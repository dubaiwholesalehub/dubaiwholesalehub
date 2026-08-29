/* =========================================================
 * Migration 151
 * Supplier Return Credit Applications - Goods Receipts
 *
 * PURPOSE
 * -------
 *
 * Extend the existing Supplier Return credit application
 * ledger so Supplier Return credit may settle either:
 *
 *   1. Quick Purchase payable
 *   2. Goods Receipt payable
 *
 * EXISTING ACCOUNTING MODEL
 * -------------------------
 *
 * Supplier Return excess AP credit:
 *
 *   Dr Supplier Advances
 *       Cr Inventory / VAT
 *
 * When later applied against a supplier payable:
 *
 *   Dr Accounts Payable
 *       Cr Supplier Advances
 *
 * IMPORTANT
 * ---------
 *
 * paid_amount remains actual posted Supplier Payment activity.
 *
 * Supplier Return credit applications reduce operational AP
 * without pretending additional cash was paid.
 *
 * APPLICATION DESTINATION
 * -----------------------
 *
 * Exactly one destination is required:
 *
 *   quick_purchase_id
 *   XOR
 *   goods_receipt_id
 *
 * Existing Quick Purchase application behavior remains
 * compatible with Migration 128 / 129.
 * ========================================================= */


/* =========================================================
 * 1. Extend Application Ledger for Goods Receipts
 * ========================================================= */

alter table
  public.supplier_return_credit_applications

alter column
  quick_purchase_id
drop not null;


alter table
  public.supplier_return_credit_applications

add column if not exists
  goods_receipt_id uuid
    references public.goods_receipts(id)
    on delete restrict;


/* =========================================================
 * 2. Application Destination Integrity
 *
 * One and only one payable target must be populated.
 * ========================================================= */

alter table
  public.supplier_return_credit_applications

drop constraint if exists
  supplier_return_credit_applications_destination_check;


alter table
  public.supplier_return_credit_applications

add constraint
  supplier_return_credit_applications_destination_check

check (
  (
    quick_purchase_id is not null
    and
    goods_receipt_id is null
  )
  or
  (
    quick_purchase_id is null
    and
    goods_receipt_id is not null
  )
);


/* =========================================================
 * 3. Goods Receipt Application Index
 * ========================================================= */

create index if not exists
  supplier_return_credit_applications_goods_receipt_idx

on
  public.supplier_return_credit_applications(
    goods_receipt_id
  )

where
  goods_receipt_id is not null;


/* =========================================================
 * 4. Documentation
 * ========================================================= */

comment on table
  public.supplier_return_credit_applications
is
  'Immutable audit ledger recording application of posted Supplier Return credits against Quick Purchase or Goods Receipt supplier obligations.';


comment on column
  public.supplier_return_credit_applications.quick_purchase_id
is
  'Quick Purchase payable receiving the Supplier Return credit. Null when the destination is a Goods Receipt.';


comment on column
  public.supplier_return_credit_applications.goods_receipt_id
is
  'Goods Receipt payable receiving the Supplier Return credit. Null when the destination is a Quick Purchase.';


/* =========================================================
 * 5. Apply Supplier Return Credit to Goods Receipt
 *
 * ACCOUNTING
 * ----------
 *
 *   Dr Accounts Payable
 *       Cr Supplier Advances
 *
 * CONTROLS
 * --------
 *
 * - authenticated administrator only
 * - Supplier Return must be posted
 * - Supplier Return must contain credit
 * - posted refunds consume credit
 * - existing applications consume credit
 * - target GRN must be completed
 * - same supplier
 * - same currency
 * - cannot apply return back to originating GRN
 * - cannot exceed available Supplier Return credit
 * - cannot exceed target GRN outstanding balance
 * - Supplier Return and payable are locked
 * - GL posting and operational AP update are atomic
 * ========================================================= */

create or replace function
  public.apply_supplier_return_credit_to_goods_receipt(
    p_supplier_return_id uuid,
    p_goods_receipt_id uuid,
    p_amount numeric,
    p_application_date date
      default current_date,
    p_posting_date date
      default current_date,
    p_notes text
      default null
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_return
    public.supplier_returns%rowtype;

  v_goods_receipt_status text;

  v_purchase_order_id uuid;

  v_target_supplier_id uuid;

  v_target_currency_code text;

  v_available_credit
    numeric(18, 2);

  v_refunded_amount
    numeric(18, 2);

  v_outstanding_payable
    numeric(18, 2);

  v_amount
    numeric(18, 2);

  v_base_amount
    numeric(18, 2);

  v_accounts_payable_account_id uuid;

  v_supplier_advances_account_id uuid;

  v_application_id uuid;

  v_journal_id uuid;

  v_lines jsonb;

  v_target_reference text;

begin

  /* =======================================================
   * Authentication
   * ======================================================= */

  v_user_id :=
    auth.uid();


  if
    v_user_id is null
  then
    raise exception
      'Authentication is required.';
  end if;


  if
    not public.is_admin()
  then
    raise exception
      'Administrator access is required.';
  end if;


  /* =======================================================
   * Validate Inputs
   * ======================================================= */

  if
    p_supplier_return_id is null
  then
    raise exception
      'Supplier Return ID is required.';
  end if;


  if
    p_goods_receipt_id is null
  then
    raise exception
      'Goods Receipt ID is required.';
  end if;


  if
    p_amount is null
    or
    p_amount <= 0
  then
    raise exception
      'Supplier credit application amount must be greater than zero.';
  end if;


  if
    p_application_date is null
  then
    raise exception
      'Application date is required.';
  end if;


  if
    p_posting_date is null
  then
    raise exception
      'Posting date is required.';
  end if;


  v_amount :=
    round(
      p_amount,
      2
    );


  /* =======================================================
   * Lock Supplier Return
   * ======================================================= */

  select
    *
  into
    v_return

  from
    public.supplier_returns

  where
    id =
      p_supplier_return_id

  for update;


  if not found then
    raise exception
      'Supplier Return was not found.';
  end if;


  if
    v_return.status <>
      'posted'
  then
    raise exception
      'Supplier Return % must be posted before its credit can be applied.',
      v_return.return_number;
  end if;


  if
    coalesce(
      v_return.supplier_credit_amount,
      0
    ) <= 0
  then
    raise exception
      'Supplier Return % does not contain available supplier credit.',
      v_return.return_number;
  end if;


  if
    coalesce(
      v_return.exchange_rate,
      0
    ) <= 0
  then
    raise exception
      'Supplier Return % does not have a valid exchange rate.',
      v_return.return_number;
  end if;


  /* =======================================================
   * Prevent Application Back to Originating GRN
   * ======================================================= */

  if
    v_return.goods_receipt_id =
      p_goods_receipt_id
  then
    raise exception
      'Supplier Return credit cannot be applied back to its originating Goods Receipt.';
  end if;


  /* =======================================================
   * Successfully Posted Refund Consumption
   * ======================================================= */

  select
    coalesce(
      sum(
        refund.amount
      ),
      0
    )

  into
    v_refunded_amount

  from
    public.supplier_return_credit_refunds
      refund

  where
    refund.supplier_return_id =
      v_return.id

    and

    refund.journal_entry_id
      is not null;


  /* =======================================================
   * Available Supplier Return Credit
   *
   * Available =
   *
   *   original supplier credit
   *   - all successful applications
   *   - successful cash/bank refunds
   *
   * supplier_credit_applied_amount is destination-neutral:
   * it includes Quick Purchase and GRN applications.
   * ======================================================= */

  v_available_credit :=
    greatest(
      round(
        coalesce(
          v_return.supplier_credit_amount,
          0
        )
        -
        coalesce(
          v_return.supplier_credit_applied_amount,
          0
        )
        -
        coalesce(
          v_refunded_amount,
          0
        ),
        2
      ),
      0
    );


  if
    v_available_credit <= 0
  then
    raise exception
      'Supplier Return % has no remaining supplier credit.',
      v_return.return_number;
  end if;


  if
    v_amount >
      v_available_credit
  then
    raise exception
      'Requested amount % exceeds available Supplier Return credit %.',
      v_amount,
      v_available_credit;
  end if;


  /* =======================================================
   * Lock Target GRN and its Purchase Order
   *
   * Supplier and document currency are authoritative from
   * the Purchase Order behind the Goods Receipt.
   * ======================================================= */

  select
    goods_receipt.status,
    goods_receipt.purchase_order_id,
    purchase_order.supplier_id,
    purchase_order.currency_code

  into
    v_goods_receipt_status,
    v_purchase_order_id,
    v_target_supplier_id,
    v_target_currency_code

  from
    public.goods_receipts
      goods_receipt

  join
    public.purchase_orders
      purchase_order

    on
      purchase_order.id =
        goods_receipt.purchase_order_id

  where
    goods_receipt.id =
      p_goods_receipt_id

  for update
    of goods_receipt,
       purchase_order;


  if not found then
    raise exception
      'Target Goods Receipt or its Purchase Order was not found.';
  end if;


  if
    v_goods_receipt_status <>
      'completed'
  then
    raise exception
      'Supplier Return credit can only be applied to a completed Goods Receipt.';
  end if;


  /* =======================================================
   * Supplier Validation
   * ======================================================= */

  if
    v_target_supplier_id is null
  then
    raise exception
      'Target Goods Receipt Purchase Order does not have a registered supplier.';
  end if;


  if
    v_target_supplier_id <>
      v_return.supplier_id
  then
    raise exception
      'Supplier Return % and target Goods Receipt belong to different suppliers.',
      v_return.return_number;
  end if;


  /* =======================================================
   * Currency Validation
   *
   * Cross-currency applications require a separate FX
   * realization model and remain intentionally unsupported.
   * ======================================================= */

  if
    upper(
      trim(
        v_target_currency_code
      )
    )
    <>
    upper(
      trim(
        v_return.currency_code
      )
    )
  then
    raise exception
      'Supplier Return credit currency % does not match target Goods Receipt currency %.',
      v_return.currency_code,
      v_target_currency_code;
  end if;


  /* =======================================================
   * Refresh Target Operational AP
   * ======================================================= */

  perform
    public.sync_goods_receipt_paid_amount(
      p_goods_receipt_id
    );


  select
    greatest(
      round(
        coalesce(
          balance_due,
          0
        ),
        2
      ),
      0
    )

  into
    v_outstanding_payable

  from
    public.goods_receipts

  where
    id =
      p_goods_receipt_id

  for update;


  if
    v_outstanding_payable <= 0
  then
    raise exception
      'Target Goods Receipt does not have an outstanding payable.';
  end if;


  if
    v_amount >
      v_outstanding_payable
  then
    raise exception
      'Requested amount % exceeds Goods Receipt outstanding payable %.',
      v_amount,
      v_outstanding_payable;
  end if;


  /* =======================================================
   * Resolve GL Accounts
   * ======================================================= */

  v_accounts_payable_account_id :=
    public.get_mapped_gl_account(
      'accounts_payable'
    );


  v_supplier_advances_account_id :=
    public.get_mapped_gl_account(
      'supplier_advances'
    );


  if
    v_accounts_payable_account_id
      is null
  then
    raise exception
      'Accounts Payable GL account mapping is missing.';
  end if;


  if
    v_supplier_advances_account_id
      is null
  then
    raise exception
      'Supplier Advances GL account mapping is missing.';
  end if;


  /* =======================================================
   * Base Currency Amount
   * ======================================================= */

  v_base_amount :=
    round(
      v_amount
      *
      v_return.exchange_rate,
      2
    );


  if
    v_base_amount <= 0
  then
    raise exception
      'Supplier credit base amount must be greater than zero.';
  end if;


  /* =======================================================
   * Stable Human-Readable Target Reference
   *
   * Avoid dependency on a particular GRN number column name.
   * ======================================================= */

  v_target_reference :=
    'GRN-'
    ||
    left(
      p_goods_receipt_id::text,
      8
    );


  /* =======================================================
   * Create Immutable Application Record
   * ======================================================= */

  insert into
    public.supplier_return_credit_applications
    (
      supplier_return_id,

      quick_purchase_id,
      goods_receipt_id,

      supplier_id,

      application_date,
      posting_date,

      currency_code,
      exchange_rate,

      amount,
      base_amount,

      notes,

      created_by,
      created_at,
      updated_at
    )

  values
    (
      v_return.id,

      null,
      p_goods_receipt_id,

      v_return.supplier_id,

      p_application_date,
      p_posting_date,

      upper(
        trim(
          v_return.currency_code
        )
      ),

      v_return.exchange_rate,

      v_amount,
      v_base_amount,

      nullif(
        trim(
          coalesce(
            p_notes,
            ''
          )
        ),
        ''
      ),

      v_user_id,
      now(),
      now()
    )

  returning
    id
  into
    v_application_id;


  /* =======================================================
   * General Ledger Lines
   *
   * Dr Accounts Payable
   * Cr Supplier Advances
   * ======================================================= */

  v_lines :=
    jsonb_build_array(

      jsonb_build_object(
        'glAccountId',
          v_accounts_payable_account_id,

        'debit',
          v_amount,

        'credit',
          0,

        'baseDebit',
          v_base_amount,

        'baseCredit',
          0,

        'description',
          'Supplier credit applied to '
          ||
          v_target_reference,

        'supplierId',
          v_return.supplier_id,

        'sourceLineType',
          'supplier_return_credit_application',

        'sourceLineId',
          v_application_id,

        'sourceLineNumber',
          1
      ),

      jsonb_build_object(
        'glAccountId',
          v_supplier_advances_account_id,

        'debit',
          0,

        'credit',
          v_amount,

        'baseDebit',
          0,

        'baseCredit',
          v_base_amount,

        'description',
          'Supplier Return credit applied from '
          ||
          v_return.return_number,

        'supplierId',
          v_return.supplier_id,

        'sourceLineType',
          'supplier_return_credit_application',

        'sourceLineId',
          v_application_id,

        'sourceLineNumber',
          2
      )

    );


  /* =======================================================
   * Post Through Controlled GL Engine
   * ======================================================= */

  v_journal_id :=
    public.post_erp_gl_journal(
      'supplier_return_credit_application',

      v_application_id,

      v_return.return_number
      ||
      ' -> '
      ||
      v_target_reference,

      p_application_date,

      p_posting_date,

      'Supplier Return credit application - '
      ||
      v_return.return_number
      ||
      ' against '
      ||
      v_target_reference,

      upper(
        trim(
          v_return.currency_code
        )
      ),

      v_return.exchange_rate,

      v_lines
    );


  /* =======================================================
   * Finalize Application
   * ======================================================= */

  update
    public.supplier_return_credit_applications

  set
    journal_entry_id =
      v_journal_id,

    updated_at =
      now()

  where
    id =
      v_application_id;


  /* =======================================================
   * Consume Supplier Return Credit
   * ======================================================= */

  update
    public.supplier_returns

  set
    supplier_credit_applied_amount =
      round(
        coalesce(
          supplier_credit_applied_amount,
          0
        )
        +
        v_amount,
        2
      ),

    updated_by =
      v_user_id,

    updated_at =
      now()

  where
    id =
      v_return.id;


  /* =======================================================
   * Synchronize Target Goods Receipt
   * ======================================================= */

  perform
    public.sync_goods_receipt_paid_amount(
      p_goods_receipt_id
    );


  return
    v_application_id;

end;
$$;


/* =========================================================
 * 6. Permissions - GRN Credit Application
 * ========================================================= */

revoke all
on function
  public.apply_supplier_return_credit_to_goods_receipt(
    uuid,
    uuid,
    numeric,
    date,
    date,
    text
  )
from public;


grant execute
on function
  public.apply_supplier_return_credit_to_goods_receipt(
    uuid,
    uuid,
    numeric,
    date,
    date,
    text
  )
to authenticated;


/* =========================================================
 * 7. Documentation - GRN Credit Application
 * ========================================================= */

comment on function
  public.apply_supplier_return_credit_to_goods_receipt(
    uuid,
    uuid,
    numeric,
    date,
    date,
    text
  )
is
  'Atomically applies available credit from a posted Supplier Return against an outstanding completed Goods Receipt for the same supplier and currency. Posts Dr Accounts Payable / Cr Supplier Advances and synchronizes the Goods Receipt operational AP without increasing paid_amount.';


/* =========================================================
 * 8. Redefine Goods Receipt AP Synchronization
 *
 * paid_amount:
 *
 *   posted Supplier Payment allocations only
 *
 * balance_due:
 *
 *   original GRN payable
 *   - posted supplier payments
 *   - posted Supplier Return AP reductions
 *   - posted Supplier Return credit applications TO GRN
 *
 * Credit applications settle AP but must NOT increase
 * paid_amount.
 * ========================================================= */

create or replace function
  public.sync_goods_receipt_paid_amount(
    p_goods_receipt_id uuid
  )
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;

  v_payable_amount
    numeric(18, 2);

  v_allocated_amount
    numeric(18, 2);

  v_return_ap_reduction_amount
    numeric(18, 2);

  v_supplier_return_credit_applied
    numeric(18, 2);

  v_paid_amount
    numeric(18, 2);

  v_balance_due
    numeric(18, 2);

  v_effective_payable
    numeric(18, 2);

  v_payment_status
    text;

begin

  /* =======================================================
   * Lock / Validate Goods Receipt
   * ======================================================= */

  select
    status

  into
    v_status

  from
    public.goods_receipts

  where
    id =
      p_goods_receipt_id

  for update;


  if not found then
    raise exception
      'Goods Receipt was not found.';
  end if;


  /* =======================================================
   * Non-completed GRNs carry no AP
   * ======================================================= */

  if
    v_status <>
      'completed'
  then

    update
      public.goods_receipts

    set
      paid_amount =
        0,

      balance_due =
        0,

      payment_status =
        'unpaid'

    where
      id =
        p_goods_receipt_id;


    return;

  end if;


  /* =======================================================
   * Original Gross Payable
   * ======================================================= */

  v_payable_amount :=
    round(
      public.get_goods_receipt_payable_amount(
        p_goods_receipt_id
      ),
      2
    );


  /* =======================================================
   * Posted Supplier Payment Allocations
   *
   * This is the ONLY component of paid_amount.
   * ======================================================= */

  select
    coalesce(
      sum(
        allocation.amount
      ),
      0
    )

  into
    v_allocated_amount

  from
    public.supplier_payment_allocations
      allocation

  join
    public.supplier_payments
      payment

    on
      payment.id =
        allocation.supplier_payment_id

  where
    allocation.goods_receipt_id =
      p_goods_receipt_id

    and

    payment.status =
      'posted';


  v_paid_amount :=
    round(
      coalesce(
        v_allocated_amount,
        0
      ),
      2
    );


  /* =======================================================
   * Posted Supplier Returns Originating From This GRN
   *
   * Only the AP reduction component is deducted here.
   * Excess Supplier Credit is tracked separately.
   * ======================================================= */

  select
    coalesce(
      sum(
        supplier_return.ap_reduction_amount
      ),
      0
    )

  into
    v_return_ap_reduction_amount

  from
    public.supplier_returns
      supplier_return

  where
    supplier_return.goods_receipt_id =
      p_goods_receipt_id

    and

    supplier_return.status =
      'posted';


  v_return_ap_reduction_amount :=
    round(
      coalesce(
        v_return_ap_reduction_amount,
        0
      ),
      2
    );


  /* =======================================================
   * Supplier Return Credit Applications TO This GRN
   *
   * Only finalized applications with a posted GL journal
   * reduce the target payable.
   * ======================================================= */

  select
    coalesce(
      sum(
        application.amount
      ),
      0
    )

  into
    v_supplier_return_credit_applied

  from
    public.supplier_return_credit_applications
      application

  where
    application.goods_receipt_id =
      p_goods_receipt_id

    and

    application.journal_entry_id
      is not null;


  v_supplier_return_credit_applied :=
    round(
      coalesce(
        v_supplier_return_credit_applied,
        0
      ),
      2
    );


  /* =======================================================
   * Accounting Integrity
   * ======================================================= */

  if
    v_paid_amount >
      v_payable_amount
  then
    raise exception
      'Goods Receipt payment exceeds the Goods Receipt payable amount.';
  end if;


  if
    v_return_ap_reduction_amount >
      v_payable_amount
  then
    raise exception
      'Goods Receipt Supplier Return AP reduction exceeds the Goods Receipt payable amount.';
  end if;


  if
    v_supplier_return_credit_applied >
      v_payable_amount
  then
    raise exception
      'Supplier Return credit applied to Goods Receipt exceeds the original Goods Receipt payable amount.';
  end if;


  if
    v_paid_amount
    +
    v_return_ap_reduction_amount
    +
    v_supplier_return_credit_applied
    >
    v_payable_amount
    +
    0.01
  then
    raise exception
      'Goods Receipt payments, Supplier Return reductions and Supplier Return credit applications exceed the Goods Receipt payable amount.';
  end if;


  /* =======================================================
   * Effective Liability
   * ======================================================= */

  v_effective_payable :=
    greatest(
      round(
        v_payable_amount
        -
        v_return_ap_reduction_amount
        -
        v_supplier_return_credit_applied,
        2
      ),
      0
    );


  /* =======================================================
   * Outstanding Balance
   * ======================================================= */

  v_balance_due :=
    greatest(
      round(
        v_effective_payable
        -
        v_paid_amount,
        2
      ),
      0
    );


  /* =======================================================
   * Payment Status
   *
   * Preserve Migration 150 semantics:
   *
   * - zero balance = paid
   * - no real payment and remaining balance = unpaid
   * - some real payment and remaining balance = partially_paid
   * ======================================================= */

  if
    v_balance_due <= 0
  then

    v_payment_status :=
      'paid';


  elsif
    v_paid_amount <= 0
  then

    v_payment_status :=
      'unpaid';


  else

    v_payment_status :=
      'partially_paid';

  end if;


  /* =======================================================
   * Persist Operational AP
   * ======================================================= */

  update
    public.goods_receipts

  set
    paid_amount =
      v_paid_amount,

    balance_due =
      v_balance_due,

    payment_status =
      v_payment_status

  where
    id =
      p_goods_receipt_id;

end;
$$;


/* =========================================================
 * 9. Preserve Internal Permission on GRN Sync
 * ========================================================= */

revoke all
on function
  public.sync_goods_receipt_paid_amount(
    uuid
  )
from public;


/* =========================================================
 * 10. Documentation - Extended GRN AP Sync
 * ========================================================= */

comment on function
  public.sync_goods_receipt_paid_amount(
    uuid
  )
is
  'Synchronizes Goods Receipt operational AP from original gross payable, posted Supplier Payment allocations, posted originating Supplier Return AP reductions and posted Supplier Return credit applications to the GRN. paid_amount remains actual Supplier Payment activity only.';


/* =========================================================
 * 11. Resynchronize Existing Completed Goods Receipts
 * ========================================================= */

do $$
declare
  v_goods_receipt_id uuid;
begin

  for v_goods_receipt_id in

    select
      id

    from
      public.goods_receipts

    where
      status =
        'completed'

  loop

    perform
      public.sync_goods_receipt_paid_amount(
        v_goods_receipt_id
      );

  end loop;

end;
$$;


/* =========================================================
 * 12. Refund-Aware Available Supplier Return Credits View
 *
 * Existing columns remain in their existing order.
 * goods_receipt_id is appended for GRN-origin visibility.
 * ========================================================= */

create or replace view
  public.available_supplier_return_credits

with (
  security_invoker = true
)

as

select
  supplier_return.id
    as supplier_return_id,

  supplier_return.return_number,

  supplier_return.supplier_id,

  supplier_return.quick_purchase_id,

  supplier_return.posting_date,

  supplier_return.currency_code,

  supplier_return.exchange_rate,

  supplier_return.supplier_credit_amount,

  supplier_return.supplier_credit_applied_amount,

  greatest(
    round(
      supplier_return.supplier_credit_amount
      -
      supplier_return.supplier_credit_applied_amount
      -
      coalesce(
        refund_summary.refunded_amount,
        0
      ),
      2
    ),
    0
  )
    as supplier_credit_available,

  round(
    coalesce(
      refund_summary.refunded_amount,
      0
    ),
    2
  )
    as supplier_credit_refunded_amount,

  supplier_return.goods_receipt_id

from
  public.supplier_returns
    supplier_return

left join lateral
(
  select
    coalesce(
      sum(
        refund.amount
      ),
      0
    )
      as refunded_amount

  from
    public.supplier_return_credit_refunds
      refund

  where
    refund.supplier_return_id =
      supplier_return.id

    and

    refund.journal_entry_id
      is not null
)
  refund_summary
on
  true

where
  supplier_return.status =
    'posted'

  and

  round(
    supplier_return.supplier_credit_amount
    -
    supplier_return.supplier_credit_applied_amount
    -
    coalesce(
      refund_summary.refunded_amount,
      0
    ),
    2
  )
    >
    0;


/* =========================================================
 * 13. Documentation - Available Credit View
 * ========================================================= */

comment on view
  public.available_supplier_return_credits
is
  'Available posted Supplier Return credit after deducting successful applications to Quick Purchases or Goods Receipts and successfully posted supplier cash/bank refunds.';
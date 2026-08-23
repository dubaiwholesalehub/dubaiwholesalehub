/*
 * =========================================================
 * 127 — Supplier Return GL Posting + Supplier Credit
 *
 * PURPOSE
 * -------
 *
 * Final accounting stage for Supplier Returns.
 *
 * Workflow:
 *
 *   Draft
 *     ↓
 *   Approved
 *     ↓
 *   Dispatched            — Migration 126
 *     ↓
 *   Posted                — THIS migration
 *
 *
 * ACCOUNTING
 * ----------
 *
 * Supplier Return reverses the original purchase:
 *
 *   Dr Accounts Payable               outstanding portion
 *   Dr Supplier Advances              excess / supplier credit
 *
 *      Cr Inventory                   historical returned cost
 *      Cr Recoverable Input VAT       where applicable
 *      Cr Pending Input VAT           where applicable
 *
 *
 * Example — fully paid purchase:
 *
 *   Return total:          21
 *   Existing AP:            0
 *
 *   Dr Supplier Advances   21
 *      Cr Inventory        20
 *      Cr Recoverable VAT   1
 *
 *
 * Example — unpaid purchase:
 *
 *   Return total:          21
 *   Existing AP:           40
 *
 *   Dr Accounts Payable   21
 *      Cr Inventory        20
 *      Cr Recoverable VAT   1
 *
 *
 * IMPORTANT
 * ---------
 *
 * Original supplier-payment history is NEVER rewritten.
 *
 * paid_amount remains the amount actually paid.
 *
 * Quick Purchase balance_due is recalculated against:
 *
 *   original purchase total
 *   -
 *   POSTED Supplier Returns
 *
 *
 * Supplier-return excess becomes a Supplier Advance / Supplier
 * Credit asset, but is NOT represented by a fake supplier
 * payment.
 *
 * Later application of Supplier Return credits to other
 * purchases will be implemented as a separate accounting event.
 * =========================================================
 */


/* =========================================================
 * 1. Supplier Return Settlement Fields
 * ========================================================= */

alter table
  public.supplier_returns

add column if not exists
  ap_reduction_amount numeric(18, 2)
    not null
    default 0;


alter table
  public.supplier_returns

add column if not exists
  supplier_credit_amount numeric(18, 2)
    not null
    default 0;


alter table
  public.supplier_returns

add column if not exists
  supplier_credit_applied_amount numeric(18, 2)
    not null
    default 0;


/* =========================================================
 * 2. Settlement Constraints
 * ========================================================= */

alter table
  public.supplier_returns

drop constraint if exists
  supplier_returns_ap_reduction_nonnegative;


alter table
  public.supplier_returns

add constraint
  supplier_returns_ap_reduction_nonnegative

check (
  ap_reduction_amount >= 0
);


alter table
  public.supplier_returns

drop constraint if exists
  supplier_returns_credit_nonnegative;


alter table
  public.supplier_returns

add constraint
  supplier_returns_credit_nonnegative

check (
  supplier_credit_amount >= 0
);


alter table
  public.supplier_returns

drop constraint if exists
  supplier_returns_credit_applied_nonnegative;


alter table
  public.supplier_returns

add constraint
  supplier_returns_credit_applied_nonnegative

check (
  supplier_credit_applied_amount >= 0
);


alter table
  public.supplier_returns

drop constraint if exists
  supplier_returns_credit_applied_not_above_credit;


alter table
  public.supplier_returns

add constraint
  supplier_returns_credit_applied_not_above_credit

check (
  supplier_credit_applied_amount
  <=
  supplier_credit_amount
);


alter table
  public.supplier_returns

drop constraint if exists
  supplier_returns_posted_settlement_consistency;


alter table
  public.supplier_returns

add constraint
  supplier_returns_posted_settlement_consistency

check (
  status <>
    'posted'

  or

  abs(
    (
      ap_reduction_amount
      +
      supplier_credit_amount
    )
    -
    grand_total
  ) <=
    0.01
);


alter table
  public.supplier_returns

drop constraint if exists
  supplier_returns_posted_audit_fields;


alter table
  public.supplier_returns

add constraint
  supplier_returns_posted_audit_fields

check (
  status <>
    'posted'

  or

  (
    journal_entry_id
      is not null

    and

    posted_at
      is not null

    and

    posted_by
      is not null
  )
);


/* =========================================================
 * 3. Supplier Credit Index
 * ========================================================= */

create index if not exists
  supplier_returns_supplier_credit_idx

on public.supplier_returns (
  supplier_id,
  posting_date
)

where
  status = 'posted'

  and

  supplier_credit_amount >
    supplier_credit_applied_amount;


/* =========================================================
 * 4. Synchronize Quick Purchase Payable
 *
 * Replaces the original function from Migration 069.
 *
 *
 * paid_amount
 * -----------
 *
 * Remains historical CASH / payment allocation history:
 *
 *   payment_opening_amount
 *   +
 *   posted supplier-payment allocations
 *
 *
 * adjusted purchase liability
 * ---------------------------
 *
 *   grand_total
 *   -
 *   posted Supplier Returns
 *
 *
 * balance_due
 * -----------
 *
 *   max(
 *     adjusted purchase liability
 *     -
 *     paid_amount,
 *     0
 *   )
 *
 *
 * IMPORTANT
 * ---------
 *
 * paid_amount may legitimately be greater than the adjusted
 * purchase liability after a Supplier Return.
 *
 * That excess is represented by supplier_return credit fields,
 * not by negative balance_due.
 * ========================================================= */

create or replace function
  public.sync_quick_purchase_paid_amount(
    p_quick_purchase_id uuid
  )
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grand_total
    numeric(18, 2);

  v_opening_amount
    numeric(18, 2);

  v_allocated_amount
    numeric(18, 2);

  v_supplier_return_amount
    numeric(18, 2);

  v_adjusted_purchase_total
    numeric(18, 2);

  v_paid_amount
    numeric(18, 2);

  v_balance_due
    numeric(18, 2);

  v_payment_status
    text;

begin

  /* -------------------------------------------------------
   * Lock Quick Purchase
   * ------------------------------------------------------- */

  select
    grand_total,
    payment_opening_amount

  into
    v_grand_total,
    v_opening_amount

  from
    public.quick_purchases

  where
    id =
      p_quick_purchase_id

  for update;


  if not found then
    raise exception
      'Quick Purchase was not found.';
  end if;


  /* -------------------------------------------------------
   * Posted Supplier Payment Allocations
   * ------------------------------------------------------- */

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
    allocation.quick_purchase_id =
      p_quick_purchase_id

    and

    payment.status =
      'posted';


  /* -------------------------------------------------------
   * Posted Supplier Returns
   * ------------------------------------------------------- */

  select
    coalesce(
      sum(
        supplier_return.grand_total
      ),
      0
    )

  into
    v_supplier_return_amount

  from
    public.supplier_returns
      supplier_return

  where
    supplier_return.quick_purchase_id =
      p_quick_purchase_id

    and

    supplier_return.status =
      'posted';


  /* -------------------------------------------------------
   * Historical Amount Actually Paid
   * ------------------------------------------------------- */

  v_paid_amount :=
    round(
      coalesce(
        v_opening_amount,
        0
      )
      +
      coalesce(
        v_allocated_amount,
        0
      ),
      2
    );


  /*
   * Existing protection remains against paying beyond the
   * ORIGINAL purchase document.
   *
   * Supplier Returns may reduce economic exposure later,
   * but must not rewrite historical payment amounts.
   */

  if
    v_paid_amount >
      v_grand_total
      +
      0.01
  then
    raise exception
      'Quick Purchase payment exceeds the original purchase total.';
  end if;


  /* -------------------------------------------------------
   * Net Purchase Liability
   * ------------------------------------------------------- */

  v_adjusted_purchase_total :=
    greatest(
      round(
        v_grand_total
        -
        v_supplier_return_amount,
        2
      ),
      0
    );


  /* -------------------------------------------------------
   * Remaining AP
   * ------------------------------------------------------- */

  v_balance_due :=
    greatest(
      round(
        v_adjusted_purchase_total
        -
        v_paid_amount,
        2
      ),
      0
    );


  /* -------------------------------------------------------
   * Payment Status
   * ------------------------------------------------------- */

  if
    v_adjusted_purchase_total <=
      0
  then

    v_payment_status :=
      'paid';


  elsif
    v_paid_amount <=
      0
  then

    v_payment_status :=
      'unpaid';


  elsif
    v_paid_amount <
      v_adjusted_purchase_total
  then

    v_payment_status :=
      'partially_paid';


  else

    v_payment_status :=
      'paid';

  end if;


  /* -------------------------------------------------------
   * Persist
   * ------------------------------------------------------- */

  update
    public.quick_purchases

  set
    paid_amount =
      v_paid_amount,

    balance_due =
      v_balance_due,

    payment_status =
      v_payment_status

  where
    id =
      p_quick_purchase_id;

end;
$$;


/* =========================================================
 * 5. Post Supplier Return to General Ledger
 * ========================================================= */

create or replace function
  public.post_supplier_return_gl(
    p_supplier_return_id uuid
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

  v_purchase
    public.quick_purchases%rowtype;

  v_inventory_transaction
    public.inventory_transactions%rowtype;


  /* GL Accounts */

  v_inventory_account_id uuid;

  v_vat_recoverable_account_id uuid;

  v_vat_pending_account_id uuid;

  v_accounts_payable_account_id uuid;

  v_supplier_advance_account_id uuid;


  /* Transaction Currency */

  v_return_total
    numeric(18, 2);

  v_inventory_amount
    numeric(18, 2);

  v_recoverable_vat_amount
    numeric(18, 2);

  v_pending_vat_amount
    numeric(18, 2);

  v_ap_reduction_amount
    numeric(18, 2);

  v_supplier_credit_amount
    numeric(18, 2);


  /* AED Base Currency */

  v_base_inventory_amount
    numeric(18, 2);

  v_base_recoverable_vat_amount
    numeric(18, 2);

  v_base_pending_vat_amount
    numeric(18, 2);

  v_base_total_credit
    numeric(18, 2);

  v_base_ap_reduction_amount
    numeric(18, 2);

  v_base_supplier_credit_amount
    numeric(18, 2);


  v_lines jsonb;

  v_journal_id uuid;

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


  if
    p_supplier_return_id is null
  then
    raise exception
      'Supplier Return ID is required.';
  end if;


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


  /* =======================================================
   * Idempotency
   * ======================================================= */

  if
    v_return.status =
      'posted'

    and

    v_return.journal_entry_id
      is not null
  then

    return
      v_return.journal_entry_id;

  end if;


  /* =======================================================
   * Must Already Be Dispatched
   * ======================================================= */

  if
    v_return.status <>
      'dispatched'
  then
    raise exception
      'Supplier Return % must be dispatched before General Ledger posting. Current status is "%".',
      v_return.return_number,
      v_return.status;
  end if;


  if
    v_return.inventory_transaction_id
      is null
  then
    raise exception
      'Supplier Return % does not have an inventory transaction.',
      v_return.return_number;
  end if;


  /* =======================================================
   * Validate Inventory Transaction
   * ======================================================= */

  select
    *
  into
    v_inventory_transaction
  from
    public.inventory_transactions
  where
    id =
      v_return.inventory_transaction_id;


  if not found then
    raise exception
      'Inventory transaction for Supplier Return % was not found.',
      v_return.return_number;
  end if;


  if
    v_inventory_transaction.status <>
      'posted'
  then
    raise exception
      'Supplier Return % inventory transaction must be posted before GL posting.',
      v_return.return_number;
  end if;


  if
    v_inventory_transaction.transaction_type <>
      'supplier_return'
  then
    raise exception
      'Supplier Return % references an invalid inventory transaction type.',
      v_return.return_number;
  end if;


  /* =======================================================
   * Lock Original Quick Purchase
   * ======================================================= */

  select
    *
  into
    v_purchase
  from
    public.quick_purchases
  where
    id =
      v_return.quick_purchase_id
  for update;


  if not found then
    raise exception
      'Original Quick Purchase for Supplier Return % was not found.',
      v_return.return_number;
  end if;


  if
    v_purchase.status <>
      'posted'
  then
    raise exception
      'Original Quick Purchase % must remain posted.',
      v_purchase.purchase_number;
  end if;


  if
    v_purchase.supplier_id is null

    or

    v_purchase.supplier_id <>
      v_return.supplier_id
  then
    raise exception
      'Supplier Return % and Quick Purchase % do not belong to the same supplier.',
      v_return.return_number,
      v_purchase.purchase_number;
  end if;


  /* =======================================================
   * Currency Integrity
   * ======================================================= */

  if
    upper(
      v_return.currency_code
    )
    <>
    upper(
      v_purchase.currency_code
    )
  then
    raise exception
      'Supplier Return % currency does not match Quick Purchase %.',
      v_return.return_number,
      v_purchase.purchase_number;
  end if;


  if
    v_return.exchange_rate is null

    or

    v_return.exchange_rate <=
      0
  then
    raise exception
      'Supplier Return % does not have a valid exchange rate.',
      v_return.return_number;
  end if;


  /* =======================================================
   * Supported Tax Treatments
   * ======================================================= */

  if
    v_return.tax_treatment not in (
      'standard_vat',
      'vat_pending',
      'no_vat'
    )
  then
    raise exception
      'Supplier Return % tax treatment "%" is not supported for GL posting.',
      v_return.return_number,
      v_return.tax_treatment;
  end if;


  /* =======================================================
   * Accounting Amounts
   * ======================================================= */

  v_return_total :=
    round(
      coalesce(
        v_return.grand_total,
        0
      ),
      2
    );


  v_inventory_amount :=
    round(
      coalesce(
        v_return.inventory_cost,
        0
      ),
      2
    );


  v_recoverable_vat_amount :=
    round(
      coalesce(
        v_return.recoverable_tax_amount,
        0
      ),
      2
    );


  v_pending_vat_amount :=
    round(
      coalesce(
        v_return.pending_tax_amount,
        0
      ),
      2
    );


  if
    v_return_total <=
      0
  then
    raise exception
      'Supplier Return % has zero or negative accounting value.',
      v_return.return_number;
  end if;


  if
    v_inventory_amount <
      0

    or

    v_recoverable_vat_amount <
      0

    or

    v_pending_vat_amount <
      0
  then
    raise exception
      'Supplier Return % contains invalid accounting amounts.',
      v_return.return_number;
  end if;


  /*
   * For the currently supported Quick Purchase workflow:
   *
   *   supplier return total
   *
   *     =
   *
   *   inventory historical cost
   *   +
   *   recoverable VAT reversal
   *   +
   *   pending VAT reversal
   *
   * Allow one-cent rounding tolerance.
   */

  if
    abs(
      v_return_total
      -
      (
        v_inventory_amount
        +
        v_recoverable_vat_amount
        +
        v_pending_vat_amount
      )
    ) >
      0.01
  then
    raise exception
      'Supplier Return % accounting value does not reconcile to Inventory plus VAT reversal.',
      v_return.return_number;
  end if;


  /* =======================================================
   * Refresh Current Purchase Payable
   *
   * This includes previously POSTED Supplier Returns but not
   * this one because this return is still dispatched.
   * ======================================================= */

  perform
    public.sync_quick_purchase_paid_amount(
      v_purchase.id
    );


  select
    *
  into
    v_purchase
  from
    public.quick_purchases
  where
    id =
      v_purchase.id
  for update;


  /* =======================================================
   * Split Return Between AP Reduction and Supplier Credit
   * ======================================================= */

  v_ap_reduction_amount :=
    least(
      v_return_total,
      greatest(
        coalesce(
          v_purchase.balance_due,
          0
        ),
        0
      )
    );


  v_supplier_credit_amount :=
    round(
      v_return_total
      -
      v_ap_reduction_amount,
      2
    );


  /* =======================================================
   * Resolve GL Accounts
   * ======================================================= */

  v_inventory_account_id :=
    public.get_mapped_gl_account(
      'inventory'
    );


  if
    v_ap_reduction_amount >
      0
  then

    v_accounts_payable_account_id :=
      public.get_mapped_gl_account(
        'accounts_payable'
      );

  end if;


  if
    v_supplier_credit_amount >
      0
  then

    v_supplier_advance_account_id :=
      public.get_mapped_gl_account(
        'supplier_advances'
      );

  end if;


  if
    v_recoverable_vat_amount >
      0
  then

    v_vat_recoverable_account_id :=
      public.get_mapped_gl_account(
        'vat_recoverable'
      );

  end if;


  if
    v_pending_vat_amount >
      0
  then

    v_vat_pending_account_id :=
      public.get_mapped_gl_account(
        'vat_pending'
      );

  end if;


  /* =======================================================
   * Base Currency — AED
   * ======================================================= */

  v_base_inventory_amount :=
    round(
      v_inventory_amount
      *
      v_return.exchange_rate,
      2
    );


  v_base_recoverable_vat_amount :=
    round(
      v_recoverable_vat_amount
      *
      v_return.exchange_rate,
      2
    );


  v_base_pending_vat_amount :=
    round(
      v_pending_vat_amount
      *
      v_return.exchange_rate,
      2
    );


  /*
   * Derive the base total from individually rounded credit
   * components so the journal remains exactly balanced.
   */

  v_base_total_credit :=
    round(
      v_base_inventory_amount
      +
      v_base_recoverable_vat_amount
      +
      v_base_pending_vat_amount,
      2
    );


  if
    v_supplier_credit_amount >
      0
  then

    v_base_ap_reduction_amount :=
      round(
        v_ap_reduction_amount
        *
        v_return.exchange_rate,
        2
      );


    /*
     * Supplier Credit receives the balancing base amount.
     */

    v_base_supplier_credit_amount :=
      round(
        v_base_total_credit
        -
        v_base_ap_reduction_amount,
        2
      );

  else

    /*
     * Entire return reduces AP.
     */

    v_base_ap_reduction_amount :=
      v_base_total_credit;


    v_base_supplier_credit_amount :=
      0;

  end if;


  /* =======================================================
   * Build Journal Lines
   * ======================================================= */

  v_lines :=
    '[]'::jsonb;


  /* -------------------------------------------------------
   * Accounts Payable Debit
   * ------------------------------------------------------- */

  if
    v_ap_reduction_amount >
      0
  then

    v_lines :=
      v_lines
      ||
      jsonb_build_array(

        jsonb_build_object(
          'glAccountId',
            v_accounts_payable_account_id,

          'debit',
            v_ap_reduction_amount,

          'credit',
            0,

          'baseDebit',
            v_base_ap_reduction_amount,

          'baseCredit',
            0,

          'description',
            'Supplier Return AP reduction - '
            ||
            v_return.return_number,

          'supplierId',
            v_return.supplier_id,

          'sourceLineType',
            'supplier_return',

          'sourceLineId',
            v_return.id
        )
      );

  end if;


  /* -------------------------------------------------------
   * Supplier Credit / Advance Debit
   * ------------------------------------------------------- */

  if
    v_supplier_credit_amount >
      0
  then

    v_lines :=
      v_lines
      ||
      jsonb_build_array(

        jsonb_build_object(
          'glAccountId',
            v_supplier_advance_account_id,

          'debit',
            v_supplier_credit_amount,

          'credit',
            0,

          'baseDebit',
            v_base_supplier_credit_amount,

          'baseCredit',
            0,

          'description',
            'Supplier Credit from '
            ||
            v_return.return_number,

          'supplierId',
            v_return.supplier_id,

          'sourceLineType',
            'supplier_return',

          'sourceLineId',
            v_return.id
        )
      );

  end if;


  /* -------------------------------------------------------
   * Inventory Credit
   * ------------------------------------------------------- */

  if
    v_inventory_amount >
      0
  then

    v_lines :=
      v_lines
      ||
      jsonb_build_array(

        jsonb_build_object(
          'glAccountId',
            v_inventory_account_id,

          'debit',
            0,

          'credit',
            v_inventory_amount,

          'baseDebit',
            0,

          'baseCredit',
            v_base_inventory_amount,

          'description',
            'Inventory returned to supplier - '
            ||
            v_return.return_number,

          'supplierId',
            v_return.supplier_id,

          'sourceLineType',
            'supplier_return',

          'sourceLineId',
            v_return.id
        )
      );

  end if;


  /* -------------------------------------------------------
   * Recoverable VAT Credit
   * ------------------------------------------------------- */

  if
    v_recoverable_vat_amount >
      0
  then

    v_lines :=
      v_lines
      ||
      jsonb_build_array(

        jsonb_build_object(
          'glAccountId',
            v_vat_recoverable_account_id,

          'debit',
            0,

          'credit',
            v_recoverable_vat_amount,

          'baseDebit',
            0,

          'baseCredit',
            v_base_recoverable_vat_amount,

          'description',
            'Recoverable Input VAT reversal - '
            ||
            v_return.return_number,

          'supplierId',
            v_return.supplier_id,

          'sourceLineType',
            'supplier_return',

          'sourceLineId',
            v_return.id
        )
      );

  end if;


  /* -------------------------------------------------------
   * Pending VAT Credit
   * ------------------------------------------------------- */

  if
    v_pending_vat_amount >
      0
  then

    v_lines :=
      v_lines
      ||
      jsonb_build_array(

        jsonb_build_object(
          'glAccountId',
            v_vat_pending_account_id,

          'debit',
            0,

          'credit',
            v_pending_vat_amount,

          'baseDebit',
            0,

          'baseCredit',
            v_base_pending_vat_amount,

          'description',
            'Pending Input VAT reversal - '
            ||
            v_return.return_number,

          'supplierId',
            v_return.supplier_id,

          'sourceLineType',
            'supplier_return',

          'sourceLineId',
            v_return.id
        )
      );

  end if;


  /* =======================================================
   * Post Through Controlled GL Engine
   * ======================================================= */

  v_journal_id :=
    public.post_erp_gl_journal(
      'supplier_return',

      v_return.id,

      v_return.return_number,

      v_return.return_date,

      v_return.posting_date,

      'Supplier Return / Debit Note - '
      ||
      v_return.return_number,

      v_return.currency_code,

      v_return.exchange_rate,

      v_lines
    );


  /* =======================================================
   * Finalize Supplier Return
   * ======================================================= */

  update
    public.supplier_returns

  set
    status =
      'posted',

    ap_reduction_amount =
      v_ap_reduction_amount,

    supplier_credit_amount =
      v_supplier_credit_amount,

    supplier_credit_applied_amount =
      0,

    journal_entry_id =
      v_journal_id,

    posted_at =
      now(),

    posted_by =
      v_user_id,

    updated_by =
      v_user_id,

    updated_at =
      now()

  where
    id =
      v_return.id;


  /* =======================================================
   * Synchronize Operational AP
   * ======================================================= */

  perform
    public.sync_quick_purchase_paid_amount(
      v_purchase.id
    );


  return
    v_journal_id;

end;
$$;


/* =========================================================
 * 6. Supplier Return Credit Availability View
 *
 * Operational source for future Supplier Credit application.
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

  round(
    supplier_return.supplier_credit_amount
    -
    supplier_return.supplier_credit_applied_amount,
    2
  )
    as supplier_credit_available

from
  public.supplier_returns
    supplier_return

where
  supplier_return.status =
    'posted'

  and

  supplier_return.supplier_credit_amount
    >
  supplier_return.supplier_credit_applied_amount;


/* =========================================================
 * 7. RLS Hardening
 *
 * Supplier Return writes continue only through controlled
 * SECURITY DEFINER functions.
 * ========================================================= */

alter table
  public.supplier_returns
enable row level security;


alter table
  public.supplier_return_items
enable row level security;


drop policy if exists
  "Management can view supplier returns"
on
  public.supplier_returns;


create policy
  "Management can view supplier returns"

on
  public.supplier_returns

for select

to authenticated

using (
  public.is_admin()
);


drop policy if exists
  "Management can view supplier return items"
on
  public.supplier_return_items;


create policy
  "Management can view supplier return items"

on
  public.supplier_return_items

for select

to authenticated

using (
  public.is_admin()
);


/* =========================================================
 * 8. Permissions
 * ========================================================= */

revoke all
on function
  public.post_supplier_return_gl(
    uuid
  )
from public;


grant execute
on function
  public.post_supplier_return_gl(
    uuid
  )
to authenticated;


/* =========================================================
 * 9. Documentation
 * ========================================================= */

comment on column
  public.supplier_returns.ap_reduction_amount
is
  'Portion of the posted Supplier Return that reduces outstanding Accounts Payable on its original Quick Purchase.';


comment on column
  public.supplier_returns.supplier_credit_amount
is
  'Excess Supplier Return value beyond outstanding Accounts Payable. Recognized as Supplier Advances / Supplier Credit asset.';


comment on column
  public.supplier_returns.supplier_credit_applied_amount
is
  'Supplier Return credit already applied against later supplier obligations. Application workflow is handled separately.';


comment on function
  public.post_supplier_return_gl(
    uuid
  )
is
  'Posts one dispatched Supplier Return to the General Ledger. Debits Accounts Payable up to the outstanding purchase balance and debits Supplier Advances for any excess supplier credit, while crediting Inventory and applicable Recoverable/Pending Input VAT. Finalizes the Supplier Return as posted and resynchronizes the Quick Purchase payable.';


comment on view
  public.available_supplier_return_credits
is
  'Posted Supplier Return credits still available for application against future supplier obligations.';
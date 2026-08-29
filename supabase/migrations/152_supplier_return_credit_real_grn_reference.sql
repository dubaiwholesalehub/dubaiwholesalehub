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
   * ======================================================= */

  select
    receipt_number
  into
    v_target_reference
  from
    public.goods_receipts
  where
    id =
      p_goods_receipt_id;


  if
    v_target_reference is null
  then
    raise exception
      'Goods Receipt % does not have a receipt number.',
      p_goods_receipt_id;
  end if;


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

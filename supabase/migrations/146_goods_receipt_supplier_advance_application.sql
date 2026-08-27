/*
 * =========================================================
 * 146 — Goods Receipt Supplier Advance Application
 *
 * Purpose
 * -------
 *
 * 1. Preserve existing Quick Purchase advance application.
 *
 * 2. Add Supplier Advance application to completed
 *    Goods Receipts.
 *
 * 3. Generalize Supplier Advance Application GL posting so
 *    the payable source may be:
 *
 *      - Quick Purchase
 *      - Goods Receipt
 *
 * 4. Make both advance-application workflows atomic:
 *
 *      Create allocation
 *          ↓
 *      Synchronize AP subledger
 *          ↓
 *      Post GL reclassification
 *
 * Accounting:
 *
 *      Dr Accounts Payable
 *         Cr Supplier Advances
 *
 * No Cash / Bank movement occurs because the original
 * Supplier Payment already moved the treasury balance.
 * ========================================================= */


/* =========================================================
 * 1. Generalized Supplier Advance Application GL Adapter
 * ========================================================= */

create or replace function
  public.post_supplier_advance_application_gl(
    p_supplier_payment_allocation_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare

  v_allocation
    public.supplier_payment_allocations%rowtype;

  v_payment
    public.supplier_payments%rowtype;


  v_document_type text;

  v_document_number text;

  v_document_supplier_id uuid;

  v_document_currency text;

  v_document_status text;


  v_accounts_payable_account_id uuid;

  v_supplier_advance_account_id uuid;


  v_amount
    numeric(18, 2);

  v_base_amount
    numeric(18, 2);


  v_lines jsonb;

  v_journal_id uuid;

begin

  /* =======================================================
   * Security
   * ======================================================= */

  if
    auth.uid() is null
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
    p_supplier_payment_allocation_id
      is null
  then
    raise exception
      'Supplier Payment Allocation ID is required.';
  end if;


  /* =======================================================
   * Lock Allocation
   * ======================================================= */

  select
    *

  into
    v_allocation

  from
    public.supplier_payment_allocations

  where
    id =
      p_supplier_payment_allocation_id

  for update;


  if not found
  then
    raise exception
      'Supplier Payment Allocation was not found.';
  end if;


  /* =======================================================
   * Must Be Supplier Advance Application
   * ======================================================= */

  if
    v_allocation.allocation_source <>
      'supplier_advance_application'
  then
    raise exception
      'Supplier Payment Allocation % is not a Supplier Advance application.',
      v_allocation.id;
  end if;


  /* =======================================================
   * Load Supplier Payment
   * ======================================================= */

  select
    *

  into
    v_payment

  from
    public.supplier_payments

  where
    id =
      v_allocation.supplier_payment_id;


  if not found
  then
    raise exception
      'Supplier Payment for allocation % was not found.',
      v_allocation.id;
  end if;


  if
    v_payment.status <>
      'posted'
  then
    raise exception
      'Supplier Payment % must remain posted before advance application GL posting.',
      v_payment.payment_number;
  end if;


  if
    v_payment.exchange_rate is null
    or
    v_payment.exchange_rate <= 0
  then
    raise exception
      'Supplier Payment % has an invalid exchange rate.',
      v_payment.payment_number;
  end if;


  /* =======================================================
   * Resolve Payable Document
   * ======================================================= */

  if
    v_allocation.quick_purchase_id
      is not null
  then

    v_document_type :=
      'quick_purchase';


    select
      purchase.purchase_number,
      purchase.supplier_id,
      purchase.currency_code,
      purchase.status

    into
      v_document_number,
      v_document_supplier_id,
      v_document_currency,
      v_document_status

    from
      public.quick_purchases
        purchase

    where
      purchase.id =
        v_allocation.quick_purchase_id;


    if not found
    then
      raise exception
        'Quick Purchase for allocation % was not found.',
        v_allocation.id;
    end if;


    if
      v_document_status <>
        'posted'
    then
      raise exception
        'Quick Purchase % must remain posted before advance application GL posting.',
        v_document_number;
    end if;


  elsif
    v_allocation.goods_receipt_id
      is not null
  then

    v_document_type :=
      'goods_receipt';


    select
      receipt.receipt_number,
      receipt.supplier_id,
      purchase_order.currency_code,
      receipt.status

    into
      v_document_number,
      v_document_supplier_id,
      v_document_currency,
      v_document_status

    from
      public.goods_receipts
        receipt

    join
      public.purchase_orders
        purchase_order

    on
      purchase_order.id =
        receipt.purchase_order_id

    where
      receipt.id =
        v_allocation.goods_receipt_id;


    if not found
    then
      raise exception
        'Goods Receipt for allocation % was not found.',
        v_allocation.id;
    end if;


    if
      v_document_status <>
        'completed'
    then
      raise exception
        'Goods Receipt % must remain completed before advance application GL posting.',
        v_document_number;
    end if;


  else

    raise exception
      'Supplier Advance application % does not have a payable source.',
      v_allocation.id;

  end if;


  /* =======================================================
   * Supplier Integrity
   * ======================================================= */

  if
    v_document_supplier_id
      is null

    or
    v_document_supplier_id <>
      v_payment.supplier_id
  then
    raise exception
      'Supplier Payment % and payable document % do not belong to the same supplier.',
      v_payment.payment_number,
      v_document_number;
  end if;


  /* =======================================================
   * Currency Integrity
   * ======================================================= */

  if
    upper(
      v_document_currency
    ) <>
    upper(
      v_payment.currency_code
    )
  then
    raise exception
      'Supplier Payment % and payable document % currencies do not match.',
      v_payment.payment_number,
      v_document_number;
  end if;


  /* =======================================================
   * Accounting Amount
   * ======================================================= */

  v_amount :=
    round(
      coalesce(
        v_allocation.amount,
        0
      ),
      2
    );


  if
    v_amount <= 0
  then
    raise exception
      'Supplier Advance application % has zero or negative value.',
      v_allocation.id;
  end if;


  v_base_amount :=
    round(
      v_amount
      *
      v_payment.exchange_rate,
      2
    );


  /* =======================================================
   * Resolve GL Accounts
   * ======================================================= */

  v_accounts_payable_account_id :=
    public.get_mapped_gl_account(
      'accounts_payable'
    );


  v_supplier_advance_account_id :=
    public.get_mapped_gl_account(
      'supplier_advances'
    );


  /* =======================================================
   * Journal Lines
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
          'Supplier Advance applied to '
          ||
          v_document_number,

        'supplierId',
          v_payment.supplier_id,

        'sourceLineType',
          'supplier_payment_allocation',

        'sourceLineId',
          v_allocation.id
      ),


      jsonb_build_object(
        'glAccountId',
          v_supplier_advance_account_id,

        'debit',
          0,

        'credit',
          v_amount,

        'baseDebit',
          0,

        'baseCredit',
          v_base_amount,

        'description',
          'Supplier Advance reclassification - '
          ||
          v_payment.payment_number,

        'supplierId',
          v_payment.supplier_id,

        'sourceLineType',
          'supplier_payment_allocation',

        'sourceLineId',
          v_allocation.id
      )
    );


  /* =======================================================
   * Post Through Controlled GL Engine
   * ======================================================= */

  v_journal_id :=
    public.post_erp_gl_journal(
      'supplier_advance_application',

      v_allocation.id,

      concat(
        v_payment.payment_number,
        ' / ',
        v_document_number
      ),

      v_allocation.created_at::date,

      v_allocation.created_at::date,

      concat(
        'Supplier Advance application - ',
        v_payment.payment_number,
        ' -> ',
        v_document_number
      ),

      v_payment.currency_code,

      v_payment.exchange_rate,

      v_lines
    );


  return
    v_journal_id;

end;
$$;


/* =========================================================
 * 2. Atomic Quick Purchase Supplier Advance Application
 *
 * Replaces the existing function while preserving its public
 * signature and FIFO behaviour.
 * ========================================================= */

create or replace function
  public.apply_supplier_advance_to_quick_purchase(
    p_quick_purchase_id uuid
  )
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare

  v_user_id uuid;

  v_supplier_id uuid;

  v_currency_code text;

  v_balance_due
    numeric(18, 2);

  v_purchase_status text;


  v_payment record;


  v_allocate_amount
    numeric(18, 2);

  v_total_applied
    numeric(18, 2) := 0;


  v_allocation_id uuid;

  v_journal_id uuid;

begin

  /* =======================================================
   * Security
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
      'You are not authorized to apply supplier advances.';
  end if;


  /* =======================================================
   * Lock Quick Purchase
   * ======================================================= */

  select
    supplier_id,
    currency_code,
    balance_due,
    status

  into
    v_supplier_id,
    v_currency_code,
    v_balance_due,
    v_purchase_status

  from
    public.quick_purchases

  where
    id =
      p_quick_purchase_id

  for update;


  if not found
  then
    raise exception
      'Quick Purchase was not found.';
  end if;


  if
    v_purchase_status <>
      'posted'
  then
    return 0;
  end if;


  if
    v_supplier_id is null
  then
    return 0;
  end if;


  if
    v_balance_due <= 0
  then
    return 0;
  end if;


  /* =======================================================
   * Apply Available Supplier Advances — FIFO
   * ======================================================= */

  for
    v_payment

  in

    select
      payment.id,
      payment.unallocated_amount

    from
      public.supplier_payments
        payment

    where
      payment.supplier_id =
        v_supplier_id

      and
      payment.status =
        'posted'

      and
      upper(
        payment.currency_code
      ) =
      upper(
        v_currency_code
      )

      and
      payment.unallocated_amount >
        0

      and not exists (

        select
          1

        from
          public.supplier_payment_allocations
            allocation

        where
          allocation.supplier_payment_id =
            payment.id

          and
          allocation.quick_purchase_id =
            p_quick_purchase_id
      )

    order by
      payment.payment_date asc,
      payment.created_at asc,
      payment.id asc

    for update

  loop

    /* =====================================================
     * Refresh Quick Purchase Balance
     * ===================================================== */

    select
      balance_due

    into
      v_balance_due

    from
      public.quick_purchases

    where
      id =
        p_quick_purchase_id

    for update;


    if
      v_balance_due <= 0
    then
      exit;
    end if;


    v_allocate_amount :=
      least(
        round(
          v_payment.unallocated_amount,
          2
        ),
        round(
          v_balance_due,
          2
        )
      );


    if
      v_allocate_amount <= 0
    then
      continue;
    end if;


    /* =====================================================
     * Create Advance Application Allocation
     * ===================================================== */

    insert into
      public.supplier_payment_allocations
    (
      supplier_payment_id,
      quick_purchase_id,
      goods_receipt_id,
      amount,
      allocation_source
    )

    values
    (
      v_payment.id,
      p_quick_purchase_id,
      null,
      v_allocate_amount,
      'supplier_advance_application'
    )

    returning
      id

    into
      v_allocation_id;


    /* =====================================================
     * Synchronize Supplier Payment
     * ===================================================== */

    perform
      public.sync_supplier_payment_totals(
        v_payment.id
      );


    /* =====================================================
     * Synchronize Quick Purchase
     * ===================================================== */

    perform
      public.sync_quick_purchase_paid_amount(
        p_quick_purchase_id
      );


    /* =====================================================
     * Atomic GL Reclassification
     * ===================================================== */

    v_journal_id :=
      public.post_supplier_advance_application_gl(
        v_allocation_id
      );


    if
      v_journal_id is null
    then
      raise exception
        'Supplier Advance application General Ledger posting did not return a journal.';
    end if;


    v_total_applied :=
      v_total_applied
      +
      v_allocate_amount;

  end loop;


  /* =======================================================
   * Final Synchronization
   * ======================================================= */

  perform
    public.sync_quick_purchase_paid_amount(
      p_quick_purchase_id
    );


  return
    round(
      v_total_applied,
      2
    );

end;
$$;


/* =========================================================
 * 3. Goods Receipt Supplier Advance Application
 * ========================================================= */

create or replace function
  public.apply_supplier_advance_to_goods_receipt(
    p_goods_receipt_id uuid
  )
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare

  v_user_id uuid;

  v_supplier_id uuid;

  v_currency_code text;

  v_balance_due
    numeric(18, 2);

  v_receipt_status text;


  v_payment record;


  v_allocate_amount
    numeric(18, 2);

  v_total_applied
    numeric(18, 2) := 0;


  v_allocation_id uuid;

  v_journal_id uuid;

begin

  /* =======================================================
   * Security
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
      'You are not authorized to apply supplier advances.';
  end if;


  /* =======================================================
   * Lock Goods Receipt
   * ======================================================= */

  select
    receipt.supplier_id,
    purchase_order.currency_code,
    receipt.balance_due,
    receipt.status

  into
    v_supplier_id,
    v_currency_code,
    v_balance_due,
    v_receipt_status

  from
    public.goods_receipts
      receipt

  join
    public.purchase_orders
      purchase_order

  on
    purchase_order.id =
      receipt.purchase_order_id

  where
    receipt.id =
      p_goods_receipt_id

  for update
    of receipt;


  if not found
  then
    raise exception
      'Goods Receipt was not found.';
  end if;


  if
    v_receipt_status <>
      'completed'
  then
    return 0;
  end if;


  if
    v_supplier_id is null
  then
    return 0;
  end if;


  if
    v_balance_due <= 0
  then
    return 0;
  end if;


  /* =======================================================
   * Apply Available Supplier Advances — FIFO
   * ======================================================= */

  for
    v_payment

  in

    select
      payment.id,
      payment.unallocated_amount

    from
      public.supplier_payments
        payment

    where
      payment.supplier_id =
        v_supplier_id

      and
      payment.status =
        'posted'

      and
      upper(
        payment.currency_code
      ) =
      upper(
        v_currency_code
      )

      and
      payment.unallocated_amount >
        0

      and not exists (

        select
          1

        from
          public.supplier_payment_allocations
            allocation

        where
          allocation.supplier_payment_id =
            payment.id

          and
          allocation.goods_receipt_id =
            p_goods_receipt_id
      )

    order by
      payment.payment_date asc,
      payment.created_at asc,
      payment.id asc

    for update

  loop

    /* =====================================================
     * Refresh GRN Balance
     * ===================================================== */

    select
      balance_due

    into
      v_balance_due

    from
      public.goods_receipts

    where
      id =
        p_goods_receipt_id

    for update;


    if
      v_balance_due <= 0
    then
      exit;
    end if;


    v_allocate_amount :=
      least(
        round(
          v_payment.unallocated_amount,
          2
        ),
        round(
          v_balance_due,
          2
        )
      );


    if
      v_allocate_amount <= 0
    then
      continue;
    end if;


    /* =====================================================
     * Create Advance Application Allocation
     * ===================================================== */

    insert into
      public.supplier_payment_allocations
    (
      supplier_payment_id,
      quick_purchase_id,
      goods_receipt_id,
      amount,
      allocation_source
    )

    values
    (
      v_payment.id,
      null,
      p_goods_receipt_id,
      v_allocate_amount,
      'supplier_advance_application'
    )

    returning
      id

    into
      v_allocation_id;


    /* =====================================================
     * Synchronize Supplier Payment Advance
     * ===================================================== */

    perform
      public.sync_supplier_payment_totals(
        v_payment.id
      );


    /* =====================================================
     * Synchronize Goods Receipt AP
     * ===================================================== */

    perform
      public.sync_goods_receipt_paid_amount(
        p_goods_receipt_id
      );


    /* =====================================================
     * Atomic GL Reclassification
     * ===================================================== */

    v_journal_id :=
      public.post_supplier_advance_application_gl(
        v_allocation_id
      );


    if
      v_journal_id is null
    then
      raise exception
        'Goods Receipt Supplier Advance General Ledger posting did not return a journal.';
    end if;


    v_total_applied :=
      v_total_applied
      +
      v_allocate_amount;

  end loop;


  /* =======================================================
   * Final Synchronization
   * ======================================================= */

  perform
    public.sync_goods_receipt_paid_amount(
      p_goods_receipt_id
    );


  return
    round(
      v_total_applied,
      2
    );

end;
$$;


/* =========================================================
 * 4. Permissions
 * ========================================================= */

revoke all
on function
  public.apply_supplier_advance_to_quick_purchase(
    uuid
  )
from public;


grant execute
on function
  public.apply_supplier_advance_to_quick_purchase(
    uuid
  )
to authenticated;


revoke all
on function
  public.apply_supplier_advance_to_goods_receipt(
    uuid
  )
from public;


grant execute
on function
  public.apply_supplier_advance_to_goods_receipt(
    uuid
  )
to authenticated;


revoke all
on function
  public.post_supplier_advance_application_gl(
    uuid
  )
from public;


grant execute
on function
  public.post_supplier_advance_application_gl(
    uuid
  )
to authenticated;


/* =========================================================
 * 5. Documentation
 * ========================================================= */

comment on function
  public.apply_supplier_advance_to_quick_purchase(
    uuid
  )
is
  'Atomically applies available posted Supplier Advances to a posted Quick Purchase using FIFO, synchronizes the payable subledger and posts each Supplier Advance reclassification to the General Ledger.';


comment on function
  public.apply_supplier_advance_to_goods_receipt(
    uuid
  )
is
  'Atomically applies available posted Supplier Advances to a completed Goods Receipt using FIFO, synchronizes the Goods Receipt payable subledger and posts each Supplier Advance reclassification to the General Ledger.';


comment on function
  public.post_supplier_advance_application_gl(
    uuid
  )
is
  'Posts one Supplier Advance application to the General Ledger for either a Quick Purchase or Goods Receipt by debiting Accounts Payable and crediting Supplier Advances. No treasury movement is recorded.';


/* =========================================================
 * End Migration 146
 * ========================================================= */
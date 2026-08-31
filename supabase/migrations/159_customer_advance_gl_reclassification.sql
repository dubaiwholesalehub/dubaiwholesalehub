/*
 * =========================================================
 * 159 - Customer Advance GL Reclassification
 *
 * PURPOSE
 * -------
 * Make Customer Advance applications accounting-correct and
 * atomic.
 *
 * Existing workflow:
 *
 *   Customer Receipt initially received as advance:
 *
 *     Dr Cash / Bank
 *        Cr Customer Advances
 *
 * Later, when that advance is applied to a Sales Order:
 *
 *     Dr Customer Advances
 *        Cr Accounts Receivable
 *
 * The operational Customer Advance workflow already:
 *
 * - selects posted Customer Receipts with available advance
 * - applies them FIFO
 * - inserts customer_receipt_allocations
 * - synchronizes receipt allocated/unallocated totals
 * - synchronizes Sales Order paid/balance amounts
 *
 * This migration adds the missing GL reclassification.
 *
 * Each later allocation receives its own GL journal using:
 *
 *   source_type = customer_advance_application
 *   source_id   = customer_receipt_allocations.id
 *
 * No Cash / Bank movement occurs during reclassification.
 *
 * IMPORTANT
 * ---------
 * The allocation and GL journal are posted inside the same
 * PostgreSQL transaction. If GL posting fails, the allocation
 * and all operational synchronization roll back.
 * =========================================================
 */


/* =========================================================
 * 1. Customer Advance Application -> GL Adapter
 * ========================================================= */

create or replace function
  public.post_customer_advance_application_gl(
    p_customer_receipt_allocation_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allocation
    public.customer_receipt_allocations%rowtype;

  v_receipt
    public.customer_receipts%rowtype;

  v_order
    public.sales_orders%rowtype;

  v_customer_advance_account_id uuid;

  v_accounts_receivable_account_id uuid;

  v_amount
    numeric(18, 2);

  v_base_amount
    numeric(18, 2);

  v_lines jsonb;

  v_journal_id uuid;

begin

  /* =======================================================
   * Authentication
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
    p_customer_receipt_allocation_id is null
  then
    raise exception
      'Customer Receipt Allocation ID is required.';
  end if;


  /* =======================================================
   * Lock Allocation
   * ======================================================= */

  select
    *

  into
    v_allocation

  from
    public.customer_receipt_allocations

  where
    id =
      p_customer_receipt_allocation_id

  for update;


  if not found
  then
    raise exception
      'Customer Receipt Allocation was not found.';
  end if;


  /* =======================================================
   * Load Customer Receipt
   * ======================================================= */

  select
    *

  into
    v_receipt

  from
    public.customer_receipts

  where
    id =
      v_allocation.receipt_id

  for update;


  if not found
  then
    raise exception
      'Customer Receipt for allocation % was not found.',
      v_allocation.id;
  end if;


  if
    v_receipt.status <>
      'posted'
  then
    raise exception
      'Customer Receipt % must remain posted before Customer Advance application GL posting.',
      v_receipt.receipt_number;
  end if;


  /* =======================================================
   * Load Sales Order
   * ======================================================= */

  select
    *

  into
    v_order

  from
    public.sales_orders

  where
    id =
      v_allocation.sales_order_id

  for update;


  if not found
  then
    raise exception
      'Sales Order for Customer Receipt Allocation % was not found.',
      v_allocation.id;
  end if;


  if
    v_order.status in (
      'draft',
      'cancelled'
    )
  then
    raise exception
      'Sales Order % is not eligible for Customer Advance application.',
      v_order.order_number;
  end if;


  /* =======================================================
   * Customer Integrity
   * ======================================================= */

  if
    v_order.customer_id is null
    or
    v_order.customer_id <>
      v_receipt.customer_id
  then
    raise exception
      'Customer Receipt % and Sales Order % do not belong to the same customer.',
      v_receipt.receipt_number,
      v_order.order_number;
  end if;


  /* =======================================================
   * Currency Integrity
   * ======================================================= */

  if
    upper(
      v_order.currency_code
    ) <>
    upper(
      v_receipt.currency_code
    )
  then
    raise exception
      'Customer Receipt % and Sales Order % currencies do not match.',
      v_receipt.receipt_number,
      v_order.order_number;
  end if;


  if
    v_receipt.exchange_rate is null
    or
    v_receipt.exchange_rate <= 0
  then
    raise exception
      'Customer Receipt % has an invalid exchange rate.',
      v_receipt.receipt_number;
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
      'Customer Advance application % has zero or negative value.',
      v_allocation.id;
  end if;


  v_base_amount :=
    round(
      v_amount
      *
      v_receipt.exchange_rate,
      2
    );


  /* =======================================================
   * Resolve GL Accounts
   * ======================================================= */

  v_customer_advance_account_id :=
    public.get_mapped_gl_account(
      'customer_advances'
    );


  v_accounts_receivable_account_id :=
    public.get_mapped_gl_account(
      'accounts_receivable'
    );


  /* =======================================================
   * Journal Lines
   *
   * Customer Advance is a liability.
   *
   * Applying it against an invoice/order:
   *
   *   Dr Customer Advances
   *      Cr Accounts Receivable
   * ======================================================= */

  v_lines :=
    jsonb_build_array(

      jsonb_build_object(
        'glAccountId',
          v_customer_advance_account_id,

        'debit',
          v_amount,

        'credit',
          0,

        'baseDebit',
          v_base_amount,

        'baseCredit',
          0,

        'description',
          'Customer Advance applied from '
          ||
          v_receipt.receipt_number,

        'customerId',
          v_receipt.customer_id,

        'sourceLineType',
          'customer_receipt_allocation',

        'sourceLineId',
          v_allocation.id
      ),


      jsonb_build_object(
        'glAccountId',
          v_accounts_receivable_account_id,

        'debit',
          0,

        'credit',
          v_amount,

        'baseDebit',
          0,

        'baseCredit',
          v_base_amount,

        'description',
          'Customer Advance applied to '
          ||
          v_order.order_number,

        'customerId',
          v_receipt.customer_id,

        'sourceLineType',
          'customer_receipt_allocation',

        'sourceLineId',
          v_allocation.id
      )
    );


  /* =======================================================
   * Post Through Controlled GL Engine
   * ======================================================= */

  v_journal_id :=
    public.post_erp_gl_journal(
      'customer_advance_application',

      v_allocation.id,

      concat(
        v_receipt.receipt_number,
        ' / ',
        v_order.order_number
      ),

      v_allocation.created_at::date,

      v_allocation.created_at::date,

      concat(
        'Customer Advance application - ',
        v_receipt.receipt_number,
        ' -> ',
        v_order.order_number
      ),

      v_receipt.currency_code,

      v_receipt.exchange_rate,

      v_lines
    );


  if
    v_journal_id is null
  then
    raise exception
      'Customer Advance application GL posting did not return a journal ID.';
  end if;


  return
    v_journal_id;

end;
$$;


/* =========================================================
 * 2. Redefine Customer Advance Application
 *
 * Existing operational behavior is preserved.
 *
 * New behavior:
 *
 * Every newly-created Customer Advance allocation immediately
 * posts its GL reclassification before processing continues.
 *
 * PostgreSQL guarantees atomicity:
 *
 * GL failure
 *   -> allocation rollback
 *   -> receipt totals rollback
 *   -> Sales Order paid amount rollback
 * ========================================================= */

create or replace function
  public.apply_customer_advance_to_sales_order(
    p_sales_order_id uuid
  )
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_customer_id uuid;

  v_currency_code text;

  v_balance_due
    numeric(18, 2);

  v_order_status text;

  v_receipt record;

  v_allocate_amount
    numeric(18, 2);

  v_total_applied
    numeric(18, 2) := 0;

  v_allocation_id uuid;

  v_gl_journal_id uuid;

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
      'You are not authorized to apply customer advances.';
  end if;


  if
    p_sales_order_id is null
  then
    raise exception
      'Sales Order ID is required.';
  end if;


  /* =======================================================
   * Lock Sales Order
   * ======================================================= */

  select
    customer_id,
    currency_code,
    balance_due,
    status

  into
    v_customer_id,
    v_currency_code,
    v_balance_due,
    v_order_status

  from
    public.sales_orders

  where
    id =
      p_sales_order_id

  for update;


  if not found
  then
    raise exception
      'Sales Order was not found.';
  end if;


  /* =======================================================
   * Sales Order Eligibility
   * ======================================================= */

  if
    v_order_status in (
      'draft',
      'cancelled'
    )
  then
    return 0;
  end if;


  if
    v_balance_due <= 0
  then
    return 0;
  end if;


  /* =======================================================
   * Apply Customer Advances - FIFO
   * ======================================================= */

  for
    v_receipt

  in

    select
      receipt.id,
      receipt.unallocated_amount

    from
      public.customer_receipts
        receipt

    where
      receipt.customer_id =
        v_customer_id

      and receipt.status =
        'posted'

      and upper(
        receipt.currency_code
      ) =
        upper(
          v_currency_code
        )

      and receipt.unallocated_amount >
        0

      and not exists (
        select
          1

        from
          public.customer_receipt_allocations
            allocation

        where
          allocation.receipt_id =
            receipt.id

          and allocation.sales_order_id =
            p_sales_order_id
      )

    order by
      receipt.receipt_date asc,
      receipt.created_at asc,
      receipt.id asc

    for update

  loop

    /*
     * Refresh Sales Order balance because an earlier advance
     * in this same loop may already have reduced it.
     */

    select
      balance_due

    into
      v_balance_due

    from
      public.sales_orders

    where
      id =
        p_sales_order_id

    for update;


    if
      v_balance_due <= 0
    then
      exit;
    end if;


    v_allocate_amount :=
      least(
        round(
          v_receipt.unallocated_amount,
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
     * Allocation Audit Record
     * ===================================================== */

    insert into
      public.customer_receipt_allocations
    (
      receipt_id,
      sales_order_id,
      amount
    )

    values
    (
      v_receipt.id,
      p_sales_order_id,
      v_allocate_amount
    )

    returning
      id

    into
      v_allocation_id;


    /* =====================================================
     * Synchronize Receipt Allocation Totals
     * ===================================================== */

    perform
      public.sync_customer_receipt_totals(
        v_receipt.id
      );


    /* =====================================================
     * Synchronize Sales Order
     * ===================================================== */

    perform
      public.sync_sales_order_paid_amount(
        p_sales_order_id
      );


    /* =====================================================
     * Post GL Reclassification
     *
     * Dr Customer Advances
     *    Cr Accounts Receivable
     *
     * This occurs in the SAME transaction as the allocation.
     * ===================================================== */

    v_gl_journal_id :=
      public.post_customer_advance_application_gl(
        v_allocation_id
      );


    if
      v_gl_journal_id is null
    then
      raise exception
        'Customer Advance allocation % did not produce a GL journal.',
        v_allocation_id;
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
    public.sync_sales_order_paid_amount(
      p_sales_order_id
    );


  return
    round(
      v_total_applied,
      2
    );

end;
$$;


/* =========================================================
 * 3. Permissions
 * ========================================================= */

revoke all
on function
  public.post_customer_advance_application_gl(
    uuid
  )
from public, anon;


grant execute
on function
  public.post_customer_advance_application_gl(
    uuid
  )
to authenticated;


revoke all
on function
  public.apply_customer_advance_to_sales_order(
    uuid
  )
from public, anon;


grant execute
on function
  public.apply_customer_advance_to_sales_order(
    uuid
  )
to authenticated;


/* =========================================================
 * 4. Documentation
 * ========================================================= */

comment on function
  public.post_customer_advance_application_gl(
    uuid
  )
is
  'Posts the GL reclassification for a later Customer Advance application. Debits Customer Advances and credits Accounts Receivable using the Customer Receipt Allocation as the immutable GL source. No Cash or Bank movement is created.';


comment on function
  public.apply_customer_advance_to_sales_order(
    uuid
  )
is
  'Atomically applies posted Customer Advances to an eligible Sales Order using FIFO, synchronizes Customer Receipt and Sales Order balances, and posts Dr Customer Advances / Cr Accounts Receivable GL reclassification for every new allocation.';

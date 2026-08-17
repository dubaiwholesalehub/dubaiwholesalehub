/*
 * =========================================================
 * 071 — Auto Apply Customer Advances
 *
 * Purpose:
 *
 * Automatically consume available unallocated Customer
 * Receipts against an existing Sales Order.
 *
 * Rules:
 *
 * - Sales Order must exist.
 * - Sales Order must not be draft/cancelled.
 * - Customer Receipt must be posted.
 * - Customer must match.
 * - Currency must match.
 * - Receipt must have unallocated_amount > 0.
 * - Oldest customer advance is consumed first (FIFO).
 * - customer_receipt_allocations remains the audit trail.
 *
 * Safe to call repeatedly.
 * =========================================================
 */


/* =========================================================
 * Apply Customer Advance to One Sales Order
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


  if not public.is_admin() then
    raise exception
      'You are not authorized to apply customer advances.';
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


  if not found then
    raise exception
      'Sales Order was not found.';
  end if;


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
   * Apply Customer Advances — FIFO
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
        select 1

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
     * Refresh the order balance because a previous advance
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
    );


    /* =====================================================
     * Synchronize Receipt
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


    v_total_applied :=
      v_total_applied +
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
 * Permissions
 * ========================================================= */

revoke all
on function
  public.apply_customer_advance_to_sales_order(
    uuid
  )
from public;


grant execute
on function
  public.apply_customer_advance_to_sales_order(
    uuid
  )
to authenticated;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on function
  public.apply_customer_advance_to_sales_order(
    uuid
  )
is
  'Automatically allocates posted unallocated Customer Receipts against a Sales Order for the same customer and currency, oldest advance first.';
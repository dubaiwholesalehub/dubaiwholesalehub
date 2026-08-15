/*
 * =========================================================
 * 070 — Auto Apply Supplier Advances
 *
 * Purpose:
 *
 * Automatically consume available unallocated supplier
 * payments against a newly-created Quick Purchase.
 *
 * Rules:
 *
 * - Quick Purchase must be posted.
 * - Quick Purchase must have a registered supplier.
 * - Supplier Payment must be posted.
 * - Supplier must match.
 * - Currency must match.
 * - Payment must have unallocated_amount > 0.
 * - Oldest supplier advance is consumed first (FIFO).
 * - Existing supplier_payment_allocations remain the
 *   financial audit trail.
 *
 * The function is safe to call more than once.
 * =========================================================
 */


/* =========================================================
 * Apply Supplier Advance to One Quick Purchase
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

  v_grand_total
    numeric(18, 2);

  v_paid_amount
    numeric(18, 2);

  v_balance_due
    numeric(18, 2);

  v_purchase_status text;

  v_payment record;

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
      'You are not authorized to apply supplier advances.';
  end if;


  /* =======================================================
   * Lock Quick Purchase
   * ======================================================= */

  select
    supplier_id,
    currency_code,
    grand_total,
    paid_amount,
    balance_due,
    status

  into
    v_supplier_id,
    v_currency_code,
    v_grand_total,
    v_paid_amount,
    v_balance_due,
    v_purchase_status

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


  if
    v_purchase_status <>
      'posted'
  then
    return 0;
  end if;


  /*
   * Anonymous/local-shop purchases cannot participate in
   * the registered supplier advance ledger.
   */

  if
    v_supplier_id is null
  then
    return 0;
  end if;


  /*
   * Already fully paid.
   */

  if
    v_balance_due <= 0
  then
    return 0;
  end if;


  /* =======================================================
   * Apply Advances — FIFO
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

      and payment.status =
        'posted'

      and upper(
        payment.currency_code
      ) =
        upper(
          v_currency_code
        )

      and payment.unallocated_amount >
        0

      /*
       * Prevent duplicate application if this function is
       * called more than once for the same purchase.
       */
      and not exists (
        select 1

        from
          public.supplier_payment_allocations
            allocation

        where
          allocation.supplier_payment_id =
            payment.id

          and allocation.quick_purchase_id =
            p_quick_purchase_id
      )

    order by
      payment.payment_date asc,
      payment.created_at asc,
      payment.id asc

    for update

  loop

    /*
     * Refresh Quick Purchase balance because each previous
     * allocation may have changed it.
     */

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
     * Allocation Audit Record
     * ===================================================== */

    insert into
      public.supplier_payment_allocations
    (
      supplier_payment_id,

      quick_purchase_id,

      amount
    )

    values
    (
      v_payment.id,

      p_quick_purchase_id,

      v_allocate_amount
    );


    /* =====================================================
     * Update Supplier Payment
     * ===================================================== */

    perform
      public.sync_supplier_payment_totals(
        v_payment.id
      );


    /* =====================================================
     * Update Quick Purchase
     * ===================================================== */

    perform
      public.sync_quick_purchase_paid_amount(
        p_quick_purchase_id
      );


    v_total_applied :=
      v_total_applied +
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
 * Permissions
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


/* =========================================================
 * Documentation
 * ========================================================= */

comment on function
  public.apply_supplier_advance_to_quick_purchase(
    uuid
  )
is
  'Automatically allocates posted unallocated supplier payments against a posted Quick Purchase for the same supplier and currency, oldest advance first.';
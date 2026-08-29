/* =========================================================
 * Migration 150
 * Goods Receipt Supplier Return AP Synchronization
 *
 * Purpose:
 *   Keep Goods Receipt operational AP synchronized with:
 *
 *   1. Original GRN gross payable
 *   2. Posted Supplier Payment allocations
 *   3. Posted Supplier Return AP reductions
 *
 * Important:
 *   paid_amount remains actual posted Supplier Payments only.
 *
 *   Supplier Returns reduce balance_due through their posted
 *   ap_reduction_amount.
 *
 * Formula:
 *
 *   balance_due
 *     =
 *   gross payable
 *   - posted supplier payments
 *   - posted supplier return AP reductions
 *
 * Supplier Return amounts that exceed open AP are recorded as
 * Supplier Advances / Supplier Credit and therefore are NOT
 * subtracted from GRN balance_due again.
 * ========================================================= */


/* =========================================================
 * 1. Redefine Goods Receipt AP Synchronization
 * ========================================================= */

create or replace function public.sync_goods_receipt_paid_amount(
  p_goods_receipt_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;

  v_payable_amount numeric(18, 2);

  v_allocated_amount numeric(18, 2);

  v_return_ap_reduction_amount numeric(18, 2);

  v_paid_amount numeric(18, 2);

  v_balance_due numeric(18, 2);

  v_effective_payable_after_returns numeric(18, 2);

  v_payment_status text;
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
    id = p_goods_receipt_id
  for update;

  if not found then
    raise exception
      'Goods Receipt was not found.';
  end if;


  /* =======================================================
   * Non-completed Goods Receipts carry no AP
   * ======================================================= */

  if v_status <> 'completed' then

    update
      public.goods_receipts
    set
      paid_amount = 0,
      balance_due = 0,
      payment_status = 'unpaid'
    where
      id = p_goods_receipt_id;

    return;

  end if;


  /* =======================================================
   * Original Gross Payable
   *
   * This function intentionally remains unchanged:
   * public.get_goods_receipt_payable_amount(...)
   *
   * It represents the original liability recognized by the
   * completed Goods Receipt.
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
   * paid_amount must continue to mean actual supplier
   * payments allocated to this Goods Receipt.
   * ======================================================= */

  select
    coalesce(
      sum(allocation.amount),
      0
    )
  into
    v_allocated_amount
  from
    public.supplier_payment_allocations allocation
  join
    public.supplier_payments payment
      on payment.id =
        allocation.supplier_payment_id
  where
    allocation.goods_receipt_id =
      p_goods_receipt_id
    and payment.status = 'posted';


  v_paid_amount :=
    round(
      coalesce(
        v_allocated_amount,
        0
      ),
      2
    );


  /* =======================================================
   * Posted Supplier Return AP Reductions
   *
   * Only the AP portion of a Supplier Return reduces the
   * Goods Receipt outstanding liability.
   *
   * Supplier Credit / Supplier Advance portion is excluded
   * because it represents value beyond the open AP balance.
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
    public.supplier_returns supplier_return
  where
    supplier_return.goods_receipt_id =
      p_goods_receipt_id
    and supplier_return.status = 'posted';


  v_return_ap_reduction_amount :=
    round(
      coalesce(
        v_return_ap_reduction_amount,
        0
      ),
      2
    );


  /* =======================================================
   * Accounting Integrity Controls
   * ======================================================= */

  if v_paid_amount >
    v_payable_amount
  then
    raise exception
      'Goods Receipt payment exceeds the Goods Receipt payable amount.';
  end if;


  if v_return_ap_reduction_amount >
    v_payable_amount
  then
    raise exception
      'Goods Receipt Supplier Return AP reduction exceeds the Goods Receipt payable amount.';
  end if;


  if
    v_paid_amount
    +
    v_return_ap_reduction_amount
    >
    v_payable_amount
  then
    raise exception
      'Goods Receipt payments plus Supplier Return AP reductions exceed the Goods Receipt payable amount.';
  end if;


  /* =======================================================
   * Remaining Effective Payable After Supplier Returns
   * ======================================================= */

  v_effective_payable_after_returns :=
    greatest(
      round(
        v_payable_amount
        -
        v_return_ap_reduction_amount,
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
        v_effective_payable_after_returns
        -
        v_paid_amount,
        2
      ),
      0
    );


  /* =======================================================
   * Payment Status
   *
   * paid_amount remains actual supplier payments.
   *
   * A fully returned / settled GRN must still show "paid"
   * when balance_due reaches zero, even if the settlement
   * was partly or fully achieved through Supplier Returns.
   * ======================================================= */

  if v_balance_due <= 0 then

    v_payment_status :=
      'paid';

  elsif v_paid_amount <= 0 then

    v_payment_status :=
      'unpaid';

  else

    v_payment_status :=
      'partially_paid';

  end if;


  /* =======================================================
   * Persist AP State
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
 * 2. Resynchronize Existing Completed Goods Receipts
 *
 * This safely recalculates existing GRN AP using the new
 * Supplier-Return-aware formula.
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
      status = 'completed'

  loop

    perform
      public.sync_goods_receipt_paid_amount(
        v_goods_receipt_id
      );

  end loop;

end;
$$;


/* =========================================================
 * 3. Permissions
 *
 * Preserve this function as an internal accounting operation.
 * Existing managed RPCs may execute it through SECURITY
 * DEFINER functions.
 * ========================================================= */

revoke all
on function
  public.sync_goods_receipt_paid_amount(
    uuid
  )
from public;


/* =========================================================
 * 4. Documentation
 * ========================================================= */

comment on function
  public.sync_goods_receipt_paid_amount(
    uuid
  )
is
  'Synchronizes Goods Receipt paid amount, outstanding balance and payment status from posted Supplier Payment allocations and posted Goods Receipt Supplier Return AP reductions. paid_amount remains actual supplier payments only; Supplier Return excess beyond open AP remains Supplier Credit / Supplier Advance.';
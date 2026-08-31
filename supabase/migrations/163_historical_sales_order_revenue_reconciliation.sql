/*
 * =========================================================
 * 163 - Historical Sales Order Revenue GL Reconciliation
 *
 * PURPOSE
 * -------
 * Reconcile three known historical Sales Orders that were
 * confirmed before / outside the fully atomic Sales Order
 * revenue GL workflow.
 *
 * Targets:
 *
 *   SO-2026-000044
 *   SO-2026-000046
 *   SO-2026-000047
 *
 * No journal lines are constructed manually.
 *
 * Existing canonical accounting adapter is used:
 *
 *   post_sales_order_revenue_gl(...)
 *
 * Expected combined accounting:
 *
 *   Dr Accounts Receivable       64.05
 *      Cr Sales Revenue          61.00
 *      Cr VAT Payable             3.05
 *
 * The underlying GL engine provides duplicate-source
 * protection / idempotency.
 * =========================================================
 */


create or replace function
  public.reconcile_historical_sales_order_revenue_163()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare

  /*
   * -------------------------------------------------------
   * Known historical Sales Orders
   * -------------------------------------------------------
   */

  v_so_44_id constant uuid :=
    'ddc111aa-85b4-4ce2-b5fd-22eaa0949580'::uuid;

  v_so_46_id constant uuid :=
    '972e5892-8a81-43c1-a8d7-68d565688e86'::uuid;

  v_so_47_id constant uuid :=
    '09db2d33-1c66-4544-9732-4d187ee552cf'::uuid;


  v_order public.sales_orders%rowtype;

  v_journal_44_id uuid;
  v_journal_46_id uuid;
  v_journal_47_id uuid;

begin

  /* =======================================================
   * Security
   * ======================================================= */

  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;


  if not public.is_admin() then
    raise exception
      'Administrator access is required.';
  end if;


  /*
   * Prevent concurrent execution of this reconciliation.
   */

  perform pg_advisory_xact_lock(
    hashtext(
      'reconcile_historical_sales_order_revenue_163'
    )
  );


  /* =======================================================
   * SO-2026-000044
   * ======================================================= */

  select
    *

  into
    v_order

  from
    public.sales_orders

  where
    id = v_so_44_id

  for update;


  if not found then
    raise exception
      'Historical Sales Order SO-2026-000044 was not found.';
  end if;


  if
    v_order.order_number <> 'SO-2026-000044'
    or
    v_order.status <> 'confirmed'
    or
    round(v_order.subtotal, 2) <> 15.00
    or
    round(coalesce(v_order.discount_amount, 0), 2) <> 0.00
    or
    round(v_order.tax_amount, 2) <> 0.75
    or
    round(v_order.grand_total, 2) <> 15.75
    or
    v_order.currency_code <> 'AED'
    or
    round(v_order.exchange_rate, 8) <> 1.00000000
    or
    v_order.confirmed_at <>
      '2026-08-25 06:37:06.221063+00'::timestamptz
  then
    raise exception
      'Historical Sales Order SO-2026-000044 validation failed.';
  end if;


  /* =======================================================
   * SO-2026-000046
   * ======================================================= */

  select
    *

  into
    v_order

  from
    public.sales_orders

  where
    id = v_so_46_id

  for update;


  if not found then
    raise exception
      'Historical Sales Order SO-2026-000046 was not found.';
  end if;


  if
    v_order.order_number <> 'SO-2026-000046'
    or
    v_order.status <> 'confirmed'
    or
    round(v_order.subtotal, 2) <> 31.00
    or
    round(coalesce(v_order.discount_amount, 0), 2) <> 0.00
    or
    round(v_order.tax_amount, 2) <> 1.55
    or
    round(v_order.grand_total, 2) <> 32.55
    or
    v_order.currency_code <> 'AED'
    or
    round(v_order.exchange_rate, 8) <> 1.00000000
    or
    v_order.confirmed_at <>
      '2026-08-25 07:40:29.568001+00'::timestamptz
  then
    raise exception
      'Historical Sales Order SO-2026-000046 validation failed.';
  end if;


  /* =======================================================
   * SO-2026-000047
   * ======================================================= */

  select
    *

  into
    v_order

  from
    public.sales_orders

  where
    id = v_so_47_id

  for update;


  if not found then
    raise exception
      'Historical Sales Order SO-2026-000047 was not found.';
  end if;


  if
    v_order.order_number <> 'SO-2026-000047'
    or
    v_order.status <> 'processing'
    or
    round(v_order.subtotal, 2) <> 15.00
    or
    round(coalesce(v_order.discount_amount, 0), 2) <> 0.00
    or
    round(v_order.tax_amount, 2) <> 0.75
    or
    round(v_order.grand_total, 2) <> 15.75
    or
    v_order.currency_code <> 'AED'
    or
    round(v_order.exchange_rate, 8) <> 1.00000000
    or
    v_order.confirmed_at <>
      '2026-08-25 07:56:02.63481+00'::timestamptz
  then
    raise exception
      'Historical Sales Order SO-2026-000047 validation failed.';
  end if;


  /* =======================================================
   * Post SO-2026-000044
   *
   * Expected:
   *
   *   Dr Accounts Receivable       15.75
   *      Cr Sales Revenue          15.00
   *      Cr VAT Payable             0.75
   * ======================================================= */

  v_journal_44_id :=
    public.post_sales_order_revenue_gl(
      v_so_44_id
    );


  if v_journal_44_id is null then
    raise exception
      'SO-2026-000044 revenue reconciliation did not return a journal ID.';
  end if;


  /* =======================================================
   * Post SO-2026-000046
   *
   * Expected:
   *
   *   Dr Accounts Receivable       32.55
   *      Cr Sales Revenue          31.00
   *      Cr VAT Payable             1.55
   * ======================================================= */

  v_journal_46_id :=
    public.post_sales_order_revenue_gl(
      v_so_46_id
    );


  if v_journal_46_id is null then
    raise exception
      'SO-2026-000046 revenue reconciliation did not return a journal ID.';
  end if;


  /* =======================================================
   * Post SO-2026-000047
   *
   * Expected:
   *
   *   Dr Accounts Receivable       15.75
   *      Cr Sales Revenue          15.00
   *      Cr VAT Payable             0.75
   * ======================================================= */

  v_journal_47_id :=
    public.post_sales_order_revenue_gl(
      v_so_47_id
    );


  if v_journal_47_id is null then
    raise exception
      'SO-2026-000047 revenue reconciliation did not return a journal ID.';
  end if;


  /* =======================================================
   * Result
   * ======================================================= */

  return
    jsonb_build_object(
      'status',
        'completed',

      'salesOrderCount',
        3,

      'totalReceivable',
        64.05,

      'totalRevenue',
        61.00,

      'totalVat',
        3.05,

      'salesOrders',
        jsonb_build_array(

          jsonb_build_object(
            'orderNumber',
              'SO-2026-000044',
            'salesOrderId',
              v_so_44_id,
            'journalId',
              v_journal_44_id,
            'receivable',
              15.75
          ),

          jsonb_build_object(
            'orderNumber',
              'SO-2026-000046',
            'salesOrderId',
              v_so_46_id,
            'journalId',
              v_journal_46_id,
            'receivable',
              32.55
          ),

          jsonb_build_object(
            'orderNumber',
              'SO-2026-000047',
            'salesOrderId',
              v_so_47_id,
            'journalId',
              v_journal_47_id,
            'receivable',
              15.75
          )
        )
    );

end;
$$;


/* =========================================================
 * Permissions
 * ========================================================= */

revoke all
on function
  public.reconcile_historical_sales_order_revenue_163()
from public;


revoke all
on function
  public.reconcile_historical_sales_order_revenue_163()
from anon;


revoke all
on function
  public.reconcile_historical_sales_order_revenue_163()
from authenticated;


grant execute
on function
  public.reconcile_historical_sales_order_revenue_163()
to authenticated;


comment on function
  public.reconcile_historical_sales_order_revenue_163()
is
'Admin-only targeted reconciliation for historical Sales Orders SO-2026-000044, SO-2026-000046 and SO-2026-000047 that are missing sales_order_revenue General Ledger journals. Uses the canonical post_sales_order_revenue_gl() adapter and its idempotent GL posting controls.';
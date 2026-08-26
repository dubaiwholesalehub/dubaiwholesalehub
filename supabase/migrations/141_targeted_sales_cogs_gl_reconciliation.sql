/*
 * =========================================================
 * 141 - Targeted Sales + COGS GL Reconciliation
 *
 * PURPOSE
 * -------
 * Reconcile two known historical transactions that were
 * completed before the live Sales / Delivery GL integration
 * introduced in migration 140.
 *
 * Targets:
 *
 *   SO-2026-000042
 *   INV-2026-000107
 *
 * No journal lines are constructed manually.
 *
 * Existing canonical accounting adapters are used:
 *
 *   post_sales_order_revenue_gl(...)
 *   post_inventory_cogs_gl(...)
 *
 * The underlying GL engine provides duplicate-source
 * protection / idempotency.
 * =========================================================
 */


create or replace function
  public.reconcile_targeted_sales_cogs_gl()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare

  v_sales_order_id constant uuid :=
    'b1139957-5e52-4b66-b53d-ed46b6039b9d'::uuid;

  v_inventory_transaction_id constant uuid :=
    '72bcfba1-4b1e-4ca4-a0c4-a228abc5cf1b'::uuid;


  v_sales_order_number text;

  v_inventory_transaction_number text;


  v_revenue_journal_id uuid;

  v_cogs_journal_id uuid;

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


  /* =======================================================
   * Validate Historical Sales Order
   * ======================================================= */

  select
    so.order_number

  into
    v_sales_order_number

  from
    public.sales_orders so

  where
    so.id =
      v_sales_order_id;


  if not found then
    raise exception
      'Historical Sales Order was not found.';
  end if;


  if v_sales_order_number <> 'SO-2026-000042' then
    raise exception
      'Historical Sales Order identity validation failed.';
  end if;


  /* =======================================================
   * Validate Historical Inventory Transaction
   * ======================================================= */

  select
    it.transaction_number

  into
    v_inventory_transaction_number

  from
    public.inventory_transactions it

  where
    it.id =
      v_inventory_transaction_id

    and it.status =
      'posted'

    and it.transaction_type =
      'sales_issue'

    and it.reference_type =
      'delivery_order';


  if not found then
    raise exception
      'Historical sales-issue Inventory Transaction was not found or is not eligible.';
  end if;


  if
    v_inventory_transaction_number
      <>
    'INV-2026-000107'
  then
    raise exception
      'Historical Inventory Transaction identity validation failed.';
  end if;


  /* =======================================================
   * Post Historical Sales Revenue / AR / VAT
   *
   * Expected:
   *
   *   Dr Accounts Receivable       80.85
   *      Cr Sales Revenue          77.00
   *      Cr VAT Payable             3.85
   *
   * Existing production adapter performs all accounting
   * validation and duplicate-source protection.
   * ======================================================= */

  v_revenue_journal_id :=
    public.post_sales_order_revenue_gl(
      v_sales_order_id
    );


  if v_revenue_journal_id is null then
    raise exception
      'Historical Sales Order revenue reconciliation did not return a journal ID.';
  end if;


  /* =======================================================
   * Post Historical Inventory COGS
   *
   * Expected:
   *
   *   Dr Cost of Goods Sold        60.30
   *      Cr Inventory              60.30
   *
   * Existing production adapter calculates the accounting
   * value from the stored inventory transaction items.
   * ======================================================= */

  v_cogs_journal_id :=
    public.post_inventory_cogs_gl(
      v_inventory_transaction_id
    );


  if v_cogs_journal_id is null then
    raise exception
      'Historical Inventory COGS reconciliation did not return a journal ID.';
  end if;


  /* =======================================================
   * Result
   * ======================================================= */

  return
    jsonb_build_object(
      'salesOrderId',
        v_sales_order_id,

      'salesOrderNumber',
        v_sales_order_number,

      'revenueJournalId',
        v_revenue_journal_id,

      'inventoryTransactionId',
        v_inventory_transaction_id,

      'inventoryTransactionNumber',
        v_inventory_transaction_number,

      'cogsJournalId',
        v_cogs_journal_id,

      'reconciled',
        true
    );

end;
$$;


/* =========================================================
 * Permissions
 * ========================================================= */

revoke all
on function
  public.reconcile_targeted_sales_cogs_gl()
from public, anon;


grant execute
on function
  public.reconcile_targeted_sales_cogs_gl()
to authenticated;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on function
  public.reconcile_targeted_sales_cogs_gl()
is
'Admin-only targeted historical GL reconciliation for SO-2026-000042 and INV-2026-000107. Uses the canonical Sales Revenue and Inventory COGS GL posting adapters and does not construct journal entries manually.';
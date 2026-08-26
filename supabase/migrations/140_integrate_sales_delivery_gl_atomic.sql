/*
 * =========================================================
 * 140 - Integrate Sales & Delivery GL Atomically
 *
 * PURPOSE
 * -------
 * Connect the existing management Sales/Delivery workflows
 * to the existing General Ledger accounting adapters.
 *
 * Sales Order confirmation:
 *
 *   confirm_sales_order_atomic()
 *          +
 *   post_sales_order_revenue_gl()
 *
 * Delivery dispatch:
 *
 *   dispatch_delivery_order_atomic()
 *          +
 *   post_inventory_cogs_gl()
 *
 * No accounting calculations are duplicated here.
 *
 * Existing canonical accounting adapters remain responsible
 * for:
 *
 *   Sales Revenue:
 *     Dr Accounts Receivable
 *        Cr Sales Revenue
 *        Cr VAT Payable
 *
 *   Inventory Dispatch:
 *     Dr Cost of Goods Sold
 *        Cr Inventory
 *
 * Because each managed wrapper executes both operations
 * within the same PostgreSQL transaction, accounting failure
 * causes the complete managed operation to roll back.
 * =========================================================
 */


/* =========================================================
 * 1. Confirm Sales Order + Revenue GL
 * ========================================================= */

create or replace function
  public.confirm_sales_order_atomic_managed(
    p_sales_order_id uuid,
    p_allow_negative_stock boolean
  )
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;

  v_revenue_journal_id uuid;
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
      'Administrator or manager access is required to confirm Sales Orders.';
  end if;


  /* =======================================================
   * Input
   * ======================================================= */

  if p_sales_order_id is null then
    raise exception
      'Sales Order ID is required.';
  end if;


  /* =======================================================
   * Operational Confirmation
   * ======================================================= */

  v_result :=
    public.confirm_sales_order_atomic(
      p_sales_order_id,
      p_allow_negative_stock
    );


  if v_result is null then
    raise exception
      'Sales Order confirmation did not return a result.';
  end if;


  /* =======================================================
   * Revenue / VAT Accounting
   *
   * Existing adapter is idempotent through:
   *
   *   source_type = sales_order_revenue
   *   source_id   = sales_orders.id
   * ======================================================= */

  v_revenue_journal_id :=
    public.post_sales_order_revenue_gl(
      p_sales_order_id
    );


  if v_revenue_journal_id is null then
    raise exception
      'Sales Order revenue accounting did not return a journal ID.';
  end if;


  /* =======================================================
   * Return Operational + Accounting Result
   * ======================================================= */

  return
    v_result
    ||
    jsonb_build_object(
      'revenueJournalId',
        v_revenue_journal_id
    );

end;
$$;


/* =========================================================
 * 2. Dispatch Delivery + Inventory COGS GL
 * ========================================================= */

create or replace function
  public.dispatch_delivery_order_atomic_managed(
    p_delivery_order_id uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;

  v_inventory_transaction_id uuid;

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
      'Administrator or manager access is required to dispatch Delivery Orders.';
  end if;


  /* =======================================================
   * Input
   * ======================================================= */

  if p_delivery_order_id is null then
    raise exception
      'Delivery Order ID is required.';
  end if;


  /* =======================================================
   * Operational Dispatch
   *
   * Existing function creates/reuses the posted sales_issue
   * inventory transaction and returns:
   *
   *   inventoryTransactionId
   * ======================================================= */

  v_result :=
    public.dispatch_delivery_order_atomic(
      p_delivery_order_id
    );


  if v_result is null then
    raise exception
      'Delivery Order dispatch did not return a result.';
  end if;


  /* =======================================================
   * Extract Inventory Transaction
   * ======================================================= */

  begin

    v_inventory_transaction_id :=
      nullif(
        v_result
          ->>
        'inventoryTransactionId',
        ''
      )::uuid;

  exception
    when invalid_text_representation then
      raise exception
        'Delivery dispatch returned an invalid Inventory Transaction ID.';

  end;


  if v_inventory_transaction_id is null then
    raise exception
      'Delivery dispatch did not return an Inventory Transaction ID.';
  end if;


  /* =======================================================
   * COGS / Inventory Accounting
   *
   * Existing adapter is idempotent through:
   *
   *   source_type = inventory_cogs
   *   source_id   = inventory_transactions.id
   * ======================================================= */

  v_cogs_journal_id :=
    public.post_inventory_cogs_gl(
      v_inventory_transaction_id
    );


  if v_cogs_journal_id is null then
    raise exception
      'Inventory COGS accounting did not return a journal ID.';
  end if;


  /* =======================================================
   * Return Operational + Accounting Result
   * ======================================================= */

  return
    v_result
    ||
    jsonb_build_object(
      'cogsJournalId',
        v_cogs_journal_id
    );

end;
$$;


/* =========================================================
 * 3. Permissions
 *
 * Preserve management-wrapper security model.
 * ========================================================= */

revoke all
on function
  public.confirm_sales_order_atomic_managed(
    uuid,
    boolean
  )
from public, anon;


grant execute
on function
  public.confirm_sales_order_atomic_managed(
    uuid,
    boolean
  )
to authenticated;


revoke all
on function
  public.dispatch_delivery_order_atomic_managed(
    uuid
  )
from public, anon;


grant execute
on function
  public.dispatch_delivery_order_atomic_managed(
    uuid
  )
to authenticated;


/* =========================================================
 * 4. Documentation
 * ========================================================= */

comment on function
  public.confirm_sales_order_atomic_managed(
    uuid,
    boolean
  )
is
'Management-only atomic Sales Order confirmation workflow. Confirms the operational Sales Order and posts the corresponding Accounts Receivable, Sales Revenue and VAT General Ledger journal through post_sales_order_revenue_gl().';


comment on function
  public.dispatch_delivery_order_atomic_managed(
    uuid
  )
is
'Management-only atomic Delivery Order dispatch workflow. Dispatches inventory and posts Cost of Goods Sold and Inventory General Ledger accounting through post_inventory_cogs_gl().';
/*
 * =========================================================
 * 100 — Manual Inventory Production GL Bridge
 *
 * PURPOSE
 * -------
 *
 * Connects the live ERP manual-inventory posting workflow
 * to the General Ledger adapter introduced in Migration 096.
 *
 *
 * EXISTING FUNCTIONS
 * ------------------
 *
 * post_manual_inventory_transaction(...)
 *
 *   Performs the operational inventory posting:
 *
 *   - Opening Balance
 *   - Adjustment In
 *   - Adjustment Out
 *   - Stock Count
 *   - Inventory transaction header/items
 *   - Warehouse stock update
 *   - Weighted-average costing
 *
 *
 * post_manual_inventory_gl(uuid)
 *
 *   Performs the formal GL posting for the resulting
 *   Inventory Transaction.
 *
 *
 * THIS FUNCTION
 * -------------
 *
 * post_manual_inventory_with_gl(...)
 *
 * executes BOTH operations inside one PostgreSQL transaction.
 *
 *
 * ATOMICITY
 * ---------
 *
 * If inventory posting succeeds but GL posting fails,
 * PostgreSQL rolls back the entire function call.
 *
 * Therefore inventory and GL can never partially diverge
 * through this production workflow.
 * =========================================================
 */


create or replace function
  public.post_manual_inventory_with_gl(
    p_transaction_type text,
    p_warehouse_id uuid,
    p_transaction_date date,
    p_reference_number text,
    p_description text,
    p_internal_notes text,
    p_items jsonb
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare

  v_inventory_transaction_id uuid;

  v_gl_journal_id uuid;

begin

  /* =======================================================
   * Authentication / Authorization
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
      'You are not authorized to post manual inventory transactions.';
  end if;


  /* =======================================================
   * 1. Operational Inventory Posting
   *
   * Existing function remains the single source of truth for
   * stock validation, costing and warehouse balance updates.
   * ======================================================= */

  v_inventory_transaction_id :=
    public.post_manual_inventory_transaction(
      p_transaction_type,
      p_warehouse_id,
      p_transaction_date,
      p_reference_number,
      p_description,
      p_internal_notes,
      p_items
    );


  if
    v_inventory_transaction_id is null
  then
    raise exception
      'Manual inventory posting did not return an Inventory Transaction ID.';
  end if;


  /* =======================================================
   * 2. Formal General Ledger Posting
   *
   * Migration 096 handles:
   *
   * Opening Balance
   *   Dr Inventory
   *   Cr Opening Balance Equity
   *
   * Adjustment In
   *   Dr Inventory
   *   Cr Inventory Adjustment Gain
   *
   * Adjustment Out
   *   Dr Inventory Adjustments & Losses
   *   Cr Inventory
   *
   * Stock Count
   *   Positive / negative variances posted according to
   *   actual inventory transaction item costs.
   * ======================================================= */

  v_gl_journal_id :=
    public.post_manual_inventory_gl(
      v_inventory_transaction_id
    );


  if
    v_gl_journal_id is null
  then
    raise exception
      'Manual inventory GL posting did not return a Journal ID.';
  end if;


  /* =======================================================
   * 3. Return Operational Transaction ID
   *
   * Keep the existing application contract unchanged.
   * ======================================================= */

  return
    v_inventory_transaction_id;

end;
$$;


/* =========================================================
 * Permissions
 * ========================================================= */

revoke all
on function
  public.post_manual_inventory_with_gl(
    text,
    uuid,
    date,
    text,
    text,
    text,
    jsonb
  )
from public;


grant execute
on function
  public.post_manual_inventory_with_gl(
    text,
    uuid,
    date,
    text,
    text,
    text,
    jsonb
  )
to authenticated;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on function
  public.post_manual_inventory_with_gl(
    text,
    uuid,
    date,
    text,
    text,
    text,
    jsonb
  )
is
  'Production manual-inventory posting workflow. Atomically posts the operational inventory transaction through post_manual_inventory_transaction() and its formal General Ledger journal through post_manual_inventory_gl(). Returns the Inventory Transaction ID.';
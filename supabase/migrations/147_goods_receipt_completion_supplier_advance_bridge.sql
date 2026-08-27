/*
 * =========================================================
 * 147 — Goods Receipt Completion Supplier Advance Bridge
 *
 * Purpose
 * -------
 * Extend the existing managed Goods Receipt completion
 * workflow so available Supplier Advances are automatically
 * applied after the Goods Receipt payable has been recognised.
 *
 * Atomic workflow:
 *
 *   complete_goods_receipt()
 *          ↓
 *   Inventory posting
 *          ↓
 *   post_goods_receipt_gl()
 *          ↓
 *   Dr Inventory / VAT
 *      Cr Accounts Payable
 *          ↓
 *   apply_supplier_advance_to_goods_receipt()
 *          ↓
 *   GRN AP synchronization
 *          ↓
 *   Dr Accounts Payable
 *      Cr Supplier Advances
 *
 * No additional Cash / Bank movement occurs when applying
 * an existing Supplier Advance.
 *
 * Any failure rolls back the entire Goods Receipt completion
 * transaction.
 * ========================================================= */


/* =========================================================
 * 1. Extend Managed Goods Receipt Completion
 * ========================================================= */

create or replace function
  public.complete_goods_receipt_managed(
    p_goods_receipt_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare

  v_user_id uuid;

  v_inventory_transaction_id uuid;

  v_journal_id uuid;

  v_supplier_advance_applied
    numeric(18, 2);

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
      'Administrator or manager access is required to complete Goods Receipts.';
  end if;


  if
    p_goods_receipt_id is null
  then
    raise exception
      'Goods Receipt ID is required.';
  end if;


  /* =======================================================
   * Operational Goods Receipt Completion
   *
   * Existing canonical inventory workflow.
   * ======================================================= */

  v_inventory_transaction_id :=
    public.complete_goods_receipt(
      p_goods_receipt_id
    );


  if
    v_inventory_transaction_id is null
  then
    raise exception
      'Goods Receipt completion did not return an inventory transaction.';
  end if;


  /* =======================================================
   * Goods Receipt General Ledger Recognition
   *
   * Recognises:
   *
   *   Dr Inventory
   *   Dr Recoverable / Pending VAT where applicable
   *      Cr Accounts Payable
   * ======================================================= */

  v_journal_id :=
    public.post_goods_receipt_gl(
      p_goods_receipt_id
    );


  if
    v_journal_id is null
  then
    raise exception
      'Goods Receipt General Ledger posting did not return a journal.';
  end if;


  /* =======================================================
   * Initialize / Synchronize GRN AP Subledger
   *
   * The operational completion occurred after Migration 143,
   * so establish the correct gross payable before checking
   * Supplier Advances.
   * ======================================================= */

  perform
    public.sync_goods_receipt_paid_amount(
      p_goods_receipt_id
    );


  /* =======================================================
   * Automatically Apply Existing Supplier Advances
   *
   * Migration 146:
   *
   * - uses FIFO available Supplier Advances
   * - creates supplier_payment_allocations
   * - marks them supplier_advance_application
   * - synchronizes Supplier Payment totals
   * - synchronizes GRN AP
   * - posts Dr AP / Cr Supplier Advances
   *
   * All of this executes in this same transaction.
   * ======================================================= */

  v_supplier_advance_applied :=
    public.apply_supplier_advance_to_goods_receipt(
      p_goods_receipt_id
    );


  if
    v_supplier_advance_applied is null
  then
    raise exception
      'Goods Receipt Supplier Advance application did not return a result.';
  end if;


  /* =======================================================
   * Final GRN AP Synchronization
   * ======================================================= */

  perform
    public.sync_goods_receipt_paid_amount(
      p_goods_receipt_id
    );


  /* =======================================================
   * Preserve Existing Application Contract
   *
   * complete_goods_receipt_managed() continues returning the
   * Inventory Transaction UUID expected by the application.
   * ======================================================= */

  return
    v_inventory_transaction_id;

end;
$$;


/* =========================================================
 * 2. Permissions
 * ========================================================= */

revoke all
on function
  public.complete_goods_receipt_managed(
    uuid
  )
from public;


grant execute
on function
  public.complete_goods_receipt_managed(
    uuid
  )
to authenticated;


/* =========================================================
 * 3. Documentation
 * ========================================================= */

comment on function
  public.complete_goods_receipt_managed(
    uuid
  )
is
  'Management-only atomic Goods Receipt completion workflow. Completes inventory receipt, posts Inventory/VAT/Accounts Payable GL recognition, synchronizes the Goods Receipt AP subledger and automatically applies available Supplier Advances FIFO with corresponding Dr Accounts Payable / Cr Supplier Advances GL reclassification. Returns the Inventory Transaction UUID.';


/* =========================================================
 * End Migration 147
 * ========================================================= */
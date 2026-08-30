/*
 * Migration 153
 * ============================================================
 * Completed Goods Receipt Immutability
 * ============================================================
 *
 * Purpose
 * -------
 * A completed Goods Receipt has already affected:
 *
 *   - inventory
 *   - purchase order receiving quantities
 *   - Accounts Payable
 *   - General Ledger
 *   - supplier payment allocation
 *   - supplier advances
 *   - supplier returns
 *
 * Therefore its operational/commercial facts must never be
 * silently edited after completion.
 *
 * Corrections must instead use controlled workflows such as:
 *
 *   - Supplier Return / Debit Note
 *   - Supplier Payment reversal/cancellation
 *   - Supplier credit application/refund
 *
 * Allowed post-completion Goods Receipt header changes:
 *
 *   paid_amount
 *   balance_due
 *   payment_status
 *   updated_at
 *
 * Goods Receipt items become fully immutable once their parent
 * Goods Receipt is completed.
 */


/* ============================================================
 * 1. Protect completed Goods Receipt headers
 * ============================================================ */

create or replace function
  public.enforce_completed_goods_receipt_immutability()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  /*
   * Only protect rows that were already completed before this
   * UPDATE.
   *
   * This deliberately allows the canonical completion workflow
   * to transition a receipt INTO 'completed'.
   */

  if old.status <> 'completed' then
    return new;
  end if;


  /*
   * AP settlement state is intentionally mutable after
   * completion.
   *
   * All other fields are historical facts and must remain
   * unchanged.
   */

  if
    new.id is distinct from old.id
    or new.receipt_number is distinct from old.receipt_number
    or new.purchase_order_id is distinct from old.purchase_order_id
    or new.supplier_id is distinct from old.supplier_id
    or new.warehouse_id is distinct from old.warehouse_id

    or new.status is distinct from old.status

    or new.supplier_delivery_note_number
         is distinct from old.supplier_delivery_note_number

    or new.supplier_invoice_number
         is distinct from old.supplier_invoice_number

    or new.carrier_name is distinct from old.carrier_name
    or new.vehicle_number is distinct from old.vehicle_number
    or new.tracking_number is distinct from old.tracking_number

    or new.received_date is distinct from old.received_date
    or new.received_at is distinct from old.received_at

    or new.inspected_at is distinct from old.inspected_at
    or new.completed_at is distinct from old.completed_at
    or new.cancelled_at is distinct from old.cancelled_at

    or new.internal_notes is distinct from old.internal_notes
    or new.supplier_notes is distinct from old.supplier_notes

    or new.created_by is distinct from old.created_by
    or new.received_by is distinct from old.received_by
    or new.inspected_by is distinct from old.inspected_by
    or new.completed_by is distinct from old.completed_by
    or new.cancelled_by is distinct from old.cancelled_by

    or new.created_at is distinct from old.created_at

    or new.payment_terms_days
         is distinct from old.payment_terms_days
  then

    raise exception
      'Completed Goods Receipt % is immutable. Use the controlled Supplier Return / accounting correction workflows instead.',
      old.receipt_number;

  end if;


  /*
   * Intentionally permitted:
   *
   *   new.paid_amount
   *   new.balance_due
   *   new.payment_status
   *   new.updated_at
   */

  return new;

end;
$$;


/* ============================================================
 * 2. Install Goods Receipt header protection
 * ============================================================ */

drop trigger if exists
  trg_enforce_completed_goods_receipt_immutability
on
  public.goods_receipts;


create trigger
  trg_enforce_completed_goods_receipt_immutability
before update
on
  public.goods_receipts
for each row
execute function
  public.enforce_completed_goods_receipt_immutability();


/* ============================================================
 * 3. Protect Goods Receipt items
 * ============================================================
 *
 * INSERT
 *   Cannot add a new item to a completed GRN.
 *
 * UPDATE
 *   Cannot change any item belonging to a completed GRN.
 *
 * DELETE
 *   Cannot delete an item belonging to a completed GRN.
 *
 * UPDATE uses OLD.goods_receipt_id intentionally so an item
 * cannot escape the protection by being reassigned from a
 * completed receipt to another receipt.
 * ============================================================ */

create or replace function
  public.enforce_completed_goods_receipt_item_immutability()
returns trigger
language plpgsql
set search_path = public
as $$
declare

  v_goods_receipt_id uuid;

  v_receipt_number text;

  v_receipt_status text;

begin

  if tg_op = 'INSERT' then

    v_goods_receipt_id :=
      new.goods_receipt_id;

  else

    v_goods_receipt_id :=
      old.goods_receipt_id;

  end if;


  select
    receipt_number,
    status
  into
    v_receipt_number,
    v_receipt_status
  from
    public.goods_receipts
  where
    id = v_goods_receipt_id;


  if not found then

    raise exception
      'Goods Receipt for Goods Receipt Item was not found.';

  end if;


  if v_receipt_status = 'completed' then

    raise exception
      'Items belonging to completed Goods Receipt % are immutable. Use the Supplier Return workflow instead.',
      v_receipt_number;

  end if;


  /*
   * For UPDATE, also protect against moving an item INTO an
   * already-completed Goods Receipt.
   */

  if
    tg_op = 'UPDATE'
    and
    new.goods_receipt_id is distinct from old.goods_receipt_id
  then

    select
      receipt_number,
      status
    into
      v_receipt_number,
      v_receipt_status
    from
      public.goods_receipts
    where
      id = new.goods_receipt_id;


    if not found then

      raise exception
        'Target Goods Receipt for Goods Receipt Item was not found.';

    end if;


    if v_receipt_status = 'completed' then

      raise exception
        'Cannot move an item into completed Goods Receipt %.',
        v_receipt_number;

    end if;

  end if;


  if tg_op = 'DELETE' then
    return old;
  end if;


  return new;

end;
$$;


/* ============================================================
 * 4. Install Goods Receipt item protection
 * ============================================================ */

drop trigger if exists
  trg_enforce_completed_goods_receipt_item_immutability
on
  public.goods_receipt_items;


create trigger
  trg_enforce_completed_goods_receipt_item_immutability
before insert or update or delete
on
  public.goods_receipt_items
for each row
execute function
  public.enforce_completed_goods_receipt_item_immutability();


/* ============================================================
 * 5. Documentation
 * ============================================================ */

comment on function
  public.enforce_completed_goods_receipt_immutability()
is
'Prevents modification of operational/commercial fields on completed Goods Receipts while allowing AP settlement fields paid_amount, balance_due, payment_status and updated_at to remain synchronized.';


comment on function
  public.enforce_completed_goods_receipt_item_immutability()
is
'Prevents INSERT, UPDATE or DELETE of Goods Receipt items once the parent Goods Receipt is completed. Historical corrections must use Supplier Return workflows.';
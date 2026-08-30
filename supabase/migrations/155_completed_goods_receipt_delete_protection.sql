/*
 * Migration 155
 * ============================================================
 * Completed Goods Receipt DELETE Protection
 * ============================================================
 *
 * Migration 153 protects completed Goods Receipts against
 * unsafe UPDATE operations and protects their items against
 * INSERT / UPDATE / DELETE.
 *
 * This migration closes the remaining header-level gap:
 *
 *   DELETE FROM goods_receipts
 *
 * A completed Goods Receipt has already affected inventory,
 * purchase-order receiving, AP and GL and therefore must remain
 * as historical evidence.
 *
 * Corrections must use controlled Supplier Return / accounting
 * correction workflows instead of deleting the GRN.
 */


/* ============================================================
 * 1. Completed GRN DELETE protection
 * ============================================================ */

create or replace function
  public.prevent_completed_goods_receipt_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  if old.status = 'completed' then

    raise exception
      'Completed Goods Receipt % cannot be deleted. Use the controlled Supplier Return / accounting correction workflows instead.',
      old.receipt_number;

  end if;


  return old;

end;
$$;


/* ============================================================
 * 2. Install DELETE trigger
 * ============================================================ */

drop trigger if exists
  trg_prevent_completed_goods_receipt_delete
on
  public.goods_receipts;


create trigger
  trg_prevent_completed_goods_receipt_delete
before delete
on
  public.goods_receipts
for each row
execute function
  public.prevent_completed_goods_receipt_delete();


/* ============================================================
 * 3. Documentation
 * ============================================================ */

comment on function
  public.prevent_completed_goods_receipt_delete()
is
'Prevents deletion of completed Goods Receipts. Completed GRNs are historical inventory and accounting documents and must be corrected through controlled Supplier Return or accounting correction workflows.';
/*
 * =========================================================
 * 081 — Enforce Sales Margin on Confirmation
 *
 * Applies margin protection whenever a Sales Order changes:
 *
 *   draft -> confirmed
 *
 * This protects:
 *
 * - Manual Sales Orders
 * - Quick Sale
 * - Quotation -> Sales Order
 * - Future API/import confirmation paths
 *
 * If validation fails, PostgreSQL rolls back the complete
 * confirmation transaction, including stock reservations.
 * =========================================================
 */


/* =========================================================
 * Trigger Function
 * ========================================================= */

create or replace function
  public.enforce_sales_order_margin_before_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;

begin

  /*
   * Only validate when the order actually transitions
   * into confirmed status.
   */

  if
    new.status = 'confirmed'
    and
    old.status is distinct from 'confirmed'
  then

    v_result :=
      public.validate_sales_order_margin(
        new.id
      );

  end if;


  return new;

end;
$$;


/* =========================================================
 * Trigger
 * ========================================================= */

drop trigger if exists
  enforce_sales_order_margin_before_confirmation
on
  public.sales_orders;


create trigger
  enforce_sales_order_margin_before_confirmation

before update of status
on public.sales_orders

for each row

when (
  new.status = 'confirmed'
  and
  old.status is distinct from 'confirmed'
)

execute function
  public.enforce_sales_order_margin_before_confirmation();


/* =========================================================
 * Permissions
 *
 * Trigger function itself does not need direct application
 * execution.
 * ========================================================= */

revoke all
on function
  public.enforce_sales_order_margin_before_confirmation()
from public,
     authenticated;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on function
  public.enforce_sales_order_margin_before_confirmation()
is
  'Database confirmation gate that validates Sales Order stock-line margins before allowing status to become confirmed.';
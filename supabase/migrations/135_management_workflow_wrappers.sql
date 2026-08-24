/*
 * =========================================================
 * 135 - Management Workflow Wrappers
 *
 * PURPOSE
 * -------
 * Establish management-only application entry points for:
 *
 *   1. Purchase Order creation from an awarded RFQ
 *   2. Goods Receipt completion / inventory posting
 *
 * Existing underlying functions remain temporarily executable
 * by authenticated users for zero-downtime deployment.
 *
 * Direct access to those underlying functions will be revoked
 * after the application has switched to these wrappers.
 * =========================================================
 */


/* =========================================================
 * 1. Management-only Purchase Order creation
 * ========================================================= */

create or replace function
  public.create_purchase_order_from_award_managed(
    p_rfq_id uuid
  )
returns public.purchase_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_purchase_order
    public.purchase_orders%rowtype;

begin

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
      'Administrator or manager access is required to create Purchase Orders.';
  end if;


  if
    p_rfq_id is null
  then
    raise exception
      'RFQ ID is required.';
  end if;


  v_purchase_order :=
    public.create_purchase_order_from_award(
      p_rfq_id
    );


  return
    v_purchase_order;

end;
$$;


/* =========================================================
 * 2. Management-only Goods Receipt completion
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

begin

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


  return
    v_inventory_transaction_id;

end;
$$;


/* =========================================================
 * 3. Wrapper permissions
 * ========================================================= */

revoke all
on function
  public.create_purchase_order_from_award_managed(
    uuid
  )
from public;

revoke all
on function
  public.create_purchase_order_from_award_managed(
    uuid
  )
from anon;

grant execute
on function
  public.create_purchase_order_from_award_managed(
    uuid
  )
to authenticated;


revoke all
on function
  public.complete_goods_receipt_managed(
    uuid
  )
from public;

revoke all
on function
  public.complete_goods_receipt_managed(
    uuid
  )
from anon;

grant execute
on function
  public.complete_goods_receipt_managed(
    uuid
  )
to authenticated;


/* =========================================================
 * 4. Documentation
 * ========================================================= */

comment on function
  public.create_purchase_order_from_award_managed(
    uuid
  )
is
  'Management-only application entry point for creating a Purchase Order from an awarded RFQ.';


comment on function
  public.complete_goods_receipt_managed(
    uuid
  )
is
  'Management-only application entry point for completing a Goods Receipt and posting inventory.';
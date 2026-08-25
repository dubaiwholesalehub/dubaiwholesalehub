/*
 * =========================================================
 * 137 - Management Sales & Delivery Workflow Wrappers
 *
 * PURPOSE
 * -------
 * Establish management-only application entry points for
 * Sales Order and Delivery Order state-changing workflows.
 *
 * Existing underlying functions remain temporarily executable
 * by authenticated users for zero-downtime deployment.
 *
 * Direct execution of the underlying functions will be
 * revoked only after the application has switched to these
 * managed wrappers and production testing has passed.
 *
 * Management roles are defined by public.is_admin():
 *
 *   super_admin
 *   admin
 *   manager
 * =========================================================
 */


/* =========================================================
 * 1. Confirm Sales Order
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
begin

  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception
      'Administrator or manager access is required to confirm Sales Orders.';
  end if;

  if p_sales_order_id is null then
    raise exception
      'Sales Order ID is required.';
  end if;

  v_result :=
    public.confirm_sales_order_atomic(
      p_sales_order_id,
      p_allow_negative_stock
    );

  return v_result;

end;
$$;


/* =========================================================
 * 2. Cancel Sales Order
 * ========================================================= */

create or replace function
  public.cancel_sales_order_atomic_managed(
    p_sales_order_id uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin

  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception
      'Administrator or manager access is required to cancel Sales Orders.';
  end if;

  if p_sales_order_id is null then
    raise exception
      'Sales Order ID is required.';
  end if;

  v_result :=
    public.cancel_sales_order_atomic(
      p_sales_order_id
    );

  return v_result;

end;
$$;


/* =========================================================
 * 3. Create Delivery From Sales Order
 * ========================================================= */

create or replace function
  public.create_delivery_from_sales_order_managed(
    p_sales_order_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delivery_order_id uuid;
begin

  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception
      'Administrator or manager access is required to create Delivery Orders.';
  end if;

  if p_sales_order_id is null then
    raise exception
      'Sales Order ID is required.';
  end if;

  v_delivery_order_id :=
    public.create_delivery_from_sales_order(
      p_sales_order_id
    );

  if v_delivery_order_id is null then
    raise exception
      'Delivery Order creation did not return an ID.';
  end if;

  return v_delivery_order_id;

end;
$$;


/* =========================================================
 * 4. Start Delivery Picking
 * ========================================================= */

create or replace function
  public.start_delivery_picking_managed(
    p_delivery_order_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result uuid;
begin

  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception
      'Administrator or manager access is required for Delivery workflows.';
  end if;

  if p_delivery_order_id is null then
    raise exception
      'Delivery Order ID is required.';
  end if;

  v_result :=
    public.start_delivery_picking(
      p_delivery_order_id
    );

  return v_result;

end;
$$;


/* =========================================================
 * 5. Confirm Delivery Picked
 * ========================================================= */

create or replace function
  public.confirm_delivery_picked_managed(
    p_delivery_order_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result uuid;
begin

  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception
      'Administrator or manager access is required for Delivery workflows.';
  end if;

  if p_delivery_order_id is null then
    raise exception
      'Delivery Order ID is required.';
  end if;

  v_result :=
    public.confirm_delivery_picked(
      p_delivery_order_id
    );

  return v_result;

end;
$$;


/* =========================================================
 * 6. Start Delivery Packing
 * ========================================================= */

create or replace function
  public.start_delivery_packing_managed(
    p_delivery_order_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result uuid;
begin

  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception
      'Administrator or manager access is required for Delivery workflows.';
  end if;

  if p_delivery_order_id is null then
    raise exception
      'Delivery Order ID is required.';
  end if;

  v_result :=
    public.start_delivery_packing(
      p_delivery_order_id
    );

  return v_result;

end;
$$;


/* =========================================================
 * 7. Confirm Delivery Packed
 * ========================================================= */

create or replace function
  public.confirm_delivery_packed_managed(
    p_delivery_order_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result uuid;
begin

  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception
      'Administrator or manager access is required for Delivery workflows.';
  end if;

  if p_delivery_order_id is null then
    raise exception
      'Delivery Order ID is required.';
  end if;

  v_result :=
    public.confirm_delivery_packed(
      p_delivery_order_id
    );

  return v_result;

end;
$$;


/* =========================================================
 * 8. Dispatch Delivery
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
begin

  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception
      'Administrator or manager access is required to dispatch Delivery Orders.';
  end if;

  if p_delivery_order_id is null then
    raise exception
      'Delivery Order ID is required.';
  end if;

  v_result :=
    public.dispatch_delivery_order_atomic(
      p_delivery_order_id
    );

  return v_result;

end;
$$;


/* =========================================================
 * 9. Mark Delivery Delivered
 * ========================================================= */

create or replace function
  public.mark_delivery_delivered_managed(
    p_delivery_order_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result uuid;
begin

  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception
      'Administrator or manager access is required for Delivery workflows.';
  end if;

  if p_delivery_order_id is null then
    raise exception
      'Delivery Order ID is required.';
  end if;

  v_result :=
    public.mark_delivery_delivered(
      p_delivery_order_id
    );

  return v_result;

end;
$$;


/* =========================================================
 * 10. Cancel Delivery
 * ========================================================= */

create or replace function
  public.cancel_delivery_order_managed(
    p_delivery_order_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result uuid;
begin

  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception
      'Administrator or manager access is required to cancel Delivery Orders.';
  end if;

  if p_delivery_order_id is null then
    raise exception
      'Delivery Order ID is required.';
  end if;

  v_result :=
    public.cancel_delivery_order(
      p_delivery_order_id
    );

  return v_result;

end;
$$;


/* =========================================================
 * 11. Lock down wrapper permissions
 * ========================================================= */

revoke all on function
  public.confirm_sales_order_atomic_managed(uuid, boolean)
from public, anon;

revoke all on function
  public.cancel_sales_order_atomic_managed(uuid)
from public, anon;

revoke all on function
  public.create_delivery_from_sales_order_managed(uuid)
from public, anon;

revoke all on function
  public.start_delivery_picking_managed(uuid)
from public, anon;

revoke all on function
  public.confirm_delivery_picked_managed(uuid)
from public, anon;

revoke all on function
  public.start_delivery_packing_managed(uuid)
from public, anon;

revoke all on function
  public.confirm_delivery_packed_managed(uuid)
from public, anon;

revoke all on function
  public.dispatch_delivery_order_atomic_managed(uuid)
from public, anon;

revoke all on function
  public.mark_delivery_delivered_managed(uuid)
from public, anon;

revoke all on function
  public.cancel_delivery_order_managed(uuid)
from public, anon;


/* =========================================================
 * 12. Grant application execution
 * ========================================================= */

grant execute on function
  public.confirm_sales_order_atomic_managed(uuid, boolean)
to authenticated;

grant execute on function
  public.cancel_sales_order_atomic_managed(uuid)
to authenticated;

grant execute on function
  public.create_delivery_from_sales_order_managed(uuid)
to authenticated;

grant execute on function
  public.start_delivery_picking_managed(uuid)
to authenticated;

grant execute on function
  public.confirm_delivery_picked_managed(uuid)
to authenticated;

grant execute on function
  public.start_delivery_packing_managed(uuid)
to authenticated;

grant execute on function
  public.confirm_delivery_packed_managed(uuid)
to authenticated;

grant execute on function
  public.dispatch_delivery_order_atomic_managed(uuid)
to authenticated;

grant execute on function
  public.mark_delivery_delivered_managed(uuid)
to authenticated;

grant execute on function
  public.cancel_delivery_order_managed(uuid)
to authenticated;
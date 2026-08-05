/*
 * HM ERP — Atomic Sales Order Confirmation
 *
 * Provides:
 * - Atomic stock reservation
 * - Optional negative-stock reservation
 * - Procurement planning
 * - Service-line handling
 * - Reservation release on cancellation
 *
 * Important:
 * Draft orders never affect warehouse stock.
 */


/* =========================================================
 * Confirm Sales Order Atomically
 * ========================================================= */

create or replace function
  public.confirm_sales_order_atomic(
    p_sales_order_id uuid,
    p_allow_negative_stock boolean
      default false
  )
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.sales_orders%rowtype;
  v_item public.sales_order_items%rowtype;
  v_stock public.warehouse_stock%rowtype;

  v_warehouse_id uuid;

  v_available numeric(18, 4);
  v_reserve numeric(18, 4);
  v_shortage numeric(18, 4);

  v_header_fulfilment_status text;

  v_stock_lines integer := 0;
  v_procurement_lines integer := 0;
  v_service_lines integer := 0;
  v_shortage_lines integer := 0;
  v_reserved_total numeric(18, 4) := 0;
begin
  /*
   * Lock the order so it cannot be confirmed
   * concurrently by another request.
   */
  select *
  into v_order
  from public.sales_orders
  where id = p_sales_order_id
  for update;

  if not found then
    raise exception
      'Sales order was not found.';
  end if;

  if v_order.status <> 'draft' then
    raise exception
      'Only draft sales orders can be confirmed.';
  end if;

  if not exists (
    select 1
    from public.sales_order_items
    where sales_order_id =
      p_sales_order_id
  ) then
    raise exception
      'Add at least one item before confirming the sales order.';
  end if;

  /*
   * Reset draft planning values before calculating
   * the real confirmed reservation.
   */
  update public.sales_order_items
  set
    quantity_reserved = 0,
    quantity_allocated = 0,
    shortage_quantity = 0
  where sales_order_id =
    p_sales_order_id;

  for v_item in
    select *
    from public.sales_order_items
    where sales_order_id =
      p_sales_order_id
    order by line_number
    for update
  loop
    /* =====================================================
     * Service
     * ===================================================== */

    if v_item.fulfilment_method =
      'service'
    then
      v_service_lines :=
        v_service_lines + 1;

      update public.sales_order_items
      set
        warehouse_id = null,
        quantity_reserved = 0,
        quantity_allocated = 0,
        shortage_quantity = 0,
        procurement_required = false,
        fulfilment_status =
          'not_required'
      where id = v_item.id;

      continue;
    end if;


    /* =====================================================
     * Local Purchase / Import / Drop Ship
     * ===================================================== */

    if v_item.fulfilment_method in (
      'local_purchase',
      'import_on_demand',
      'dropship'
    ) then
      v_procurement_lines :=
        v_procurement_lines + 1;

      update public.sales_order_items
      set
        quantity_reserved = 0,
        quantity_allocated = 0,
        shortage_quantity =
          quantity,
        procurement_required = true,
        fulfilment_status =
          'awaiting_procurement'
      where id = v_item.id;

      continue;
    end if;


    /* =====================================================
     * Stock Item
     * ===================================================== */

    v_stock_lines :=
      v_stock_lines + 1;

    v_warehouse_id :=
      coalesce(
        v_item.warehouse_id,
        v_order.warehouse_id
      );

    if v_item.product_id is null then
      raise exception
        'Stock line % must have a linked product.',
        v_item.line_number;
    end if;

    if v_warehouse_id is null then
      raise exception
        'Stock line % requires a warehouse.',
        v_item.line_number;
    end if;

    /*
     * Ensure a warehouse-stock row exists.
     */
    insert into public.warehouse_stock (
      product_id,
      warehouse_id,
      quantity_on_hand,
      quantity_reserved,
      average_unit_cost
    )
    values (
      v_item.product_id,
      v_warehouse_id,
      0,
      0,
      0
    )
    on conflict (
      product_id,
      warehouse_id
    )
    do nothing;

    /*
     * Lock the exact stock record. Another order
     * confirming the same product must wait.
     */
    select *
    into v_stock
    from public.warehouse_stock
    where product_id =
      v_item.product_id
      and warehouse_id =
        v_warehouse_id
    for update;

    v_available :=
      coalesce(
        v_stock.quantity_available,
        v_stock.quantity_on_hand -
          v_stock.quantity_reserved
      );

    /*
     * Admin override:
     * reserve the complete quantity even when this
     * creates negative availability.
     *
     * Normal confirmation:
     * reserve only the currently available quantity.
     */
    if p_allow_negative_stock then
      v_reserve :=
        v_item.quantity;
    else
      v_reserve :=
        greatest(
          least(
            v_item.quantity,
            greatest(
              v_available,
              0
            )
          ),
          0
        );
    end if;

    v_shortage :=
      greatest(
        v_item.quantity -
          v_reserve,
        0
      );

    update public.warehouse_stock
    set
      quantity_reserved =
        quantity_reserved +
          v_reserve,

      quantity_available =
        quantity_on_hand -
        (
          quantity_reserved +
          v_reserve
        ),

      last_transaction_at = now(),
      updated_at = now()
    where id = v_stock.id;

    update public.sales_order_items
    set
      warehouse_id =
        v_warehouse_id,

      quantity_reserved =
        v_reserve,

      quantity_allocated =
        v_reserve,

      shortage_quantity =
        v_shortage,

      procurement_required =
        case
          when v_shortage > 0
            and allow_backorder
          then true
          else false
        end,

      fulfilment_status =
        case
          when v_reserve >= quantity
          then 'allocated'

          when v_reserve > 0
          then 'partially_allocated'

          else 'awaiting_stock'
        end
    where id = v_item.id;

    v_reserved_total :=
      v_reserved_total +
      v_reserve;

    if v_shortage > 0 then
      v_shortage_lines :=
        v_shortage_lines + 1;
    end if;
  end loop;


  /* =======================================================
   * Derive Header Fulfilment Status
   * ======================================================= */

  if not exists (
    select 1
    from public.sales_order_items
    where sales_order_id =
      p_sales_order_id
      and fulfilment_status <>
        'not_required'
  ) then
    v_header_fulfilment_status :=
      'not_required';

  elsif exists (
    select 1
    from public.sales_order_items
    where sales_order_id =
      p_sales_order_id
      and fulfilment_status =
        'awaiting_procurement'
  ) then
    v_header_fulfilment_status :=
      'awaiting_procurement';

  elsif exists (
    select 1
    from public.sales_order_items
    where sales_order_id =
      p_sales_order_id
      and fulfilment_status =
        'awaiting_stock'
  ) then
    v_header_fulfilment_status :=
      'awaiting_stock';

  elsif exists (
    select 1
    from public.sales_order_items
    where sales_order_id =
      p_sales_order_id
      and fulfilment_status =
        'partially_allocated'
  ) then
    v_header_fulfilment_status :=
      'partially_allocated';

  elsif not exists (
    select 1
    from public.sales_order_items
    where sales_order_id =
      p_sales_order_id
      and fulfilment_status not in (
        'allocated',
        'not_required'
      )
  ) then
    v_header_fulfilment_status :=
      'allocated';

  else
    v_header_fulfilment_status :=
      'unplanned';
  end if;


  /* =======================================================
   * Confirm Order
   * ======================================================= */

  update public.sales_orders
  set
    status = 'confirmed',

    fulfilment_status =
      v_header_fulfilment_status,

    confirmed_at = now(),

    updated_at = now(),

    updated_by = auth.uid()
  where id = p_sales_order_id;

  return jsonb_build_object(
    'salesOrderId',
      p_sales_order_id,

    'status',
      'confirmed',

    'fulfilmentStatus',
      v_header_fulfilment_status,

    'stockLines',
      v_stock_lines,

    'procurementLines',
      v_procurement_lines,

    'serviceLines',
      v_service_lines,

    'shortageLines',
      v_shortage_lines,

    'reservedQuantity',
      v_reserved_total,

    'negativeStockAllowed',
      p_allow_negative_stock
  );
end;
$$;


/* =========================================================
 * Cancel and Release Reservations Atomically
 * ========================================================= */

create or replace function
  public.cancel_sales_order_atomic(
    p_sales_order_id uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.sales_orders%rowtype;
  v_item public.sales_order_items%rowtype;
  v_stock public.warehouse_stock%rowtype;

  v_released_total numeric(18, 4) := 0;
begin
  select *
  into v_order
  from public.sales_orders
  where id = p_sales_order_id
  for update;

  if not found then
    raise exception
      'Sales order was not found.';
  end if;

  if v_order.status = 'cancelled' then
    return jsonb_build_object(
      'salesOrderId',
        p_sales_order_id,

      'status',
        'cancelled',

      'releasedQuantity',
        0
    );
  end if;

  if v_order.status in (
    'fulfilled',
    'completed',
    'closed'
  ) then
    raise exception
      'A fulfilled, completed, or closed order cannot be cancelled.';
  end if;

  if exists (
    select 1
    from public.sales_order_items
    where sales_order_id =
      p_sales_order_id
      and quantity_fulfilled > 0
  ) then
    raise exception
      'This order already contains fulfilled quantities and cannot be cancelled directly.';
  end if;

  for v_item in
    select *
    from public.sales_order_items
    where sales_order_id =
      p_sales_order_id
    order by line_number
    for update
  loop
    if (
      v_item.fulfilment_method =
        'stock'
      and v_item.product_id is not null
      and v_item.warehouse_id is not null
      and v_item.quantity_reserved > 0
    ) then
      select *
      into v_stock
      from public.warehouse_stock
      where product_id =
        v_item.product_id
        and warehouse_id =
          v_item.warehouse_id
      for update;

      if found then
        update public.warehouse_stock
        set
          quantity_reserved =
            greatest(
              quantity_reserved -
                v_item.quantity_reserved,
              0
            ),

          quantity_available =
            quantity_on_hand -
            greatest(
              quantity_reserved -
                v_item.quantity_reserved,
              0
            ),

          last_transaction_at = now(),
          updated_at = now()
        where id = v_stock.id;

        v_released_total :=
          v_released_total +
          v_item.quantity_reserved;
      end if;
    end if;

    update public.sales_order_items
    set
      quantity_reserved = 0,
      quantity_allocated = 0,

      quantity_cancelled =
        greatest(
          quantity -
            quantity_fulfilled,
          0
        ),

      shortage_quantity = 0,

      procurement_required = false,

      fulfilment_status =
        'cancelled',

      updated_at = now()
    where id = v_item.id;
  end loop;

  update public.sales_orders
  set
    status = 'cancelled',

    fulfilment_status =
      'unplanned',

    cancelled_at = now(),

    updated_at = now(),

    updated_by = auth.uid()
  where id = p_sales_order_id;

  return jsonb_build_object(
    'salesOrderId',
      p_sales_order_id,

    'status',
      'cancelled',

    'releasedQuantity',
      v_released_total
  );
end;
$$;


/* =========================================================
 * Function Permissions
 * ========================================================= */

revoke all
on function
  public.confirm_sales_order_atomic(
    uuid,
    boolean
  )
from public;

revoke all
on function
  public.cancel_sales_order_atomic(
    uuid
  )
from public;

grant execute
on function
  public.confirm_sales_order_atomic(
    uuid,
    boolean
  )
to authenticated;

grant execute
on function
  public.cancel_sales_order_atomic(
    uuid
  )
to authenticated;
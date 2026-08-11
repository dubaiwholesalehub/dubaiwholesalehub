/*
 * HM ERP — Delivery Order Workflow
 *
 * Part A:
 *   1. Create Delivery from Sales Order
 *   2. Start Picking
 *   3. Confirm Picking
 *   4. Start Packing
 *   5. Confirm Packing
 *   6. Mark Delivered
 *   7. Cancel Delivery
 *
 * Part B will add atomic dispatch and inventory posting.
 */


/* =========================================================
 * Create Delivery from Sales Order
 * ========================================================= */

create or replace function
  public.create_delivery_from_sales_order(
    p_sales_order_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.sales_orders%rowtype;

  v_delivery_order_id uuid;

  v_line_number integer := 0;
  v_item_count integer := 0;

  v_item record;

  v_already_planned numeric(18, 4);
  v_remaining_quantity numeric(18, 4);
  v_available_reserved numeric(18, 4);
  v_delivery_quantity numeric(18, 4);

  v_user_id uuid;
begin
  v_user_id := auth.uid();

  /*
   * Lock the Sales Order so two users cannot create
   * overlapping deliveries at the same time.
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

  if v_order.status not in (
    'confirmed',
    'processing',
    'partially_fulfilled'
  ) then
    raise exception
      'Only confirmed or processing sales orders can create deliveries.';
  end if;

  if v_order.warehouse_id is null then
    raise exception
      'The sales order requires a warehouse before creating a delivery.';
  end if;

  /*
   * Ensure at least one physical stock line still has
   * reserved quantity available for delivery.
   */
  if not exists (
    select 1
    from public.sales_order_items item
    where item.sales_order_id =
      p_sales_order_id
      and item.fulfilment_method =
        'stock'
      and item.product_id is not null
      and item.quantity_reserved >
        item.quantity_fulfilled
  ) then
    raise exception
      'No reserved stock is currently available for delivery.';
  end if;

  insert into public.delivery_orders (
    delivery_number,

    sales_order_id,
    customer_id,
    shipping_address_id,
    warehouse_id,

    delivery_date,
    requested_delivery_date,
    expected_delivery_date,

    status,
    priority,
    delivery_method,

    external_reference,
    customer_reference,

    delivery_notes,
    internal_notes,

    created_by,
    updated_by
  )
  values (
    public.generate_delivery_order_number(),

    v_order.id,
    v_order.customer_id,
    v_order.shipping_address_id,
    v_order.warehouse_id,

    current_date,
    v_order.requested_delivery_date,
    v_order.expected_delivery_date,

    'draft',
    'normal',
    'company_delivery',

    v_order.external_reference,
    v_order.customer_reference,

    v_order.customer_notes,
    v_order.internal_notes,

    v_user_id,
    v_user_id
  )
  returning id
  into v_delivery_order_id;

  /*
   * Create one delivery line for every deliverable
   * stock line.
   *
   * Existing active delivery quantities are deducted
   * so multiple delivery documents cannot over-plan
   * the same Sales Order quantity.
   */
  for v_item in
    select
      item.id,
      item.line_number,
      item.product_id,
      item.unit_id,

      coalesce(
        item.warehouse_id,
        v_order.warehouse_id
      ) as warehouse_id,

      item.sku,
      item.item_name,
      item.description,

      item.quantity,
      item.quantity_reserved,
      item.quantity_fulfilled,

      stock.average_unit_cost,

      item.line_notes
    from public.sales_order_items item

    left join public.warehouse_stock stock
      on stock.product_id =
        item.product_id
      and stock.warehouse_id =
        coalesce(
          item.warehouse_id,
          v_order.warehouse_id
        )

    where item.sales_order_id =
      p_sales_order_id

      and item.fulfilment_method =
        'stock'

      and item.product_id is not null

    order by item.line_number
    for update of item
  loop
    select coalesce(
      sum(delivery_item.delivery_quantity),
      0
    )
    into v_already_planned
    from public.delivery_order_items
      delivery_item

    inner join public.delivery_orders
      delivery_order
      on delivery_order.id =
        delivery_item.delivery_order_id

    where delivery_item.sales_order_item_id =
      v_item.id

      and delivery_order.status in (
        'draft',
        'picking',
        'picked',
        'packing',
        'packed'
      );

    v_remaining_quantity :=
      greatest(
        v_item.quantity
        - v_item.quantity_fulfilled
        - v_already_planned,
        0
      );

    v_available_reserved :=
        greatest(
            v_item.quantity_reserved
            - v_already_planned,
            0
        );

    v_delivery_quantity :=
      least(
        v_remaining_quantity,
        v_available_reserved
      );

    if v_delivery_quantity <= 0 then
      continue;
    end if;

    if v_item.warehouse_id is null then
      raise exception
        'Sales order line % requires a warehouse.',
        v_item.line_number;
    end if;

    v_line_number :=
      v_line_number + 1;

    insert into public.delivery_order_items (
      delivery_order_id,
      sales_order_item_id,

      line_number,

      product_id,
      unit_id,
      warehouse_id,

      sku,
      item_name,
      description,

      ordered_quantity,
      previously_delivered_quantity,
      delivery_quantity,

      picked_quantity,
      packed_quantity,
      dispatched_quantity,
      delivered_quantity,

      unit_cost,

      line_notes
    )
    values (
      v_delivery_order_id,
      v_item.id,

      v_line_number,

      v_item.product_id,
      v_item.unit_id,
      v_item.warehouse_id,

      v_item.sku,
      v_item.item_name,
      v_item.description,

      v_item.quantity,
      v_item.quantity_fulfilled,
      v_delivery_quantity,

      0,
      0,
      0,
      0,

      coalesce(
        v_item.average_unit_cost,
        0
      ),

      v_item.line_notes
    );

    v_item_count :=
      v_item_count + 1;
  end loop;

  if v_item_count = 0 then
    delete from public.delivery_orders
    where id = v_delivery_order_id;

    raise exception
      'No remaining reserved quantities are available for a new delivery.';
  end if;

  /*
   * Once delivery execution starts, the Sales Order
   * moves from Confirmed to Processing.
   */
  update public.sales_orders
  set
    status =
      case
        when status = 'confirmed'
        then 'processing'
        else status
      end,

    processing_at =
      case
        when status = 'confirmed'
        then coalesce(
          processing_at,
          now()
        )
        else processing_at
      end,

    updated_at = now(),
    updated_by = v_user_id
  where id = p_sales_order_id;

  return v_delivery_order_id;
end;
$$;


/* =========================================================
 * Start Picking
 * ========================================================= */

create or replace function
  public.start_delivery_picking(
    p_delivery_order_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delivery public.delivery_orders%rowtype;
begin
  select *
  into v_delivery
  from public.delivery_orders
  where id = p_delivery_order_id
  for update;

  if not found then
    raise exception
      'Delivery order was not found.';
  end if;

  if v_delivery.status <> 'draft' then
    raise exception
      'Only draft deliveries can start picking.';
  end if;

  if not exists (
    select 1
    from public.delivery_order_items
    where delivery_order_id =
      p_delivery_order_id
  ) then
    raise exception
      'The delivery order does not contain any items.';
  end if;

  update public.delivery_orders
  set
    status = 'picking',
    updated_at = now(),
    updated_by = auth.uid()
  where id = p_delivery_order_id;

  return p_delivery_order_id;
end;
$$;


/* =========================================================
 * Confirm Picked
 * ========================================================= */

create or replace function
  public.confirm_delivery_picked(
    p_delivery_order_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delivery public.delivery_orders%rowtype;
begin
  select *
  into v_delivery
  from public.delivery_orders
  where id = p_delivery_order_id
  for update;

  if not found then
    raise exception
      'Delivery order was not found.';
  end if;

  if v_delivery.status not in (
    'draft',
    'picking'
  ) then
    raise exception
      'Only draft or picking deliveries can be marked as picked.';
  end if;

  if not exists (
    select 1
    from public.delivery_order_items
    where delivery_order_id =
      p_delivery_order_id
  ) then
    raise exception
      'The delivery order does not contain any items.';
  end if;

  /*
   * Initial workflow:
   * Confirm the complete planned delivery quantity
   * as picked.
   *
   * A later warehouse UI can set partial picked
   * quantities before calling this function.
   */
  update public.delivery_order_items
  set
    picked_quantity =
      case
        when picked_quantity > 0
        then picked_quantity
        else delivery_quantity
      end,

    updated_at = now()
  where delivery_order_id =
    p_delivery_order_id;

  if exists (
    select 1
    from public.delivery_order_items
    where delivery_order_id =
      p_delivery_order_id
      and (
        picked_quantity <= 0
        or picked_quantity >
          delivery_quantity
      )
  ) then
    raise exception
      'One or more delivery lines contain invalid picked quantities.';
  end if;

  update public.delivery_orders
  set
    status = 'picked',

    picked_at = now(),
    picked_by = auth.uid(),

    updated_at = now(),
    updated_by = auth.uid()
  where id = p_delivery_order_id;

  return p_delivery_order_id;
end;
$$;


/* =========================================================
 * Start Packing
 * ========================================================= */

create or replace function
  public.start_delivery_packing(
    p_delivery_order_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delivery public.delivery_orders%rowtype;
begin
  select *
  into v_delivery
  from public.delivery_orders
  where id = p_delivery_order_id
  for update;

  if not found then
    raise exception
      'Delivery order was not found.';
  end if;

  if v_delivery.status <> 'picked' then
    raise exception
      'Only picked deliveries can start packing.';
  end if;

  update public.delivery_orders
  set
    status = 'packing',
    updated_at = now(),
    updated_by = auth.uid()
  where id = p_delivery_order_id;

  return p_delivery_order_id;
end;
$$;


/* =========================================================
 * Confirm Packed
 * ========================================================= */

create or replace function
  public.confirm_delivery_packed(
    p_delivery_order_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delivery public.delivery_orders%rowtype;
begin
  select *
  into v_delivery
  from public.delivery_orders
  where id = p_delivery_order_id
  for update;

  if not found then
    raise exception
      'Delivery order was not found.';
  end if;

  if v_delivery.status not in (
    'picked',
    'packing'
  ) then
    raise exception
      'Only picked or packing deliveries can be marked as packed.';
  end if;

  update public.delivery_order_items
  set
    packed_quantity =
      case
        when packed_quantity > 0
        then packed_quantity
        else picked_quantity
      end,

    updated_at = now()
  where delivery_order_id =
    p_delivery_order_id;

  if exists (
    select 1
    from public.delivery_order_items
    where delivery_order_id =
      p_delivery_order_id
      and (
        packed_quantity <= 0
        or packed_quantity >
          picked_quantity
      )
  ) then
    raise exception
      'One or more delivery lines contain invalid packed quantities.';
  end if;

  update public.delivery_orders
  set
    status = 'packed',

    packed_at = now(),
    packed_by = auth.uid(),

    updated_at = now(),
    updated_by = auth.uid()
  where id = p_delivery_order_id;

  return p_delivery_order_id;
end;
$$;


/* =========================================================
 * Mark Delivery Delivered
 * ========================================================= */

create or replace function
  public.mark_delivery_delivered(
    p_delivery_order_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delivery public.delivery_orders%rowtype;
begin
  select *
  into v_delivery
  from public.delivery_orders
  where id = p_delivery_order_id
  for update;

  if not found then
    raise exception
      'Delivery order was not found.';
  end if;

  if v_delivery.status = 'delivered' then
    return p_delivery_order_id;
  end if;

  if v_delivery.status <> 'dispatched' then
    raise exception
      'Only dispatched deliveries can be marked as delivered.';
  end if;

  update public.delivery_order_items
  set
    delivered_quantity =
      dispatched_quantity,

    updated_at = now()
  where delivery_order_id =
    p_delivery_order_id;

  update public.delivery_orders
  set
    status = 'delivered',

    delivered_date =
      coalesce(
        delivered_date,
        current_date
      ),

    delivered_at = now(),
    delivered_by = auth.uid(),

    updated_at = now(),
    updated_by = auth.uid()
  where id = p_delivery_order_id;

  return p_delivery_order_id;
end;
$$;


/* =========================================================
 * Cancel Delivery
 * ========================================================= */

create or replace function
  public.cancel_delivery_order(
    p_delivery_order_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delivery public.delivery_orders%rowtype;
begin
  select *
  into v_delivery
  from public.delivery_orders
  where id = p_delivery_order_id
  for update;

  if not found then
    raise exception
      'Delivery order was not found.';
  end if;

  if v_delivery.status = 'cancelled' then
    return p_delivery_order_id;
  end if;

  if v_delivery.status in (
    'dispatched',
    'delivered'
  ) then
    raise exception
      'A dispatched or delivered order cannot be cancelled directly.';
  end if;

  update public.delivery_order_items
  set
    picked_quantity = 0,
    packed_quantity = 0,
    dispatched_quantity = 0,
    delivered_quantity = 0,
    updated_at = now()
  where delivery_order_id =
    p_delivery_order_id;

  update public.delivery_orders
  set
    status = 'cancelled',

    cancelled_at = now(),
    cancelled_by = auth.uid(),

    updated_at = now(),
    updated_by = auth.uid()
  where id = p_delivery_order_id;

  return p_delivery_order_id;
end;
$$;

/* =========================================================
 * Synchronize Sales Order Fulfilment
 *
 * Recalculates item and header fulfilment statuses after
 * delivery dispatch.
 * ========================================================= */

create or replace function
  public.synchronize_sales_order_fulfilment(
    p_sales_order_id uuid
  )
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_status text;
  v_fulfilment_status text;
  v_total_physical_lines integer;
  v_fulfilled_physical_lines integer;
  v_partially_fulfilled_lines integer;
begin
  /*
   * Recalculate each physical Sales Order line.
   */
  update public.sales_order_items
  set
    shortage_quantity =
      greatest(
        quantity
        - quantity_fulfilled
        - quantity_reserved,
        0
      ),

    fulfilment_status =
      case
        when fulfilment_method = 'service'
        then 'not_required'

        when quantity_cancelled >= quantity
        then 'cancelled'

        when quantity_fulfilled >= quantity
        then 'fulfilled'

        when quantity_fulfilled > 0
        then 'partially_fulfilled'

        when fulfilment_method in (
          'local_purchase',
          'import_on_demand',
          'dropship'
        )
        then 'awaiting_procurement'

        when quantity_reserved >= quantity
        then 'allocated'

        when quantity_reserved > 0
        then 'partially_allocated'

        else 'awaiting_stock'
      end,

    procurement_required =
      case
        when fulfilment_method in (
          'local_purchase',
          'import_on_demand',
          'dropship'
        )
          and quantity_fulfilled < quantity
        then true

        when fulfilment_method = 'stock'
          and quantity_fulfilled
            + quantity_reserved
            < quantity
          and allow_backorder
        then true

        else false
      end,

    updated_at = now()
  where sales_order_id =
    p_sales_order_id;

  select count(*)
  into v_total_physical_lines
  from public.sales_order_items
  where sales_order_id =
    p_sales_order_id
    and fulfilment_method <> 'service'
    and quantity_cancelled < quantity;

  select count(*)
  into v_fulfilled_physical_lines
  from public.sales_order_items
  where sales_order_id =
    p_sales_order_id
    and fulfilment_method <> 'service'
    and quantity_cancelled < quantity
    and quantity_fulfilled >= quantity;

  select count(*)
  into v_partially_fulfilled_lines
  from public.sales_order_items
  where sales_order_id =
    p_sales_order_id
    and fulfilment_method <> 'service'
    and quantity_cancelled < quantity
    and quantity_fulfilled > 0
    and quantity_fulfilled < quantity;

  /*
   * Derive the Sales Order header fulfilment status.
   */
  if v_total_physical_lines = 0 then
    v_fulfilment_status :=
      'not_required';

  elsif v_fulfilled_physical_lines =
    v_total_physical_lines
  then
    v_fulfilment_status :=
      'fulfilled';

  elsif v_fulfilled_physical_lines > 0
    or v_partially_fulfilled_lines > 0
  then
    v_fulfilment_status :=
      'partially_fulfilled';

  elsif exists (
    select 1
    from public.sales_order_items
    where sales_order_id =
      p_sales_order_id
      and fulfilment_status =
        'awaiting_procurement'
  ) then
    v_fulfilment_status :=
      'awaiting_procurement';

  elsif exists (
    select 1
    from public.sales_order_items
    where sales_order_id =
      p_sales_order_id
      and fulfilment_status =
        'awaiting_stock'
  ) then
    v_fulfilment_status :=
      'awaiting_stock';

  elsif exists (
    select 1
    from public.sales_order_items
    where sales_order_id =
      p_sales_order_id
      and fulfilment_status =
        'partially_allocated'
  ) then
    v_fulfilment_status :=
      'partially_allocated';

  elsif not exists (
    select 1
    from public.sales_order_items
    where sales_order_id =
      p_sales_order_id
      and fulfilment_status not in (
        'allocated',
        'not_required',
        'cancelled'
      )
  ) then
    v_fulfilment_status :=
      'allocated';

  else
    v_fulfilment_status :=
      'unplanned';
  end if;

  /*
   * Derive the commercial Sales Order status.
   */
  if v_fulfilment_status = 'fulfilled' then
    v_order_status :=
      'fulfilled';

  elsif v_fulfilment_status =
    'partially_fulfilled'
  then
    v_order_status :=
      'partially_fulfilled';

  else
    v_order_status :=
      'processing';
  end if;

  update public.sales_orders
  set
    fulfilment_status =
      v_fulfilment_status,

    status =
      case
        when status in (
          'cancelled',
          'closed',
          'completed'
        )
        then status

        else v_order_status
      end,
      
    updated_at = now(),
    updated_by = auth.uid()
  where id = p_sales_order_id;

  return v_fulfilment_status;
end;
$$;


/* =========================================================
 * Atomic Delivery Dispatch Result
 * ========================================================= */

create or replace function
  public.dispatch_delivery_order_atomic(
    p_delivery_order_id uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delivery public.delivery_orders%rowtype;
  v_sales_order public.sales_orders%rowtype;
  v_delivery_item public.delivery_order_items%rowtype;
  v_sales_item public.sales_order_items%rowtype;
  v_stock public.warehouse_stock%rowtype;

  v_inventory_transaction_id uuid;
  v_transaction_number text;

  v_dispatch_quantity numeric(18, 4);
  v_new_on_hand numeric(18, 4);
  v_new_reserved numeric(18, 4);

  v_line_count integer := 0;
  v_total_dispatched numeric(18, 4) := 0;

  v_fulfilment_status text;
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  /* -------------------------------------------------------
   * Lock Delivery Order
   * ------------------------------------------------------- */

  select *
  into v_delivery
  from public.delivery_orders
  where id = p_delivery_order_id
  for update;

  if not found then
    raise exception
      'Delivery order was not found.';
  end if;

  if v_delivery.status = 'dispatched' then
    select id
    into v_inventory_transaction_id
    from public.inventory_transactions
    where transaction_type =
      'sales_issue'
      and reference_type =
        'delivery_order'
      and reference_id =
        p_delivery_order_id
      and status = 'posted'
    limit 1;

    return jsonb_build_object(
      'deliveryOrderId',
        p_delivery_order_id,

      'status',
        'dispatched',

      'inventoryTransactionId',
        v_inventory_transaction_id,

      'lineCount',
        0,

      'dispatchedQuantity',
        0,

      'alreadyDispatched',
        true
    );
  end if;

  if v_delivery.status <> 'packed' then
    raise exception
      'Only packed delivery orders can be dispatched.';
  end if;

  /* -------------------------------------------------------
   * Lock Sales Order
   * ------------------------------------------------------- */

  select *
  into v_sales_order
  from public.sales_orders
  where id = v_delivery.sales_order_id
  for update;

  if not found then
    raise exception
      'The linked sales order was not found.';
  end if;

  if v_sales_order.status not in (
    'confirmed',
    'processing',
    'partially_fulfilled'
  ) then
    raise exception
      'The linked sales order cannot be dispatched in its current status.';
  end if;

  /* -------------------------------------------------------
   * Validate Delivery Items
   * ------------------------------------------------------- */

  if not exists (
    select 1
    from public.delivery_order_items
    where delivery_order_id =
      p_delivery_order_id
  ) then
    raise exception
      'The delivery order does not contain any items.';
  end if;

  if exists (
    select 1
    from public.delivery_order_items
    where delivery_order_id =
      p_delivery_order_id
      and (
        packed_quantity <= 0
        or packed_quantity >
          picked_quantity
        or packed_quantity >
          delivery_quantity
      )
  ) then
    raise exception
      'One or more delivery lines contain invalid packed quantities.';
  end if;

  /*
   * Prevent duplicate inventory posting.
   */
  if exists (
    select 1
    from public.inventory_transactions
    where transaction_type =
      'sales_issue'
      and reference_type =
        'delivery_order'
      and reference_id =
        p_delivery_order_id
      and status = 'posted'
  ) then
    raise exception
      'Inventory has already been posted for this delivery order.';
  end if;

  /* -------------------------------------------------------
   * Generate Inventory Transaction
   * ------------------------------------------------------- */

  v_transaction_number :=
    'INV-'
    || to_char(
      current_date,
      'YYYY'
    )
    || '-'
    || lpad(
      nextval(
        'public.inventory_transaction_number_seq'
      )::text,
      6,
      '0'
    );

  insert into public.inventory_transactions (
    transaction_number,
    transaction_type,
    status,
    transaction_date,

    warehouse_id,

    reference_type,
    reference_id,
    reference_number,

    description,
    internal_notes,

    posted_at,

    created_by,
    posted_by,

    created_at,
    updated_at
  )
  values (
    v_transaction_number,
    'sales_issue',
    'posted',
    current_date,

    v_delivery.warehouse_id,

    'delivery_order',
    v_delivery.id,
    v_delivery.delivery_number,

    'Delivery dispatch '
      || v_delivery.delivery_number,

    v_delivery.internal_notes,

    now(),

    v_user_id,
    v_user_id,

    now(),
    now()
  )
  returning id
  into v_inventory_transaction_id;

  /* -------------------------------------------------------
   * Process Every Delivery Line
   * ------------------------------------------------------- */

  for v_delivery_item in
    select *
    from public.delivery_order_items
    where delivery_order_id =
      p_delivery_order_id
    order by line_number
    for update
  loop
    v_dispatch_quantity :=
      v_delivery_item.packed_quantity;

    if v_dispatch_quantity <= 0 then
      raise exception
        'Delivery line % has no quantity to dispatch.',
        v_delivery_item.line_number;
    end if;

    if v_delivery_item.product_id is null then
      raise exception
        'Delivery line % must have a linked product.',
        v_delivery_item.line_number;
    end if;

    /*
     * Lock the linked Sales Order item.
     */
    select *
    into v_sales_item
    from public.sales_order_items
    where id =
      v_delivery_item.sales_order_item_id
      and sales_order_id =
        v_sales_order.id
    for update;

    if not found then
      raise exception
        'The Sales Order line linked to delivery line % was not found.',
        v_delivery_item.line_number;
    end if;

    if (
      v_sales_item.quantity_fulfilled
      + v_dispatch_quantity
      > v_sales_item.quantity
    ) then
      raise exception
        'Dispatch quantity exceeds the remaining Sales Order quantity for line %.',
        v_delivery_item.line_number;
    end if;

    if (
      v_sales_item.quantity_reserved
      < v_dispatch_quantity
    ) then
      raise exception
        'Reserved quantity is insufficient for delivery line %.',
        v_delivery_item.line_number;
    end if;

    /*
     * Lock warehouse stock.
     */
    select *
    into v_stock
    from public.warehouse_stock
    where product_id =
      v_delivery_item.product_id
      and warehouse_id =
        v_delivery_item.warehouse_id
    for update;

    if not found then
      raise exception
        'Warehouse stock was not found for delivery line %.',
        v_delivery_item.line_number;
    end if;

    if v_stock.quantity_on_hand <
      v_dispatch_quantity
    then
      raise exception
        'Insufficient on-hand stock for delivery line %.',
        v_delivery_item.line_number;
    end if;

    if v_stock.quantity_reserved <
      v_dispatch_quantity
    then
      raise exception
        'Insufficient warehouse reservation for delivery line %.',
        v_delivery_item.line_number;
    end if;

    v_new_on_hand :=
      v_stock.quantity_on_hand
      - v_dispatch_quantity;

    v_new_reserved :=
      greatest(
        v_stock.quantity_reserved
        - v_dispatch_quantity,
        0
      );

    /*
     * Record negative inventory movement.
     */
    insert into public.inventory_transaction_items (
      inventory_transaction_id,
      warehouse_id,
      product_id,
      line_number,

      quantity_change,
      unit_cost,

      source_document_item_id,

      batch_number,
      lot_number,
      serial_number,

      manufacturing_date,
      expiry_date,

      notes,
      created_at
    )
    values (
      v_inventory_transaction_id,
      v_delivery_item.warehouse_id,
      v_delivery_item.product_id,
      v_delivery_item.line_number,

      -v_dispatch_quantity,
      v_stock.average_unit_cost,

      v_delivery_item.id,

      v_delivery_item.batch_number,
      v_delivery_item.lot_number,
      v_delivery_item.serial_number,

      v_delivery_item.manufacturing_date,
      v_delivery_item.expiry_date,

      v_delivery_item.line_notes,
      now()
    );

    /*
     * quantity_available is generated automatically.
     * Never update it directly.
     */
    update public.warehouse_stock
    set
      quantity_on_hand =
        v_new_on_hand,

      quantity_reserved =
        v_new_reserved,

      last_transaction_at =
        now(),

      updated_at =
        now()
    where id = v_stock.id;

    /*
     * Reduce remaining reservation and increase
     * fulfilled quantity on the Sales Order line.
     */
    update public.sales_order_items
    set
      quantity_reserved =
        greatest(
          quantity_reserved
          - v_dispatch_quantity,
          0
        ),

      quantity_allocated =
        greatest(
          quantity_allocated
          - v_dispatch_quantity,
          0
        ),

      quantity_fulfilled =
        quantity_fulfilled
        + v_dispatch_quantity,

      updated_at =
        now()
    where id = v_sales_item.id;

    update public.delivery_order_items
    set
      dispatched_quantity =
        v_dispatch_quantity,

      updated_at =
        now()
    where id = v_delivery_item.id;

    v_line_count :=
      v_line_count + 1;

    v_total_dispatched :=
      v_total_dispatched
      + v_dispatch_quantity;
  end loop;

  /* -------------------------------------------------------
   * Update Delivery Header
   * ------------------------------------------------------- */

  update public.delivery_orders
  set
    status = 'dispatched',

    dispatched_date =
      coalesce(
        dispatched_date,
        current_date
      ),

    dispatched_at =
      now(),

    dispatched_by =
      v_user_id,

    updated_at =
      now(),

    updated_by =
      v_user_id
  where id = p_delivery_order_id;

  /* -------------------------------------------------------
   * Synchronize Sales Order
   * ------------------------------------------------------- */

  v_fulfilment_status :=
    public.synchronize_sales_order_fulfilment(
      v_sales_order.id
    );

  return jsonb_build_object(
    'deliveryOrderId',
      p_delivery_order_id,

    'salesOrderId',
      v_sales_order.id,

    'status',
      'dispatched',

    'fulfilmentStatus',
      v_fulfilment_status,

    'inventoryTransactionId',
      v_inventory_transaction_id,

    'inventoryTransactionNumber',
      v_transaction_number,

    'lineCount',
      v_line_count,

    'dispatchedQuantity',
      v_total_dispatched,

    'alreadyDispatched',
      false
  );
end;
$$;


/* =========================================================
 * Function Permissions
 * ========================================================= */

revoke all
on function
  public.create_delivery_from_sales_order(
    uuid
  )
from public;

revoke all
on function
  public.start_delivery_picking(
    uuid
  )
from public;

revoke all
on function
  public.confirm_delivery_picked(
    uuid
  )
from public;

revoke all
on function
  public.start_delivery_packing(
    uuid
  )
from public;

revoke all
on function
  public.confirm_delivery_packed(
    uuid
  )
from public;

revoke all
on function
  public.dispatch_delivery_order_atomic(
    uuid
  )
from public;

revoke all
on function
  public.mark_delivery_delivered(
    uuid
  )
from public;

revoke all
on function
  public.cancel_delivery_order(
    uuid
  )
from public;

revoke all
on function
  public.synchronize_sales_order_fulfilment(
    uuid
  )
from public;


grant execute
on function
  public.create_delivery_from_sales_order(
    uuid
  )
to authenticated;

grant execute
on function
  public.start_delivery_picking(
    uuid
  )
to authenticated;

grant execute
on function
  public.confirm_delivery_picked(
    uuid
  )
to authenticated;

grant execute
on function
  public.start_delivery_packing(
    uuid
  )
to authenticated;

grant execute
on function
  public.confirm_delivery_packed(
    uuid
  )
to authenticated;

grant execute
on function
  public.dispatch_delivery_order_atomic(
    uuid
  )
to authenticated;

grant execute
on function
  public.mark_delivery_delivered(
    uuid
  )
to authenticated;

grant execute
on function
  public.cancel_delivery_order(
    uuid
  )
to authenticated;

grant execute
on function
  public.synchronize_sales_order_fulfilment(
    uuid
  )
to authenticated;
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
      and item.fulfilment_method in (
        'stock',
        'local_purchase'
        )
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

      and item.fulfilment_method in (
        'stock',
        'local_purchase'
        )
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
 * Synchronize Sales Order Fulfilment
 *
 * Stock-first aware:
 * Local Purchase may become deliverable after procurement
 * has brought stock into the warehouse and that stock has
 * been reserved against the Sales Order.
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

        /*
         * IMPORTANT:
         *
         * Local Purchase can become allocated once
         * procured inventory has been received and
         * reserved against this Sales Order.
         */
        when fulfilment_method = 'local_purchase'
          and quantity_reserved >=
            greatest(
              quantity - quantity_fulfilled,
              0
            )
        then 'allocated'

        when fulfilment_method = 'local_purchase'
          and quantity_reserved > 0
        then 'partially_allocated'

        /*
         * No stock has been reserved yet.
         * Procurement is still required.
         */
        when fulfilment_method = 'local_purchase'
        then 'awaiting_procurement'

        /*
         * Import / Dropship remain procurement-driven.
         */
        when fulfilment_method in (
          'import_on_demand',
          'dropship'
        )
        then 'awaiting_procurement'

        /*
         * Normal warehouse-stock fulfilment.
         */
        when quantity_reserved >=
          greatest(
            quantity - quantity_fulfilled,
            0
          )
        then 'allocated'

        when quantity_reserved > 0
        then 'partially_allocated'

        else 'awaiting_stock'

      end,

    procurement_required =
      case

        /*
         * Local Purchase:
         * procurement remains required only for the
         * portion not fulfilled or reserved.
         */
        when fulfilment_method = 'local_purchase'
          and (
            quantity_fulfilled
            + quantity_reserved
          ) < quantity
        then true

        when fulfilment_method = 'local_purchase'
        then false

        when fulfilment_method in (
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


  /* ---------------------------------------------------------
   * Count physical fulfilment lines
   * --------------------------------------------------------- */

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


  /* ---------------------------------------------------------
   * Header fulfilment status
   * --------------------------------------------------------- */

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


  /* ---------------------------------------------------------
   * Commercial Sales Order status
   * --------------------------------------------------------- */

  if v_fulfilment_status =
    'fulfilled'
  then

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

  where id =
    p_sales_order_id;


  return v_fulfilment_status;
end;
$$;
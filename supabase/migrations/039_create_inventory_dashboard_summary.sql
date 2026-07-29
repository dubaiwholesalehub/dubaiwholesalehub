create or replace function public.get_inventory_dashboard_summary()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with published_product_stock as (
    select
      p.id as product_id,
      coalesce(sum(ws.quantity_on_hand), 0) as quantity_on_hand,
      coalesce(sum(ws.quantity_reserved), 0) as quantity_reserved,
      coalesce(sum(ws.quantity_available), 0) as quantity_available,
      coalesce(
        sum(ws.quantity_on_hand * ws.average_unit_cost),
        0
      ) as inventory_value
    from products p
    left join warehouse_stock ws
      on ws.product_id = p.id
    where p.status = 'published'
    group by p.id
  ),

  product_summary as (
    select
      count(*) as total_products,

      count(*) filter (
        where quantity_on_hand > 0
          and quantity_on_hand <= 10
      ) as low_stock_products,

      count(*) filter (
        where quantity_on_hand <= 0
      ) as out_of_stock_products
    from published_product_stock
  ),

  stock_summary as (
    select
      coalesce(sum(quantity_on_hand), 0) as total_stock_quantity,
      coalesce(sum(quantity_available), 0) as total_available_quantity,
      coalesce(sum(quantity_reserved), 0) as total_reserved_quantity,
      coalesce(sum(inventory_value), 0) as inventory_value
    from published_product_stock
  ),

  warehouse_summary as (
    select
      count(*) as active_warehouses
    from warehouses
    where is_active = true
  )

  select jsonb_build_object(
    'total_products',
    product_summary.total_products,

    'total_stock_quantity',
    stock_summary.total_stock_quantity,

    'total_available_quantity',
    stock_summary.total_available_quantity,

    'total_reserved_quantity',
    stock_summary.total_reserved_quantity,

    'inventory_value',
    stock_summary.inventory_value,

    'low_stock_products',
    product_summary.low_stock_products,

    'out_of_stock_products',
    product_summary.out_of_stock_products,

    'active_warehouses',
    warehouse_summary.active_warehouses
  )
  from product_summary
  cross join stock_summary
  cross join warehouse_summary;
$$;
create or replace function public.get_warehouse_stock_page(
  p_search text default null,
  p_warehouse_id uuid default null,
  p_category_id uuid default null,
  p_brand_id uuid default null,
  p_stock_status text default null,
  p_sort_by text default 'product_name',
  p_sort_direction text default 'asc',
  p_page integer default 1,
  p_page_size integer default 25
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := least(greatest(coalesce(p_page_size, 25), 1), 100);
  v_offset integer;
  v_total_count bigint;
  v_items jsonb;
begin
  if p_stock_status is not null
    and p_stock_status not in ('in_stock', 'low_stock', 'out_of_stock')
  then
    raise exception 'Invalid stock status';
  end if;

  if p_sort_by not in (
    'product_name',
    'sku',
    'warehouse_name',
    'quantity_on_hand',
    'quantity_available',
    'average_unit_cost',
    'stock_value'
  ) then
    raise exception 'Invalid sort column';
  end if;

  if lower(p_sort_direction) not in ('asc', 'desc') then
    raise exception 'Invalid sort direction';
  end if;

  v_offset := (v_page - 1) * v_page_size;

  with filtered_stock as (
    select
      ws.id,
      ws.warehouse_id,
      ws.product_id,

      w.code as warehouse_code,
      w.name as warehouse_name,

      p.sku,
      p.barcode,
      p.name as product_name,

      c.id as category_id,
      c.name as category_name,

      b.id as brand_id,
      b.name as brand_name,

      ws.quantity_on_hand,
      ws.quantity_reserved,
      ws.quantity_available,
      ws.average_unit_cost,

      ws.quantity_on_hand * ws.average_unit_cost as stock_value,

      case
        when ws.quantity_available <= 0 then 'out_of_stock'
        when ws.quantity_available <= 10 then 'low_stock'
        else 'in_stock'
      end as stock_status,

      ws.last_transaction_at,
      ws.updated_at
    from warehouse_stock ws
    inner join warehouses w
      on w.id = ws.warehouse_id
    inner join products p
      on p.id = ws.product_id
    left join categories c
      on c.id = p.category_id
    left join brands b
      on b.id = p.brand_id
    where
      p.status = 'published'
      and (
        p_search is null
        or btrim(p_search) = ''
        or p.sku ilike '%' || btrim(p_search) || '%'
        or p.name ilike '%' || btrim(p_search) || '%'
        or coalesce(p.barcode, '') ilike '%' || btrim(p_search) || '%'
        or coalesce(b.name, '') ilike '%' || btrim(p_search) || '%'
      )
      and (
        p_warehouse_id is null
        or ws.warehouse_id = p_warehouse_id
      )
      and (
        p_category_id is null
        or p.category_id = p_category_id
      )
      and (
        p_brand_id is null
        or p.brand_id = p_brand_id
      )
      and (
        p_stock_status is null
        or (
          p_stock_status = 'out_of_stock'
          and ws.quantity_available <= 0
        )
        or (
          p_stock_status = 'low_stock'
          and ws.quantity_available > 0
          and ws.quantity_available <= 10
        )
        or (
          p_stock_status = 'in_stock'
          and ws.quantity_available > 10
        )
      )
  )
  select count(*)
  into v_total_count
  from filtered_stock;

  with filtered_stock as (
    select
      ws.id,
      ws.warehouse_id,
      ws.product_id,

      w.code as warehouse_code,
      w.name as warehouse_name,

      p.sku,
      p.barcode,
      p.name as product_name,

      c.id as category_id,
      c.name as category_name,

      b.id as brand_id,
      b.name as brand_name,

      ws.quantity_on_hand,
      ws.quantity_reserved,
      ws.quantity_available,
      ws.average_unit_cost,

      ws.quantity_on_hand * ws.average_unit_cost as stock_value,

      case
        when ws.quantity_available <= 0 then 'out_of_stock'
        when ws.quantity_available <= 10 then 'low_stock'
        else 'in_stock'
      end as stock_status,

      ws.last_transaction_at,
      ws.updated_at
    from warehouse_stock ws
    inner join warehouses w
      on w.id = ws.warehouse_id
    inner join products p
      on p.id = ws.product_id
    left join categories c
      on c.id = p.category_id
    left join brands b
      on b.id = p.brand_id
    where
      p.status = 'published'
      and (
        p_search is null
        or btrim(p_search) = ''
        or p.sku ilike '%' || btrim(p_search) || '%'
        or p.name ilike '%' || btrim(p_search) || '%'
        or coalesce(p.barcode, '') ilike '%' || btrim(p_search) || '%'
        or coalesce(b.name, '') ilike '%' || btrim(p_search) || '%'
      )
      and (
        p_warehouse_id is null
        or ws.warehouse_id = p_warehouse_id
      )
      and (
        p_category_id is null
        or p.category_id = p_category_id
      )
      and (
        p_brand_id is null
        or p.brand_id = p_brand_id
      )
      and (
        p_stock_status is null
        or (
          p_stock_status = 'out_of_stock'
          and ws.quantity_available <= 0
        )
        or (
          p_stock_status = 'low_stock'
          and ws.quantity_available > 0
          and ws.quantity_available <= 10
        )
        or (
          p_stock_status = 'in_stock'
          and ws.quantity_available > 10
        )
      )
  ),
  sorted_stock as (
    select *
    from filtered_stock
    order by
      case
        when p_sort_by = 'product_name'
          and lower(p_sort_direction) = 'asc'
        then product_name
      end asc,

      case
        when p_sort_by = 'product_name'
          and lower(p_sort_direction) = 'desc'
        then product_name
      end desc,

      case
        when p_sort_by = 'sku'
          and lower(p_sort_direction) = 'asc'
        then sku
      end asc,

      case
        when p_sort_by = 'sku'
          and lower(p_sort_direction) = 'desc'
        then sku
      end desc,

      case
        when p_sort_by = 'warehouse_name'
          and lower(p_sort_direction) = 'asc'
        then warehouse_name
      end asc,

      case
        when p_sort_by = 'warehouse_name'
          and lower(p_sort_direction) = 'desc'
        then warehouse_name
      end desc,

      case
        when p_sort_by = 'quantity_on_hand'
          and lower(p_sort_direction) = 'asc'
        then quantity_on_hand
      end asc,

      case
        when p_sort_by = 'quantity_on_hand'
          and lower(p_sort_direction) = 'desc'
        then quantity_on_hand
      end desc,

      case
        when p_sort_by = 'quantity_available'
          and lower(p_sort_direction) = 'asc'
        then quantity_available
      end asc,

      case
        when p_sort_by = 'quantity_available'
          and lower(p_sort_direction) = 'desc'
        then quantity_available
      end desc,

      case
        when p_sort_by = 'average_unit_cost'
          and lower(p_sort_direction) = 'asc'
        then average_unit_cost
      end asc,

      case
        when p_sort_by = 'average_unit_cost'
          and lower(p_sort_direction) = 'desc'
        then average_unit_cost
      end desc,

      case
        when p_sort_by = 'stock_value'
          and lower(p_sort_direction) = 'asc'
        then stock_value
      end asc,

      case
        when p_sort_by = 'stock_value'
          and lower(p_sort_direction) = 'desc'
        then stock_value
      end desc,

      product_name asc,
      warehouse_name asc
    limit v_page_size
    offset v_offset
  )
  select coalesce(jsonb_agg(to_jsonb(sorted_stock)), '[]'::jsonb)
  into v_items
  from sorted_stock;

  return jsonb_build_object(
    'items', v_items,
    'pagination', jsonb_build_object(
      'page', v_page,
      'page_size', v_page_size,
      'total_count', v_total_count,
      'total_pages',
        case
          when v_total_count = 0 then 0
          else ceil(v_total_count::numeric / v_page_size)::integer
        end
    )
  );
end;
$$;
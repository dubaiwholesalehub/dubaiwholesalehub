/*
 * HM ERP — Inventory Product Health
 *
 * Provides inventory movement intelligence for products.
 *
 * Current classifications:
 *
 * out_of_stock
 * low_stock
 * fast_moving
 * slow_moving
 * dead_stock
 * no_sales
 * healthy
 *
 * This is intentionally the first practical version.
 * Thresholds can later become company settings.
 */

create or replace function
  public.get_inventory_product_health(
    p_limit integer default 100
  )
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with product_stock as (
  select
    p.id as product_id,
    p.name as product_name,
    p.sku,
    p.status,

    coalesce(
      sum(ws.quantity_on_hand),
      0
    ) as quantity_on_hand,

    coalesce(
      sum(ws.quantity_reserved),
      0
    ) as quantity_reserved,

    coalesce(
      sum(ws.quantity_available),
      0
    ) as quantity_available,

    coalesce(
      sum(
        ws.quantity_on_hand
        * ws.average_unit_cost
      ),
      0
    ) as inventory_value,

    max(
      ws.last_transaction_at
    ) as last_inventory_movement_at

  from public.products p

  left join public.warehouse_stock ws
    on ws.product_id = p.id

  where
    p.status <> 'archived'
    and coalesce(
      p.fulfilment_method,
      'stock'
    ) <> 'service'

  group by
    p.id,
    p.name,
    p.sku,
    p.status
),

sales_movement as (
  select
    iti.product_id,

    coalesce(
      sum(
        abs(
          iti.quantity_change
        )
      ) filter (
        where
          it.transaction_type =
            'sales_issue'

          and
          it.transaction_date >=
            current_date
            - interval '30 days'
      ),
      0
    ) as sold_30_days,

    coalesce(
      sum(
        abs(
          iti.quantity_change
        )
      ) filter (
        where
          it.transaction_type =
            'sales_issue'

          and
          it.transaction_date >=
            current_date
            - interval '90 days'
      ),
      0
    ) as sold_90_days,

    coalesce(
      sum(
        abs(
          iti.quantity_change
        )
      ) filter (
        where
          it.transaction_type =
            'sales_issue'

          and
          it.transaction_date >=
            current_date
            - interval '180 days'
      ),
      0
    ) as sold_180_days,

    max(
      it.transaction_date
    ) filter (
      where
        it.transaction_type =
          'sales_issue'
    ) as last_sale_date

  from public.inventory_transaction_items iti

  inner join public.inventory_transactions it
    on it.id =
      iti.inventory_transaction_id

  where
    it.status = 'posted'

  group by
    iti.product_id
),

combined as (
  select
    ps.product_id,
    ps.product_name,
    ps.sku,

    ps.quantity_on_hand,
    ps.quantity_reserved,
    ps.quantity_available,

    ps.inventory_value,

    ps.last_inventory_movement_at,

    coalesce(
      sm.sold_30_days,
      0
    ) as sold_30_days,

    coalesce(
      sm.sold_90_days,
      0
    ) as sold_90_days,

    coalesce(
      sm.sold_180_days,
      0
    ) as sold_180_days,

    sm.last_sale_date,

    case

      /*
       * No physical stock.
       */
      when
        ps.quantity_on_hand <= 0
      then
        'out_of_stock'


      /*
       * Current low-stock rule.
       *
       * This matches the existing inventory
       * dashboard threshold.
       */
      when
        ps.quantity_on_hand > 0
        and ps.quantity_on_hand <= 10
      then
        'low_stock'


      /*
       * Fast-moving v1:
       *
       * At least 50% of current on-hand
       * quantity sold during last 30 days.
       */
      when
        coalesce(
          sm.sold_30_days,
          0
        ) > 0

        and
        coalesce(
          sm.sold_30_days,
          0
        ) >=
          ps.quantity_on_hand * 0.50
      then
        'fast_moving'


      /*
       * Dead stock:
       *
       * Product has stock but no sales for
       * 180 days or more.
       */
      when
        ps.quantity_on_hand > 0

        and (
          sm.last_sale_date is null

          or
          sm.last_sale_date <
            current_date
            - interval '180 days'
        )
      then
        case
          when sm.last_sale_date is null
          then 'no_sales'
          else 'dead_stock'
        end


      /*
       * Slow moving:
       *
       * Product sold something in 180 days,
       * but nothing in the latest 90 days.
       */
      when
        ps.quantity_on_hand > 0

        and
        coalesce(
          sm.sold_180_days,
          0
        ) > 0

        and
        coalesce(
          sm.sold_90_days,
          0
        ) = 0
      then
        'slow_moving'


      else
        'healthy'

    end as health_status

  from product_stock ps

  left join sales_movement sm
    on sm.product_id =
      ps.product_id
),

summary as (
  select
    count(*) as total_products,

    count(*) filter (
      where health_status =
        'fast_moving'
    ) as fast_moving,

    count(*) filter (
      where health_status =
        'slow_moving'
    ) as slow_moving,

    count(*) filter (
      where health_status =
        'dead_stock'
    ) as dead_stock,

    count(*) filter (
      where health_status =
        'no_sales'
    ) as no_sales,

    count(*) filter (
      where health_status =
        'low_stock'
    ) as low_stock,

    count(*) filter (
      where health_status =
        'out_of_stock'
    ) as out_of_stock,

    count(*) filter (
      where health_status =
        'healthy'
    ) as healthy,

    coalesce(
      sum(
        inventory_value
      ) filter (
        where health_status in (
          'dead_stock',
          'no_sales'
        )
      ),
      0
    ) as dormant_inventory_value

  from combined
),

top_attention as (
  select
    jsonb_agg(
      jsonb_build_object(
        'product_id',
          product_id,

        'product_name',
          product_name,

        'sku',
          sku,

        'health_status',
          health_status,

        'quantity_on_hand',
          quantity_on_hand,

        'quantity_reserved',
          quantity_reserved,

        'quantity_available',
          quantity_available,

        'inventory_value',
          inventory_value,

        'sold_30_days',
          sold_30_days,

        'sold_90_days',
          sold_90_days,

        'sold_180_days',
          sold_180_days,

        'last_sale_date',
          last_sale_date,

        'last_inventory_movement_at',
          last_inventory_movement_at
      )
      order by
        case health_status
          when 'dead_stock' then 1
          when 'no_sales' then 2
          when 'out_of_stock' then 3
          when 'low_stock' then 4
          when 'slow_moving' then 5
          when 'fast_moving' then 6
          else 7
        end,

        inventory_value desc
    ) filter (
      where health_status <>
        'healthy'
    ) as items

  from (
    select *
    from combined

    where
      health_status <>
        'healthy'

    order by
      inventory_value desc

    limit greatest(
      coalesce(
        p_limit,
        100
      ),
      1
    )
  ) ranked
)

select jsonb_build_object(
  'summary',
    jsonb_build_object(
      'total_products',
        summary.total_products,

      'fast_moving',
        summary.fast_moving,

      'slow_moving',
        summary.slow_moving,

      'dead_stock',
        summary.dead_stock,

      'no_sales',
        summary.no_sales,

      'low_stock',
        summary.low_stock,

      'out_of_stock',
        summary.out_of_stock,

      'healthy',
        summary.healthy,

      'dormant_inventory_value',
        summary.dormant_inventory_value
    ),

  'items',
    coalesce(
      top_attention.items,
      '[]'::jsonb
    )
)

from summary
cross join top_attention;
$$;


/* =========================================================
 * Permissions
 * ========================================================= */

revoke all
on function
  public.get_inventory_product_health(
    integer
  )
from public;

grant execute
on function
  public.get_inventory_product_health(
    integer
  )
to authenticated;


comment on function
  public.get_inventory_product_health(
    integer
  )
is
  'Returns HM ERP product inventory health using current warehouse stock and posted sales_issue inventory movements.';
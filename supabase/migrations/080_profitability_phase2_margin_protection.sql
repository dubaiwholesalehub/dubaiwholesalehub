/*
 * =========================================================
 * 080 — Profitability Phase 2 + Margin Protection
 *
 * Adds:
 *
 * 1. Sales margin policy
 * 2. Draft Sales Order margin analysis
 * 3. Confirmation-time margin protection
 * 4. Profitability by category
 * 5. Profitability by warehouse
 * 6. Profitability by sales source/channel
 *
 * Stock-line protection uses warehouse average_unit_cost.
 *
 * Procurement / dropship / service lines are not blocked
 * until a reliable actual/estimated procurement cost exists.
 * =========================================================
 */


/* =========================================================
 * 1. Sales Margin Policy
 * ========================================================= */

create table if not exists
  public.sales_margin_policy
(
  id uuid
    primary key
    default gen_random_uuid(),

  policy_name text
    not null
    default 'Default Sales Margin Policy',

  is_active boolean
    not null
    default true,

  /*
   * Warn when margin is below this percentage.
   */
  warning_margin_percentage numeric(8, 4)
    not null
    default 15,

  /*
   * Block confirmation when margin is below this percentage.
   *
   * Default 0 means:
   * never confirm a sale below current inventory cost.
   */
  minimum_margin_percentage numeric(8, 4)
    not null
    default 0,

  block_below_minimum boolean
    not null
    default true,

  /*
   * Stock with zero/unknown cost should not silently pass.
   */
  block_when_cost_missing boolean
    not null
    default true,

  created_by uuid
    references public.profiles(id),

  updated_by uuid
    references public.profiles(id),

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  constraint
    sales_margin_policy_warning_check
  check (
    warning_margin_percentage
      between -100 and 1000
  ),

  constraint
    sales_margin_policy_minimum_check
  check (
    minimum_margin_percentage
      between -100 and 1000
  )
);


/*
 * Only one active global policy for now.
 */
create unique index if not exists
  sales_margin_policy_one_active_idx
on public.sales_margin_policy (
  is_active
)
where is_active = true;


/* =========================================================
 * Seed Default Policy
 * ========================================================= */

insert into
  public.sales_margin_policy
(
  policy_name,
  warning_margin_percentage,
  minimum_margin_percentage,
  block_below_minimum,
  block_when_cost_missing
)
select
  'Default Sales Margin Policy',
  15,
  0,
  true,
  true

where not exists (
  select 1
  from public.sales_margin_policy
  where is_active = true
);


/* =========================================================
 * 2. Draft Sales Order Margin Analysis
 * ========================================================= */

create or replace view
  public.sales_order_margin_analysis
with (
  security_invoker = true
)
as

select
  sales_order.id
    as sales_order_id,

  sales_order.order_number,

  sales_order.status,

  sales_order.customer_id,

  sales_order.source,

  sales_order.currency_code,

  sales_order.exchange_rate,

  sales_item.id
    as sales_order_item_id,

  sales_item.line_number,

  sales_item.product_id,

  product.category_id,

  sales_item.item_name,

  sales_item.sku,

  sales_item.fulfilment_method,

  coalesce(
    sales_item.warehouse_id,
    sales_order.warehouse_id
  )
    as warehouse_id,

  sales_item.quantity,

  sales_item.unit_price,

  sales_item.discount_amount,

  /*
   * Net selling value excluding VAT.
   *
   * line_subtotal already represents the line before VAT.
   */
  sales_item.line_subtotal
    as net_sales_value,

  case
    when sales_item.quantity > 0
    then
      round(
        sales_item.line_subtotal
        /
        sales_item.quantity,
        4
      )
    else 0
  end
    as effective_unit_selling_price,

  warehouse_stock.average_unit_cost
    as current_unit_cost,

  case
    when
      sales_item.fulfilment_method = 'stock'
      and warehouse_stock.average_unit_cost is not null
    then
      round(
        warehouse_stock.average_unit_cost
        *
        sales_item.quantity,
        2
      )
    else null
  end
    as estimated_cogs,

  case
    when
      sales_item.fulfilment_method = 'stock'
      and warehouse_stock.average_unit_cost is not null
    then
      round(
        sales_item.line_subtotal
        -
        (
          warehouse_stock.average_unit_cost
          *
          sales_item.quantity
        ),
        2
      )
    else null
  end
    as estimated_gross_profit,

  case
    when
      sales_item.fulfilment_method = 'stock'
      and warehouse_stock.average_unit_cost is not null
      and sales_item.line_subtotal > 0
    then
      round(
        (
          sales_item.line_subtotal
          -
          (
            warehouse_stock.average_unit_cost
            *
            sales_item.quantity
          )
        )
        /
        sales_item.line_subtotal
        *
        100,
        2
      )
    else null
  end
    as estimated_margin_percentage,

  case
    when sales_item.fulfilment_method <> 'stock'
    then
      'cost_not_available'

    when warehouse_stock.id is null
    then
      'cost_missing'

    when warehouse_stock.average_unit_cost <= 0
    then
      'cost_missing'

    when
      (
        (
          sales_item.line_subtotal
          -
          (
            warehouse_stock.average_unit_cost
            *
            sales_item.quantity
          )
        )
        /
        nullif(
          sales_item.line_subtotal,
          0
        )
        *
        100
      )
      <
      coalesce(
        policy.minimum_margin_percentage,
        0
      )
    then
      'blocked'

    when
      (
        (
          sales_item.line_subtotal
          -
          (
            warehouse_stock.average_unit_cost
            *
            sales_item.quantity
          )
        )
        /
        nullif(
          sales_item.line_subtotal,
          0
        )
        *
        100
      )
      <
      coalesce(
        policy.warning_margin_percentage,
        15
      )
    then
      'warning'

    else
      'healthy'
  end
    as margin_status

from
  public.sales_orders
    sales_order

inner join
  public.sales_order_items
    sales_item
  on
    sales_item.sales_order_id =
      sales_order.id

left join
  public.products
    product
  on
    product.id =
      sales_item.product_id

left join
  public.warehouse_stock
    warehouse_stock
  on
    warehouse_stock.product_id =
      sales_item.product_id

  and warehouse_stock.warehouse_id =
      coalesce(
        sales_item.warehouse_id,
        sales_order.warehouse_id
      )

left join lateral (
  select
    p.*
  from
    public.sales_margin_policy p
  where
    p.is_active = true
  order by
    p.updated_at desc
  limit 1
) policy
  on true;


/* =========================================================
 * 3. Validate One Sales Order Margin
 *
 * This is reusable from:
 *
 * - UI preview
 * - normal Sales Order confirmation
 * - Quick Sale
 * - future APIs/imports
 * ========================================================= */

create or replace function
  public.validate_sales_order_margin(
    p_sales_order_id uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_policy
    public.sales_margin_policy%rowtype;

  v_line record;

  v_warning_count integer := 0;

  v_blocked_count integer := 0;

  v_missing_cost_count integer := 0;

  v_lowest_margin numeric(18, 4);

begin

  v_user_id :=
    auth.uid();


  if v_user_id is null then
    raise exception
      'Authentication is required.';
  end if;


  if not public.is_admin() then
    raise exception
      'You are not authorized to validate sales margins.';
  end if;


  select *
  into v_policy
  from public.sales_margin_policy
  where is_active = true
  order by updated_at desc
  limit 1;


  if not found then
    raise exception
      'No active sales margin policy exists.';
  end if;


  if not exists (
    select 1
    from public.sales_orders
    where id = p_sales_order_id
  ) then
    raise exception
      'Sales order was not found.';
  end if;


  /*
   * Only STOCK lines can currently be protected using
   * real warehouse average cost.
   */
  for v_line in

    select *
    from public.sales_order_margin_analysis
    where sales_order_id =
      p_sales_order_id

      and fulfilment_method =
        'stock'

    order by line_number

  loop

    if
      v_line.current_unit_cost is null
      or
      v_line.current_unit_cost <= 0
    then

      v_missing_cost_count :=
        v_missing_cost_count + 1;


      if v_policy.block_when_cost_missing then

        raise exception
          'Cannot confirm Sales Order %. Line % (%) has no valid inventory cost.',
          v_line.order_number,
          v_line.line_number,
          v_line.item_name;

      end if;


      continue;

    end if;


    if
      v_line.estimated_margin_percentage
      is not null
    then

      if
        v_lowest_margin is null
        or
        v_line.estimated_margin_percentage <
          v_lowest_margin
      then
        v_lowest_margin :=
          v_line.estimated_margin_percentage;
      end if;

    end if;


    if
      v_line.estimated_margin_percentage
      <
      v_policy.minimum_margin_percentage
    then

      v_blocked_count :=
        v_blocked_count + 1;


      if
        v_policy.block_below_minimum
      then

        raise exception
          'Margin protection blocked Sales Order %. Line % (%) margin is %%%, below the minimum %%%. Selling value: %, estimated cost: %.',
          v_line.order_number,
          v_line.line_number,
          v_line.item_name,
          round(
            v_line.estimated_margin_percentage,
            2
          ),
          round(
            v_policy.minimum_margin_percentage,
            2
          ),
          round(
            v_line.net_sales_value,
            2
          ),
          round(
            v_line.estimated_cogs,
            2
          );

      end if;


    elsif
      v_line.estimated_margin_percentage
      <
      v_policy.warning_margin_percentage
    then

      v_warning_count :=
        v_warning_count + 1;

    end if;

  end loop;


  return
    jsonb_build_object(
      'salesOrderId',
        p_sales_order_id,

      'warningMarginPercentage',
        v_policy.warning_margin_percentage,

      'minimumMarginPercentage',
        v_policy.minimum_margin_percentage,

      'warningLines',
        v_warning_count,

      'blockedLines',
        v_blocked_count,

      'missingCostLines',
        v_missing_cost_count,

      'lowestMarginPercentage',
        v_lowest_margin,

      'canConfirm',
        (
          v_blocked_count = 0
          and
          (
            not v_policy.block_when_cost_missing
            or
            v_missing_cost_count = 0
          )
        )
    );

end;
$$;


/* =========================================================
 * 4. Profitability by Category
 * ========================================================= */

create or replace view
  public.profitability_by_category
with (
  security_invoker = true
)
as

select
  product.category_id,

  category.name
    as category_name,

  count(
    distinct line.sales_order_id
  )
    as sales_order_count,

  sum(
    line.recognized_quantity
  )
    as quantity_sold,

  round(
    sum(
      line.base_net_revenue
    ),
    2
  )
    as revenue,

  round(
    sum(
      line.base_cogs
    ),
    2
  )
    as cogs,

  round(
    sum(
      line.gross_profit
    ),
    2
  )
    as gross_profit,

  round(
    case
      when sum(
        line.base_net_revenue
      ) > 0
      then
        sum(
          line.gross_profit
        )
        /
        sum(
          line.base_net_revenue
        )
        *
        100
      else 0
    end,
    2
  )
    as gross_margin_percentage

from
  public.profitability_sales_lines line

left join
  public.products product
  on product.id =
    line.product_id

left join
  public.categories category
  on category.id =
    product.category_id

group by
  product.category_id,
  category.name;


/* =========================================================
 * 5. Profitability by Warehouse
 * ========================================================= */

create or replace view
  public.profitability_by_warehouse
with (
  security_invoker = true
)
as

select
  line.warehouse_id,

  warehouse.code
    as warehouse_code,

  warehouse.name
    as warehouse_name,

  count(
    distinct line.sales_order_id
  )
    as sales_order_count,

  sum(
    line.recognized_quantity
  )
    as quantity_sold,

  round(
    sum(
      line.base_net_revenue
    ),
    2
  )
    as revenue,

  round(
    sum(
      line.base_cogs
    ),
    2
  )
    as cogs,

  round(
    sum(
      line.gross_profit
    ),
    2
  )
    as gross_profit,

  round(
    case
      when sum(
        line.base_net_revenue
      ) > 0
      then
        sum(
          line.gross_profit
        )
        /
        sum(
          line.base_net_revenue
        )
        *
        100
      else 0
    end,
    2
  )
    as gross_margin_percentage

from
  public.profitability_sales_lines line

left join
  public.warehouses warehouse
  on warehouse.id =
    line.warehouse_id

group by
  line.warehouse_id,
  warehouse.code,
  warehouse.name;


/* =========================================================
 * 6. Profitability by Sales Source / Channel
 *
 * Existing sales_orders.source already tracks the origin.
 * ========================================================= */

create or replace view
  public.profitability_by_sales_source
with (
  security_invoker = true
)
as

select
  sales_order.source,

  count(
    distinct line.sales_order_id
  )
    as sales_order_count,

  sum(
    line.recognized_quantity
  )
    as quantity_sold,

  round(
    sum(
      line.base_net_revenue
    ),
    2
  )
    as revenue,

  round(
    sum(
      line.base_cogs
    ),
    2
  )
    as cogs,

  round(
    sum(
      line.gross_profit
    ),
    2
  )
    as gross_profit,

  round(
    case
      when sum(
        line.base_net_revenue
      ) > 0
      then
        sum(
          line.gross_profit
        )
        /
        sum(
          line.base_net_revenue
        )
        *
        100
      else 0
    end,
    2
  )
    as gross_margin_percentage

from
  public.profitability_sales_lines line

inner join
  public.sales_orders sales_order
  on sales_order.id =
    line.sales_order_id

group by
  sales_order.source;


/* =========================================================
 * 7. RLS
 * ========================================================= */

alter table
  public.sales_margin_policy
enable row level security;


drop policy if exists
  sales_margin_policy_admin
on
  public.sales_margin_policy;


create policy
  sales_margin_policy_admin
on
  public.sales_margin_policy
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


/* =========================================================
 * 8. Permissions
 * ========================================================= */

grant select
on
  public.sales_order_margin_analysis,
  public.profitability_by_category,
  public.profitability_by_warehouse,
  public.profitability_by_sales_source
to authenticated;


revoke all
on function
  public.validate_sales_order_margin(
    uuid
  )
from public;


grant execute
on function
  public.validate_sales_order_margin(
    uuid
  )
to authenticated;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on table
  public.sales_margin_policy
is
  'Global sales margin policy used to warn or block Sales Orders based on current stock average cost.';


comment on view
  public.sales_order_margin_analysis
is
  'Draft/current Sales Order line margin analysis using net selling value and current warehouse average inventory cost.';


comment on function
  public.validate_sales_order_margin(
    uuid
  )
is
  'Validates stock-line Sales Order margins against the active margin policy and blocks confirmation when required.';
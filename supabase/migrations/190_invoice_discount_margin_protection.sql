/* =========================================================
 * Migration 190
 * Invoice Discount Margin Protection
 *
 * Purpose
 * -------
 * Make Sales Order margin protection aware of the
 * invoice-level discount introduced in migration 189.
 *
 * The invoice discount is allocated proportionally across
 * Sales Order lines based on each line's net selling value
 * before VAT (line_subtotal).
 *
 * Delivery charges and round-off are intentionally excluded
 * from product margin analysis.
 *
 * Existing cost hierarchy is preserved:
 *
 *   1. margin_cost_override
 *   2. warehouse average cost
 *
 * Actual dispatch COGS remains unchanged.
 * ========================================================= */


/* =========================================================
 * Rebuild the canonical Sales Order margin analysis view.
 *
 * Migration 169 dropped/recreated this view when changing
 * warehouse cost precision. We follow the same pattern.
 * ========================================================= */

drop view public.sales_order_margin_analysis;


create view
  public.sales_order_margin_analysis
with (
  security_invoker = true
)
as

with order_line_totals as (

  select
    sales_order_item.sales_order_id,

    sum(
      sales_order_item.line_subtotal
    )
      as order_net_item_value

  from
    public.sales_order_items
      sales_order_item

  group by
    sales_order_item.sales_order_id
),

margin_base as (

  select

    /* =====================================================
     * Sales Order Header
     * ===================================================== */

    sales_order.id
      as sales_order_id,

    sales_order.order_number,

    sales_order.status,

    sales_order.customer_id,

    sales_order.source,

    sales_order.currency_code,

    sales_order.exchange_rate,


    /* =====================================================
     * Sales Order Item
     * ===================================================== */

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

    warehouse_stock.average_unit_cost
      as warehouse_average_unit_cost,

    sales_item.margin_cost_override,

    sales_item.margin_cost_override_reason,


    /* =====================================================
     * Effective Cost
     *
     * Preserve migration 169 behaviour.
     * ===================================================== */

    coalesce(
      sales_item.margin_cost_override,
      warehouse_stock.average_unit_cost
    )
      as current_unit_cost,


    /* =====================================================
     * Invoice Discount Allocation
     *
     * Allocation is proportional to line_subtotal.
     *
     * Do not round the allocation to 2dp here. Margin
     * protection should use the mathematically accurate
     * proportional value rather than introducing artificial
     * line-level rounding differences.
     * ===================================================== */

    case
      when
        coalesce(
          order_line_totals.order_net_item_value,
          0
        ) > 0
      then
        coalesce(
          sales_order.invoice_discount_amount,
          0
        )
        *
        sales_item.line_subtotal
        /
        order_line_totals.order_net_item_value

      else
        0
    end
      as allocated_invoice_discount,


    /* =====================================================
     * Effective Net Sales Value
     *
     * Product revenue after:
     *
     *   item-level discount
     *   invoice-level discount allocation
     *
     * VAT, delivery charges and round-off are excluded.
     * ===================================================== */

    sales_item.line_subtotal
    -
    case
      when
        coalesce(
          order_line_totals.order_net_item_value,
          0
        ) > 0
      then
        coalesce(
          sales_order.invoice_discount_amount,
          0
        )
        *
        sales_item.line_subtotal
        /
        order_line_totals.order_net_item_value

      else
        0
    end
      as adjusted_net_sales_value

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
    order_line_totals
    on
      order_line_totals.sales_order_id =
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

      and

      warehouse_stock.warehouse_id =
        coalesce(
          sales_item.warehouse_id,
          sales_order.warehouse_id
        )
),

margin_calculation as (

  select
    margin_base.*,


    /* =====================================================
     * Estimated COGS
     * ===================================================== */

    case
      when
        margin_base.fulfilment_method =
          'stock'

        and

        margin_base.current_unit_cost
          is not null

      then
        round(
          margin_base.current_unit_cost
          *
          margin_base.quantity,
          2
        )

      else
        null
    end
      as calculated_estimated_cogs,


    /* =====================================================
     * Estimated Gross Profit
     * ===================================================== */

    case
      when
        margin_base.fulfilment_method =
          'stock'

        and

        margin_base.current_unit_cost
          is not null

      then
        round(
          margin_base.adjusted_net_sales_value
          -
          (
            margin_base.current_unit_cost
            *
            margin_base.quantity
          ),
          2
        )

      else
        null
    end
      as calculated_estimated_gross_profit,


    /* =====================================================
     * Estimated Margin Percentage
     * ===================================================== */

    case
      when
        margin_base.fulfilment_method =
          'stock'

        and

        margin_base.current_unit_cost
          is not null

        and

        margin_base.adjusted_net_sales_value > 0

      then
        round(
          (
            margin_base.adjusted_net_sales_value
            -
            (
              margin_base.current_unit_cost
              *
              margin_base.quantity
            )
          )
          /
          margin_base.adjusted_net_sales_value
          *
          100,
          2
        )

      else
        null
    end
      as calculated_margin_percentage

  from
    margin_base
)

select

  /* =======================================================
   * IMPORTANT
   *
   * Preserve the original view column order from migration
   * 169 because application/database consumers already rely
   * on this view.
   * ======================================================= */

  margin_calculation.sales_order_id,

  margin_calculation.order_number,

  margin_calculation.status,

  margin_calculation.customer_id,

  margin_calculation.source,

  margin_calculation.currency_code,

  margin_calculation.exchange_rate,

  margin_calculation.sales_order_item_id,

  margin_calculation.line_number,

  margin_calculation.product_id,

  margin_calculation.category_id,

  margin_calculation.item_name,

  margin_calculation.sku,

  margin_calculation.fulfilment_method,

  margin_calculation.warehouse_id,

  margin_calculation.quantity,

  margin_calculation.unit_price,

  margin_calculation.discount_amount,


  /* =======================================================
   * Net Sales Value
   *
   * Now includes proportional invoice discount allocation.
   * ======================================================= */

  margin_calculation.adjusted_net_sales_value
    as net_sales_value,


  /* =======================================================
   * Effective Unit Selling Price
   * ======================================================= */

  case
    when
      margin_calculation.quantity > 0

    then
      round(
        margin_calculation.adjusted_net_sales_value
        /
        margin_calculation.quantity,
        4
      )

    else
      0
  end
    as effective_unit_selling_price,


  /* =======================================================
   * Current Unit Cost
   * ======================================================= */

  margin_calculation.current_unit_cost,


  /* =======================================================
   * Estimated COGS
   * ======================================================= */

  margin_calculation.calculated_estimated_cogs
    as estimated_cogs,


  /* =======================================================
   * Estimated Gross Profit
   * ======================================================= */

  margin_calculation.calculated_estimated_gross_profit
    as estimated_gross_profit,


  /* =======================================================
   * Estimated Gross Margin %
   * ======================================================= */

  margin_calculation.calculated_margin_percentage
    as estimated_margin_percentage,


  /* =======================================================
   * Margin Status
   * ======================================================= */

  case

    when
      margin_calculation.fulfilment_method <>
        'stock'

    then
      'cost_not_available'


    when
      margin_calculation.current_unit_cost
        is null

      or

      margin_calculation.current_unit_cost <= 0

    then
      'cost_missing'


    /*
     * A discount that reduces effective revenue to zero or
     * below must never be classified as healthy.
     */

    when
      margin_calculation.adjusted_net_sales_value <= 0

    then
      'blocked'


    when
      margin_calculation.calculated_margin_percentage
      <
      coalesce(
        policy.minimum_margin_percentage,
        0
      )

    then
      'blocked'


    when
      margin_calculation.calculated_margin_percentage
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
    as margin_status,


  /* =======================================================
   * Columns appended by migration 169.
   *
   * Preserve names and positions.
   * ======================================================= */

  margin_calculation.warehouse_average_unit_cost,

  margin_calculation.margin_cost_override,

  margin_calculation.margin_cost_override_reason,

  case

    when
      margin_calculation.margin_cost_override
        is not null

    then
      'cost_override'


    when
      margin_calculation.warehouse_average_unit_cost
        is not null

    then
      'warehouse_average'


    else
      'missing'

  end
    as margin_cost_source


from
  margin_calculation


/* =========================================================
 * Active Margin Policy
 * ========================================================= */

left join lateral (

  select
    p.*

  from
    public.sales_margin_policy
      p

  where
    p.is_active =
      true

  order by
    p.updated_at desc

  limit 1

) policy
  on true;


comment on view
  public.sales_order_margin_analysis
is
  'Pre-sale Sales Order margin analysis. Invoice-level discount is allocated proportionally across merchandise lines before margin calculation. Uses margin cost override when available, otherwise current warehouse average inventory cost. Delivery charges and round-off are excluded. Does not replace actual dispatch COGS used by P&L.';


grant all privileges
  on table public.sales_order_margin_analysis
  to anon;

grant all privileges
  on table public.sales_order_margin_analysis
  to authenticated;

grant all privileges
  on table public.sales_order_margin_analysis
  to service_role;

grant all privileges
  on table public.sales_order_margin_analysis
  to postgres;
/*
 * =========================================================
 * 083 — Quick Sale Margin Cost Override
 *
 * Purpose
 * -------
 *
 * Margin APPROVAL may use a transaction-specific expected
 * cost, while final P&L continues to use actual inventory
 * COGS captured at dispatch.
 *
 * Primary use:
 *
 * Quick Sale local purchase
 *   -> margin_cost_override = entered purchase cost
 *
 * Quick Sale stock item
 *   -> no override
 *   -> warehouse average_unit_cost
 *
 * Actual profitability / COGS remains unchanged.
 * =========================================================
 */


/* =========================================================
 * 1. Sales Order Item Margin Cost Override
 * ========================================================= */

alter table
  public.sales_order_items
add column if not exists
  margin_cost_override
    numeric(18, 4);


alter table
  public.sales_order_items
add column if not exists
  margin_cost_override_reason
    text;


/* =========================================================
 * 2. Validation
 * ========================================================= */

alter table
  public.sales_order_items
drop constraint if exists
  sales_order_items_margin_cost_override_check;


alter table
  public.sales_order_items
add constraint
  sales_order_items_margin_cost_override_check
check (
  margin_cost_override is null
  or
  margin_cost_override >= 0
);


/* =========================================================
 * 3. Replace Margin Analysis View
 *
 * IMPORTANT:
 *
 * Existing view columns must stay in their original
 * order for CREATE OR REPLACE VIEW.
 *
 * Existing columns:
 *
 *   ...
 *   effective_unit_selling_price
 *   current_unit_cost
 *   estimated_cogs
 *   estimated_gross_profit
 *   estimated_margin_percentage
 *   margin_status
 *
 * New columns are appended AFTER margin_status.
 *
 *
 * Margin Approval Cost:
 *
 * margin_cost_override
 *      ↓ if absent
 * warehouse average_unit_cost
 *
 *
 * This DOES NOT change actual P&L COGS.
 * ========================================================= */

create or replace view
  public.sales_order_margin_analysis
with (
  security_invoker = true
)
as

select

  /* =======================================================
   * Sales Order Header
   * ======================================================= */

  sales_order.id
    as sales_order_id,

  sales_order.order_number,

  sales_order.status,

  sales_order.customer_id,

  sales_order.source,

  sales_order.currency_code,

  sales_order.exchange_rate,


  /* =======================================================
   * Sales Order Item
   * ======================================================= */

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

  sales_item.line_subtotal
    as net_sales_value,


  /* =======================================================
   * Effective Unit Selling Price
   *
   * line_subtotal is already the net line value
   * before VAT.
   * ======================================================= */

  case
    when
      sales_item.quantity > 0
    then
      round(
        sales_item.line_subtotal
        /
        sales_item.quantity,
        4
      )

    else
      0
  end
    as effective_unit_selling_price,


  /* =======================================================
   * Current Unit Cost
   *
   * IMPORTANT:
   *
   * This column MUST remain in the same position as the
   * previous view definition.
   *
   * Quick Sale Local Purchase:
   *     margin_cost_override
   *
   * Normal Stock Sale:
   *     warehouse average cost
   * ======================================================= */

  coalesce(
    sales_item.margin_cost_override,
    warehouse_stock.average_unit_cost
  )
    as current_unit_cost,


  /* =======================================================
   * Estimated COGS
   *
   * Used for PRE-SALE margin analysis only.
   * ======================================================= */

  case
    when
      sales_item.fulfilment_method =
        'stock'

      and

      coalesce(
        sales_item.margin_cost_override,
        warehouse_stock.average_unit_cost
      )
      is not null

    then
      round(
        coalesce(
          sales_item.margin_cost_override,
          warehouse_stock.average_unit_cost
        )
        *
        sales_item.quantity,
        2
      )

    else
      null
  end
    as estimated_cogs,


  /* =======================================================
   * Estimated Gross Profit
   * ======================================================= */

  case
    when
      sales_item.fulfilment_method =
        'stock'

      and

      coalesce(
        sales_item.margin_cost_override,
        warehouse_stock.average_unit_cost
      )
      is not null

    then
      round(
        sales_item.line_subtotal
        -
        (
          coalesce(
            sales_item.margin_cost_override,
            warehouse_stock.average_unit_cost
          )
          *
          sales_item.quantity
        ),
        2
      )

    else
      null
  end
    as estimated_gross_profit,


  /* =======================================================
   * Estimated Gross Margin %
   *
   * Formula:
   *
   *   (Revenue - Cost)
   *   ---------------- × 100
   *        Revenue
   * ======================================================= */

  case
    when
      sales_item.fulfilment_method =
        'stock'

      and

      coalesce(
        sales_item.margin_cost_override,
        warehouse_stock.average_unit_cost
      )
      is not null

      and

      sales_item.line_subtotal > 0

    then
      round(
        (
          sales_item.line_subtotal
          -
          (
            coalesce(
              sales_item.margin_cost_override,
              warehouse_stock.average_unit_cost
            )
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

    else
      null
  end
    as estimated_margin_percentage,


  /* =======================================================
   * Margin Status
   *
   * healthy
   * warning
   * blocked
   * cost_missing
   * cost_not_available
   * ======================================================= */

  case

    /*
     * Margin protection currently operates on stock lines.
     */
    when
      sales_item.fulfilment_method <>
        'stock'

    then
      'cost_not_available'


    /*
     * Cost missing / invalid.
     */
    when
      coalesce(
        sales_item.margin_cost_override,
        warehouse_stock.average_unit_cost
      )
      is null

      or

      coalesce(
        sales_item.margin_cost_override,
        warehouse_stock.average_unit_cost
      )
      <= 0

    then
      'cost_missing'


    /*
     * Below configured minimum.
     *
     * Example:
     *
     * minimum = 0%
     * calculated margin = -5%
     *
     * -> blocked / approval required
     */
    when
      (
        (
          sales_item.line_subtotal
          -
          (
            coalesce(
              sales_item.margin_cost_override,
              warehouse_stock.average_unit_cost
            )
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


    /*
     * Below warning threshold but above/equal minimum.
     */
    when
      (
        (
          sales_item.line_subtotal
          -
          (
            coalesce(
              sales_item.margin_cost_override,
              warehouse_stock.average_unit_cost
            )
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
    as margin_status,


  /* =======================================================
   * NEW COLUMNS — APPENDED AFTER EXISTING VIEW COLUMNS
   *
   * PostgreSQL requires the original CREATE OR REPLACE VIEW
   * columns to retain their names and positions.
   * ======================================================= */


  /*
   * Warehouse cost before applying override.
   */
  warehouse_stock.average_unit_cost
    as warehouse_average_unit_cost,


  /*
   * Transaction-specific expected cost.
   *
   * Quick Sale local purchase uses the purchase price
   * entered by the user.
   */
  sales_item.margin_cost_override,


  /*
   * Explains why an override exists.
   *
   * Example:
   *
   * Quick Sale local purchase
   */
  sales_item.margin_cost_override_reason,


  /*
   * Makes the source visible to the application.
   */
  case

    when
      sales_item.margin_cost_override
        is not null

    then
      'cost_override'


    when
      warehouse_stock.average_unit_cost
        is not null

    then
      'warehouse_average'


    else
      'missing'

  end
    as margin_cost_source


/* =========================================================
 * Tables
 * ========================================================= */

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

  and

    warehouse_stock.warehouse_id =
      coalesce(
        sales_item.warehouse_id,
        sales_order.warehouse_id
      )


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


/* =========================================================
 * 4. Documentation
 * ========================================================= */

comment on column
  public.sales_order_items.margin_cost_override
is
  'Optional transaction-specific unit cost used only for pre-sale margin approval. Actual profitability continues to use inventory COGS at dispatch.';


comment on column
  public.sales_order_items.margin_cost_override_reason
is
  'Reason/source of the pre-sale margin cost override, for example Quick Sale local purchase.';


comment on view
  public.sales_order_margin_analysis
is
  'Pre-sale Sales Order margin analysis. Uses margin cost override when available, otherwise current warehouse average inventory cost. Does not replace actual dispatch COGS used by P&L.';
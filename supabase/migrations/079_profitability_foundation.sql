/*
 * =========================================================
 * 079 — Profitability & P&L Foundation
 *
 * Recognition model
 * -----------------
 *
 * Revenue:
 *   recognized from dispatched Sales Order quantities.
 *
 * COGS:
 *   recognized from posted inventory sales_issue lines.
 *
 * Expense:
 *   recognized from posted expenses.
 *
 * VAT:
 *   Sales VAT is excluded from revenue.
 *
 *   Recoverable / pending purchase VAT is excluded from
 *   expense.
 *
 *   Non-recoverable VAT becomes part of expense.
 *
 * Cash movements DO NOT determine profit.
 * =========================================================
 */


/* =========================================================
 * 1. Recognized Sales / COGS Lines
 *
 * One row per posted inventory sales_issue line.
 *
 * source_document_item_id
 *      -> delivery_order_items.id
 *
 * delivery_order_items.sales_order_item_id
 *      -> sales_order_items.id
 *
 * This gives exact:
 *
 * Sales Order
 * Product
 * Customer
 * Warehouse
 * Quantity
 * Selling price
 * Discount
 * Actual COGS
 * ========================================================= */

create or replace view
  public.profitability_sales_lines
with (
  security_invoker = true
)
as

select
  inventory_tx.id
    as inventory_transaction_id,

  inventory_tx.transaction_number
    as inventory_transaction_number,

  inventory_tx.transaction_date
    as recognition_date,

  delivery.id
    as delivery_order_id,

  delivery.delivery_number,

  sales_order.id
    as sales_order_id,

  sales_order.order_number,

  sales_order.customer_id,

  sales_order.order_date,

  sales_order.currency_code,

  sales_order.exchange_rate,

  sales_item.id
    as sales_order_item_id,

  sales_item.line_number,

  sales_item.product_id,

  sales_item.item_name,

  sales_item.sku,

  sales_item.warehouse_id,

  sales_item.fulfilment_method,

  abs(
    inventory_item.quantity_change
  )::numeric(18, 4)
    as recognized_quantity,

  sales_item.unit_price::numeric(18, 4)
    as unit_selling_price,

  inventory_item.unit_cost::numeric(18, 4)
    as unit_cost,

  /*
   * Gross sales before line discount.
   */
  round(
    abs(
      inventory_item.quantity_change
    )
    *
    sales_item.unit_price,
    2
  )
    as gross_revenue,

  /*
   * Allocate the Sales Order line discount proportionally
   * to the quantity dispatched in this inventory issue.
   */
  round(
    case
      when sales_item.quantity > 0
      then
        sales_item.discount_amount
        *
        (
          abs(
            inventory_item.quantity_change
          )
          /
          sales_item.quantity
        )

      else 0
    end,
    2
  )
    as recognized_discount,

  /*
   * Revenue excluding VAT.
   *
   * line_subtotal is selling value before VAT.
   * We recognize only the dispatched proportion.
   */
  round(
    (
      abs(
        inventory_item.quantity_change
      )
      *
      sales_item.unit_price
    )
    -
    case
      when sales_item.quantity > 0
      then
        sales_item.discount_amount
        *
        (
          abs(
            inventory_item.quantity_change
          )
          /
          sales_item.quantity
        )

      else 0
    end,
    2
  )
    as net_revenue,

  /*
   * Convert revenue to ERP base currency.
   */
  round(
    (
      (
        abs(
          inventory_item.quantity_change
        )
        *
        sales_item.unit_price
      )
      -
      case
        when sales_item.quantity > 0
        then
          sales_item.discount_amount
          *
          (
            abs(
              inventory_item.quantity_change
            )
            /
            sales_item.quantity
          )

        else 0
      end
    )
    *
    sales_order.exchange_rate,
    2
  )
    as base_net_revenue,

  /*
   * Exact inventory cost captured when stock left.
   */
  round(
    inventory_item.total_cost,
    2
  )
    as cogs,

  /*
   * Inventory costs are already maintained in base
   * accounting cost by the warehouse engine.
   */
  round(
    inventory_item.total_cost,
    2
  )
    as base_cogs,

  round(
    (
      (
        (
          abs(
            inventory_item.quantity_change
          )
          *
          sales_item.unit_price
        )
        -
        case
          when sales_item.quantity > 0
          then
            sales_item.discount_amount
            *
            (
              abs(
                inventory_item.quantity_change
              )
              /
              sales_item.quantity
            )

          else 0
        end
      )
      *
      sales_order.exchange_rate
    )
    -
    inventory_item.total_cost,
    2
  )
    as gross_profit,

  round(
    case
      when
        (
          (
            (
              abs(
                inventory_item.quantity_change
              )
              *
              sales_item.unit_price
            )
            -
            case
              when sales_item.quantity > 0
              then
                sales_item.discount_amount
                *
                (
                  abs(
                    inventory_item.quantity_change
                  )
                  /
                  sales_item.quantity
                )

              else 0
            end
          )
          *
          sales_order.exchange_rate
        ) > 0

      then
        (
          (
            (
              (
                (
                  abs(
                    inventory_item.quantity_change
                  )
                  *
                  sales_item.unit_price
                )
                -
                case
                  when sales_item.quantity > 0
                  then
                    sales_item.discount_amount
                    *
                    (
                      abs(
                        inventory_item.quantity_change
                      )
                      /
                      sales_item.quantity
                    )

                  else 0
                end
              )
              *
              sales_order.exchange_rate
            )
            -
            inventory_item.total_cost
          )
          /
          (
            (
              (
                abs(
                  inventory_item.quantity_change
                )
                *
                sales_item.unit_price
              )
              -
              case
                when sales_item.quantity > 0
                then
                  sales_item.discount_amount
                  *
                  (
                    abs(
                      inventory_item.quantity_change
                    )
                    /
                    sales_item.quantity
                  )

                else 0
              end
            )
            *
            sales_order.exchange_rate
          )
        )
        *
        100

      else 0
    end,
    2
  )
    as gross_margin_percentage

from
  public.inventory_transactions
    inventory_tx

inner join
  public.inventory_transaction_items
    inventory_item
  on
    inventory_item.inventory_transaction_id =
      inventory_tx.id

inner join
  public.delivery_order_items
    delivery_item
  on
    delivery_item.id =
      inventory_item.source_document_item_id

inner join
  public.delivery_orders
    delivery
  on
    delivery.id =
      delivery_item.delivery_order_id

inner join
  public.sales_order_items
    sales_item
  on
    sales_item.id =
      delivery_item.sales_order_item_id

inner join
  public.sales_orders
    sales_order
  on
    sales_order.id =
      sales_item.sales_order_id

where
  inventory_tx.status =
    'posted'

  and inventory_tx.transaction_type =
    'sales_issue'

  and inventory_tx.reference_type =
    'delivery_order'

  and inventory_tx.reference_id =
    delivery.id

  and inventory_item.quantity_change < 0

  and sales_order.status <>
    'cancelled';


/* =========================================================
 * 2. Profitability Expense Lines
 *
 * P&L expense =
 *
 * net amount
 * + non-recoverable VAT
 *
 * Equivalent generic formula:
 *
 * net
 * + tax
 * - recoverable tax
 * - pending tax
 *
 * Standard recoverable VAT:
 *   net + tax - tax = net
 *
 * VAT pending:
 *   net + tax - pending = net
 *
 * Non recoverable:
 *   net + tax
 * ========================================================= */

create or replace view
  public.profitability_expense_lines
with (
  security_invoker = true
)
as

select
  expense.id
    as expense_id,

  expense.expense_number,

  expense.expense_date
    as recognition_date,

  expense.category_id,

    category.code
    as category_code,

    category.name
    as category_name,

    expense.expense_type,

  expense.customer_id,

  expense.sales_order_id,

  expense.currency_code,

  expense.exchange_rate,

  expense.net_amount,

  expense.tax_amount,

  expense.recoverable_tax_amount,

  expense.pending_tax_amount,

  expense.gross_amount,

  round(
    expense.net_amount
    +
    expense.tax_amount
    -
    expense.recoverable_tax_amount
    -
    expense.pending_tax_amount,
    2
  )
    as profitability_expense_amount,

  round(
    (
      expense.net_amount
      +
      expense.tax_amount
      -
      expense.recoverable_tax_amount
      -
      expense.pending_tax_amount
    )
    *
    expense.exchange_rate,
    2
  )
    as base_profitability_expense_amount,

  expense.payee_name,

  expense.supplier_id,

  expense.notes

from
  public.expenses
    expense

inner join
  public.expense_categories
    category
  on
    category.id =
      expense.category_id

where
  expense.status =
    'posted';


/* =========================================================
 * 3. Daily Sales Profitability
 * ========================================================= */

create or replace view
  public.profitability_daily_sales
with (
  security_invoker = true
)
as

select
  recognition_date,

  count(
    distinct sales_order_id
  )
    as sales_order_count,

  sum(
    recognized_quantity
  )
    as quantity_sold,

  round(
    sum(
      base_net_revenue
    ),
    2
  )
    as revenue,

  round(
    sum(
      base_cogs
    ),
    2
  )
    as cogs,

  round(
    sum(
      gross_profit
    ),
    2
  )
    as gross_profit,

  round(
    case
      when
        sum(
          base_net_revenue
        ) > 0

      then
        (
          sum(
            gross_profit
          )
          /
          sum(
            base_net_revenue
          )
        )
        *
        100

      else 0
    end,
    2
  )
    as gross_margin_percentage

from
  public.profitability_sales_lines

group by
  recognition_date;


/* =========================================================
 * 4. Daily Expenses
 * ========================================================= */

create or replace view
  public.profitability_daily_expenses
with (
  security_invoker = true
)
as

select
  recognition_date,

  round(
    sum(
      case
        when expense_type =
          'direct'
        then
          base_profitability_expense_amount
        else 0
      end
    ),
    2
  )
    as direct_expenses,

  round(
    sum(
      case
        when expense_type =
          'operating'
        then
          base_profitability_expense_amount
        else 0
      end
    ),
    2
  )
    as operating_expenses,

  round(
    sum(
      case
        when expense_type =
          'financial'
        then
          base_profitability_expense_amount
        else 0
      end
    ),
    2
  )
    as financial_expenses,

  round(
    sum(
      case
        when expense_type =
          'other'
        then
          base_profitability_expense_amount
        else 0
      end
    ),
    2
  )
    as other_expenses,

  round(
    sum(
      base_profitability_expense_amount
    ),
    2
  )
    as total_expenses

from
  public.profitability_expense_lines

group by
  recognition_date;


/* =========================================================
 * 5. P&L Summary RPC
 *
 * All output is base-currency value.
 * ========================================================= */

create or replace function
  public.get_profit_and_loss_summary(
    p_date_from date,
    p_date_to date
  )
returns table
(
  revenue numeric,

  cogs numeric,

  gross_profit numeric,

  gross_margin_percentage numeric,

  direct_expenses numeric,

  contribution_profit numeric,

  operating_expenses numeric,

  operating_profit numeric,

  financial_expenses numeric,

  other_expenses numeric,

  total_expenses numeric,

  net_profit numeric,

  net_margin_percentage numeric,

  sales_order_count bigint,

  quantity_sold numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_revenue numeric(18, 2);
  v_cogs numeric(18, 2);

  v_direct numeric(18, 2);
  v_operating numeric(18, 2);
  v_financial numeric(18, 2);
  v_other numeric(18, 2);

  v_gross_profit numeric(18, 2);
  v_contribution numeric(18, 2);
  v_operating_profit numeric(18, 2);
  v_net_profit numeric(18, 2);

  v_order_count bigint;
  v_quantity numeric(18, 4);

begin

  v_user_id :=
    auth.uid();


  if
    v_user_id is null
  then
    raise exception
      'Authentication is required.';
  end if;


  if not public.is_admin() then
    raise exception
      'You are not authorized to view profitability.';
  end if;


  if
    p_date_from is null
    or
    p_date_to is null
  then
    raise exception
      'Date From and Date To are required.';
  end if;


  if
    p_date_from >
    p_date_to
  then
    raise exception
      'Date From cannot be after Date To.';
  end if;


  select
    coalesce(
      sum(
        line.base_net_revenue
      ),
      0
    ),

    coalesce(
      sum(
        line.base_cogs
      ),
      0
    ),

    count(
      distinct line.sales_order_id
    ),

    coalesce(
      sum(
        line.recognized_quantity
      ),
      0
    )

  into
    v_revenue,
    v_cogs,
    v_order_count,
    v_quantity

  from
    public.profitability_sales_lines
      line

  where
    line.recognition_date
      between
        p_date_from
        and
        p_date_to;


  select
    coalesce(
      sum(
        case
          when expense_type =
            'direct'
          then
            base_profitability_expense_amount
          else 0
        end
      ),
      0
    ),

    coalesce(
      sum(
        case
          when expense_type =
            'operating'
          then
            base_profitability_expense_amount
          else 0
        end
      ),
      0
    ),

    coalesce(
      sum(
        case
          when expense_type =
            'financial'
          then
            base_profitability_expense_amount
          else 0
        end
      ),
      0
    ),

    coalesce(
      sum(
        case
          when expense_type =
            'other'
          then
            base_profitability_expense_amount
          else 0
        end
      ),
      0
    )

  into
    v_direct,
    v_operating,
    v_financial,
    v_other

  from
    public.profitability_expense_lines

  where
    recognition_date
      between
        p_date_from
        and
        p_date_to;


  v_gross_profit :=
    round(
      v_revenue -
      v_cogs,
      2
    );


  v_contribution :=
    round(
      v_gross_profit -
      v_direct,
      2
    );


  v_operating_profit :=
    round(
      v_contribution -
      v_operating,
      2
    );


  v_net_profit :=
    round(
      v_operating_profit
      -
      v_financial
      -
      v_other,
      2
    );


  return query

  select
    round(
      v_revenue,
      2
    ),

    round(
      v_cogs,
      2
    ),

    v_gross_profit,

    round(
      case
        when v_revenue > 0
        then
          (
            v_gross_profit
            /
            v_revenue
          )
          *
          100

        else 0
      end,
      2
    ),

    round(
      v_direct,
      2
    ),

    v_contribution,

    round(
      v_operating,
      2
    ),

    v_operating_profit,

    round(
      v_financial,
      2
    ),

    round(
      v_other,
      2
    ),

    round(
      v_direct
      +
      v_operating
      +
      v_financial
      +
      v_other,
      2
    ),

    v_net_profit,

    round(
      case
        when v_revenue > 0
        then
          (
            v_net_profit
            /
            v_revenue
          )
          *
          100

        else 0
      end,
      2
    ),

    v_order_count,

    v_quantity;

end;
$$;


/* =========================================================
 * 6. Profitability By Sales Order
 * ========================================================= */

create or replace view
  public.profitability_by_sales_order
with (
  security_invoker = true
)
as

select
  sales_order_id,

  order_number,

  customer_id,

  min(
    recognition_date
  )
    as first_recognition_date,

  max(
    recognition_date
  )
    as last_recognition_date,

  sum(
    recognized_quantity
  )
    as recognized_quantity,

  round(
    sum(
      base_net_revenue
    ),
    2
  )
    as revenue,

  round(
    sum(
      base_cogs
    ),
    2
  )
    as cogs,

  round(
    sum(
      gross_profit
    ),
    2
  )
    as gross_profit,

  round(
    case
      when
        sum(
          base_net_revenue
        ) > 0

      then
        (
          sum(
            gross_profit
          )
          /
          sum(
            base_net_revenue
          )
        )
        *
        100

      else 0
    end,
    2
  )
    as gross_margin_percentage

from
  public.profitability_sales_lines

group by
  sales_order_id,
  order_number,
  customer_id;


/* =========================================================
 * 7. Profitability By Product
 * ========================================================= */

create or replace view
  public.profitability_by_product
with (
  security_invoker = true
)
as

select
  product_id,

  item_name,

  sku,

  sum(
    recognized_quantity
  )
    as quantity_sold,

  round(
    sum(
      base_net_revenue
    ),
    2
  )
    as revenue,

  round(
    sum(
      base_cogs
    ),
    2
  )
    as cogs,

  round(
    sum(
      gross_profit
    ),
    2
  )
    as gross_profit,

  round(
    case
      when
        sum(
          base_net_revenue
        ) > 0

      then
        (
          sum(
            gross_profit
          )
          /
          sum(
            base_net_revenue
          )
        )
        *
        100

      else 0
    end,
    2
  )
    as gross_margin_percentage

from
  public.profitability_sales_lines

group by
  product_id,
  item_name,
  sku;


/* =========================================================
 * 8. Profitability By Customer
 * ========================================================= */

create or replace view
  public.profitability_by_customer
with (
  security_invoker = true
)
as

select
  customer_id,

  count(
    distinct sales_order_id
  )
    as sales_order_count,

  round(
    sum(
      base_net_revenue
    ),
    2
  )
    as revenue,

  round(
    sum(
      base_cogs
    ),
    2
  )
    as cogs,

  round(
    sum(
      gross_profit
    ),
    2
  )
    as gross_profit,

  round(
    case
      when
        sum(
          base_net_revenue
        ) > 0

      then
        (
          sum(
            gross_profit
          )
          /
          sum(
            base_net_revenue
          )
        )
        *
        100

      else 0
    end,
    2
  )
    as gross_margin_percentage

from
  public.profitability_sales_lines

group by
  customer_id;


/* =========================================================
 * 9. Permissions
 * ========================================================= */

revoke all
on function
  public.get_profit_and_loss_summary(
    date,
    date
  )
from public;


grant execute
on function
  public.get_profit_and_loss_summary(
    date,
    date
  )
to authenticated;


grant select
on
  public.profitability_sales_lines,
  public.profitability_expense_lines,
  public.profitability_daily_sales,
  public.profitability_daily_expenses,
  public.profitability_by_sales_order,
  public.profitability_by_product,
  public.profitability_by_customer
to authenticated;


/* =========================================================
 * 10. Documentation
 * ========================================================= */

comment on view
  public.profitability_sales_lines
is
  'Recognized Sales and exact inventory COGS by dispatched Sales Order line. Revenue excludes VAT and follows the same dispatch event that posts sales_issue inventory cost.';


comment on view
  public.profitability_expense_lines
is
  'Posted expense profitability amounts excluding recoverable and pending VAT while including non-recoverable VAT.';


comment on function
  public.get_profit_and_loss_summary(
    date,
    date
  )
is
  'Returns base-currency P&L from recognized dispatched sales, exact inventory COGS and posted expenses.';
/*
 * =========================================================
 * 084 — Profitability Management Intelligence
 *
 * Purpose
 * -------
 *
 * Complete date-aware management reporting layer built on
 * top of the recognized accounting profitability foundation.
 *
 * IMPORTANT ACCOUNTING PRINCIPLES
 * --------------------------------
 *
 * Revenue
 *   -> recognized dispatched Sales Order revenue
 *
 * COGS
 *   -> exact posted inventory sales_issue cost
 *
 * Expenses
 *   -> posted profitability expenses
 *
 * VAT
 *   -> follows profitability_expense_lines rules
 *
 * Margin approval cost
 *   -> NOT used for actual P&L
 *
 * Actual profitability always continues to use recognized
 * inventory COGS.
 *
 *
 * This RPC returns:
 *
 *  1. Current-period P&L
 *  2. Previous equivalent-period P&L
 *  3. KPI comparison
 *  4. Profitability trend
 *  5. Product profitability
 *  6. Category profitability
 *  7. Customer profitability
 *  8. Warehouse profitability
 *  9. Sales-source profitability
 * 10. Expense-category intelligence
 * 11. Sales Order profitability
 * 12. Loss-making orders
 * 13. Low / negative margin products
 * 14. Margin approval exception audit
 * 15. Management risk indicators
 *
 * The previous comparison period is the same number of days
 * immediately preceding the selected current period.
 *
 * Example:
 *
 * Current:
 *   2026-08-01 -> 2026-08-18
 *
 * Previous:
 *   2026-07-14 -> 2026-07-31
 * =========================================================
 */


/* =========================================================
 * 1. Management Intelligence RPC
 * ========================================================= */

create or replace function
  public.get_profitability_management_intelligence(
    p_date_from date,
    p_date_to date
  )
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_period_days integer;

  v_previous_date_from date;
  v_previous_date_to date;

  v_current_summary jsonb;
  v_previous_summary jsonb;

  v_comparison jsonb;

  v_trend jsonb;

  v_products jsonb;
  v_categories jsonb;
  v_customers jsonb;
  v_warehouses jsonb;
  v_sources jsonb;

  v_expense_categories jsonb;

  v_orders jsonb;
  v_loss_orders jsonb;

  v_low_margin_products jsonb;

  v_margin_exceptions jsonb;

  v_risks jsonb;

begin

  /* =======================================================
   * Authentication
   * ======================================================= */

  v_user_id :=
    auth.uid();


  if
    v_user_id is null
  then
    raise exception
      'Authentication is required.';
  end if;


  if
    not public.is_admin()
  then
    raise exception
      'You are not authorized to view profitability management intelligence.';
  end if;


  /* =======================================================
   * Validate Dates
   * ======================================================= */

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


  /*
   * Inclusive number of days.
   */

  v_period_days :=
    (
      p_date_to -
      p_date_from
    )
    +
    1;


  /*
   * Previous equivalent period.
   */

  v_previous_date_to :=
    p_date_from -
    1;


  v_previous_date_from :=
    v_previous_date_to
    -
    (
      v_period_days -
      1
    );


  /* =======================================================
   * 2. Current P&L Summary
   * ======================================================= */

  select
    to_jsonb(
      summary
    )

  into
    v_current_summary

  from
    public.get_profit_and_loss_summary(
      p_date_from,
      p_date_to
    )
      summary;


  v_current_summary :=
    coalesce(
      v_current_summary,
      '{}'::jsonb
    );


  /* =======================================================
   * 3. Previous Equivalent Period P&L
   * ======================================================= */

  select
    to_jsonb(
      summary
    )

  into
    v_previous_summary

  from
    public.get_profit_and_loss_summary(
      v_previous_date_from,
      v_previous_date_to
    )
      summary;


  v_previous_summary :=
    coalesce(
      v_previous_summary,
      '{}'::jsonb
    );


  /* =======================================================
   * 4. KPI Comparison
   *
   * Percentage changes:
   *
   *   (current - previous)
   *   -------------------- × 100
   *         previous
   *
   * Margin movement is reported as percentage points.
   * ======================================================= */

  v_comparison :=
    jsonb_build_object(

      'revenuePercentage',
      round(
        case
          when
            coalesce(
              (
                v_previous_summary
                  ->>
                'revenue'
              )::numeric,
              0
            )
            <>
            0
          then
            (
              (
                coalesce(
                  (
                    v_current_summary
                      ->>
                    'revenue'
                  )::numeric,
                  0
                )
                -
                coalesce(
                  (
                    v_previous_summary
                      ->>
                    'revenue'
                  )::numeric,
                  0
                )
              )
              /
              abs(
                (
                  v_previous_summary
                    ->>
                  'revenue'
                )::numeric
              )
            )
            *
            100

          when
            coalesce(
              (
                v_current_summary
                  ->>
                'revenue'
              )::numeric,
              0
            )
            =
            0
          then
            0

          else
            null
        end,
        2
      ),


      'cogsPercentage',
      round(
        case
          when
            coalesce(
              (
                v_previous_summary
                  ->>
                'cogs'
              )::numeric,
              0
            )
            <>
            0
          then
            (
              (
                coalesce(
                  (
                    v_current_summary
                      ->>
                    'cogs'
                  )::numeric,
                  0
                )
                -
                coalesce(
                  (
                    v_previous_summary
                      ->>
                    'cogs'
                  )::numeric,
                  0
                )
              )
              /
              abs(
                (
                  v_previous_summary
                    ->>
                  'cogs'
                )::numeric
              )
            )
            *
            100

          when
            coalesce(
              (
                v_current_summary
                  ->>
                'cogs'
              )::numeric,
              0
            )
            =
            0
          then
            0

          else
            null
        end,
        2
      ),


      'grossProfitPercentage',
      round(
        case
          when
            coalesce(
              (
                v_previous_summary
                  ->>
                'gross_profit'
              )::numeric,
              0
            )
            <>
            0
          then
            (
              (
                coalesce(
                  (
                    v_current_summary
                      ->>
                    'gross_profit'
                  )::numeric,
                  0
                )
                -
                coalesce(
                  (
                    v_previous_summary
                      ->>
                    'gross_profit'
                  )::numeric,
                  0
                )
              )
              /
              abs(
                (
                  v_previous_summary
                    ->>
                  'gross_profit'
                )::numeric
              )
            )
            *
            100

          when
            coalesce(
              (
                v_current_summary
                  ->>
                'gross_profit'
              )::numeric,
              0
            )
            =
            0
          then
            0

          else
            null
        end,
        2
      ),


      'expensesPercentage',
      round(
        case
          when
            coalesce(
              (
                v_previous_summary
                  ->>
                'total_expenses'
              )::numeric,
              0
            )
            <>
            0
          then
            (
              (
                coalesce(
                  (
                    v_current_summary
                      ->>
                    'total_expenses'
                  )::numeric,
                  0
                )
                -
                coalesce(
                  (
                    v_previous_summary
                      ->>
                    'total_expenses'
                  )::numeric,
                  0
                )
              )
              /
              abs(
                (
                  v_previous_summary
                    ->>
                  'total_expenses'
                )::numeric
              )
            )
            *
            100

          when
            coalesce(
              (
                v_current_summary
                  ->>
                'total_expenses'
              )::numeric,
              0
            )
            =
            0
          then
            0

          else
            null
        end,
        2
      ),


      'netProfitPercentage',
      round(
        case
          when
            coalesce(
              (
                v_previous_summary
                  ->>
                'net_profit'
              )::numeric,
              0
            )
            <>
            0
          then
            (
              (
                coalesce(
                  (
                    v_current_summary
                      ->>
                    'net_profit'
                  )::numeric,
                  0
                )
                -
                coalesce(
                  (
                    v_previous_summary
                      ->>
                    'net_profit'
                  )::numeric,
                  0
                )
              )
              /
              abs(
                (
                  v_previous_summary
                    ->>
                  'net_profit'
                )::numeric
              )
            )
            *
            100

          when
            coalesce(
              (
                v_current_summary
                  ->>
                'net_profit'
              )::numeric,
              0
            )
            =
            0
          then
            0

          else
            null
        end,
        2
      ),


      'ordersPercentage',
      round(
        case
          when
            coalesce(
              (
                v_previous_summary
                  ->>
                'sales_order_count'
              )::numeric,
              0
            )
            <>
            0
          then
            (
              (
                coalesce(
                  (
                    v_current_summary
                      ->>
                    'sales_order_count'
                  )::numeric,
                  0
                )
                -
                coalesce(
                  (
                    v_previous_summary
                      ->>
                    'sales_order_count'
                  )::numeric,
                  0
                )
              )
              /
              abs(
                (
                  v_previous_summary
                    ->>
                  'sales_order_count'
                )::numeric
              )
            )
            *
            100

          when
            coalesce(
              (
                v_current_summary
                  ->>
                'sales_order_count'
              )::numeric,
              0
            )
            =
            0
          then
            0

          else
            null
        end,
        2
      ),


      /*
       * Gross-margin movement in percentage points.
       */
      'grossMarginPointChange',
      round(
        coalesce(
          (
            v_current_summary
              ->>
            'gross_margin_percentage'
          )::numeric,
          0
        )
        -
        coalesce(
          (
            v_previous_summary
              ->>
            'gross_margin_percentage'
          )::numeric,
          0
        ),
        2
      ),


      /*
       * Net-margin movement in percentage points.
       */
      'netMarginPointChange',
      round(
        coalesce(
          (
            v_current_summary
              ->>
            'net_margin_percentage'
          )::numeric,
          0
        )
        -
        coalesce(
          (
            v_previous_summary
              ->>
            'net_margin_percentage'
          )::numeric,
          0
        ),
        2
      ),


      /*
       * Recognized-sales Average Order Value.
       */
      'averageOrderValue',
      round(
        case
          when
            coalesce(
              (
                v_current_summary
                  ->>
                'sales_order_count'
              )::numeric,
              0
            )
            >
            0
          then
            coalesce(
              (
                v_current_summary
                  ->>
                'revenue'
              )::numeric,
              0
            )
            /
            (
              v_current_summary
                ->>
              'sales_order_count'
            )::numeric

          else
            0
        end,
        2
      ),


      'previousAverageOrderValue',
      round(
        case
          when
            coalesce(
              (
                v_previous_summary
                  ->>
                'sales_order_count'
              )::numeric,
              0
            )
            >
            0
          then
            coalesce(
              (
                v_previous_summary
                  ->>
                'revenue'
              )::numeric,
              0
            )
            /
            (
              v_previous_summary
                ->>
              'sales_order_count'
            )::numeric

          else
            0
        end,
        2
      )
    );


  /* =======================================================
   * 5. Profitability Trend
   *
   * <= 62 days:
   *   daily
   *
   * > 62 days:
   *   monthly
   *
   * Empty periods are generated too, so charts do not have
   * missing dates.
   * ======================================================= */

  if
    v_period_days <=
    62
  then

    select
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'period',
              calendar.period_date,

            'label',
              to_char(
                calendar.period_date,
                'DD Mon'
              ),

            'revenue',
              round(
                coalesce(
                  sales.revenue,
                  0
                ),
                2
              ),

            'cogs',
              round(
                coalesce(
                  sales.cogs,
                  0
                ),
                2
              ),

            'grossProfit',
              round(
                coalesce(
                  sales.gross_profit,
                  0
                ),
                2
              ),

            'expenses',
              round(
                coalesce(
                  expense.total_expenses,
                  0
                ),
                2
              ),

            'netProfit',
              round(
                coalesce(
                  sales.gross_profit,
                  0
                )
                -
                coalesce(
                  expense.total_expenses,
                  0
                ),
                2
              )
          )
          order by
            calendar.period_date
        ),
        '[]'::jsonb
      )

    into
      v_trend

    from (
      select
        generate_series(
          p_date_from::timestamp,
          p_date_to::timestamp,
          interval '1 day'
        )::date
          as period_date
    )
      calendar

    left join (
      select
        recognition_date,

        sum(
          base_net_revenue
        )
          as revenue,

        sum(
          base_cogs
        )
          as cogs,

        sum(
          gross_profit
        )
          as gross_profit

      from
        public.profitability_sales_lines

      where
        recognition_date
          between
            p_date_from
            and
            p_date_to

      group by
        recognition_date
    )
      sales

      on
        sales.recognition_date =
          calendar.period_date

    left join (
      select
        recognition_date,

        sum(
          base_profitability_expense_amount
        )
          as total_expenses

      from
        public.profitability_expense_lines

      where
        recognition_date
          between
            p_date_from
            and
            p_date_to

      group by
        recognition_date
    )
      expense

      on
        expense.recognition_date =
          calendar.period_date;


  else

    select
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'period',
              calendar.period_month,

            'label',
              to_char(
                calendar.period_month,
                'Mon YYYY'
              ),

            'revenue',
              round(
                coalesce(
                  sales.revenue,
                  0
                ),
                2
              ),

            'cogs',
              round(
                coalesce(
                  sales.cogs,
                  0
                ),
                2
              ),

            'grossProfit',
              round(
                coalesce(
                  sales.gross_profit,
                  0
                ),
                2
              ),

            'expenses',
              round(
                coalesce(
                  expense.total_expenses,
                  0
                ),
                2
              ),

            'netProfit',
              round(
                coalesce(
                  sales.gross_profit,
                  0
                )
                -
                coalesce(
                  expense.total_expenses,
                  0
                ),
                2
              )
          )
          order by
            calendar.period_month
        ),
        '[]'::jsonb
      )

    into
      v_trend

    from (
      select
        generate_series(
          date_trunc(
            'month',
            p_date_from::timestamp
          ),
          date_trunc(
            'month',
            p_date_to::timestamp
          ),
          interval '1 month'
        )::date
          as period_month
    )
      calendar

    left join (
      select
        date_trunc(
          'month',
          recognition_date
        )::date
          as period_month,

        sum(
          base_net_revenue
        )
          as revenue,

        sum(
          base_cogs
        )
          as cogs,

        sum(
          gross_profit
        )
          as gross_profit

      from
        public.profitability_sales_lines

      where
        recognition_date
          between
            p_date_from
            and
            p_date_to

      group by
        date_trunc(
          'month',
          recognition_date
        )
    )
      sales

      on
        sales.period_month =
          calendar.period_month

    left join (
      select
        date_trunc(
          'month',
          recognition_date
        )::date
          as period_month,

        sum(
          base_profitability_expense_amount
        )
          as total_expenses

      from
        public.profitability_expense_lines

      where
        recognition_date
          between
            p_date_from
            and
            p_date_to

      group by
        date_trunc(
          'month',
          recognition_date
        )
    )
      expense

      on
        expense.period_month =
          calendar.period_month;

  end if;


  /* =======================================================
   * 6. Product Profitability
   * ======================================================= */

  select
    coalesce(
      jsonb_agg(
        row_data
        order by
          (
            row_data
              ->>
            'grossProfit'
          )::numeric
          desc
      ),
      '[]'::jsonb
    )

  into
    v_products

  from (
    select
      jsonb_build_object(

        'productId',
          line.product_id,

        'itemName',
          max(
            line.item_name
          ),

        'sku',
          max(
            line.sku
          ),

        'quantitySold',
          round(
            sum(
              line.recognized_quantity
            ),
            4
          ),

        'salesOrderCount',
          count(
            distinct
              line.sales_order_id
          ),

        'revenue',
          round(
            sum(
              line.base_net_revenue
            ),
            2
          ),

        'cogs',
          round(
            sum(
              line.base_cogs
            ),
            2
          ),

        'grossProfit',
          round(
            sum(
              line.gross_profit
            ),
            2
          ),

        'grossMarginPercentage',
          round(
            case
              when
                sum(
                  line.base_net_revenue
                )
                >
                0
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

              else
                0
            end,
            2
          )

      )
        as row_data

    from
      public.profitability_sales_lines
        line

    where
      line.recognition_date
        between
          p_date_from
          and
          p_date_to

    group by
      line.product_id,
      coalesce(
        line.product_id::text,
        line.item_name
      )
  )
    product_rows;


  /* =======================================================
   * 7. Category Profitability
   * ======================================================= */

  select
    coalesce(
      jsonb_agg(
        row_data
        order by
          (
            row_data
              ->>
            'grossProfit'
          )::numeric
          desc
      ),
      '[]'::jsonb
    )

  into
    v_categories

  from (
    select
      jsonb_build_object(

        'categoryId',
          product.category_id,

        'categoryName',
          coalesce(
            category.name,
            'Uncategorized'
          ),

        'salesOrderCount',
          count(
            distinct
              line.sales_order_id
          ),

        'quantitySold',
          round(
            sum(
              line.recognized_quantity
            ),
            4
          ),

        'revenue',
          round(
            sum(
              line.base_net_revenue
            ),
            2
          ),

        'cogs',
          round(
            sum(
              line.base_cogs
            ),
            2
          ),

        'grossProfit',
          round(
            sum(
              line.gross_profit
            ),
            2
          ),

        'grossMarginPercentage',
          round(
            case
              when
                sum(
                  line.base_net_revenue
                )
                >
                0
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

              else
                0
            end,
            2
          )

      )
        as row_data

    from
      public.profitability_sales_lines
        line

    left join
      public.products
        product

      on
        product.id =
          line.product_id

    left join
      public.categories
        category

      on
        category.id =
          product.category_id

    where
      line.recognition_date
        between
          p_date_from
          and
          p_date_to

    group by
      product.category_id,
      category.name
  )
    category_rows;


  /* =======================================================
   * 8. Customer Profitability
   * ======================================================= */

  select
    coalesce(
      jsonb_agg(
        row_data
        order by
          (
            row_data
              ->>
            'grossProfit'
          )::numeric
          desc
      ),
      '[]'::jsonb
    )

  into
    v_customers

  from (
    select
      jsonb_build_object(

        'customerId',
          line.customer_id,

        'customerNumber',
          customer.customer_number,

        'customerName',
          coalesce(
            customer.display_name,
            customer.company_name,
            customer.customer_number,
            'Unknown Customer'
          ),

        'salesOrderCount',
          count(
            distinct
              line.sales_order_id
          ),

        'quantitySold',
          round(
            sum(
              line.recognized_quantity
            ),
            4
          ),

        'revenue',
          round(
            sum(
              line.base_net_revenue
            ),
            2
          ),

        'cogs',
          round(
            sum(
              line.base_cogs
            ),
            2
          ),

        'grossProfit',
          round(
            sum(
              line.gross_profit
            ),
            2
          ),

        'grossMarginPercentage',
          round(
            case
              when
                sum(
                  line.base_net_revenue
                )
                >
                0
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

              else
                0
            end,
            2
          ),

        'averageOrderValue',
          round(
            case
              when
                count(
                  distinct
                    line.sales_order_id
                )
                >
                0
              then
                sum(
                  line.base_net_revenue
                )
                /
                count(
                  distinct
                    line.sales_order_id
                )

              else
                0
            end,
            2
          )

      )
        as row_data

    from
      public.profitability_sales_lines
        line

    left join
      public.customers
        customer

      on
        customer.id =
          line.customer_id

    where
      line.recognition_date
        between
          p_date_from
          and
          p_date_to

    group by
      line.customer_id,
      customer.customer_number,
      customer.display_name,
      customer.company_name
  )
    customer_rows;


  /* =======================================================
   * 9. Warehouse Profitability
   * ======================================================= */

  select
    coalesce(
      jsonb_agg(
        row_data
        order by
          (
            row_data
              ->>
            'grossProfit'
          )::numeric
          desc
      ),
      '[]'::jsonb
    )

  into
    v_warehouses

  from (
    select
      jsonb_build_object(

        'warehouseId',
          line.warehouse_id,

        'warehouseCode',
          warehouse.code,

        'warehouseName',
          coalesce(
            warehouse.name,
            'Unknown Warehouse'
          ),

        'salesOrderCount',
          count(
            distinct
              line.sales_order_id
          ),

        'quantitySold',
          round(
            sum(
              line.recognized_quantity
            ),
            4
          ),

        'revenue',
          round(
            sum(
              line.base_net_revenue
            ),
            2
          ),

        'cogs',
          round(
            sum(
              line.base_cogs
            ),
            2
          ),

        'grossProfit',
          round(
            sum(
              line.gross_profit
            ),
            2
          ),

        'grossMarginPercentage',
          round(
            case
              when
                sum(
                  line.base_net_revenue
                )
                >
                0
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

              else
                0
            end,
            2
          )

      )
        as row_data

    from
      public.profitability_sales_lines
        line

    left join
      public.warehouses
        warehouse

      on
        warehouse.id =
          line.warehouse_id

    where
      line.recognition_date
        between
          p_date_from
          and
          p_date_to

    group by
      line.warehouse_id,
      warehouse.code,
      warehouse.name
  )
    warehouse_rows;


  /* =======================================================
   * 10. Sales Source / Channel Profitability
   * ======================================================= */

  select
    coalesce(
      jsonb_agg(
        row_data
        order by
          (
            row_data
              ->>
            'revenue'
          )::numeric
          desc
      ),
      '[]'::jsonb
    )

  into
    v_sources

  from (
    select
      jsonb_build_object(

        'source',
          sales_order.source,

        'salesOrderCount',
          count(
            distinct
              line.sales_order_id
          ),

        'quantitySold',
          round(
            sum(
              line.recognized_quantity
            ),
            4
          ),

        'revenue',
          round(
            sum(
              line.base_net_revenue
            ),
            2
          ),

        'cogs',
          round(
            sum(
              line.base_cogs
            ),
            2
          ),

        'grossProfit',
          round(
            sum(
              line.gross_profit
            ),
            2
          ),

        'grossMarginPercentage',
          round(
            case
              when
                sum(
                  line.base_net_revenue
                )
                >
                0
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

              else
                0
            end,
            2
          )

      )
        as row_data

    from
      public.profitability_sales_lines
        line

    inner join
      public.sales_orders
        sales_order

      on
        sales_order.id =
          line.sales_order_id

    where
      line.recognition_date
        between
          p_date_from
          and
          p_date_to

    group by
      sales_order.source
  )
    source_rows;


  /* =======================================================
   * 11. Expense Category Intelligence
   *
   * Includes previous equivalent-period amount so management
   * can identify expense growth.
   * ======================================================= */

  select
    coalesce(
      jsonb_agg(
        row_data
        order by
          (
            row_data
              ->>
            'currentAmount'
          )::numeric
          desc
      ),
      '[]'::jsonb
    )

  into
    v_expense_categories

  from (
    select
      jsonb_build_object(

        'categoryId',
          category.id,

        'categoryCode',
          category.code,

        'categoryName',
          category.name,

        'expenseType',
          category.expense_type,

        'currentAmount',
          round(
            coalesce(
              current_period.amount,
              0
            ),
            2
          ),

        'previousAmount',
          round(
            coalesce(
              previous_period.amount,
              0
            ),
            2
          ),

        'changePercentage',
          round(
            case
              when
                coalesce(
                  previous_period.amount,
                  0
                )
                <>
                0
              then
                (
                  (
                    coalesce(
                      current_period.amount,
                      0
                    )
                    -
                    coalesce(
                      previous_period.amount,
                      0
                    )
                  )
                  /
                  abs(
                    previous_period.amount
                  )
                )
                *
                100

              when
                coalesce(
                  current_period.amount,
                  0
                )
                =
                0
              then
                0

              else
                null
            end,
            2
          )

      )
        as row_data

    from
      public.expense_categories
        category

    left join (
      select
        category_id,

        sum(
          base_profitability_expense_amount
        )
          as amount

      from
        public.profitability_expense_lines

      where
        recognition_date
          between
            p_date_from
            and
            p_date_to

      group by
        category_id
    )
      current_period

      on
        current_period.category_id =
          category.id

    left join (
      select
        category_id,

        sum(
          base_profitability_expense_amount
        )
          as amount

      from
        public.profitability_expense_lines

      where
        recognition_date
          between
            v_previous_date_from
            and
            v_previous_date_to

      group by
        category_id
    )
      previous_period

      on
        previous_period.category_id =
          category.id

    where
      coalesce(
        current_period.amount,
        0
      )
      <>
      0

      or

      coalesce(
        previous_period.amount,
        0
      )
      <>
      0
  )
    expense_category_rows;


  /* =======================================================
   * 12. Sales Order Profitability
   * ======================================================= */

  select
    coalesce(
      jsonb_agg(
        row_data
        order by
          (
            row_data
              ->>
            'grossProfit'
          )::numeric
          desc
      ),
      '[]'::jsonb
    )

  into
    v_orders

  from (
    select
  jsonb_build_object(

    'salesOrderId',
      line.sales_order_id,

    'orderNumber',
      sales_order.order_number,

    'customerId',
      sales_order.customer_id,

    'customerName',
      coalesce(
        customer.display_name,
        customer.company_name,
        customer.customer_number,
        'Unknown Customer'
      ),

    'source',
      sales_order.source,

    'quantitySold',
      round(
        sum(
          line.recognized_quantity
        ),
        4
      ),

    'revenue',
      round(
        sum(
          line.base_net_revenue
        ),
        2
      ),

    'cogs',
      round(
        sum(
          line.base_cogs
        ),
        2
      ),

    'grossProfit',
      round(
        sum(
          line.gross_profit
        ),
        2
      ),

    'grossMarginPercentage',
      round(
        case
          when
            sum(
              line.base_net_revenue
            )
            >
            0
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

          else
            0
        end,
        2
      )

  )
    as row_data

from
  public.profitability_sales_lines
    line

inner join
  public.sales_orders
    sales_order

  on
    sales_order.id =
      line.sales_order_id

left join
  public.customers
    customer

  on
    customer.id =
      sales_order.customer_id

where
  line.recognition_date
    between
      p_date_from
      and
      p_date_to

group by
  line.sales_order_id,
  sales_order.order_number,
  sales_order.customer_id,
  sales_order.source,
  customer.display_name,
  customer.company_name,
  customer.customer_number
  )
    order_rows;


  /* =======================================================
   * 13. Loss-Making Sales Orders
   * ======================================================= */

  select
    coalesce(
      jsonb_agg(
        row_data
        order by
          (
            row_data
              ->>
            'grossProfit'
          )::numeric
          asc
      ),
      '[]'::jsonb
    )

  into
    v_loss_orders

  from (
    select
      jsonb_build_object(

        'salesOrderId',
          line.sales_order_id,

        'orderNumber',
          max(
            line.order_number
          ),

        'customerName',
          max(
            coalesce(
              customer.display_name,
              customer.company_name,
              customer.customer_number,
              'Unknown Customer'
            )
          ),

        'revenue',
          round(
            sum(
              line.base_net_revenue
            ),
            2
          ),

        'cogs',
          round(
            sum(
              line.base_cogs
            ),
            2
          ),

        'grossProfit',
          round(
            sum(
              line.gross_profit
            ),
            2
          ),

        'grossMarginPercentage',
          round(
            case
              when
                sum(
                  line.base_net_revenue
                )
                >
                0
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

              else
                0
            end,
            2
          )

      )
        as row_data

    from
      public.profitability_sales_lines
        line

    left join
      public.customers
        customer

      on
        customer.id =
          line.customer_id

    where
      line.recognition_date
        between
          p_date_from
          and
          p_date_to

    group by
      line.sales_order_id

    having
      sum(
        line.gross_profit
      )
      <
      0
  )
    loss_rows;


  /* =======================================================
   * 14. Low / Negative Margin Products
   *
   * Uses actual recognized profitability.
   *
   * Threshold is the currently configured warning margin.
   * ======================================================= */

  select
    coalesce(
      jsonb_agg(
        row_data
        order by
          (
            row_data
              ->>
            'grossMarginPercentage'
          )::numeric
          asc
      ),
      '[]'::jsonb
    )

  into
    v_low_margin_products

  from (
    select
      jsonb_build_object(

        'productId',
          line.product_id,

        'itemName',
          max(
            line.item_name
          ),

        'sku',
          max(
            line.sku
          ),

        'quantitySold',
          round(
            sum(
              line.recognized_quantity
            ),
            4
          ),

        'revenue',
          round(
            sum(
              line.base_net_revenue
            ),
            2
          ),

        'cogs',
          round(
            sum(
              line.base_cogs
            ),
            2
          ),

        'grossProfit',
          round(
            sum(
              line.gross_profit
            ),
            2
          ),

        'grossMarginPercentage',
          round(
            case
              when
                sum(
                  line.base_net_revenue
                )
                >
                0
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

              else
                0
            end,
            2
          )

      )
        as row_data

    from
      public.profitability_sales_lines
        line

    where
      line.recognition_date
        between
          p_date_from
          and
          p_date_to

    group by
      line.product_id,
      coalesce(
        line.product_id::text,
        line.item_name
      )

    having
      (
        case
          when
            sum(
              line.base_net_revenue
            )
            >
            0
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

          else
            0
        end
      )
      <
      coalesce(
        (
          select
            warning_margin_percentage

          from
            public.sales_margin_policy

          where
            is_active =
              true

          order by
            updated_at
              desc

          limit 1
        ),
        15
      )
  )
    low_margin_rows;


  /* =======================================================
   * 15. Margin Exception Audit
   *
   * Includes approved margin exceptions for Sales Orders
   * that have recognized sales activity during the selected
   * reporting period.
   *
   * Actual revenue / COGS / margin below are recognized
   * profitability, not the pre-sale estimate.
   * ======================================================= */

  select
    coalesce(
      jsonb_agg(
        row_data
        order by
          (
            row_data
              ->>
            'approvedAt'
          )
          desc
      ),
      '[]'::jsonb
    )

  into
    v_margin_exceptions

  from (
    select
      jsonb_build_object(

        'approvalId',
          approval.id,

        'salesOrderId',
          approval.sales_order_id,

        'orderNumber',
          sales_order.order_number,

        'customerId',
          sales_order.customer_id,

        'customerName',
          coalesce(
            customer.display_name,
            customer.company_name,
            customer.customer_number,
            'Unknown Customer'
          ),

        'source',
          sales_order.source,

        'requestedReason',
          approval.requested_reason,

        'decisionNotes',
          approval.decision_notes,

        'requestedAt',
          approval.requested_at,

        'approvedAt',
          approval.approved_at,

        'requestedBy',
          approval.requested_by,

        'requestedByName',
          coalesce(
            requester.full_name,
            requester.email
          ),

        'approvedBy',
          approval.approved_by,

        'approvedByName',
          coalesce(
            approver.full_name,
            approver.email
          ),

        'lowestApprovedMarginPercentage',
          approval.lowest_margin_percentage,

        'policyMinimumPercentage',
          approval.policy_minimum_percentage,

        'policyWarningPercentage',
          approval.policy_warning_percentage,

        'recognizedRevenue',
          round(
            recognized.revenue,
            2
          ),

        'recognizedCogs',
          round(
            recognized.cogs,
            2
          ),

        'actualGrossProfit',
          round(
            recognized.gross_profit,
            2
          ),

        'actualGrossMarginPercentage',
          round(
            case
              when
                recognized.revenue >
                0
              then
                recognized.gross_profit
                /
                recognized.revenue
                *
                100

              else
                0
            end,
            2
          ),

        /*
         * Difference between minimum policy margin and the
         * approved pre-sale margin.
         *
         * Positive value means margin was sacrificed below
         * policy.
         */
        'approvedMarginSacrificePoints',
          round(
            greatest(
              coalesce(
                approval.policy_minimum_percentage,
                0
              )
              -
              coalesce(
                approval.lowest_margin_percentage,
                0
              ),
              0
            ),
            2
          )

      )
        as row_data

    from
      public.sales_margin_approvals
        approval

    inner join
      public.sales_orders
        sales_order

      on
        sales_order.id =
          approval.sales_order_id

    left join
      public.customers
        customer

      on
        customer.id =
          sales_order.customer_id

    left join
      public.profiles
        requester

      on
        requester.id =
          approval.requested_by

    left join
      public.profiles
        approver

      on
        approver.id =
          approval.approved_by

    inner join lateral (
      select
        sum(
          line.base_net_revenue
        )
          as revenue,

        sum(
          line.base_cogs
        )
          as cogs,

        sum(
          line.gross_profit
        )
          as gross_profit

      from
        public.profitability_sales_lines
          line

      where
        line.sales_order_id =
          approval.sales_order_id

        and
        line.recognition_date
          between
            p_date_from
            and
            p_date_to
    )
      recognized

      on
        recognized.revenue
        is not null

    where
      approval.status =
        'approved'
  )
    margin_exception_rows;


  /* =======================================================
   * 16. Management Risk Indicators
   * ======================================================= */

  v_risks :=
    jsonb_build_object(

      /*
       * Number of recognized loss-making Sales Orders.
       */
      'lossMakingOrderCount',
      (
        select
          count(*)

        from (
          select
            sales_order_id

          from
            public.profitability_sales_lines

          where
            recognition_date
              between
                p_date_from
                and
                p_date_to

          group by
            sales_order_id

          having
            sum(
              gross_profit
            )
            <
            0
        )
          loss_orders
      ),


      /*
       * Number of products with negative recognized profit.
       */
      'negativeMarginProductCount',
      (
        select
          count(*)

        from (
          select
            product_id,
            item_name

          from
            public.profitability_sales_lines

          where
            recognition_date
              between
                p_date_from
                and
                p_date_to

          group by
            product_id,
            item_name

          having
            sum(
              gross_profit
            )
            <
            0
        )
          negative_products
      ),


      /*
       * Number of products below configured warning margin.
       */
      'lowMarginProductCount',
      jsonb_array_length(
        v_low_margin_products
      ),


      /*
       * Margin approvals attached to recognized activity.
       */
      'approvedExceptionCount',
      jsonb_array_length(
        v_margin_exceptions
      ),


      /*
       * Current gross-margin deterioration compared with
       * previous equivalent period.
       */
      'grossMarginPointChange',
      round(
        coalesce(
          (
            v_current_summary
              ->>
            'gross_margin_percentage'
          )::numeric,
          0
        )
        -
        coalesce(
          (
            v_previous_summary
              ->>
            'gross_margin_percentage'
          )::numeric,
          0
        ),
        2
      ),


      'grossMarginDeteriorating',
      (
        coalesce(
          (
            v_current_summary
              ->>
            'gross_margin_percentage'
          )::numeric,
          0
        )
        <
        coalesce(
          (
            v_previous_summary
              ->>
            'gross_margin_percentage'
          )::numeric,
          0
        )
      ),


      /*
       * Expense growth over previous equivalent period.
       */
      'expenseGrowthPercentage',
      (
        v_comparison
          ->>
        'expensesPercentage'
      )::numeric,


      'expenseGrowthAlert',
      case
        when
          (
            v_comparison
              ->>
            'expensesPercentage'
          ) is null
        then
          false

        else
          (
            v_comparison
              ->>
            'expensesPercentage'
          )::numeric
          >
          20
      end,


      /*
       * Net loss flag.
       */
      'netLoss',
      (
        coalesce(
          (
            v_current_summary
              ->>
            'net_profit'
          )::numeric,
          0
        )
        <
        0
      )
    );


  /* =======================================================
   * 17. Return Complete Management Payload
   * ======================================================= */

  return
    jsonb_build_object(

      'period',
      jsonb_build_object(
        'dateFrom',
          p_date_from,

        'dateTo',
          p_date_to,

        'days',
          v_period_days,

        'trendGranularity',
          case
            when
              v_period_days <=
              62
            then
              'day'

            else
              'month'
          end
      ),


      'previousPeriod',
      jsonb_build_object(
        'dateFrom',
          v_previous_date_from,

        'dateTo',
          v_previous_date_to,

        'days',
          v_period_days
      ),


      'summary',
        v_current_summary,


      'previousSummary',
        v_previous_summary,


      'comparison',
        v_comparison,


      'trend',
        coalesce(
          v_trend,
          '[]'::jsonb
        ),


      'products',
        coalesce(
          v_products,
          '[]'::jsonb
        ),


      'categories',
        coalesce(
          v_categories,
          '[]'::jsonb
        ),


      'customers',
        coalesce(
          v_customers,
          '[]'::jsonb
        ),


      'warehouses',
        coalesce(
          v_warehouses,
          '[]'::jsonb
        ),


      'salesSources',
        coalesce(
          v_sources,
          '[]'::jsonb
        ),


      'expenseCategories',
        coalesce(
          v_expense_categories,
          '[]'::jsonb
        ),


      'orders',
        coalesce(
          v_orders,
          '[]'::jsonb
        ),


      'lossMakingOrders',
        coalesce(
          v_loss_orders,
          '[]'::jsonb
        ),


      'lowMarginProducts',
        coalesce(
          v_low_margin_products,
          '[]'::jsonb
        ),


      'marginExceptions',
        coalesce(
          v_margin_exceptions,
          '[]'::jsonb
        ),


      'risks',
        coalesce(
          v_risks,
          '{}'::jsonb
        )
    );

end;
$$;


/* =========================================================
 * 18. Permissions
 * ========================================================= */

revoke all
on function
  public.get_profitability_management_intelligence(
    date,
    date
  )
from public;


grant execute
on function
  public.get_profitability_management_intelligence(
    date,
    date
  )
to authenticated;


/* =========================================================
 * 19. Documentation
 * ========================================================= */

comment on function
  public.get_profitability_management_intelligence(
    date,
    date
  )
is
  'Returns complete date-aware management profitability intelligence including current and previous P&L, KPI comparisons, trends, product/category/customer/warehouse/source analysis, expenses, loss alerts and margin-approval audit. Actual profitability always uses recognized dispatch revenue and inventory COGS.';
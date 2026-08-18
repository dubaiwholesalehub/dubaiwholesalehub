import Link from "next/link";

import type {
  ComponentType,
} from "react";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Gauge,
  Package,
  ReceiptText,
  ShieldAlert,
  ShoppingCart,
  Store,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Users,
  Warehouse,
} from "lucide-react";

import {
  getProfitabilityDashboard,
} from "@/lib/repositories/profitability.repository";


/* =========================================================
 * Page Types
 * ========================================================= */

interface ProfitabilityPageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
    period?: string;
  }>;
}


/* =========================================================
 * Date Helpers
 * ========================================================= */

function isoDate(
  date: Date,
): string {
  return date
    .toISOString()
    .slice(
      0,
      10,
    );
}


function getDateRange(
  period: string,
  from?: string,
  to?: string,
) {
  const today =
    new Date();

  const todayIso =
    isoDate(
      today,
    );


  if (
    period ===
      "custom" &&
    from &&
    to
  ) {
    return {
      dateFrom:
        from,

      dateTo:
        to,

      period:
        "custom",
    };
  }


  if (
    period ===
    "today"
  ) {
    return {
      dateFrom:
        todayIso,

      dateTo:
        todayIso,

      period:
        "today",
    };
  }


  if (
    period ===
    "year"
  ) {
    return {
      dateFrom:
        `${today.getFullYear()}-01-01`,

      dateTo:
        todayIso,

      period:
        "year",
    };
  }


  if (
    period ===
    "week"
  ) {
    const start =
      new Date(
        today,
      );

    const day =
      start.getDay();

    const difference =
      day === 0
        ? -6
        : 1 - day;

    start.setDate(
      start.getDate() +
        difference,
    );


    return {
      dateFrom:
        isoDate(
          start,
        ),

      dateTo:
        todayIso,

      period:
        "week",
    };
  }


  const monthStart =
    new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
    );


  return {
    dateFrom:
      isoDate(
        monthStart,
      ),

    dateTo:
      todayIso,

    period:
      "month",
  };
}


/* =========================================================
 * Formatting Helpers
 * ========================================================= */

function money(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-AE",
    {
      style:
        "currency",

      currency:
        "AED",

      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    },
  ).format(
    value,
  );
}


function percent(
  value: number,
) {
  return `${value.toFixed(
    2,
  )}%`;
}


function units(
  value: number,
) {
  return value.toLocaleString(
    "en-AE",
    {
      minimumFractionDigits:
        0,

      maximumFractionDigits:
        2,
    },
  );
}


function sourceLabel(
  source: string,
) {
  switch (
    source
  ) {
    case "hmshoponline":
      return "HM Shop Online";

    case "dubaiwholesalehub":
      return "Dubai Wholesale Hub";

    case "import":
      return "Imported";

    case "internal":
      return "Internal";

    default:
      return source ||
        "Unknown";
  }
}


function dateTimeLabel(
  value:
    | string
    | null,
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-AE",
    {
      dateStyle:
        "medium",

      timeStyle:
        "short",
    },
  ).format(
    date,
  );
}


/* =========================================================
 * Comparison Helpers
 * ========================================================= */

function comparisonText(
  value:
    | number
    | null,
) {
  if (
    value ===
    null
  ) {
    return "No previous-period base";
  }

  if (
    value ===
    0
  ) {
    return "No change";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(
    2,
  )}% vs previous`;
}


function comparisonTone(
  value:
    | number
    | null,
  positiveIsGood = true,
) {
  if (
    value === null ||
    value === 0
  ) {
    return "neutral" as const;
  }

  const favorable =
    positiveIsGood
      ? value > 0
      : value < 0;

  return favorable
    ? "positive" as const
    : "negative" as const;
}


/* =========================================================
 * Main Page
 * ========================================================= */

export default async function ProfitabilityPage({
  searchParams,
}: ProfitabilityPageProps) {
  const params =
    await searchParams;


  const {
    dateFrom,
    dateTo,
    period,
  } =
    getDateRange(
      params.period ??
        "month",

      params.from,

      params.to,
    );


  const data =
    await getProfitabilityDashboard(
      dateFrom,
      dateTo,
    );


  const {
    summary,
    previousSummary,
    comparison,
    trend,
    products,
    categories,
    customers,
    warehouses,
    salesSources,
    expenseCategories,
    orders,
    lossMakingOrders,
    lowMarginProducts,
    marginExceptions,
    risks,
    previousPeriod,
  } =
    data;


  const topProducts =
    products.slice(
      0,
      10,
    );


  const topCustomers =
    customers.slice(
      0,
      10,
    );


  const topOrders =
    orders.slice(
      0,
      10,
    );


  const topCategories =
    categories.slice(
      0,
      10,
    );


  const maxTrendValue =
    Math.max(
      ...trend.map(
        (row) =>
          Math.max(
            row.revenue,
            row.cogs,
            Math.abs(
              row.netProfit,
            ),
          ),
      ),
      1,
    );


  return (
    <div className="space-y-6 pb-16">

      {/* ===================================================
       * Header
       * =================================================== */}

      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <BarChart3 className="size-6" />
          </div>

          <div>
            <p className="text-sm font-medium text-emerald-700">
              Accounts
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Profitability &amp; Management Intelligence
            </h1>

            <p className="mt-1 max-w-4xl text-sm leading-6 text-muted-foreground">
              Recognized revenue, exact inventory COGS, expenses,
              customer and product profitability, margin exceptions,
              risk alerts and previous-period comparison.
            </p>
          </div>
        </div>

        <PeriodLinks
          activePeriod={
            period
          }
        />
      </section>


      {/* ===================================================
       * Date Filter
       * =================================================== */}

      <CustomDateFilter
        dateFrom={
          dateFrom
        }
        dateTo={
          dateTo
        }
        active={
          period ===
          "custom"
        }
      />


      {/* ===================================================
       * Reporting Period Information
       * =================================================== */}

      <section className="grid gap-3 md:grid-cols-2">
        <PeriodCard
          label="Current Period"
          dateFrom={
            dateFrom
          }
          dateTo={
            dateTo
          }
          days={
            data.period.days
          }
          active
        />

        <PeriodCard
          label="Previous Equivalent Period"
          dateFrom={
            previousPeriod.dateFrom
          }
          dateTo={
            previousPeriod.dateTo
          }
          days={
            previousPeriod.days
          }
        />
      </section>


      {/* ===================================================
       * Executive KPIs
       * =================================================== */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Revenue"
          value={
            money(
              summary.revenue,
            )
          }
          note={
            comparisonText(
              comparison.revenuePercentage,
            )
          }
          icon={
            CircleDollarSign
          }
          tone={
            comparisonTone(
              comparison.revenuePercentage,
            )
          }
        />

        <MetricCard
          label="Gross Profit"
          value={
            money(
              summary.grossProfit,
            )
          }
          note={`Margin ${percent(
            summary.grossMarginPercentage,
          )}`}
          icon={
            summary.grossProfit >=
            0
              ? TrendingUp
              : TrendingDown
          }
          tone={
            summary.grossProfit >=
            0
              ? "positive"
              : "negative"
          }
        />

        <MetricCard
          label="Net Profit"
          value={
            money(
              summary.netProfit,
            )
          }
          note={`Net margin ${percent(
            summary.netMarginPercentage,
          )}`}
          icon={
            summary.netProfit >=
            0
              ? ArrowUpRight
              : ArrowDownRight
          }
          tone={
            summary.netProfit >=
            0
              ? "positive"
              : "negative"
          }
        />

        <MetricCard
          label="Average Order Value"
          value={
            money(
              comparison.averageOrderValue,
            )
          }
          note={`${summary.salesOrderCount} recognized orders`}
          icon={
            ShoppingCart
          }
        />

        <MetricCard
          label="COGS"
          value={
            money(
              summary.cogs,
            )
          }
          note={`${units(
            summary.quantitySold,
          )} units sold`}
          icon={
            Package
          }
        />

        <MetricCard
          label="Total Expenses"
          value={
            money(
              summary.totalExpenses,
            )
          }
          note={
            comparisonText(
              comparison.expensesPercentage,
            )
          }
          icon={
            ReceiptText
          }
          tone={
            comparisonTone(
              comparison.expensesPercentage,
              false,
            )
          }
        />

        <MetricCard
          label="Gross Margin"
          value={
            percent(
              summary.grossMarginPercentage,
            )
          }
          note={`${comparison.grossMarginPointChange >= 0 ? "+" : ""}${comparison.grossMarginPointChange.toFixed(
            2,
          )} pts vs previous`}
          icon={
            Gauge
          }
          tone={
            comparison.grossMarginPointChange >
            0
              ? "positive"
              : comparison.grossMarginPointChange <
                  0
                ? "negative"
                : "neutral"
          }
        />

        <MetricCard
          label="Recognized Orders"
          value={
            summary.salesOrderCount.toLocaleString(
              "en-AE",
            )
          }
          note={
            comparisonText(
              comparison.ordersPercentage,
            )
          }
          icon={
            Boxes
          }
        />
      </section>


      {/* ===================================================
       * Risk Intelligence
       * =================================================== */}

      <section className="rounded-2xl border bg-card">
        <div className="flex items-center gap-3 border-b px-5 py-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <ShieldAlert className="size-4" />
          </div>

          <div>
            <h2 className="font-semibold">
              Management Risk Monitor
            </h2>

            <p className="mt-0.5 text-sm text-muted-foreground">
              Automatic alerts calculated from recognized profitability.
            </p>
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-5">
          <RiskCard
            label="Net Result"
            value={
              risks.netLoss
                ? "Net Loss"
                : "Profitable"
            }
            danger={
              risks.netLoss
            }
          />

          <RiskCard
            label="Loss-Making Orders"
            value={
              risks.lossMakingOrderCount.toString()
            }
            danger={
              risks.lossMakingOrderCount >
              0
            }
          />

          <RiskCard
            label="Negative-Margin Products"
            value={
              risks.negativeMarginProductCount.toString()
            }
            danger={
              risks.negativeMarginProductCount >
              0
            }
          />

          <RiskCard
            label="Low-Margin Products"
            value={
              risks.lowMarginProductCount.toString()
            }
            danger={
              risks.lowMarginProductCount >
              0
            }
            warning
          />

          <RiskCard
            label="Approved Exceptions"
            value={
              risks.approvedExceptionCount.toString()
            }
            danger={
              false
            }
            warning={
              risks.approvedExceptionCount >
              0
            }
          />
        </div>

        <div className="grid gap-3 border-t p-5 md:grid-cols-2">
          <RiskMessage
            active={
              risks.grossMarginDeteriorating
            }
            warning
            title="Gross margin deterioration"
            message={`Gross margin moved ${risks.grossMarginPointChange.toFixed(
              2,
            )} percentage points versus the previous equivalent period.`}
            inactiveMessage="Gross margin has not deteriorated versus the previous equivalent period."
          />

          <RiskMessage
            active={
              risks.expenseGrowthAlert
            }
            warning
            title="Expense growth alert"
            message={
              risks.expenseGrowthPercentage ===
              null
                ? "Expense growth cannot be compared because the previous period has no expense base."
                : `Expenses increased ${risks.expenseGrowthPercentage.toFixed(
                    2,
                  )}% versus the previous equivalent period.`
            }
            inactiveMessage={
              risks.expenseGrowthPercentage ===
              null
                ? "No previous-period expense base is available for comparison."
                : `Expense movement is ${risks.expenseGrowthPercentage.toFixed(
                    2,
                  )}% and remains below the alert threshold.`
            }
          />
        </div>
      </section>


      {/* ===================================================
       * P&L + Period Comparison
       * =================================================== */}

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">

        <div className="overflow-hidden rounded-2xl border bg-card">
          <div className="border-b px-5 py-4">
            <h2 className="font-semibold">
              Profit &amp; Loss Statement
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {dateFrom} to {dateTo}
            </p>
          </div>

          <div className="p-5">
            <PnlLine
              label="Sales Revenue"
              value={
                summary.revenue
              }
              strong
            />

            <PnlLine
              label="Cost of Goods Sold"
              value={
                -summary.cogs
              }
            />

            <PnlSubtotal
              label="Gross Profit"
              value={
                summary.grossProfit
              }
              margin={
                summary.grossMarginPercentage
              }
            />

            <PnlLine
              label="Direct Expenses"
              value={
                -summary.directExpenses
              }
            />

            <PnlSubtotal
              label="Contribution Profit"
              value={
                summary.contributionProfit
              }
            />

            <PnlLine
              label="Operating Expenses"
              value={
                -summary.operatingExpenses
              }
            />

            <PnlSubtotal
              label="Operating Profit"
              value={
                summary.operatingProfit
              }
            />

            <PnlLine
              label="Financial Expenses"
              value={
                -summary.financialExpenses
              }
            />

            <PnlLine
              label="Other Expenses"
              value={
                -summary.otherExpenses
              }
            />

            <div className="mt-4 border-t pt-4">
              <PnlSubtotal
                label="Net Profit"
                value={
                  summary.netProfit
                }
                margin={
                  summary.netMarginPercentage
                }
                major
              />
            </div>
          </div>
        </div>


        <section className="overflow-hidden rounded-2xl border bg-card">
          <div className="border-b px-5 py-4">
            <h2 className="font-semibold">
              Previous Period Comparison
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {previousPeriod.dateFrom} to {previousPeriod.dateTo}
            </p>
          </div>

          <div className="divide-y">
            <ComparisonRow
              label="Revenue"
              current={
                summary.revenue
              }
              previous={
                previousSummary.revenue
              }
              change={
                comparison.revenuePercentage
              }
            />

            <ComparisonRow
              label="COGS"
              current={
                summary.cogs
              }
              previous={
                previousSummary.cogs
              }
              change={
                comparison.cogsPercentage
              }
              positiveIsGood={
                false
              }
            />

            <ComparisonRow
              label="Gross Profit"
              current={
                summary.grossProfit
              }
              previous={
                previousSummary.grossProfit
              }
              change={
                comparison.grossProfitPercentage
              }
            />

            <ComparisonRow
              label="Expenses"
              current={
                summary.totalExpenses
              }
              previous={
                previousSummary.totalExpenses
              }
              change={
                comparison.expensesPercentage
              }
              positiveIsGood={
                false
              }
            />

            <ComparisonRow
              label="Net Profit"
              current={
                summary.netProfit
              }
              previous={
                previousSummary.netProfit
              }
              change={
                comparison.netProfitPercentage
              }
            />

            <ComparisonRow
              label="Average Order Value"
              current={
                comparison.averageOrderValue
              }
              previous={
                comparison.previousAverageOrderValue
              }
              change={
                null
              }
            />
          </div>
        </section>
      </section>


      {/* ===================================================
       * Profit Trend
       * =================================================== */}

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex flex-col gap-2 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">
              Profitability Trend
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Revenue, COGS, expenses and net profit by{" "}
              {data.period.trendGranularity ===
              "day"
                ? "day"
                : "month"}.
            </p>
          </div>

          <CalendarDays className="size-5 text-muted-foreground" />
        </div>

        {trend.length ===
        0 ? (
          <EmptyState
            message="No recognized activity in this period."
          />
        ) : (
          <div className="overflow-x-auto p-5">
            <div className="min-w-[820px] space-y-3">
              {trend.map(
                (
                  row,
                ) => (
                  <TrendRow
                    key={
                      row.period
                    }
                    label={
                      row.label
                    }
                    revenue={
                      row.revenue
                    }
                    cogs={
                      row.cogs
                    }
                    expenses={
                      row.expenses
                    }
                    netProfit={
                      row.netProfit
                    }
                    maxValue={
                      maxTrendValue
                    }
                  />
                ),
              )}
            </div>
          </div>
        )}
      </section>


      {/* ===================================================
       * Products + Categories
       * =================================================== */}

      <section className="grid gap-6 xl:grid-cols-2">
        <ProfitabilityTable
          title="Top Products"
          description="Products ranked by recognized gross profit."
          icon={
            Package
          }
          rows={
            topProducts.map(
              (
                product,
              ) => ({
                id:
                  product.productId ??
                  product.itemName,

                label:
                  product.itemName,

                sublabel:
                  `${product.sku ?? "No SKU"} · ${units(
                    product.quantitySold,
                  )} units · ${product.salesOrderCount} orders`,

                revenue:
                  product.revenue,

                cogs:
                  product.cogs,

                profit:
                  product.grossProfit,

                margin:
                  product.grossMarginPercentage,
              }),
            )
          }
        />

        <ProfitabilityTable
          title="Category Profitability"
          description="Recognized profitability by product category."
          icon={
            Boxes
          }
          rows={
            topCategories.map(
              (
                category,
              ) => ({
                id:
                  category.categoryId ??
                  category.categoryName,

                label:
                  category.categoryName,

                sublabel:
                  `${units(
                    category.quantitySold,
                  )} units · ${category.salesOrderCount} orders`,

                revenue:
                  category.revenue,

                cogs:
                  category.cogs,

                profit:
                  category.grossProfit,

                margin:
                  category.grossMarginPercentage,
              }),
            )
          }
        />
      </section>


      {/* ===================================================
       * Customers + Orders
       * =================================================== */}

      <section className="grid gap-6 xl:grid-cols-2">
        <ProfitabilityTable
          title="Customer Profitability"
          description="Customers ranked by recognized gross profit."
          icon={
            Users
          }
          rows={
            topCustomers.map(
              (
                customer,
              ) => ({
                id:
                  customer.customerId ??
                  customer.customerName,

                label:
                  customer.customerName,

                sublabel:
                  `${customer.customerNumber ?? "No customer number"} · ${customer.salesOrderCount} orders · AOV ${money(
                    customer.averageOrderValue,
                  )}`,

                revenue:
                  customer.revenue,

                cogs:
                  customer.cogs,

                profit:
                  customer.grossProfit,

                margin:
                  customer.grossMarginPercentage,
              }),
            )
          }
        />

        <ProfitabilityTable
          title="Top Sales Orders"
          description="Sales Orders ranked by actual recognized profit."
          icon={
            CircleDollarSign
          }
          rows={
            topOrders.map(
              (
                order,
              ) => ({
                id:
                  order.salesOrderId,

                label:
                  order.orderNumber,

                sublabel:
                  `${order.customerName} · ${sourceLabel(
                    order.source,
                  )} · ${units(
                    order.quantitySold,
                  )} units`,

                revenue:
                  order.revenue,

                cogs:
                  order.cogs,

                profit:
                  order.grossProfit,

                margin:
                  order.grossMarginPercentage,

                href:
                  `/admin/sales/orders/${order.salesOrderId}`,
              }),
            )
          }
        />
      </section>


      {/* ===================================================
       * Warehouse + Sales Source
       * =================================================== */}

      <section className="grid gap-6 xl:grid-cols-2">

        <DimensionTable
          title="Warehouse Profitability"
          icon={
            Warehouse
          }
          rows={
            warehouses.map(
              (
                warehouse,
              ) => ({
                id:
                  warehouse.warehouseId ??
                  warehouse.warehouseName,

                label:
                  warehouse.warehouseName,

                sublabel:
                  `${warehouse.warehouseCode ?? "No code"} · ${warehouse.salesOrderCount} orders`,

                quantity:
                  warehouse.quantitySold,

                revenue:
                  warehouse.revenue,

                profit:
                  warehouse.grossProfit,

                margin:
                  warehouse.grossMarginPercentage,
              }),
            )
          }
        />


        <DimensionTable
          title="Sales Channel / Source"
          icon={
            Store
          }
          rows={
            salesSources.map(
              (
                source,
              ) => ({
                id:
                  source.source,

                label:
                  sourceLabel(
                    source.source,
                  ),

                sublabel:
                  `${source.salesOrderCount} orders`,

                quantity:
                  source.quantitySold,

                revenue:
                  source.revenue,

                profit:
                  source.grossProfit,

                margin:
                  source.grossMarginPercentage,
              }),
            )
          }
        />
      </section>


      {/* ===================================================
       * Expense Intelligence
       * =================================================== */}

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex items-center gap-3 border-b px-5 py-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
            <ReceiptText className="size-4" />
          </div>

          <div>
            <h2 className="font-semibold">
              Expense Intelligence
            </h2>

            <p className="mt-0.5 text-sm text-muted-foreground">
              Posted P&amp;L expense categories compared with the previous equivalent period.
            </p>
          </div>
        </div>

        {expenseCategories.length ===
        0 ? (
          <EmptyState
            message="No recognized expenses in the current or previous period."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">
                    Category
                  </th>

                  <th className="px-5 py-3">
                    Type
                  </th>

                  <th className="px-5 py-3 text-right">
                    Current
                  </th>

                  <th className="px-5 py-3 text-right">
                    Previous
                  </th>

                  <th className="px-5 py-3 text-right">
                    Change
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {expenseCategories.map(
                  (
                    expense,
                  ) => (
                    <tr
                      key={
                        expense.categoryId
                      }
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium">
                          {expense.categoryName}
                        </p>

                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {expense.categoryCode}
                        </p>
                      </td>

                      <td className="px-5 py-4 capitalize">
                        {expense.expenseType}
                      </td>

                      <td className="px-5 py-4 text-right font-semibold">
                        {money(
                          expense.currentAmount,
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {money(
                          expense.previousAmount,
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <ChangeBadge
                          value={
                            expense.changePercentage
                          }
                          positiveIsGood={
                            false
                          }
                        />
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>


      {/* ===================================================
       * Margin & Loss Intelligence
       * =================================================== */}

      <section className="grid gap-6 xl:grid-cols-2">

        <section className="overflow-hidden rounded-2xl border bg-card">
          <div className="flex items-center gap-3 border-b px-5 py-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-red-100 text-red-700">
              <TrendingDown className="size-4" />
            </div>

            <div>
              <h2 className="font-semibold">
                Loss-Making Sales Orders
              </h2>

              <p className="mt-0.5 text-sm text-muted-foreground">
                Orders where actual recognized COGS exceeded revenue.
              </p>
            </div>
          </div>

          {lossMakingOrders.length ===
          0 ? (
            <EmptyState
              message="No loss-making Sales Orders in this period."
            />
          ) : (
            <div className="divide-y">
              {lossMakingOrders
                .slice(
                  0,
                  10,
                )
                .map(
                  (
                    order,
                  ) => (
                    <Link
                      key={
                        order.salesOrderId
                      }
                      href={`/admin/sales/orders/${order.salesOrderId}`}
                      className="block px-5 py-4 transition hover:bg-muted/40"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold">
                            {order.orderNumber}
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            {order.customerName}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-bold text-red-700">
                            {money(
                              order.grossProfit,
                            )}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-red-600">
                            {percent(
                              order.grossMarginPercentage,
                            )}
                          </p>
                        </div>
                      </div>

                      <p className="mt-2 text-xs text-muted-foreground">
                        Revenue {money(
                          order.revenue,
                        )} · COGS {money(
                          order.cogs,
                        )}
                      </p>
                    </Link>
                  ),
                )}
            </div>
          )}
        </section>


        <section className="overflow-hidden rounded-2xl border bg-card">
          <div className="flex items-center gap-3 border-b px-5 py-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <TriangleAlert className="size-4" />
            </div>

            <div>
              <h2 className="font-semibold">
                Low-Margin Products
              </h2>

              <p className="mt-0.5 text-sm text-muted-foreground">
                Products below the configured warning-margin threshold.
              </p>
            </div>
          </div>

          {lowMarginProducts.length ===
          0 ? (
            <EmptyState
              message="No low-margin products in this period."
            />
          ) : (
            <div className="divide-y">
              {lowMarginProducts
                .slice(
                  0,
                  10,
                )
                .map(
                  (
                    product,
                  ) => (
                    <div
                      key={
                        product.productId ??
                        product.itemName
                      }
                      className="px-5 py-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-medium">
                            {product.itemName}
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            {product.sku ??
                              "No SKU"} ·{" "}
                            {units(
                              product.quantitySold,
                            )} units
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p
                            className={
                              product.grossProfit <
                              0
                                ? "font-bold text-red-700"
                                : "font-bold text-amber-700"
                            }
                          >
                            {money(
                              product.grossProfit,
                            )}
                          </p>

                          <p
                            className={
                              product.grossMarginPercentage <
                              0
                                ? "mt-1 text-xs font-semibold text-red-600"
                                : "mt-1 text-xs font-semibold text-amber-600"
                            }
                          >
                            {percent(
                              product.grossMarginPercentage,
                            )}
                          </p>
                        </div>
                      </div>

                      <p className="mt-2 text-xs text-muted-foreground">
                        Revenue {money(
                          product.revenue,
                        )} · COGS {money(
                          product.cogs,
                        )}
                      </p>
                    </div>
                  ),
                )}
            </div>
          )}
        </section>
      </section>


      {/* ===================================================
       * Margin Exception Audit
       * =================================================== */}

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex items-center gap-3 border-b px-5 py-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
            <ShieldAlert className="size-4" />
          </div>

          <div>
            <h2 className="font-semibold">
              Approved Margin Exceptions
            </h2>

            <p className="mt-0.5 text-sm text-muted-foreground">
              Audit trail of below-policy sales approved by management and their actual recognized result.
            </p>
          </div>
        </div>

        {marginExceptions.length ===
        0 ? (
          <EmptyState
            message="No approved margin exceptions with recognized activity in this period."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-sm">
              <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">
                    Sales Order
                  </th>

                  <th className="px-4 py-3">
                    Customer
                  </th>

                  <th className="px-4 py-3">
                    Approval Reason
                  </th>

                  <th className="px-4 py-3">
                    Approved By
                  </th>

                  <th className="px-4 py-3">
                    Approved At
                  </th>

                  <th className="px-4 py-3 text-right">
                    Approved Margin
                  </th>

                  <th className="px-4 py-3 text-right">
                    Actual Margin
                  </th>

                  <th className="px-4 py-3 text-right">
                    Actual Profit
                  </th>

                  <th className="px-4 py-3 text-right">
                    Sacrifice
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {marginExceptions.map(
                  (
                    approval,
                  ) => (
                    <tr
                      key={
                        approval.approvalId
                      }
                    >
                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/sales/orders/${approval.salesOrderId}`}
                          className="font-semibold hover:underline"
                        >
                          {approval.orderNumber}
                        </Link>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {sourceLabel(
                            approval.source,
                          )}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        {approval.customerName}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-medium">
                          {approval.requestedReason}
                        </p>

                        {approval.decisionNotes &&
                        approval.decisionNotes !==
                          approval.requestedReason ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {approval.decisionNotes}
                          </p>
                        ) : null}
                      </td>

                      <td className="px-4 py-4">
                        {approval.approvedByName ??
                          "Admin"}
                      </td>

                      <td className="px-4 py-4">
                        {dateTimeLabel(
                          approval.approvedAt,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {approval.lowestApprovedMarginPercentage ===
                        null
                          ? "—"
                          : percent(
                              approval.lowestApprovedMarginPercentage,
                            )}
                      </td>

                      <td
                        className={`px-4 py-4 text-right font-semibold ${
                          approval.actualGrossMarginPercentage <
                          0
                            ? "text-red-700"
                            : "text-emerald-700"
                        }`}
                      >
                        {percent(
                          approval.actualGrossMarginPercentage,
                        )}
                      </td>

                      <td
                        className={`px-4 py-4 text-right font-bold ${
                          approval.actualGrossProfit <
                          0
                            ? "text-red-700"
                            : "text-emerald-700"
                        }`}
                      >
                        {money(
                          approval.actualGrossProfit,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right font-semibold text-orange-700">
                        {approval.approvedMarginSacrificePoints.toFixed(
                          2,
                        )} pts
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}


/* =========================================================
 * Period Navigation
 * ========================================================= */

function PeriodLinks({
  activePeriod,
}: {
  activePeriod: string;
}) {
  const options = [
    {
      value:
        "today",

      label:
        "Today",
    },
    {
      value:
        "week",

      label:
        "This Week",
    },
    {
      value:
        "month",

      label:
        "This Month",
    },
    {
      value:
        "year",

      label:
        "This Year",
    },
  ];


  return (
    <div className="flex flex-wrap gap-2">
      {options.map(
        (
          option,
        ) => (
          <Link
            key={
              option.value
            }
            href={`/admin/accounts/profitability?period=${option.value}`}
            className={
              activePeriod ===
              option.value
                ? "rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white"
                : "rounded-lg border bg-background px-3 py-2 text-sm font-medium transition hover:bg-muted"
            }
          >
            {option.label}
          </Link>
        ),
      )}
    </div>
  );
}


/* =========================================================
 * Custom Date Filter
 * ========================================================= */

function CustomDateFilter({
  dateFrom,
  dateTo,
  active,
}: {
  dateFrom: string;
  dateTo: string;
  active: boolean;
}) {
  return (
    <form className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-end">
      <input
        type="hidden"
        name="period"
        value="custom"
      />

      <label className="space-y-1">
        <span className="text-xs font-medium text-muted-foreground">
          From
        </span>

        <input
          type="date"
          name="from"
          defaultValue={
            dateFrom
          }
          className="h-10 rounded-lg border bg-background px-3 text-sm"
        />
      </label>

      <label className="space-y-1">
        <span className="text-xs font-medium text-muted-foreground">
          To
        </span>

        <input
          type="date"
          name="to"
          defaultValue={
            dateTo
          }
          className="h-10 rounded-lg border bg-background px-3 text-sm"
        />
      </label>

      <button
        type="submit"
        className={
          active
            ? "h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white"
            : "h-10 rounded-lg border px-4 text-sm font-semibold transition hover:bg-muted"
        }
      >
        Apply Custom Range
      </button>
    </form>
  );
}


/* =========================================================
 * Period Card
 * ========================================================= */

function PeriodCard({
  label,
  dateFrom,
  dateTo,
  days,
  active = false,
}: {
  label: string;
  dateFrom: string;
  dateTo: string;
  days: number;
  active?: boolean;
}) {
  return (
    <div
      className={
        active
          ? "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3"
          : "rounded-xl border bg-card px-4 py-3"
      }
    >
      <p
        className={
          active
            ? "text-xs font-semibold uppercase tracking-wide text-emerald-700"
            : "text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        }
      >
        {label}
      </p>

      <p className="mt-1 font-semibold">
        {dateFrom}{" "}
        <ArrowRight className="mx-1 inline size-3.5" />{" "}
        {dateTo}
      </p>

      <p className="mt-1 text-xs text-muted-foreground">
        {days} day
        {days ===
        1
          ? ""
          : "s"}
      </p>
    </div>
  );
}


/* =========================================================
 * Metric Card
 * ========================================================= */

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  note: string;

  icon:
    ComponentType<{
      className?: string;
    }>;

  tone?:
    | "positive"
    | "negative"
    | "neutral";
}) {
  return (
    <article className="rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {label}
          </p>

          <p
            className={`mt-2 text-2xl font-semibold tracking-tight ${
              tone ===
              "negative"
                ? "text-red-700"
                : tone ===
                    "positive"
                  ? "text-emerald-700"
                  : ""
            }`}
          >
            {value}
          </p>
        </div>

        <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-4" />
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {note}
      </p>
    </article>
  );
}


/* =========================================================
 * Risk Components
 * ========================================================= */

function RiskCard({
  label,
  value,
  danger,
  warning = false,
}: {
  label: string;
  value: string;
  danger: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={
        danger
          ? "rounded-xl border border-red-200 bg-red-50 p-4"
          : warning
            ? "rounded-xl border border-amber-200 bg-amber-50 p-4"
            : "rounded-xl border bg-muted/20 p-4"
      }
    >
      <p className="text-xs font-medium text-muted-foreground">
        {label}
      </p>

      <p
        className={
          danger
            ? "mt-2 text-xl font-bold text-red-700"
            : warning
              ? "mt-2 text-xl font-bold text-amber-700"
              : "mt-2 text-xl font-bold text-emerald-700"
        }
      >
        {value}
      </p>
    </div>
  );
}


function RiskMessage({
  active,
  title,
  message,
  inactiveMessage,
  warning = false,
}: {
  active: boolean;
  title: string;
  message: string;
  inactiveMessage: string;
  warning?: boolean;
}) {
  return (
    <div
      className={
        active
          ? warning
            ? "rounded-xl border border-amber-200 bg-amber-50 p-4"
            : "rounded-xl border border-red-200 bg-red-50 p-4"
          : "rounded-xl border border-emerald-200 bg-emerald-50 p-4"
      }
    >
      <div className="flex items-start gap-3">
        {active ? (
          <AlertTriangle
            className={
              warning
                ? "mt-0.5 size-5 shrink-0 text-amber-700"
                : "mt-0.5 size-5 shrink-0 text-red-700"
            }
          />
        ) : (
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" />
        )}

        <div>
          <p className="font-semibold">
            {title}
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            {active
              ? message
              : inactiveMessage}
          </p>
        </div>
      </div>
    </div>
  );
}


/* =========================================================
 * P&L Components
 * ========================================================= */

function PnlLine({
  label,
  value,
  strong,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 last:border-0">
      <span
        className={
          strong
            ? "font-semibold"
            : "text-sm text-muted-foreground"
        }
      >
        {label}
      </span>

      <span
        className={`font-medium ${
          value <
          0
            ? "text-red-700"
            : ""
        }`}
      >
        {money(
          value,
        )}
      </span>
    </div>
  );
}


function PnlSubtotal({
  label,
  value,
  margin,
  major,
}: {
  label: string;
  value: number;
  margin?: number;
  major?: boolean;
}) {
  return (
    <div
      className={
        major
          ? "flex items-center justify-between gap-4 rounded-xl bg-muted/50 px-4 py-4"
          : "my-2 flex items-center justify-between gap-4 rounded-lg bg-muted/30 px-3 py-3"
      }
    >
      <div>
        <p
          className={
            major
              ? "text-base font-bold"
              : "font-semibold"
          }
        >
          {label}
        </p>

        {margin !==
        undefined ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Margin{" "}
            {percent(
              margin,
            )}
          </p>
        ) : null}
      </div>

      <span
        className={`${
          major
            ? "text-xl font-bold"
            : "font-bold"
        } ${
          value >=
          0
            ? "text-emerald-700"
            : "text-red-700"
        }`}
      >
        {money(
          value,
        )}
      </span>
    </div>
  );
}


/* =========================================================
 * Comparison Row
 * ========================================================= */

function ComparisonRow({
  label,
  current,
  previous,
  change,
  positiveIsGood = true,
}: {
  label: string;
  current: number;
  previous: number;
  change:
    | number
    | null;
  positiveIsGood?: boolean;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4">
      <div>
        <p className="font-medium">
          {label}
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          Previous{" "}
          {money(
            previous,
          )}
        </p>
      </div>

      <div className="text-right">
        <p className="font-semibold">
          {money(
            current,
          )}
        </p>

        <div className="mt-1">
          <ChangeBadge
            value={
              change
            }
            positiveIsGood={
              positiveIsGood
            }
          />
        </div>
      </div>
    </div>
  );
}


/* =========================================================
 * Change Badge
 * ========================================================= */

function ChangeBadge({
  value,
  positiveIsGood = true,
}: {
  value:
    | number
    | null;
  positiveIsGood?: boolean;
}) {
  if (
    value ===
    null
  ) {
    return (
      <span className="inline-flex rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
        No base
      </span>
    );
  }


  if (
    value ===
    0
  ) {
    return (
      <span className="inline-flex rounded-full bg-muted px-2 py-1 text-xs font-medium">
        0.00%
      </span>
    );
  }


  const favorable =
    positiveIsGood
      ? value >
        0
      : value <
        0;


  return (
    <span
      className={
        favorable
          ? "inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700"
          : "inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700"
      }
    >
      {value >
      0
        ? "+"
        : ""}
      {value.toFixed(
        2,
      )}
      %
    </span>
  );
}


/* =========================================================
 * Trend
 * ========================================================= */

function TrendRow({
  label,
  revenue,
  cogs,
  expenses,
  netProfit,
  maxValue,
}: {
  label: string;
  revenue: number;
  cogs: number;
  expenses: number;
  netProfit: number;
  maxValue: number;
}) {
  const revenueWidth =
    Math.max(
      0,
      Math.min(
        100,
        (
          revenue /
          maxValue
        ) *
          100,
      ),
    );

  const cogsWidth =
    Math.max(
      0,
      Math.min(
        100,
        (
          cogs /
          maxValue
        ) *
          100,
      ),
    );

  return (
    <div className="grid grid-cols-[90px_1fr_150px] items-center gap-4">
      <div>
        <p className="text-sm font-semibold">
          {label}
        </p>
      </div>

      <div className="space-y-1">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{
              width:
                `${revenueWidth}%`,
            }}
          />
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-slate-400"
            style={{
              width:
                `${cogsWidth}%`,
            }}
          />
        </div>
      </div>

      <div className="text-right">
        <p className="text-xs text-muted-foreground">
          Revenue{" "}
          {money(
            revenue,
          )}
        </p>

        <p
          className={
            netProfit >=
            0
              ? "mt-1 text-sm font-bold text-emerald-700"
              : "mt-1 text-sm font-bold text-red-700"
          }
        >
          Net{" "}
          {money(
            netProfit,
          )}
        </p>

        {expenses >
        0 ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Expenses{" "}
            {money(
              expenses,
            )}
          </p>
        ) : null}
      </div>
    </div>
  );
}


/* =========================================================
 * General Profitability Table
 * ========================================================= */

interface ProfitabilityTableRow {
  id: string;

  label: string;

  sublabel: string;

  revenue: number;

  cogs: number;

  profit: number;

  margin: number;

  href?: string;
}


function ProfitabilityTable({
  title,
  description,
  icon: Icon,
  rows,
}: {
  title: string;

  description: string;

  icon:
    ComponentType<{
      className?: string;
    }>;

  rows:
    ProfitabilityTableRow[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-start gap-3 border-b px-5 py-4">
        <Icon className="mt-0.5 size-4 text-muted-foreground" />

        <div>
          <h2 className="font-semibold">
            {title}
          </h2>

          <p className="mt-1 text-xs text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      {rows.length ===
      0 ? (
        <EmptyState
          message="No profitability data in this period."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">
                  Name
                </th>

                <th className="px-4 py-3 text-right">
                  Revenue
                </th>

                <th className="px-4 py-3 text-right">
                  COGS
                </th>

                <th className="px-4 py-3 text-right">
                  Profit
                </th>

                <th className="px-4 py-3 text-right">
                  Margin
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {rows.map(
                (
                  row,
                ) => {
                  const content =
                    (
                      <>
                        <p className="font-medium">
                          {row.label}
                        </p>

                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {row.sublabel}
                        </p>
                      </>
                    );


                  return (
                    <tr
                      key={
                        row.id
                      }
                    >
                      <td className="px-4 py-4">
                        {row.href ? (
                          <Link
                            href={
                              row.href
                            }
                            className="hover:underline"
                          >
                            {content}
                          </Link>
                        ) : (
                          content
                        )}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {money(
                          row.revenue,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {money(
                          row.cogs,
                        )}
                      </td>

                      <td
                        className={`px-4 py-4 text-right font-semibold ${
                          row.profit >=
                          0
                            ? "text-emerald-700"
                            : "text-red-700"
                        }`}
                      >
                        {money(
                          row.profit,
                        )}
                      </td>

                      <td
                        className={`px-4 py-4 text-right font-semibold ${
                          row.margin <
                          0
                            ? "text-red-700"
                            : row.margin <
                                15
                              ? "text-amber-700"
                              : ""
                        }`}
                      >
                        {percent(
                          row.margin,
                        )}
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}


/* =========================================================
 * Dimension Table
 * ========================================================= */

interface DimensionTableRow {
  id: string;

  label: string;

  sublabel: string;

  quantity: number;

  revenue: number;

  profit: number;

  margin: number;
}


function DimensionTable({
  title,
  icon: Icon,
  rows,
}: {
  title: string;

  icon:
    ComponentType<{
      className?: string;
    }>;

  rows:
    DimensionTableRow[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-center gap-2 border-b px-5 py-4">
        <Icon className="size-4 text-muted-foreground" />

        <h2 className="font-semibold">
          {title}
        </h2>
      </div>

      {rows.length ===
      0 ? (
        <EmptyState
          message="No recognized profitability data in this period."
        />
      ) : (
        <div className="divide-y">
          {rows.map(
            (
              row,
            ) => (
              <div
                key={
                  row.id
                }
                className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="font-medium">
                    {row.label}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.sublabel} ·{" "}
                    {units(
                      row.quantity,
                    )} units
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-5 text-right">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Revenue
                    </p>

                    <p className="mt-1 font-semibold">
                      {money(
                        row.revenue,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Profit
                    </p>

                    <p
                      className={
                        row.profit >=
                        0
                          ? "mt-1 font-semibold text-emerald-700"
                          : "mt-1 font-semibold text-red-700"
                      }
                    >
                      {money(
                        row.profit,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Margin
                    </p>

                    <p
                      className={
                        row.margin <
                        0
                          ? "mt-1 font-semibold text-red-700"
                          : row.margin <
                              15
                            ? "mt-1 font-semibold text-amber-700"
                            : "mt-1 font-semibold"
                      }
                    >
                      {percent(
                        row.margin,
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </section>
  );
}


/* =========================================================
 * Empty State
 * ========================================================= */

function EmptyState({
  message,
}: {
  message: string;
}) {
  return (
    <div className="px-5 py-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
import Link from "next/link";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Package,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import {
  getProfitabilityDashboard,
} from "@/lib/repositories/profitability.repository";


interface ProfitabilityPageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
    period?: string;
  }>;
}


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


function money(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-AE",
    {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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
    products,
    orders,
    customers,
    expenseBreakdown,
    daily,
    lossMakingOrders,
  } =
    data;


  const topProducts =
    products.slice(
      0,
      8,
    );


  const topCustomers =
    customers.slice(
      0,
      8,
    );


  const topOrders =
    orders.slice(
      0,
      8,
    );


  const recentDaily =
    daily.slice(
      -14,
    ).reverse();


  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <BarChart3 className="size-5" />
          </div>

          <div>
            <p className="text-sm font-medium text-emerald-700">
              Accounts
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Profitability & P&amp;L
            </h1>

            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Analyze recognized sales revenue, exact inventory COGS, expenses, gross profit and net profit.
            </p>
          </div>
        </div>

        <PeriodLinks
          activePeriod={
            period
          }
        />
      </section>


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


      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Revenue"
          value={
            money(
              summary.revenue,
            )
          }
          note={`${summary.salesOrderCount} recognized sales orders`}
          icon={
            CircleDollarSign
          }
        />

        <MetricCard
          label="COGS"
          value={
            money(
              summary.cogs,
            )
          }
          note={`${summary.quantitySold.toFixed(
            2,
          )} units sold`}
          icon={
            Package
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
          positive={
            summary.grossProfit >=
            0
          }
        />

        <MetricCard
          label="Expenses"
          value={
            money(
              summary.totalExpenses,
            )
          }
          note="P&L-recognized expenses"
          icon={
            ReceiptText
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
          positive={
            summary.netProfit >=
            0
          }
        />
      </section>


      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
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


        <div className="space-y-6">
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="font-semibold">
              Expense Breakdown
            </h2>

            <div className="mt-4 space-y-3">
              {expenseBreakdown.map(
                (
                  item,
                ) => (
                  <div
                    key={
                      item.expenseType
                    }
                    className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3"
                  >
                    <span className="capitalize text-sm">
                      {
                        item.expenseType
                      }
                    </span>

                    <span className="font-semibold">
                      {money(
                        item.amount,
                      )}
                    </span>
                  </div>
                ),
              )}
            </div>
          </section>


          <section className="rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-600" />

              <h2 className="font-semibold">
                Margin Alerts
              </h2>
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              Sales Orders where recognized COGS exceeds recognized revenue.
            </p>


            {lossMakingOrders.length ===
            0 ? (
              <p className="mt-4 rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                No loss-making orders in this period.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {lossMakingOrders
                  .slice(
                    0,
                    6,
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
                        className="block rounded-lg border border-red-200 bg-red-50 px-4 py-3 hover:bg-red-100"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-semibold text-red-900">
                            {
                              order.orderNumber
                            }
                          </span>

                          <span className="font-semibold text-red-700">
                            {money(
                              order.grossProfit,
                            )}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-red-800/70">
                          Revenue{" "}
                          {money(
                            order.revenue,
                          )}
                          {" • "}
                          COGS{" "}
                          {money(
                            order.cogs,
                          )}
                          {" • "}
                          Margin{" "}
                          {percent(
                            order.grossMarginPercentage,
                          )}
                        </p>
                      </Link>
                    ),
                  )}
              </div>
            )}
          </section>
        </div>
      </section>


      <section className="grid gap-6 xl:grid-cols-2">
        <ProfitabilityTable
          title="Top Products"
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
                  product.sku ??
                  "No SKU",

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
          title="Top Customers"
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
                  `${customer.salesOrderCount} sales order${
                    customer.salesOrderCount ===
                    1
                      ? ""
                      : "s"
                  }`,

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
      </section>


      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ProfitabilityTable
          title="Top Sales Orders"
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
                  `${order.quantitySold.toFixed(
                    2,
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


        <section className="overflow-hidden rounded-2xl border bg-card">
          <div className="border-b px-5 py-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-muted-foreground" />

              <h2 className="font-semibold">
                Recent Daily Profit
              </h2>
            </div>
          </div>

          <div className="divide-y">
            {recentDaily.length ===
            0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                No recognized activity in this period.
              </div>
            ) : (
              recentDaily.map(
                (
                  row,
                ) => (
                  <div
                    key={
                      row.date
                    }
                    className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4"
                  >
                    <div>
                      <p className="font-medium">
                        {
                          row.date
                        }
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Revenue{" "}
                        {money(
                          row.revenue,
                        )}
                        {" • "}
                        COGS{" "}
                        {money(
                          row.cogs,
                        )}
                        {" • "}
                        Expenses{" "}
                        {money(
                          row.expenses,
                        )}
                      </p>
                    </div>

                    <div className="text-right">
                      <p
                        className={
                          row.netProfit >=
                          0
                            ? "font-semibold text-emerald-700"
                            : "font-semibold text-red-700"
                        }
                      >
                        {money(
                          row.netProfit,
                        )}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Net Profit
                      </p>
                    </div>
                  </div>
                ),
              )
            )}
          </div>
        </section>
      </section>
    </div>
  );
}


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
                : "rounded-lg border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
            }
          >
            {
              option.label
            }
          </Link>
        ),
      )}
    </div>
  );
}


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
            : "h-10 rounded-lg border px-4 text-sm font-semibold"
        }
      >
        Apply Custom Range
      </button>
    </form>
  );
}


function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  positive,
}: {
  label: string;
  value: string;
  note: string;
  icon:
    React.ComponentType<{
      className?: string;
    }>;

  positive?: boolean;
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
              positive ===
              false
                ? "text-red-700"
                : positive ===
                    true
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
          value < 0
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
          value >= 0
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
  icon: Icon,
  rows,
}: {
  title: string;

  icon:
    React.ComponentType<{
      className?: string;
    }>;

  rows:
    ProfitabilityTableRow[];
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
        <div className="px-5 py-10 text-center text-sm text-muted-foreground">
          No profitability data in this period.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
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
                          {
                            row.label
                          }
                        </p>

                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {
                            row.sublabel
                          }
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
                          row.margin >=
                          0
                            ? ""
                            : "text-red-700"
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
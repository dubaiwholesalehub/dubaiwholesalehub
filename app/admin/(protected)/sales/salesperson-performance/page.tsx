import {
  CalendarDays,
  TrendingUp,
  Users,
} from "lucide-react";

import {
  requireAdmin,
} from "@/lib/auth/require-admin";

import {
  getSalespersonPerformance,
} from "@/lib/repositories/salesperson-performance.repository";

type PageProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
  }>;
};

function todayDubai() {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Dubai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(new Date());
}

function firstDayOfMonth(
  date: string,
) {
  return `${date.slice(0, 7)}-01`;
}

function money(value: number) {
  return new Intl.NumberFormat(
    "en-AE",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(value);
}

function percentage(value: number) {
  return new Intl.NumberFormat(
    "en-AE",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(value);
}

export default async function SalespersonPerformancePage({
  searchParams,
}: PageProps) {
  await requireAdmin();

  const params =
    await searchParams;

  const today =
    todayDubai();

  const dateFrom =
    params.from ||
    firstDayOfMonth(today);

  const dateTo =
    params.to ||
    today;

  if (dateFrom > dateTo) {
    throw new Error(
      "From date cannot be later than To date.",
    );
  }

  const data =
    await getSalespersonPerformance(
      dateFrom,
      dateTo,
    );

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <TrendingUp className="size-5" />
          </div>

          <div>
            <p className="text-sm font-medium text-amber-600">
              Sales Intelligence
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Salesperson Performance
            </h1>

            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Compare salesperson ownership, recognized sales,
              posted returns and gross profitability for the
              selected period.
            </p>
          </div>
        </div>

        <form
          method="get"
          className="flex flex-wrap items-end gap-2 rounded-xl border bg-card p-3"
        >
          <label className="space-y-1">
            <span className="block text-xs font-semibold text-slate-500">
              From
            </span>

            <input
              type="date"
              name="from"
              defaultValue={dateFrom}
              className="h-9 rounded-lg border bg-background px-3 text-sm"
            />
          </label>

          <label className="space-y-1">
            <span className="block text-xs font-semibold text-slate-500">
              To
            </span>

            <input
              type="date"
              name="to"
              defaultValue={dateTo}
              className="h-9 rounded-lg border bg-background px-3 text-sm"
            />
          </label>

          <button
            type="submit"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <CalendarDays className="size-4" />
            Apply
          </button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="Orders"
          value={String(
            data.totals.orderCount,
          )}
        />

        <SummaryCard
          label="Sales"
          value={`AED ${money(
            data.totals.sales,
          )}`}
        />

        <SummaryCard
          label="Returns"
          value={`AED ${money(
            data.totals.returns,
          )}`}
        />

        <SummaryCard
          label="Net Sales"
          value={`AED ${money(
            data.totals.netSales,
          )}`}
        />

        <SummaryCard
          label="Gross Profit"
          value={`AED ${money(
            data.totals.grossProfit,
          )}`}
          secondary={`${percentage(
            data.totals
              .grossMarginPercentage,
          )}% margin`}
        />
      </div>

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-semibold">
              Team Performance
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {dateFrom} to {dateTo}
            </p>
          </div>

          <div className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Users className="size-4" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">
                  Salesperson
                </th>

                <th className="px-4 py-3 text-right">
                  Orders
                </th>

                <th className="px-4 py-3 text-right">
                  Sales
                </th>

                <th className="px-4 py-3 text-right">
                  Returns
                </th>

                <th className="px-4 py-3 text-right">
                  Net Sales
                </th>

                <th className="px-4 py-3 text-right">
                  Gross Profit
                </th>

                <th className="px-5 py-3 text-right">
                  Margin
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {data.rows.map(
                (row) => (
                  <tr
                    key={
                      row.salespersonId
                    }
                    className="transition hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-950">
                        {
                          row.salespersonName
                        }
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        {row.designation ||
                          "No designation"}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-right font-medium">
                      {row.orderCount}
                    </td>

                    <td className="px-4 py-4 text-right tabular-nums">
                      AED{" "}
                      {money(
                        row.sales,
                      )}
                    </td>

                    <td className="px-4 py-4 text-right tabular-nums text-red-600">
                      AED{" "}
                      {money(
                        row.returns,
                      )}
                    </td>

                    <td className="px-4 py-4 text-right font-semibold tabular-nums">
                      AED{" "}
                      {money(
                        row.netSales,
                      )}
                    </td>

                    <td className="px-4 py-4 text-right font-semibold tabular-nums text-emerald-700">
                      AED{" "}
                      {money(
                        row.grossProfit,
                      )}
                    </td>

                    <td className="px-5 py-4 text-right font-semibold tabular-nums">
                      {percentage(
                        row.grossMarginPercentage,
                      )}
                      %
                    </td>
                  </tr>
                ),
              )}

              {data.rows.length ===
              0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-14 text-center text-sm text-slate-500"
                  >
                    No salesperson sales activity was found for this period.
                  </td>
                </tr>
              ) : null}
            </tbody>

            {data.rows.length >
            0 ? (
              <tfoot className="border-t bg-slate-50 font-semibold">
                <tr>
                  <td className="px-5 py-4">
                    Total
                  </td>

                  <td className="px-4 py-4 text-right">
                    {
                      data.totals
                        .orderCount
                    }
                  </td>

                  <td className="px-4 py-4 text-right tabular-nums">
                    AED{" "}
                    {money(
                      data.totals
                        .sales,
                    )}
                  </td>

                  <td className="px-4 py-4 text-right tabular-nums text-red-600">
                    AED{" "}
                    {money(
                      data.totals
                        .returns,
                    )}
                  </td>

                  <td className="px-4 py-4 text-right tabular-nums">
                    AED{" "}
                    {money(
                      data.totals
                        .netSales,
                    )}
                  </td>

                  <td className="px-4 py-4 text-right tabular-nums text-emerald-700">
                    AED{" "}
                    {money(
                      data.totals
                        .grossProfit,
                    )}
                  </td>

                  <td className="px-5 py-4 text-right tabular-nums">
                    {percentage(
                      data.totals
                        .grossMarginPercentage,
                    )}
                    %
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </section>

      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <strong>
          Reporting basis:
        </strong>{" "}
        Sales and gross profit use the ERP&apos;s existing
        profitability intelligence. Posted sales returns are
        attributed to the salesperson who owns the original
        Sales Order. Net Sales equals Sales minus Returns.
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  secondary,
}: {
  label: string;
  value: string;
  secondary?: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-xl font-bold text-slate-950">
        {value}
      </p>

      {secondary ? (
        <p className="mt-1 text-xs text-slate-500">
          {secondary}
        </p>
      ) : null}
    </div>
  );
}
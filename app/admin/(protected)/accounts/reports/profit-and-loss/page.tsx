import Link from "next/link";

import { requireAdmin } from "@/lib/auth/require-admin";
import {
  FormalProfitAndLossSection,
  getFormalProfitAndLossStatement,
} from "@/lib/repositories/profit-and-loss.repository";

interface ProfitAndLossPageProps {
  searchParams?: Promise<{
    from?: string;
    to?: string;
  }>;
}

function formatMoney(
  value: number,
): string {
  return new Intl.NumberFormat(
    "en-AE",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(value);
}

function formatPercentage(
  value: number,
): string {
  return `${value.toFixed(2)}%`;
}

function todayIso(): string {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function monthStartIso(): string {
  const now =
    new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  )
    .toISOString()
    .slice(0, 10);
}

function StatementSection({
  title,
  section,
}: {
  title: string;
  section: FormalProfitAndLossSection;
}) {
  return (
    <div className="border-b border-slate-200 py-5 last:border-b-0">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">
          {title}
        </h3>

        <div className="text-sm font-bold text-slate-950">
          AED {formatMoney(section.total)}
        </div>
      </div>

      {section.accounts.length > 0 ? (
        <div className="space-y-2">
          {section.accounts.map(
            (account) => (
              <div
                key={account.glAccountId}
                className="grid grid-cols-[100px_1fr_auto] items-center gap-3 text-sm"
              >
                <div className="font-mono text-xs text-slate-500">
                  {account.accountCode}
                </div>

                <div className="text-slate-700">
                  {account.accountName}
                </div>

                <div className="font-medium tabular-nums text-slate-950">
                  AED {formatMoney(account.amount)}
                </div>
              </div>
            ),
          )}
        </div>
      ) : (
        <div className="text-sm text-slate-400">
          No activity in this period.
        </div>
      )}
    </div>
  );
}

function ProfitRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
}) {
  return (
    <div
      className={[
        "flex items-center justify-between gap-4 py-4",
        emphasis
          ? "border-y-2 border-slate-950"
          : "border-b border-slate-200",
      ].join(" ")}
    >
      <div
        className={
          emphasis
            ? "text-base font-black text-slate-950"
            : "text-sm font-bold text-slate-700"
        }
      >
        {label}
      </div>

      <div
        className={[
          "tabular-nums",
          emphasis
            ? "text-xl font-black text-slate-950"
            : "text-base font-bold text-slate-950",
        ].join(" ")}
      >
        AED {formatMoney(value)}
      </div>
    </div>
  );
}

export default async function ProfitAndLossPage({
  searchParams,
}: ProfitAndLossPageProps) {
  await requireAdmin();

  const params =
    (await searchParams) ?? {};

  const dateFrom =
    params.from ??
    monthStartIso();

  const dateTo =
    params.to ??
    todayIso();

  const statement =
    await getFormalProfitAndLossStatement(
      dateFrom,
      dateTo,
    );

  const isLoss =
    statement.netProfit < 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <Link
              href="/admin/accounts"
              className="hover:text-slate-950"
            >
              Accounts
            </Link>

            <span>/</span>

            <span>Reports</span>

            <span>/</span>

            <span className="font-semibold text-slate-950">
              Profit &amp; Loss
            </span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            Profit &amp; Loss Statement
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Formal General Ledger financial statement in AED based on posting-date activity.
          </p>
        </div>

        <Link
          href="/admin/accounts/profitability"
          className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950"
        >
          Management Profitability
        </Link>
      </div>

      <form
        method="get"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              From Date
            </span>

            <input
              type="date"
              name="from"
              defaultValue={dateFrom}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              To Date
            </span>

            <input
              type="date"
              name="to"
              defaultValue={dateTo}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
            />
          </label>

          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
          >
            Apply
          </button>
        </div>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Revenue
          </div>

          <div className="mt-2 text-2xl font-black text-slate-950">
            AED {formatMoney(statement.revenue.total)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Gross Profit
          </div>

          <div className="mt-2 text-2xl font-black text-slate-950">
            AED {formatMoney(statement.grossProfit)}
          </div>

          <div className="mt-1 text-xs text-slate-500">
            Margin {formatPercentage(statement.grossMarginPercentage)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Total Expenses
          </div>

          <div className="mt-2 text-2xl font-black text-slate-950">
            AED {formatMoney(statement.totalExpenses)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Net Profit / Loss
          </div>

          <div
            className={[
              "mt-2 text-2xl font-black",
              isLoss
                ? "text-red-600"
                : "text-emerald-700",
            ].join(" ")}
          >
            AED {formatMoney(statement.netProfit)}
          </div>

          <div className="mt-1 text-xs text-slate-500">
            Margin {formatPercentage(statement.netMarginPercentage)}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Formal Statement
          </div>

          <h2 className="mt-1 text-xl font-black text-slate-950">
            Profit &amp; Loss
          </h2>

          <div className="mt-1 text-sm text-slate-500">
            {statement.dateFrom} to {statement.dateTo} · {statement.currencyCode}
          </div>
        </div>

        <div className="px-6">
          <StatementSection
            title="Revenue"
            section={statement.revenue}
          />

          <StatementSection
            title="Cost of Sales"
            section={statement.costOfSales}
          />

          <ProfitRow
            label="Gross Profit"
            value={statement.grossProfit}
            emphasis
          />

          <StatementSection
            title="Direct Expenses"
            section={statement.directExpenses}
          />

          <ProfitRow
            label="Contribution Profit"
            value={statement.contributionProfit}
          />

          <StatementSection
            title="Operating Expenses"
            section={statement.operatingExpenses}
          />

          <ProfitRow
            label="Operating Profit"
            value={statement.operatingProfit}
            emphasis
          />

          <StatementSection
            title="Other Income"
            section={statement.otherIncome}
          />

          <StatementSection
            title="Financial Expenses"
            section={statement.financialExpenses}
          />

          <StatementSection
            title="Other Expenses"
            section={statement.otherExpenses}
          />

          <div className="py-6">
            <ProfitRow
              label="Net Profit / (Loss)"
              value={statement.netProfit}
              emphasis
            />

            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-500">
                Net Margin
              </span>

              <span className="font-bold text-slate-950">
                {formatPercentage(statement.netMarginPercentage)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
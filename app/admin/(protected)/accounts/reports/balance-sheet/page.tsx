import Link from "next/link";

import { requireAdmin } from "@/lib/auth/require-admin";
import {
  FormalBalanceSheetSection,
  FormalBalanceSheetEquitySection,
  getFormalBalanceSheet,
} from "@/lib/repositories/balance-sheet.repository";

interface BalanceSheetPageProps {
  searchParams?: Promise<{
    asOf?: string;
  }>;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function todayIso(): string {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function StatementSection({
  title,
  section,
}: {
  title: string;
  section: FormalBalanceSheetSection;
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
          {section.accounts.map((account) => (
            <div
              key={account.glAccountId}
              className="grid grid-cols-[120px_1fr_auto] items-center gap-3 text-sm"
            >
              <div className="font-mono text-xs text-slate-500">
                {account.accountCode}
              </div>

              <div>
                <div className="text-slate-700">
                  {account.accountName}
                </div>

                {account.parentName && (
                  <div className="mt-0.5 text-xs text-slate-400">
                    {account.parentName}
                  </div>
                )}
              </div>

              <div className="font-medium tabular-nums text-slate-950">
                AED {formatMoney(account.amount)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-slate-400">
          No balance as of this date.
        </div>
      )}
    </div>
  );
}

function EquitySection({
  section,
}: {
  section: FormalBalanceSheetEquitySection;
}) {
  return (
    <div className="border-b border-slate-200 py-5">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">
          Equity
        </h3>

        <div className="text-sm font-bold text-slate-950">
          AED {formatMoney(section.total)}
        </div>
      </div>

      <div className="space-y-2">
        {section.accounts.map((account) => (
          <div
            key={account.glAccountId}
            className="grid grid-cols-[120px_1fr_auto] items-center gap-3 text-sm"
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
        ))}

        <div className="grid grid-cols-[120px_1fr_auto] items-center gap-3 pt-2 text-sm">
          <div className="font-mono text-xs text-slate-500">
            CYE
          </div>

          <div className="font-semibold text-slate-700">
            Current Year Earnings
          </div>

          <div
            className={[
              "font-bold tabular-nums",
              section.currentYearEarnings < 0
                ? "text-red-600"
                : "text-emerald-700",
            ].join(" ")}
          >
            AED {formatMoney(section.currentYearEarnings)}
          </div>
        </div>
      </div>
    </div>
  );
}

function TotalRow({
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

export default async function BalanceSheetPage({
  searchParams,
}: BalanceSheetPageProps) {
  await requireAdmin();

  const params =
    (await searchParams) ?? {};

  const asOfDate =
    params.asOf ??
    todayIso();

  const statement =
    await getFormalBalanceSheet(
      asOfDate,
    );

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
              Balance Sheet
            </span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            Balance Sheet
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Formal General Ledger financial position in AED as of the selected date.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/accounts/reports/profit-and-loss"
            className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950"
          >
            Profit &amp; Loss
          </Link>

          <Link
            href="/admin/accounts/profitability"
            className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950"
          >
            Management Profitability
          </Link>
        </div>
      </div>

      <form
        method="get"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              As Of Date
            </span>

            <input
              type="date"
              name="asOf"
              defaultValue={asOfDate}
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
            Total Assets
          </div>

          <div className="mt-2 text-2xl font-black text-slate-950">
            AED {formatMoney(statement.totalAssets)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Total Liabilities
          </div>

          <div className="mt-2 text-2xl font-black text-slate-950">
            AED {formatMoney(statement.totalLiabilities)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Total Equity
          </div>

          <div className="mt-2 text-2xl font-black text-slate-950">
            AED {formatMoney(statement.totalEquity)}
          </div>

          <div className="mt-1 text-xs text-slate-500">
            Includes current-year earnings
          </div>
        </div>

        <div
          className={[
            "rounded-2xl border p-5 shadow-sm",
            statement.isBalanced
              ? "border-emerald-200 bg-emerald-50"
              : "border-red-200 bg-red-50",
          ].join(" ")}
        >
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Balance Control
          </div>

          <div
            className={[
              "mt-2 text-2xl font-black",
              statement.isBalanced
                ? "text-emerald-700"
                : "text-red-600",
            ].join(" ")}
          >
            {statement.isBalanced
              ? "Balanced"
              : "Out of Balance"}
          </div>

          <div className="mt-1 text-xs font-semibold text-slate-600">
            Difference AED {formatMoney(statement.balanceDifference)}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Assets
            </div>

            <h2 className="mt-1 text-xl font-black text-slate-950">
              What the business owns
            </h2>
          </div>

          <div className="px-6">
            <StatementSection
              title="Assets"
              section={statement.assets}
            />

            <div className="py-5">
              <TotalRow
                label="Total Assets"
                value={statement.totalAssets}
                emphasis
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Liabilities &amp; Equity
            </div>

            <h2 className="mt-1 text-xl font-black text-slate-950">
              How the business is financed
            </h2>
          </div>

          <div className="px-6">
            <StatementSection
              title="Liabilities"
              section={statement.liabilities}
            />

            <EquitySection
              section={statement.equity}
            />

            <div className="py-5">
              <TotalRow
                label="Total Liabilities"
                value={statement.totalLiabilities}
              />

              <TotalRow
                label="Posted Equity"
                value={statement.postedEquity}
              />

              <TotalRow
                label="Current Year Earnings"
                value={statement.currentYearEarnings}
              />

              <TotalRow
                label="Total Equity"
                value={statement.totalEquity}
              />

              <TotalRow
                label="Total Liabilities & Equity"
                value={statement.totalLiabilitiesAndEquity}
                emphasis
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Statement Date
            </div>

            <div className="mt-1 font-semibold text-slate-950">
              {statement.asOfDate}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Fiscal Year Start
            </div>

            <div className="mt-1 font-semibold text-slate-950">
              {statement.fiscalYearStart}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Accounting Equation
            </div>

            <div className="mt-1 font-semibold text-slate-950">
              Assets = Liabilities + Equity
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
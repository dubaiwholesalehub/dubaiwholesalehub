import Link from "next/link";

import { requireAdmin } from "@/lib/auth/require-admin";
import {
  TrialBalanceAccount,
  getFormalTrialBalance,
} from "@/lib/repositories/trial-balance.repository";

interface TrialBalancePageProps {
  searchParams?: Promise<{
    from?: string;
    to?: string;
  }>;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthStartIso(): string {
  const now = new Date();

  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function accountClassLabel(accountClass: string): string {
  switch (accountClass) {
    case "asset":
      return "Asset";

    case "liability":
      return "Liability";

    case "equity":
      return "Equity";

    case "revenue":
      return "Revenue";

    case "cogs":
      return "Cost of Sales";

    case "expense":
      return "Expense";

    case "other_income":
      return "Other Income";

    case "other_expense":
      return "Other Expense";

    default:
      return accountClass;
  }
}

function Amount({ value }: { value: number }) {
  if (value === 0) {
    return <span className="text-slate-300">—</span>;
  }

  return (
    <span className="font-medium tabular-nums text-slate-950">
      {formatMoney(value)}
    </span>
  );
}

function ControlCard({
  title,
  debit,
  credit,
  difference,
  balanced,
}: {
  title: string;
  debit: number;
  credit: number;
  difference: number;
  balanced: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-5 shadow-sm",
        balanced
          ? "border-emerald-200 bg-emerald-50"
          : "border-red-200 bg-red-50",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {title}
          </div>

          <div
            className={[
              "mt-2 text-xl font-black",
              balanced ? "text-emerald-700" : "text-red-600",
            ].join(" ")}
          >
            {balanced ? "Balanced" : "Out of Balance"}
          </div>
        </div>

        <div
          className={[
            "rounded-full px-3 py-1 text-xs font-bold",
            balanced
              ? "bg-emerald-100 text-emerald-700"
              : "bg-red-100 text-red-700",
          ].join(" ")}
        >
          {balanced ? "OK" : "CHECK"}
        </div>
      </div>

      <div className="mt-4 space-y-2 border-t border-black/5 pt-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500">Debit</span>

          <span className="font-semibold tabular-nums text-slate-950">
            AED {formatMoney(debit)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500">Credit</span>

          <span className="font-semibold tabular-nums text-slate-950">
            AED {formatMoney(credit)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold text-slate-600">Difference</span>

          <span
            className={[
              "font-bold tabular-nums",
              balanced ? "text-emerald-700" : "text-red-600",
            ].join(" ")}
          >
            AED {formatMoney(difference)}
          </span>
        </div>
      </div>
    </div>
  );
}

function TrialBalanceRow({
  account,
  dateFrom,
  dateTo,
}: {
  account: TrialBalanceAccount;
  dateFrom: string;
  dateTo: string;
}) {
  const ledgerHref =
    `/admin/accounts/reports/general-ledger/${account.glAccountId}` +
    `?from=${encodeURIComponent(dateFrom)}` +
    `&to=${encodeURIComponent(dateTo)}`;

  return (
    <tr className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
      <td className="whitespace-nowrap px-4 py-3 align-top">
        <Link
          href={ledgerHref}
          className="font-mono text-xs font-semibold text-slate-600 transition hover:text-amber-600 hover:underline"
        >
          {account.accountCode}
        </Link>
      </td>

      <td className="min-w-[240px] px-4 py-3 align-top">
        <Link
          href={ledgerHref}
          className="font-medium text-slate-800 transition hover:text-amber-600 hover:underline"
        >
          {account.accountName}
        </Link>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span>{accountClassLabel(account.accountClass)}</span>

          {account.isControlAccount && (
            <>
              <span>•</span>

              <span className="font-semibold text-slate-500">
                Control Account
              </span>
            </>
          )}
        </div>
      </td>

      <td className="whitespace-nowrap px-4 py-3 text-right align-top">
        <Amount value={account.openingDebit} />
      </td>

      <td className="whitespace-nowrap px-4 py-3 text-right align-top">
        <Amount value={account.openingCredit} />
      </td>

      <td className="whitespace-nowrap border-l border-slate-100 px-4 py-3 text-right align-top">
        <Amount value={account.periodDebit} />
      </td>

      <td className="whitespace-nowrap px-4 py-3 text-right align-top">
        <Amount value={account.periodCredit} />
      </td>

      <td className="whitespace-nowrap border-l border-slate-100 px-4 py-3 text-right align-top">
        <Amount value={account.closingDebit} />
      </td>

      <td className="whitespace-nowrap px-4 py-3 text-right align-top">
        <Amount value={account.closingCredit} />
      </td>
    </tr>
  );
}

export default async function TrialBalancePage({
  searchParams,
}: TrialBalancePageProps) {
  await requireAdmin();

  const params = (await searchParams) ?? {};

  const dateFrom = params.from ?? monthStartIso();

  const dateTo = params.to ?? todayIso();

  const statement = await getFormalTrialBalance(dateFrom, dateTo);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <Link href="/admin/accounts" className="hover:text-slate-950">
              Accounts
            </Link>

            <span>/</span>

            <span>Reports</span>

            <span>/</span>

            <span className="font-semibold text-slate-950">Trial Balance</span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            Trial Balance
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Formal General Ledger Trial Balance in AED showing opening balances,
            period movement, and closing balances for every posting account.
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
            href="/admin/accounts/reports/balance-sheet"
            className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950"
          >
            Balance Sheet
          </Link>
        </div>
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ControlCard
          title="Opening Balance"
          debit={statement.openingDebit}
          credit={statement.openingCredit}
          difference={statement.openingDifference}
          balanced={statement.openingBalanced}
        />

        <ControlCard
          title="Period Movement"
          debit={statement.periodDebit}
          credit={statement.periodCredit}
          difference={statement.periodDifference}
          balanced={statement.periodBalanced}
        />

        <ControlCard
          title="Closing Balance"
          debit={statement.closingDebit}
          credit={statement.closingCredit}
          difference={statement.closingDifference}
          balanced={statement.closingBalanced}
        />

        <div
          className={[
            "rounded-2xl border p-5 shadow-sm",
            statement.isBalanced
              ? "border-emerald-200 bg-emerald-50"
              : "border-red-200 bg-red-50",
          ].join(" ")}
        >
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Trial Balance Control
          </div>

          <div
            className={[
              "mt-2 text-2xl font-black",
              statement.isBalanced ? "text-emerald-700" : "text-red-600",
            ].join(" ")}
          >
            {statement.isBalanced ? "Balanced" : "Out of Balance"}
          </div>

          <div className="mt-3 text-sm leading-6 text-slate-600">
            Opening, period movement, and closing controls must all balance.
          </div>

          <div className="mt-4 border-t border-black/5 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Base Currency
          </div>

          <div className="mt-1 text-lg font-black text-slate-950">
            {statement.currencyCode || "AED"}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              General Ledger Accounts
            </div>

            <h2 className="mt-1 text-xl font-black text-slate-950">
              Account Balances
            </h2>
          </div>

          <div className="text-sm font-semibold text-slate-500">
            {statement.accounts.length} active balance
            {statement.accounts.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th
                  rowSpan={2}
                  className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500"
                >
                  Code
                </th>

                <th
                  rowSpan={2}
                  className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500"
                >
                  Account
                </th>

                <th
                  colSpan={2}
                  className="border-l border-slate-200 px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500"
                >
                  Opening Balance
                </th>

                <th
                  colSpan={2}
                  className="border-l border-slate-200 px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500"
                >
                  Period Movement
                </th>

                <th
                  colSpan={2}
                  className="border-l border-slate-200 px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500"
                >
                  Closing Balance
                </th>
              </tr>

              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="border-l border-slate-200 px-4 py-2 text-right text-xs font-bold text-slate-500">
                  Debit
                </th>

                <th className="px-4 py-2 text-right text-xs font-bold text-slate-500">
                  Credit
                </th>

                <th className="border-l border-slate-200 px-4 py-2 text-right text-xs font-bold text-slate-500">
                  Debit
                </th>

                <th className="px-4 py-2 text-right text-xs font-bold text-slate-500">
                  Credit
                </th>

                <th className="border-l border-slate-200 px-4 py-2 text-right text-xs font-bold text-slate-500">
                  Debit
                </th>

                <th className="px-4 py-2 text-right text-xs font-bold text-slate-500">
                  Credit
                </th>
              </tr>
            </thead>

            <tbody>
              {statement.accounts.length > 0 ? (
                statement.accounts.map((account) => (
                  <TrialBalanceRow
                    key={account.glAccountId}
                    account={account}
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                  />
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center text-sm text-slate-400"
                  >
                    No General Ledger activity exists for the selected period.
                  </td>
                </tr>
              )}
            </tbody>

            <tfoot>
              <tr className="border-t-2 border-slate-950 bg-slate-50 font-bold text-slate-950">
                <td colSpan={2} className="px-4 py-4 text-left">
                  TOTAL
                </td>

                <td className="border-l border-slate-200 px-4 py-4 text-right tabular-nums">
                  {formatMoney(statement.openingDebit)}
                </td>

                <td className="px-4 py-4 text-right tabular-nums">
                  {formatMoney(statement.openingCredit)}
                </td>

                <td className="border-l border-slate-200 px-4 py-4 text-right tabular-nums">
                  {formatMoney(statement.periodDebit)}
                </td>

                <td className="px-4 py-4 text-right tabular-nums">
                  {formatMoney(statement.periodCredit)}
                </td>

                <td className="border-l border-slate-200 px-4 py-4 text-right tabular-nums">
                  {formatMoney(statement.closingDebit)}
                </td>

                <td className="px-4 py-4 text-right tabular-nums">
                  {formatMoney(statement.closingCredit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Reporting Period
            </div>

            <div className="mt-1 font-semibold text-slate-950">
              {statement.dateFrom} to {statement.dateTo}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Accounting Basis
            </div>

            <div className="mt-1 font-semibold text-slate-950">
              General Ledger — Posting Date
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Control Equation
            </div>

            <div className="mt-1 font-semibold text-slate-950">
              Total Debits = Total Credits
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

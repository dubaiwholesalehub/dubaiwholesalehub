import Link from "next/link";

import { requireAdmin } from "@/lib/auth/require-admin";
import {
  GeneralLedgerTransaction,
  getFormalGeneralLedger,
} from "@/lib/repositories/general-ledger-report.repository";

interface GeneralLedgerPageProps {
  params: Promise<{
    accountId: string;
  }>;

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

function sourceLabel(
  sourceType: string,
): string {
  return sourceType
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

function formatBalance(
  debit: number,
  credit: number,
): string {
  if (debit > 0) {
    return `${formatMoney(debit)} Dr`;
  }

  if (credit > 0) {
    return `${formatMoney(credit)} Cr`;
  }

  return "0.00";
}

function Amount({
  value,
}: {
  value: number;
}) {
  if (value === 0) {
    return (
      <span className="text-slate-300">
        —
      </span>
    );
  }

  return (
    <span className="font-medium tabular-nums text-slate-950">
      {formatMoney(value)}
    </span>
  );
}

function LedgerRow({
  transaction,
}: {
  transaction: GeneralLedgerTransaction;
}) {
  const isReversal =
    transaction.sourceType ===
      "journal_reversal" ||
    Boolean(
      transaction.originalEntryId,
    );

  return (
    <tr className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
      <td className="whitespace-nowrap px-4 py-3 align-top text-sm text-slate-600">
        {transaction.postingDate}
      </td>

      <td className="whitespace-nowrap px-4 py-3 align-top">
        <div className="font-mono text-xs font-semibold text-slate-700">
          {transaction.journalNumber}
        </div>

        <div className="mt-1 text-xs text-slate-400">
          Line {transaction.lineNumber}
        </div>
      </td>

      <td className="min-w-[180px] px-4 py-3 align-top">
        <div className="text-sm font-medium text-slate-700">
          {sourceLabel(
            transaction.sourceType,
          )}
        </div>

        {transaction.sourceNumber && (
          <div className="mt-1 font-mono text-xs text-slate-400">
            {transaction.sourceNumber}
          </div>
        )}
      </td>

      <td className="min-w-[280px] px-4 py-3 align-top">
        <div className="text-sm text-slate-700">
          {transaction.lineDescription ||
            transaction.journalDescription}
        </div>

        {transaction.lineDescription &&
          transaction.journalDescription !==
            transaction.lineDescription && (
            <div className="mt-1 text-xs leading-5 text-slate-400">
              {
                transaction.journalDescription
              }
            </div>
          )}

        {isReversal && (
          <div className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-700">
            Reversal
          </div>
        )}
      </td>

      <td className="whitespace-nowrap px-4 py-3 text-right align-top">
        <Amount
          value={transaction.debit}
        />
      </td>

      <td className="whitespace-nowrap px-4 py-3 text-right align-top">
        <Amount
          value={transaction.credit}
        />
      </td>

      <td className="whitespace-nowrap border-l border-slate-100 px-4 py-3 text-right align-top font-bold tabular-nums text-slate-950">
        {formatBalance(
          transaction.runningDebit,
          transaction.runningCredit,
        )}
      </td>
    </tr>
  );
}

export default async function GeneralLedgerPage({
  params,
  searchParams,
}: GeneralLedgerPageProps) {
  await requireAdmin();

  const {
    accountId,
  } = await params;

  const query =
    (await searchParams) ?? {};

  const dateFrom =
    query.from ??
    monthStartIso();

  const dateTo =
    query.to ??
    todayIso();

  const ledger =
    await getFormalGeneralLedger(
      accountId,
      dateFrom,
      dateTo,
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

            <Link
              href={`/admin/accounts/reports/trial-balance?from=${dateFrom}&to=${dateTo}`}
              className="hover:text-slate-950"
            >
              Trial Balance
            </Link>

            <span>/</span>

            <span className="font-semibold text-slate-950">
              General Ledger
            </span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            {ledger.account.accountCode} —{" "}
            {ledger.account.accountName}
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Formal General Ledger account statement in AED with opening balance,
            journal activity, running balance, and closing balance.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/accounts/reports/trial-balance?from=${dateFrom}&to=${dateTo}`}
            className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950"
          >
            Trial Balance
          </Link>

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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Opening Balance
          </div>

          <div className="mt-2 text-2xl font-black text-slate-950">
            AED{" "}
            {formatBalance(
              ledger.openingDebit,
              ledger.openingCredit,
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Period Debit
          </div>

          <div className="mt-2 text-2xl font-black text-slate-950">
            AED{" "}
            {formatMoney(
              ledger.periodDebit,
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Period Credit
          </div>

          <div className="mt-2 text-2xl font-black text-slate-950">
            AED{" "}
            {formatMoney(
              ledger.periodCredit,
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-950 bg-slate-950 p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Closing Balance
          </div>

          <div className="mt-2 text-2xl font-black text-white">
            AED{" "}
            {formatBalance(
              ledger.closingDebit,
              ledger.closingCredit,
            )}
          </div>

          <div className="mt-1 text-xs text-slate-400">
            {ledger.transactionCount} journal line
            {ledger.transactionCount === 1
              ? ""
              : "s"}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Account Activity
            </div>

            <h2 className="mt-1 text-xl font-black text-slate-950">
              General Ledger Transactions
            </h2>
          </div>

          <div className="text-sm font-semibold text-slate-500">
            {ledger.dateFrom} to{" "}
            {ledger.dateTo}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1200px] w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  Posting Date
                </th>

                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  Journal
                </th>

                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  Source
                </th>

                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  Description
                </th>

                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                  Debit
                </th>

                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                  Credit
                </th>

                <th className="border-l border-slate-200 px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                  Running Balance
                </th>
              </tr>
            </thead>

            <tbody>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <td
                  colSpan={4}
                  className="px-4 py-3 font-semibold text-slate-600"
                >
                  Opening Balance
                </td>

                <td className="px-4 py-3 text-right">
                  <Amount
                    value={
                      ledger.openingDebit
                    }
                  />
                </td>

                <td className="px-4 py-3 text-right">
                  <Amount
                    value={
                      ledger.openingCredit
                    }
                  />
                </td>

                <td className="border-l border-slate-100 px-4 py-3 text-right font-bold tabular-nums text-slate-950">
                  {formatBalance(
                    ledger.openingDebit,
                    ledger.openingCredit,
                  )}
                </td>
              </tr>

              {ledger.transactions.length > 0 ? (
                ledger.transactions.map(
                  (transaction) => (
                    <LedgerRow
                      key={
                        transaction.journalLineId
                      }
                      transaction={
                        transaction
                      }
                    />
                  ),
                )
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-sm text-slate-400"
                  >
                    No General Ledger activity exists for this account in the selected period.
                  </td>
                </tr>
              )}
            </tbody>

            <tfoot>
              <tr className="border-t-2 border-slate-950 bg-slate-50 font-bold text-slate-950">
                <td
                  colSpan={4}
                  className="px-4 py-4"
                >
                  PERIOD TOTAL
                </td>

                <td className="px-4 py-4 text-right tabular-nums">
                  {formatMoney(
                    ledger.periodDebit,
                  )}
                </td>

                <td className="px-4 py-4 text-right tabular-nums">
                  {formatMoney(
                    ledger.periodCredit,
                  )}
                </td>

                <td className="border-l border-slate-200 px-4 py-4 text-right tabular-nums">
                  {formatBalance(
                    ledger.closingDebit,
                    ledger.closingCredit,
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Account Class
            </div>

            <div className="mt-1 font-semibold capitalize text-slate-950">
              {ledger.account.accountClass.replaceAll(
                "_",
                " ",
              )}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Statement
            </div>

            <div className="mt-1 font-semibold capitalize text-slate-950">
              {ledger.account.statementType.replaceAll(
                "_",
                " ",
              )}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Normal Balance
            </div>

            <div className="mt-1 font-semibold capitalize text-slate-950">
              {ledger.account.normalBalance}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Account Status
            </div>

            <div className="mt-1 font-semibold text-slate-950">
              {ledger.account.isActive
                ? "Active"
                : "Inactive"}
              {ledger.account.isControlAccount
                ? " · Control Account"
                : ""}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
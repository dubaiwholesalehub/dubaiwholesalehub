import Link from "next/link";

import { requireAdmin } from "@/lib/auth/require-admin";
import {
  JournalEntryDetailLine,
  getFormalJournalEntryDetail,
} from "@/lib/repositories/journal-entry-detail.repository";

interface JournalEntryPageProps {
  params: Promise<{
    journalEntryId: string;
  }>;

  searchParams?: Promise<{
    accountId?: string;
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

function sourceLabel(sourceType: string): string {
  return sourceType
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function statusLabel(status: string): string {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function Amount({ value }: { value: number }) {
  if (value === 0) {
    return <span className="text-slate-300">—</span>;
  }

  return (
    <span className="font-semibold tabular-nums text-slate-950">
      {formatMoney(value)}
    </span>
  );
}

function DimensionBadge({ label, value }: { label: string; value?: string }) {
  if (!value) {
    return null;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs">
      <span className="font-semibold text-slate-500">{label}:</span>{" "}
      <span className="font-mono text-slate-700">{value}</span>
    </div>
  );
}

function JournalLineRow({ line }: { line: JournalEntryDetailLine }) {
  return (
    <tr className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
      <td className="whitespace-nowrap px-4 py-3 align-top">
        <div className="font-mono text-xs font-semibold text-slate-500">
          {line.lineNumber}
        </div>
      </td>

      <td className="min-w-[230px] px-4 py-3 align-top">
        <div className="font-mono text-xs font-semibold text-slate-600">
          {line.accountCode}
        </div>

        <div className="mt-1 font-medium text-slate-800">
          {line.accountName}
        </div>

        <div className="mt-1 text-xs capitalize text-slate-400">
          {line.accountClass.replaceAll("_", " ")}
          {line.isControlAccount ? " · Control Account" : ""}
        </div>
      </td>

      <td className="min-w-[280px] px-4 py-3 align-top">
        <div className="text-sm text-slate-700">
          {line.description || "No line description"}
        </div>

        {(line.sourceLineType || line.sourceLineId) && (
          <div className="mt-2 text-xs text-slate-400">
            {line.sourceLineType && <span>{line.sourceLineType}</span>}

            {line.sourceLineId && (
              <>
                <span> · </span>
                <span className="font-mono">{line.sourceLineId}</span>
              </>
            )}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <DimensionBadge
            label="Customer"
            value={line.customerName || line.customerId}
          />

          <DimensionBadge
            label="Supplier"
            value={line.supplierName || line.supplierId}
          />

          <DimensionBadge
            label="Product"
            value={line.productName || line.productId}
          />

          <DimensionBadge
            label="Warehouse"
            value={line.warehouseName || line.warehouseId}
          />

          <DimensionBadge
            label="Financial"
            value={line.financialAccountName || line.financialAccountId}
          />

          <DimensionBadge
            label="Expense"
            value={line.expenseCategoryName || line.expenseCategoryId}
          />
        </div>
      </td>

      <td className="whitespace-nowrap px-4 py-3 text-right align-top">
        <Amount value={line.debit} />
      </td>

      <td className="whitespace-nowrap px-4 py-3 text-right align-top">
        <Amount value={line.credit} />
      </td>

      <td className="whitespace-nowrap border-l border-slate-100 px-4 py-3 text-right align-top">
        <Amount value={line.baseDebit} />
      </td>

      <td className="whitespace-nowrap px-4 py-3 text-right align-top">
        <Amount value={line.baseCredit} />
      </td>
    </tr>
  );
}

export default async function JournalEntryPage({
  params,
  searchParams,
}: JournalEntryPageProps) {
  await requireAdmin();

  const { journalEntryId } = await params;

  const query = (await searchParams) ?? {};

  const journal = await getFormalJournalEntryDetail(journalEntryId);

  const generalLedgerHref = query.accountId
    ? `/admin/accounts/reports/general-ledger/${query.accountId}?from=${encodeURIComponent(
        query.from ?? "",
      )}&to=${encodeURIComponent(query.to ?? "")}`
    : null;

  const isReversal =
    journal.sourceType === "journal_reversal" ||
    Boolean(journal.originalEntryId);

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

            {generalLedgerHref ? (
              <Link href={generalLedgerHref} className="hover:text-slate-950">
                General Ledger
              </Link>
            ) : (
              <span>General Ledger</span>
            )}

            <span>/</span>

            <span className="font-semibold text-slate-950">Journal Entry</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-slate-950">
              {journal.journalNumber}
            </h1>

            <span
              className={[
                "rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide",
                journal.status === "posted"
                  ? "bg-emerald-100 text-emerald-700"
                  : journal.status === "reversed"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-600",
              ].join(" ")}
            >
              {statusLabel(journal.status)}
            </span>

            {isReversal && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">
                Reversal
              </span>
            )}
          </div>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            {journal.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {generalLedgerHref && (
            <Link
              href={generalLedgerHref}
              className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950"
            >
              Back to Ledger
            </Link>
          )}

          <Link
            href="/admin/accounts/reports/trial-balance"
            className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950"
          >
            Trial Balance
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Total Debit
          </div>

          <div className="mt-2 text-2xl font-black text-slate-950">
            {journal.currencyCode} {formatMoney(journal.totalDebit)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Total Credit
          </div>

          <div className="mt-2 text-2xl font-black text-slate-950">
            {journal.currencyCode} {formatMoney(journal.totalCredit)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Base Amount
          </div>

          <div className="mt-2 text-2xl font-black text-slate-950">
            AED {formatMoney(journal.baseDebit)}
          </div>

          <div className="mt-1 text-xs text-slate-500">
            Exchange rate {journal.exchangeRate}
          </div>
        </div>

        <div
          className={[
            "rounded-2xl border p-5 shadow-sm",
            journal.isBalanced
              ? "border-emerald-200 bg-emerald-50"
              : "border-red-200 bg-red-50",
          ].join(" ")}
        >
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Journal Control
          </div>

          <div
            className={[
              "mt-2 text-2xl font-black",
              journal.isBalanced ? "text-emerald-700" : "text-red-600",
            ].join(" ")}
          >
            {journal.isBalanced ? "Balanced" : "Out of Balance"}
          </div>

          <div className="mt-1 text-xs font-semibold text-slate-600">
            {journal.lineCount} journal line
            {journal.lineCount === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Journal Date
            </div>

            <div className="mt-1 font-semibold text-slate-950">
              {journal.journalDate}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Posting Date
            </div>

            <div className="mt-1 font-semibold text-slate-950">
              {journal.postingDate}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Source
            </div>

            <div className="mt-1 font-semibold text-slate-950">
              {sourceLabel(journal.sourceType)}
            </div>

            {journal.sourceNumber && (
              <div className="mt-1 font-mono text-xs text-slate-500">
                {journal.sourceNumber}
              </div>
            )}
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Currency
            </div>

            <div className="mt-1 font-semibold text-slate-950">
              {journal.currencyCode}
            </div>
          </div>
        </div>
      </div>

      {(journal.originalEntryId ||
        journal.reversalEntryId ||
        journal.reversalReason) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-amber-700">
            Reversal Audit Trail
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {journal.originalEntryId && (
              <div>
                <div className="text-xs font-semibold text-amber-700">
                  Original Journal
                </div>

                <Link
                  href={`/admin/accounts/reports/journal-entry/${journal.originalEntryId}`}
                  className="mt-1 block font-mono text-sm font-semibold text-amber-900 hover:underline"
                >
                  {journal.originalEntryId}
                </Link>
              </div>
            )}

            {journal.reversalEntryId && (
              <div>
                <div className="text-xs font-semibold text-amber-700">
                  Reversal Journal
                </div>

                <Link
                  href={`/admin/accounts/reports/journal-entry/${journal.reversalEntryId}`}
                  className="mt-1 block font-mono text-sm font-semibold text-amber-900 hover:underline"
                >
                  {journal.reversalEntryId}
                </Link>
              </div>
            )}

            {journal.reversalReason && (
              <div>
                <div className="text-xs font-semibold text-amber-700">
                  Reason
                </div>

                <div className="mt-1 text-sm text-amber-900">
                  {journal.reversalReason}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Double Entry
            </div>

            <h2 className="mt-1 text-xl font-black text-slate-950">
              Journal Lines
            </h2>
          </div>

          <div className="text-sm font-semibold text-slate-500">
            {journal.lineCount} line
            {journal.lineCount === 1 ? "" : "s"}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1250px] w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  Line
                </th>

                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  GL Account
                </th>

                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  Description / Dimensions
                </th>

                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                  Debit
                </th>

                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                  Credit
                </th>

                <th className="border-l border-slate-200 px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                  Base Debit
                </th>

                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                  Base Credit
                </th>
              </tr>
            </thead>

            <tbody>
              {journal.lines.map((line) => (
                <JournalLineRow key={line.journalLineId} line={line} />
              ))}
            </tbody>

            <tfoot>
              <tr className="border-t-2 border-slate-950 bg-slate-50 font-bold text-slate-950">
                <td colSpan={3} className="px-4 py-4">
                  TOTAL
                </td>

                <td className="px-4 py-4 text-right tabular-nums">
                  {formatMoney(journal.totalDebit)}
                </td>

                <td className="px-4 py-4 text-right tabular-nums">
                  {formatMoney(journal.totalCredit)}
                </td>

                <td className="border-l border-slate-200 px-4 py-4 text-right tabular-nums">
                  {formatMoney(journal.baseDebit)}
                </td>

                <td className="px-4 py-4 text-right tabular-nums">
                  {formatMoney(journal.baseCredit)}
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
              Journal Entry ID
            </div>

            <div className="mt-1 break-all font-mono text-xs text-slate-700">
              {journal.journalEntryId}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Accounting Period
            </div>

            <div className="mt-1 break-all font-mono text-xs text-slate-700">
              {journal.accountingPeriodId}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Created At
            </div>

            <div className="mt-1 text-sm font-semibold text-slate-950">
              {journal.createdAt || "—"}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Posted At
            </div>

            <div className="mt-1 text-sm font-semibold text-slate-950">
              {journal.postedAt || "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

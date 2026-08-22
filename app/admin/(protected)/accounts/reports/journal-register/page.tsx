import Link from "next/link";

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Filter,
  RotateCcw,
  Search,
} from "lucide-react";

import {
  getJournalRegister,
  type JournalRegisterRow,
  type JournalRegisterStatus,
} from "@/lib/repositories/journal-register.repository";

type SearchParams = Promise<{
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  sourceType?: string;
  search?: string;
  page?: string;
}>;

const PAGE_SIZE = 50;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartIso() {
  const now = new Date();

  const year = now.getUTCFullYear();

  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  return `${year}-${month}-01`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function sourceLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function statusLabel(status: JournalRegisterStatus) {
  switch (status) {
    case "draft":
      return "Draft";

    case "posted":
      return "Posted";

    case "reversed":
      return "Reversed";
  }
}

function statusClass(status: JournalRegisterStatus) {
  switch (status) {
    case "draft":
      return "bg-slate-100 text-slate-700 ring-slate-500/20";

    case "posted":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";

    case "reversed":
      return "bg-amber-50 text-amber-700 ring-amber-600/20";
  }
}

function StatusBadge({ status }: { status: JournalRegisterStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClass(
        status,
      )}`}
    >
      {statusLabel(status)}
    </span>
  );
}

function buildQuery({
  dateFrom,
  dateTo,
  status,
  sourceType,
  search,
  page,
}: {
  dateFrom: string;
  dateTo: string;
  status: string;
  sourceType: string;
  search: string;
  page: number;
}) {
  const params = new URLSearchParams();

  params.set("dateFrom", dateFrom);

  params.set("dateTo", dateTo);

  if (status) {
    params.set("status", status);
  }

  if (sourceType) {
    params.set("sourceType", sourceType);
  }

  if (search) {
    params.set("search", search);
  }

  params.set("page", String(page));

  return params.toString();
}

export default async function JournalRegisterPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const dateFrom = params.dateFrom || monthStartIso();

  const dateTo = params.dateTo || todayIso();

  const status = params.status?.trim() || "";

  const sourceType = params.sourceType?.trim() || "";

  const search = params.search?.trim() || "";

  const requestedPage = Number(params.page || "1");

  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const offset = (page - 1) * PAGE_SIZE;

  const result = await getJournalRegister({
    dateFrom,
    dateTo,
    status,
    sourceType,
    search,
    limit: PAGE_SIZE,
    offset,
  });

  const totalPages = Math.max(1, Math.ceil(result.totalCount / PAGE_SIZE));

  const displayedFrom = result.totalCount === 0 ? 0 : offset + 1;

  const displayedTo = Math.min(offset + result.rows.length, result.totalCount);

  const sourceTypes = Array.from(
    new Set(result.rows.map((row) => row.sourceType)),
  ).sort();

  return (
    <div className="space-y-8">
      <section>
        <Link
          href="/admin/accounts"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Accounts
        </Link>

        <p className="mt-6 text-sm font-medium text-amber-600">
          Finance &amp; Accounting
        </p>

        <div className="mt-1 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Journal Register
            </h1>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Review all General Ledger journals, posting sources, debit and
              credit totals, statuses and reversal relationships.
            </p>
          </div>

          <Link
            href="/admin/accounts/manual-journals/new"
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
          >
            <BookOpen className="size-4" />
            New Manual Journal
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <form
          method="get"
          className="grid gap-4 xl:grid-cols-[170px_170px_170px_220px_minmax(240px,1fr)_auto]"
        >
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Date From
            </span>

            <input
              type="date"
              name="dateFrom"
              defaultValue={dateFrom}
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Date To
            </span>

            <input
              type="date"
              name="dateTo"
              defaultValue={dateTo}
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Status
            </span>

            <select
              name="status"
              defaultValue={status}
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
            >
              <option value="">All Statuses</option>

              <option value="posted">Posted</option>

              <option value="reversed">Reversed</option>

              <option value="draft">Draft</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Source
            </span>

            <select
              name="sourceType"
              defaultValue={sourceType}
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
            >
              <option value="">All Sources</option>

              {sourceTypes.map((source) => (
                <option key={source} value={source}>
                  {sourceLabel(source)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Search
            </span>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <input
                type="search"
                name="search"
                defaultValue={search}
                placeholder="Journal, source, reference or description"
                className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm"
              />
            </div>
          </label>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
            >
              <Filter className="size-4" />
              Apply
            </button>

            <Link
              href="/admin/accounts/reports/journal-register"
              className="inline-flex size-10 items-center justify-center rounded-lg border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground"
              title="Reset filters"
            >
              <RotateCcw className="size-4" />
            </Link>
          </div>
        </form>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Matching Journals"
          value={String(result.totalCount)}
        />

        <SummaryCard label="Rows Shown" value={String(result.rows.length)} />

        <SummaryCard
          label="Total Base Debit"
          value={`AED ${formatMoney(result.filteredBaseDebit)}`}
        />

        <SummaryCard
          label="Total Base Credit"
          value={`AED ${formatMoney(result.filteredBaseCredit)}`}
        />
      </section>

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 className="font-semibold">General Ledger Journals</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Showing {displayedFrom}–{displayedTo} of {result.totalCount}
            </p>
          </div>

          <div className="text-sm text-muted-foreground">
            Posting date:{" "}
            <span className="font-semibold text-foreground">{dateFrom}</span> →{" "}
            <span className="font-semibold text-foreground">{dateTo}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1450px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Posting Date</th>

                <th className="px-4 py-3">Journal</th>

                <th className="px-4 py-3">Source</th>

                <th className="px-4 py-3">Description</th>

                <th className="px-4 py-3 text-right">Debit</th>

                <th className="px-4 py-3 text-right">Credit</th>

                <th className="px-4 py-3">Status</th>

                <th className="px-4 py-3">Audit</th>

                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {result.rows.length > 0 ? (
                result.rows.map((row) => (
                  <JournalRow key={row.journalEntryId} row={row} />
                ))
              ) : (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-14 text-center text-muted-foreground"
                  >
                    No journals matched the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t px-5 py-4">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>

          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={`/admin/accounts/reports/journal-register?${buildQuery({
                  dateFrom,
                  dateTo,
                  status,
                  sourceType,
                  search,
                  page: page - 1,
                })}`}
                className="inline-flex h-9 items-center gap-1 rounded-lg border bg-background px-3 text-sm font-semibold transition hover:bg-muted"
              >
                <ChevronLeft className="size-4" />
                Previous
              </Link>
            ) : (
              <span className="inline-flex h-9 cursor-not-allowed items-center gap-1 rounded-lg border bg-muted/30 px-3 text-sm font-semibold text-muted-foreground opacity-50">
                <ChevronLeft className="size-4" />
                Previous
              </span>
            )}

            {page < totalPages ? (
              <Link
                href={`/admin/accounts/reports/journal-register?${buildQuery({
                  dateFrom,
                  dateTo,
                  status,
                  sourceType,
                  search,
                  page: page + 1,
                })}`}
                className="inline-flex h-9 items-center gap-1 rounded-lg border bg-background px-3 text-sm font-semibold transition hover:bg-muted"
              >
                Next
                <ChevronRight className="size-4" />
              </Link>
            ) : (
              <span className="inline-flex h-9 cursor-not-allowed items-center gap-1 rounded-lg border bg-muted/30 px-3 text-sm font-semibold text-muted-foreground opacity-50">
                Next
                <ChevronRight className="size-4" />
              </span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function JournalRow({ row }: { row: JournalRegisterRow }) {
  return (
    <tr className="align-top transition hover:bg-muted/20">
      <td className="whitespace-nowrap px-4 py-4">
        <p className="font-semibold">{row.postingDate}</p>

        {row.journalDate !== row.postingDate ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Journal {row.journalDate}
          </p>
        ) : null}
      </td>

      <td className="px-4 py-4">
        <Link
          href={`/admin/accounts/reports/journal-entry/${row.journalEntryId}`}
          className="font-mono font-semibold text-amber-700 transition hover:text-amber-800 hover:underline"
        >
          {row.journalNumber}
        </Link>

        <p className="mt-1 text-xs text-muted-foreground">
          {row.lineCount} line
          {row.lineCount === 1 ? "" : "s"}
        </p>
      </td>

      <td className="min-w-[200px] px-4 py-4">
        <p className="font-semibold">{sourceLabel(row.sourceType)}</p>

        {row.sourceNumber ? (
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {row.sourceNumber}
          </p>
        ) : null}
      </td>

      <td className="max-w-md px-4 py-4">
        <p className="line-clamp-3">{row.description}</p>
      </td>

      <td className="whitespace-nowrap px-4 py-4 text-right font-semibold tabular-nums">
        AED {formatMoney(row.baseDebit)}
      </td>

      <td className="whitespace-nowrap px-4 py-4 text-right font-semibold tabular-nums">
        AED {formatMoney(row.baseCredit)}
      </td>

      <td className="px-4 py-4">
        <StatusBadge status={row.status} />
      </td>

      <td className="min-w-[180px] px-4 py-4">
        {row.originalEntryId ? (
          <div>
            <p className="text-xs font-semibold text-amber-700">
              Reversal Journal
            </p>

            <Link
              href={`/admin/accounts/reports/journal-entry/${row.originalEntryId}`}
              className="mt-1 inline-block text-xs font-semibold text-amber-800 hover:underline"
            >
              View Original
            </Link>
          </div>
        ) : row.reversalEntryId ? (
          <div>
            <p className="text-xs font-semibold text-amber-700">
              Original Reversed
            </p>

            <Link
              href={`/admin/accounts/reports/journal-entry/${row.reversalEntryId}`}
              className="mt-1 inline-block text-xs font-semibold text-amber-800 hover:underline"
            >
              View Reversal
            </Link>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>

      <td className="whitespace-nowrap px-4 py-4 text-right">
        <Link
          href={`/admin/accounts/reports/journal-entry/${row.journalEntryId}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 transition hover:text-amber-800 hover:underline"
        >
          View
          <ArrowRight className="size-3.5" />
        </Link>
      </td>
    </tr>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>

      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

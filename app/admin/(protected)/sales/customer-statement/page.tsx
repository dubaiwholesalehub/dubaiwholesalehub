import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BookOpenText,
  CalendarRange,
  Landmark,
  Users,
  WalletCards,
} from "lucide-react";

import Link from "next/link";

import { requireAdmin } from "@/lib/auth/require-admin";

import {
  getCustomerStatement,
  getCustomerStatementOptions,
} from "@/lib/repositories/customer-statement.repository";

interface CustomerStatementPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function param(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

function money(value: number) {
  return new Intl.NumberFormat("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function typeLabel(type: "sale" | "receipt") {
  return type === "sale" ? "Sale" : "Receipt";
}

export default async function CustomerStatementPage({
  searchParams,
}: CustomerStatementPageProps) {
  await requireAdmin();

  const params = await searchParams;

  const customerId = param(params.customerId);

  const dateFrom = param(params.dateFrom);

  const dateTo = param(params.dateTo);

  const customers = await getCustomerStatementOptions();

  const statement = customerId
    ? await getCustomerStatement({
        customerId,

        dateFrom: dateFrom || undefined,

        dateTo: dateTo || undefined,
      })
    : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-blue-600">Accounts Receivable</p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Customer Statement
        </h1>

        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Review customer sales, receipts, advances and running receivable
          balance.
        </p>
      </div>

      {/* Filters */}

      <form className="rounded-xl border bg-card p-5">
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr_auto]">
          <label className="space-y-2">
            <span className="text-sm font-medium">Customer</span>

            <select
              name="customerId"
              defaultValue={customerId}
              className={inputClass}
            >
              <option value="">Select customer</option>

              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.customerNumber} — {customer.displayName}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">From</span>

            <input
              type="date"
              name="dateFrom"
              defaultValue={dateFrom}
              className={inputClass}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">To</span>

            <input
              type="date"
              name="dateTo"
              defaultValue={dateTo}
              className={inputClass}
            />
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              className="h-11 rounded-md bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              View Statement
            </button>
          </div>
        </div>
      </form>

      {!customerId ? (
        <section className="rounded-xl border bg-card px-6 py-16 text-center">
          <Users className="mx-auto size-10 text-muted-foreground" />

          <h2 className="mt-4 font-semibold">Select a customer</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Choose a customer above to view sales, receipts and receivable
            balance.
          </p>
        </section>
      ) : !statement ? (
        <section className="rounded-xl border bg-card px-6 py-16 text-center">
          <p className="font-semibold">Customer not found.</p>
        </section>
      ) : (
        <>
          {/* Customer */}

          <section className="rounded-xl border bg-card p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <Users className="size-5" />
              </div>

              <div>
                <h2 className="text-xl font-semibold">
                  {statement.customer.displayName}
                </h2>

                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span>{statement.customer.customerNumber}</span>

                  {statement.customer.companyName ? (
                    <span>{statement.customer.companyName}</span>
                  ) : null}

                  <span>{statement.customer.currencyCode}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Summary */}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Opening Balance"
              value={statement.summary.openingBalance}
              icon={Landmark}
            />

            <SummaryCard
              label="Sales"
              value={statement.summary.sales}
              icon={ArrowDownToLine}
            />

            <SummaryCard
              label="Receipts"
              value={statement.summary.receipts}
              icon={ArrowUpFromLine}
            />

            <SummaryCard
              label={
                statement.summary.closingBalance >= 0
                  ? "Closing Receivable"
                  : "Customer Advance"
              }
              value={Math.abs(statement.summary.closingBalance)}
              icon={WalletCards}
            />
          </div>

          {/* ===================================================
           * Current Account Position
           * =================================================== */}

          <section className="rounded-2xl border border-blue-100 bg-blue-50/40 p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700">
                  Customer Account Position
                </p>

                <h2 className="mt-1 text-lg font-semibold text-slate-950">
                  {statement.customer.displayName}
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Current receivable, available customer advance and net account
                  position.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[650px]">
                <AccountPositionCard
                  label="Receivable"
                  value={statement.summary.closingReceivable}
                  tone="receivable"
                />

                <AccountPositionCard
                  label="Customer Advance"
                  value={statement.summary.customerAdvance}
                  tone="advance"
                />

                <AccountPositionCard
                  label="Net Position"
                  value={Math.abs(statement.summary.closingBalance)}
                  tone={
                    statement.summary.closingBalance > 0
                      ? "receivable"
                      : statement.summary.closingBalance < 0
                        ? "advance"
                        : "settled"
                  }
                  suffix={
                    statement.summary.closingBalance > 0
                      ? "Receivable"
                      : statement.summary.closingBalance < 0
                        ? "Advance"
                        : "Settled"
                  }
                />
              </div>
            </div>
          </section>

          {/* Ledger */}

          <section className="overflow-hidden rounded-xl border bg-card">
            <div className="flex flex-col gap-2 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <BookOpenText className="size-4" />

                  <h2 className="font-semibold">Receivables Ledger</h2>
                </div>

                <p className="mt-1 text-sm text-muted-foreground">
                  Sales increase receivables and receipts reduce them. Running
                  Balance is the customer&apos;s total account balance after
                  each transaction.
                </p>
              </div>

              {dateFrom || dateTo ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarRange className="size-4" />
                  {dateFrom || "Beginning"} → {dateTo || "Today"}
                </div>
              ) : null}
            </div>

            {statement.entries.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="font-medium">No transactions in this period.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] text-sm">
                  <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Date</th>

                      <th className="px-4 py-3">Document</th>

                      <th className="px-4 py-3">Type</th>

                      <th className="px-4 py-3">Description</th>

                      <th className="px-4 py-3 text-right">Debit</th>

                      <th className="px-4 py-3 text-right">Credit</th>

                      <th className="px-4 py-3 text-right">Running Balance</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {statement.entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-muted/30">
                        <td className="px-4 py-4 text-muted-foreground">
                          {entry.date}
                        </td>

                        <td className="px-4 py-4">
                          <Link
                            href={entry.href}
                            className="font-semibold text-primary hover:underline"
                          >
                            {entry.documentNumber}
                          </Link>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={[
                              "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",

                              entry.type === "sale"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-emerald-100 text-emerald-700",
                            ].join(" ")}
                          >
                            {typeLabel(entry.type)}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-muted-foreground">
                          {entry.description}
                        </td>

                        <td className="px-4 py-4 text-right">
                          {entry.debit > 0 ? `AED ${money(entry.debit)}` : "—"}
                        </td>

                        <td className="px-4 py-4 text-right">
                          {entry.credit > 0
                            ? `AED ${money(entry.credit)}`
                            : "—"}
                        </td>

                        <td
                          className={[
                            "px-4 py-4 text-right font-semibold",

                            entry.balance < 0
                              ? "text-violet-700"
                              : entry.balance > 0
                                ? "text-amber-700"
                                : "text-emerald-700",
                          ].join(" ")}
                        >
                          {entry.balance < 0 ? (
                            <>Advance AED {money(Math.abs(entry.balance))}</>
                          ) : (
                            <>AED {money(entry.balance)}</>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  <tfoot className="border-t-2 bg-muted/30">
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-4 text-right font-semibold"
                      >
                        Closing Balance
                      </td>

                      <td className="px-4 py-4 text-right font-semibold">
                        AED {money(statement.summary.sales)}
                      </td>

                      <td className="px-4 py-4 text-right font-semibold">
                        AED {money(statement.summary.receipts)}
                      </td>

                      <td className="px-4 py-4 text-right text-base font-bold">
                        {statement.summary.closingBalance < 0
                          ? `Advance AED ${money(
                              Math.abs(statement.summary.closingBalance),
                            )}`
                          : `AED ${money(statement.summary.closingBalance)}`}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;

  value: number;

  icon: React.ElementType;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>

          <p className="mt-2 text-2xl font-semibold tracking-tight">
            AED {money(value)}
          </p>
        </div>

        <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

function AccountPositionCard({
  label,
  value,
  tone,
  suffix,
}: {
  label: string;

  value: number;

  tone: "receivable" | "advance" | "settled";

  suffix?: string;
}) {
  const toneClass =
    tone === "receivable"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : tone === "advance"
        ? "border-violet-200 bg-violet-50 text-violet-900"
        : "border-emerald-200 bg-emerald-50 text-emerald-900";

  return (
    <div className={["rounded-xl border p-4", toneClass].join(" ")}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
        {label}
      </p>

      <p className="mt-2 text-xl font-bold">AED {money(value)}</p>

      {suffix ? (
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide opacity-70">
          {suffix}
        </p>
      ) : null}
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

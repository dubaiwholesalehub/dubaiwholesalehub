import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
  CalendarRange,
  Landmark,
  WalletCards,
} from "lucide-react";

import Link from "next/link";

import { requireAdmin } from "@/lib/auth/require-admin";

import { getActiveSupplierOptions } from "@/lib/repositories/supplier.repository";

import { getSupplierStatement } from "@/lib/repositories/supplier-statement.repository";

interface SupplierStatementPageProps {
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

function typeLabel(
  type:
    | "purchase"
    | "goods_receipt"
    | "supplier_return"
    | "supplier_return_refund"
    | "payment"
    | "legacy_payment"
    | "opening_balance",
) {
  switch (type) {
    case "opening_balance":
      return "Opening Balance";

    case "purchase":
      return "Purchase";

    case "goods_receipt":
      return "Goods Receipt";

    case "supplier_return":
      return "Supplier Return";

    case "supplier_return_refund":
      return "Return Credit Refund";

    case "legacy_payment":
      return "Opening Payment";

    case "payment":
    default:
      return "Payment";
  }
}

export default async function SupplierStatementPage({
  searchParams,
}: SupplierStatementPageProps) {
  await requireAdmin();

  const params = await searchParams;

  const supplierId = param(params.supplierId);

  const dateFrom = param(params.dateFrom);

  const dateTo = param(params.dateTo);

  const suppliers = await getActiveSupplierOptions();

  const statement = supplierId
    ? await getSupplierStatement(supplierId, {
        dateFrom: dateFrom || undefined,

        dateTo: dateTo || undefined,
      })
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Supplier Statement
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Review supplier purchases, payments, advances and running payable
          balance.
        </p>
      </div>

      {/* Filters */}

      <form className="rounded-xl border bg-card p-5">
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr_auto]">
          <label className="space-y-2">
            <span className="text-sm font-medium">Supplier</span>

            <select
              name="supplierId"
              defaultValue={supplierId}
              className={inputClass}
            >
              <option value="">Select supplier</option>

              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.company_name}
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

      {!supplierId ? (
        <section className="rounded-xl border bg-card px-6 py-16 text-center">
          <Building2 className="mx-auto size-10 text-muted-foreground" />

          <h2 className="mt-4 font-semibold">Select a supplier</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Choose a supplier above to view purchases, payments and payable
            balance.
          </p>
        </section>
      ) : !statement ? (
        <section className="rounded-xl border bg-card px-6 py-16 text-center">
          <p className="font-semibold">Supplier not found.</p>
        </section>
      ) : (
        <>
          {/* Supplier */}

          <section className="rounded-xl border bg-card p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <Building2 className="size-5" />
              </div>

              <div>
                <h2 className="text-xl font-semibold">
                  {statement.supplier.companyName}
                </h2>

                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {statement.supplier.contactName ? (
                    <span>{statement.supplier.contactName}</span>
                  ) : null}

                  {statement.supplier.phone ? (
                    <span>{statement.supplier.phone}</span>
                  ) : null}

                  {statement.supplier.city ? (
                    <span>{statement.supplier.city}</span>
                  ) : null}
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
              label="Purchases"
              value={statement.summary.periodPurchases}
              icon={ArrowDownToLine}
            />

            <SummaryCard
              label="Payments"
              value={statement.summary.periodPayments}
              icon={ArrowUpFromLine}
            />

            <SummaryCard
              label="Supplier Returns"
              value={statement.summary.periodSupplierReturns}
              icon={ArrowUpFromLine}
            />

            <SummaryCard
              label={
                statement.summary.closingBalance >= 0
                  ? "Closing Payable"
                  : "Supplier Advance"
              }
              value={Math.abs(statement.summary.closingBalance)}
              icon={WalletCards}
            />
          </div>

          {/* ===================================================
           * Current Account Position
           * =================================================== */}

          <section className="rounded-2xl border border-violet-100 bg-violet-50/40 p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-violet-700">
                  Supplier Account Position
                </p>

                <h2 className="mt-1 text-lg font-semibold text-slate-950">
                  {statement.supplier.companyName}
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Current outstanding purchases, supplier credits and net
                  payable position.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[650px]">
                <SupplierPositionCard
                  label="Outstanding Payable"
                  value={statement.summary.totalOutstandingPurchases}
                  tone="payable"
                />

                <SupplierPositionCard
                  label="Supplier Credit"
                  value={statement.summary.totalSupplierCredit}
                  tone="advance"
                />

                <SupplierPositionCard
                  label="Net Position"
                  value={Math.abs(statement.summary.currentNetPosition)}
                  tone={
                    statement.summary.currentNetPosition > 0
                      ? "payable"
                      : statement.summary.currentNetPosition < 0
                        ? "advance"
                        : "settled"
                  }
                  suffix={
                    statement.summary.currentNetPosition > 0
                      ? "Payable"
                      : statement.summary.currentNetPosition < 0
                        ? "Credit"
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
                <h2 className="font-semibold">Payables Ledger</h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Purchases increase the balance; payments and supplier returns
                  reduce it.
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

                      <th className="px-4 py-3">Reference</th>

                      <th className="px-4 py-3 text-right">Debit</th>

                      <th className="px-4 py-3 text-right">Credit</th>

                      <th className="px-4 py-3 text-right">Balance</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {statement.entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-muted/30">
                        <td className="px-4 py-4 text-muted-foreground">
                          {entry.date}
                        </td>

                        <td className="px-4 py-4">
                          {entry.supplierReturnId ? (
                            <Link
                              href={`/admin/purchasing/returns/${entry.supplierReturnId}`}
                              className="font-semibold text-primary hover:underline"
                            >
                              {entry.documentNumber}
                            </Link>
                          ) : entry.supplierPaymentId ? (
                            <Link
                              href={`/admin/purchasing/supplier-payments/${entry.supplierPaymentId}`}
                              className="font-semibold text-primary hover:underline"
                            >
                              {entry.documentNumber}
                            </Link>
                          ) : (
                            <span className="font-semibold">
                              {entry.documentNumber}
                            </span>
                          )}

                          {entry.description ? (
                            <p className="mt-1 max-w-md truncate text-xs text-muted-foreground">
                              {entry.description}
                            </p>
                          ) : null}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={[
                              "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",

                              entry.type === "purchase"
                                ? "bg-blue-100 text-blue-700"
                                : entry.type === "supplier_return" ||
                                    entry.type === "supplier_return_refund"
                                  ? "bg-violet-100 text-violet-700"
                                  : entry.type === "payment"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-amber-100 text-amber-700",
                            ].join(" ")}
                          >
                            {typeLabel(entry.type)}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-muted-foreground">
                          {entry.referenceNumber ?? "—"}
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

                            entry.runningBalance < 0
                              ? "text-violet-700"
                              : entry.runningBalance > 0
                                ? "text-amber-700"
                                : "text-emerald-700",
                          ].join(" ")}
                        >
                          {entry.runningBalance < 0 ? (
                            <>
                              Advance AED{" "}
                              {money(Math.abs(entry.runningBalance))}
                            </>
                          ) : (
                            <>AED {money(entry.runningBalance)}</>
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
                        AED{" "}
                        {money(
                          statement.summary.periodPurchases +
                            statement.summary.periodSupplierReturnRefunds,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right font-semibold">
                        AED{" "}
                        {money(
                          statement.summary.periodPayments +
                            statement.summary.periodSupplierReturns,
                        )}
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

function SupplierPositionCard({
  label,
  value,
  tone,
  suffix,
}: {
  label: string;

  value: number;

  tone: "payable" | "advance" | "settled";

  suffix?: string;
}) {
  const toneClass =
    tone === "payable"
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

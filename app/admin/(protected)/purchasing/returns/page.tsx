import { RotateCcw, Plus } from "lucide-react";

import PageHeader from "@/components/admin/shared/PageHeader";

import {
  getSupplierReturnPage,
  type SupplierReturnStatus,
} from "@/lib/repositories/supplier-return.repository";

interface SupplierReturnsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getStringParam(
  value: string | string[] | undefined,
): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function getPositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeStatus(
  value: string | undefined,
): SupplierReturnStatus | "all" {
  const statuses: SupplierReturnStatus[] = [
    "draft",
    "approved",
    "dispatched",
    "posted",
    "cancelled",
  ];

  return statuses.includes(value as SupplierReturnStatus)
    ? (value as SupplierReturnStatus)
    : "all";
}

function money(value: number): string {
  return new Intl.NumberFormat("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function statusLabel(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClassName(status: string): string {
  switch (status) {
    case "posted":
      return "bg-emerald-100 text-emerald-700";

    case "dispatched":
      return "bg-violet-100 text-violet-700";

    case "approved":
      return "bg-blue-100 text-blue-700";

    case "cancelled":
      return "bg-red-100 text-red-700";

    case "draft":
    default:
      return "bg-amber-100 text-amber-700";
  }
}

export default async function SupplierReturnsPage({
  searchParams,
}: SupplierReturnsPageProps) {
  const params = await searchParams;

  const search = getStringParam(params.search)?.trim() ?? "";

  const status = normalizeStatus(getStringParam(params.status));

  const dateFrom = getStringParam(params.dateFrom) ?? "";

  const dateTo = getStringParam(params.dateTo) ?? "";

  const page = getPositiveInteger(getStringParam(params.page), 1);

  const pageSize = Math.min(
    getPositiveInteger(getStringParam(params.pageSize), 25),
    100,
  );

  const result = await getSupplierReturnPage({
    search: search || undefined,

    status,

    dateFrom: dateFrom || undefined,

    dateTo: dateTo || undefined,

    page,

    pageSize,
  });

  const summary = result.summary;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Returns"
        description="Manage supplier debit notes, returned inventory, VAT reversals and supplier credits."
        icon={RotateCcw}
        action={{
          href: "/admin/purchasing/returns/new",

          label: "New Supplier Return",

          icon: Plus,
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="Total Returns"
          value={String(summary.totalReturns)}
        />

        <SummaryCard label="Draft" value={String(summary.draftReturns)} />

        <SummaryCard label="Approved" value={String(summary.approvedReturns)} />

        <SummaryCard
          label="Dispatched"
          value={String(summary.dispatchedReturns)}
        />

        <SummaryCard
          label="Posted Value"
          value={`AED ${money(summary.totalPostedValue)}`}
        />
      </div>

      <form
        method="get"
        className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2 xl:grid-cols-6"
      >
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder="Return number or reason..."
          className="h-10 rounded-md border bg-background px-3 text-sm xl:col-span-2"
        />

        <select
          name="status"
          defaultValue={status}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">All statuses</option>

          <option value="draft">Draft</option>

          <option value="approved">Approved</option>

          <option value="dispatched">Dispatched</option>

          <option value="posted">Posted</option>

          <option value="cancelled">Cancelled</option>
        </select>

        <input
          type="date"
          name="dateFrom"
          defaultValue={dateFrom}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        />

        <input
          type="date"
          name="dateTo"
          defaultValue={dateTo}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        />

        <button
          type="submit"
          className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Filter
        </button>
      </form>

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {result.total} matching Supplier Return
            {result.total === 1 ? "" : "s"}
          </p>
        </div>

        {result.rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-medium">No Supplier Returns found.</p>

            <p className="mt-1 text-sm text-muted-foreground">
              Create a Supplier Return from a posted Quick Purchase or completed
              Goods Receipt.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Return</th>

                  <th className="px-4 py-3">Date</th>

                  <th className="px-4 py-3">Supplier</th>

                  <th className="px-4 py-3">Source</th>

                  <th className="px-4 py-3">Warehouse</th>

                  <th className="px-4 py-3">Status</th>

                  <th className="px-4 py-3 text-right">Return Value</th>

                  <th className="px-4 py-3 text-right">Inventory Cost</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {result.rows.map((supplierReturn) => (
                  <tr
                    key={supplierReturn.id}
                    className="transition hover:bg-muted/30"
                  >
                    <td className="px-4 py-4">
                      <a
                        href={`/admin/purchasing/returns/${supplierReturn.id}`}
                        className="font-semibold hover:underline"
                      >
                        {supplierReturn.returnNumber}
                      </a>

                      <p className="mt-1 max-w-[260px] truncate text-xs text-muted-foreground">
                        {supplierReturn.reason}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-muted-foreground">
                      {supplierReturn.returnDate}
                    </td>

                    <td className="px-4 py-4 font-medium">
                      {supplierReturn.supplierName}
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-medium">
                        {supplierReturn.goodsReceiptId
                          ? (supplierReturn.goodsReceiptNumber ?? "—")
                          : supplierReturn.purchaseNumber}
                      </div>

                      <div className="mt-1 text-xs text-muted-foreground">
                        {supplierReturn.goodsReceiptId
                          ? "Goods Receipt"
                          : "Quick Purchase"}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-muted-foreground">
                      {supplierReturn.warehouseName}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={[
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                          statusClassName(supplierReturn.status),
                        ].join(" ")}
                      >
                        {statusLabel(supplierReturn.status)}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-right font-semibold">
                      {supplierReturn.currencyCode}{" "}
                      {money(supplierReturn.grandTotal)}
                    </td>

                    <td className="px-4 py-4 text-right text-muted-foreground">
                      AED {money(supplierReturn.inventoryCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 border-t px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Page {result.page} of {result.totalPages}
          </p>

          <div className="flex gap-2">
            {result.page > 1 ? (
              <a
                href={`?page=${result.page - 1}&pageSize=${result.pageSize}&status=${status}&search=${encodeURIComponent(
                  search,
                )}&dateFrom=${dateFrom}&dateTo=${dateTo}`}
                className="rounded-md border px-3 py-1.5 text-sm font-medium"
              >
                Previous
              </a>
            ) : null}

            {result.page < result.totalPages ? (
              <a
                href={`?page=${result.page + 1}&pageSize=${result.pageSize}&status=${status}&search=${encodeURIComponent(
                  search,
                )}&dateFrom=${dateFrom}&dateTo=${dateTo}`}
                className="rounded-md border px-3 py-1.5 text-sm font-medium"
              >
                Next
              </a>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>

      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

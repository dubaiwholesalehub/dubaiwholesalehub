import {
  ArrowLeft,
  Banknote,
  Building2,
  CalendarDays,
  CircleDollarSign,
  FileText,
  ReceiptText,
} from "lucide-react";

import Link from "next/link";

import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";

import { getCustomerReceiptById } from "@/lib/repositories/customer-receipt.repository";

import CancelReceiptButton from "@/components/admin/sales/receipts/CancelReceiptButton";

interface CustomerReceiptDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

function money(value: number) {
  return new Intl.NumberFormat("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function paymentMethodLabel(method: string) {
  switch (method) {
    case "bank":
      return "Bank Transfer";

    case "card":
      return "Card";

    case "cheque":
      return "Cheque";

    case "other":
      return "Other";

    case "cash":
    default:
      return "Cash";
  }
}

function paymentStatusLabel(status: string) {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function CustomerReceiptDetailPage({
  params,
}: CustomerReceiptDetailPageProps) {
  await requireAdmin();

  const { id } = await params;

  const receipt = await getCustomerReceiptById(id);

  if (!receipt) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-16">
      <div>
        <Link
          href="/admin/sales/receipts"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Customer Receipts
        </Link>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <ReceiptText className="size-5" />
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Customer Receipt
              </p>

              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                {receipt.receiptNumber}
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                Payment received from {receipt.customerName}.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <span
              className={[
                "inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold",
                receipt.status === "posted"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700",
              ].join(" ")}
            >
              {receipt.status === "posted" ? "Posted" : "Cancelled"}
            </span>

            {receipt.status === "posted" ? (
              <CancelReceiptButton
                receiptId={receipt.id}
                receiptNumber={receipt.receiptNumber}
              />
            ) : null}
          </div>
        </div>
      </div>

      {/* Summary */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Receipt Amount"
          value={`${receipt.currencyCode} ${money(receipt.amount)}`}
          icon={Banknote}
        />

        <SummaryCard
          label="Allocated"
          value={`${receipt.currencyCode} ${money(receipt.allocatedAmount)}`}
          icon={CircleDollarSign}
        />

        <SummaryCard
          label="Unallocated"
          value={`${receipt.currencyCode} ${money(receipt.unallocatedAmount)}`}
          icon={CircleDollarSign}
        />

        <SummaryCard
          label="Payment Method"
          value={paymentMethodLabel(receipt.paymentMethod)}
          icon={ReceiptText}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          {/* Allocations */}

          <section className="overflow-hidden rounded-xl border bg-card">
            <div className="border-b p-5">
              <h2 className="font-semibold">Sales Order Allocations</h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Sales Orders paid by this receipt.
              </p>
            </div>

            {receipt.allocations.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <p className="font-medium">No Sales Order allocations.</p>

                <p className="mt-1 text-sm text-muted-foreground">
                  The full receipt amount remains as unallocated customer
                  credit.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Sales Order</th>

                      <th className="px-4 py-3">Date</th>

                      <th className="px-4 py-3 text-right">Order Total</th>

                      <th className="px-4 py-3 text-right">This Receipt</th>

                      <th className="px-4 py-3 text-right">Balance Due</th>

                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {receipt.allocations.map((allocation) => (
                      <tr key={allocation.id}>
                        <td className="px-4 py-4">
                          <Link
                            href={`/admin/sales/orders/${allocation.salesOrderId}`}
                            className="font-semibold text-primary hover:underline"
                          >
                            {allocation.orderNumber}
                          </Link>
                        </td>

                        <td className="px-4 py-4 text-muted-foreground">
                          {allocation.orderDate}
                        </td>

                        <td className="px-4 py-4 text-right">
                          AED {money(allocation.grandTotal)}
                        </td>

                        <td className="px-4 py-4 text-right font-semibold text-emerald-700">
                          AED {money(allocation.amount)}
                        </td>

                        <td className="px-4 py-4 text-right font-semibold">
                          AED {money(allocation.balanceDue)}
                        </td>

                        <td className="px-4 py-4">
                          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                            {paymentStatusLabel(allocation.paymentStatus)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Notes */}

          {receipt.notes ? (
            <section className="rounded-xl border bg-card p-5">
              <div className="flex items-center gap-2">
                <FileText className="size-4" />

                <h2 className="font-semibold">Notes</h2>
              </div>

              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                {receipt.notes}
              </p>
            </section>
          ) : null}

          {/* Cancellation */}

          {receipt.status === "cancelled" ? (
            <section className="rounded-xl border border-red-200 bg-red-50 p-5">
              <h2 className="font-semibold text-red-900">Receipt Cancelled</h2>

              {receipt.cancellationReason ? (
                <p className="mt-2 text-sm text-red-800">
                  {receipt.cancellationReason}
                </p>
              ) : null}

              {receipt.cancelledAt ? (
                <p className="mt-2 text-xs text-red-700">
                  Cancelled: {receipt.cancelledAt}
                </p>
              ) : null}
            </section>
          ) : null}
        </div>

        {/* Receipt Information */}

        <aside className="h-fit rounded-xl border bg-card p-6 xl:sticky xl:top-24">
          <h2 className="font-semibold">Receipt Information</h2>

          <div className="mt-5 space-y-5">
            <InfoRow
              icon={CalendarDays}
              label="Receipt Date"
              value={receipt.receiptDate}
            />

            <InfoRow
              icon={Building2}
              label="Customer"
              value={receipt.customerName}
            />

            {receipt.customerNumber ? (
              <InfoRow
                icon={FileText}
                label="Customer Number"
                value={receipt.customerNumber}
              />
            ) : null}

            <InfoRow
              icon={ReceiptText}
              label="Payment Method"
              value={paymentMethodLabel(receipt.paymentMethod)}
            />

            {receipt.referenceNumber ? (
              <InfoRow
                icon={FileText}
                label="Reference"
                value={receipt.referenceNumber}
              />
            ) : null}

            {receipt.bankName ? (
              <InfoRow icon={Building2} label="Bank" value={receipt.bankName} />
            ) : null}

            {receipt.chequeNumber ? (
              <InfoRow
                icon={FileText}
                label="Cheque Number"
                value={receipt.chequeNumber}
              />
            ) : null}

            {receipt.chequeDate ? (
              <InfoRow
                icon={CalendarDays}
                label="Cheque Date"
                value={receipt.chequeDate}
              />
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>

          <p className="mt-2 text-xl font-semibold">{value}</p>
        </div>

        <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;

  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-4" />
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>

        <p className="mt-1 text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

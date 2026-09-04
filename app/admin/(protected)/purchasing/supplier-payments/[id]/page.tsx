import {
  ArrowLeft,
  Banknote,
  Building2,
  CalendarDays,
  FileText,
  HandCoins,
} from "lucide-react";

import Link from "next/link";

import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";

import { getSupplierPaymentById } from "@/lib/repositories/supplier-payment.repository";

import CancelSupplierPaymentButton from "@/components/admin/purchasing/supplier-payments/CancelSupplierPaymentButton";

interface SupplierPaymentDetailPageProps {
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

export default async function SupplierPaymentDetailPage({
  params,
}: SupplierPaymentDetailPageProps) {
  await requireAdmin();

  const { id } = await params;

  const payment = await getSupplierPaymentById(id);

  if (!payment) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-16">
      <div>
        <Link
          href="/admin/purchasing/supplier-payments"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Supplier Payments
        </Link>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <HandCoins className="size-5" />
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Supplier Payment
              </p>

              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                {payment.paymentNumber}
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                Payment made to {payment.supplierName}.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <span
              className={[
                "inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold",

                payment.status === "posted"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700",
              ].join(" ")}
            >
              {payment.status === "posted" ? "Posted" : "Cancelled"}
            </span>

            {payment.status === "posted" ? (
              <CancelSupplierPaymentButton
                paymentId={payment.id}
                paymentNumber={payment.paymentNumber}
              />
            ) : null}
          </div>
        </div>
      </div>

      {/* Summary */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Payment Amount"
          value={`${payment.currencyCode} ${money(payment.amount)}`}
          icon={Banknote}
        />

        <SummaryCard
          label="Allocated"
          value={`${payment.currencyCode} ${money(payment.allocatedAmount)}`}
          icon={HandCoins}
        />

        <SummaryCard
          label="Supplier Advance"
          value={`${payment.currencyCode} ${money(payment.unallocatedAmount)}`}
          icon={Banknote}
        />

        <SummaryCard
          label="Payment Method"
          value={paymentMethodLabel(payment.paymentMethod)}
          icon={HandCoins}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          {/* Allocations */}

          <section className="overflow-hidden rounded-xl border bg-card">
            <div className="border-b p-5">
              <h2 className="font-semibold">Payment Allocations</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Supplier payable documents settled by this payment.
              </p>
            </div>

            {payment.allocations.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <p className="font-medium">No payment allocations.</p>

                <p className="mt-1 text-sm text-muted-foreground">
                  The full payment remains as an unallocated supplier advance.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Document</th>

                      <th className="px-4 py-3">Supplier Invoice</th>

                      <th className="px-4 py-3">Date</th>

                      <th className="px-4 py-3 text-right">Document Total</th>

                      <th className="px-4 py-3 text-right">This Payment</th>

                      <th className="px-4 py-3 text-right">Current Balance</th>

                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {payment.allocations.map((allocation) => (
                      <tr key={allocation.id}>
                        <td className="px-4 py-4 font-semibold">
                          <div>
                            <div>{allocation.documentNumber}</div>

                            <div className="mt-1 text-xs font-normal text-muted-foreground">
                              {allocation.sourceType ===
                              "supplier_opening_balance"
                                ? "Opening Balance"
                                : allocation.sourceType === "goods_receipt"
                                  ? "Goods Receipt"
                                  : "Quick Purchase"}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-muted-foreground">
                          {allocation.supplierInvoiceNumber ?? "—"}
                        </td>

                        <td className="px-4 py-4 text-muted-foreground">
                          {allocation.documentDate}
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

          {payment.notes ? (
            <section className="rounded-xl border bg-card p-5">
              <div className="flex items-center gap-2">
                <FileText className="size-4" />

                <h2 className="font-semibold">Notes</h2>
              </div>

              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                {payment.notes}
              </p>
            </section>
          ) : null}

          {/* Cancellation information */}

          {payment.status === "cancelled" ? (
            <section className="rounded-xl border border-red-200 bg-red-50 p-5">
              <h2 className="font-semibold text-red-900">
                Supplier Payment Cancelled
              </h2>

              {payment.cancellationReason ? (
                <p className="mt-2 text-sm text-red-800">
                  {payment.cancellationReason}
                </p>
              ) : null}

              {payment.cancelledAt ? (
                <p className="mt-2 text-xs text-red-700">
                  Cancelled: {payment.cancelledAt}
                </p>
              ) : null}
            </section>
          ) : null}
        </div>

        {/* Payment Information */}

        <aside className="h-fit rounded-xl border bg-card p-6 xl:sticky xl:top-24">
          <h2 className="font-semibold">Payment Information</h2>

          <div className="mt-5 space-y-5">
            <InfoRow
              icon={CalendarDays}
              label="Payment Date"
              value={payment.paymentDate}
            />

            <InfoRow
              icon={Building2}
              label="Supplier"
              value={payment.supplierName}
            />

            <InfoRow
              icon={HandCoins}
              label="Payment Method"
              value={paymentMethodLabel(payment.paymentMethod)}
            />

            {payment.referenceNumber ? (
              <InfoRow
                icon={FileText}
                label="Reference"
                value={payment.referenceNumber}
              />
            ) : null}

            {payment.bankName ? (
              <InfoRow icon={Building2} label="Bank" value={payment.bankName} />
            ) : null}

            {payment.chequeNumber ? (
              <InfoRow
                icon={FileText}
                label="Cheque Number"
                value={payment.chequeNumber}
              />
            ) : null}

            {payment.chequeDate ? (
              <InfoRow
                icon={CalendarDays}
                label="Cheque Date"
                value={payment.chequeDate}
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

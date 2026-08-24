import { ArrowLeft, RotateCcw } from "lucide-react";

import Link from "next/link";

import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";

import {
  getSupplierReturnById,
  getSupplierReturnCreditApplications,
  getSupplierReturnCreditEligiblePurchases,
  getSupplierReturnCreditRefunds,
  getSupplierReturnCreditState,
} from "@/lib/repositories/supplier-return.repository";

import SupplierReturnCreditPanel from "@/components/admin/purchasing/supplier-returns/SupplierReturnCreditPanel";
import SupplierReturnWorkflowActions from "@/components/admin/purchasing/supplier-returns/SupplierReturnWorkflowActions";
import { getFinancialAccounts } from "@/lib/repositories/financial-account.repository";
interface SupplierReturnDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

function money(value: number): string {
  return new Intl.NumberFormat("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function statusLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function statusClassName(value: string): string {
  switch (value) {
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

export default async function SupplierReturnDetailPage({
  params,
}: SupplierReturnDetailPageProps) {
  await requireAdmin();

  const { id } = await params;

  const supplierReturn = await getSupplierReturnById(id);

  if (!supplierReturn) {
    notFound();
  }

  const [supplierCredit, creditApplications, creditRefunds, financialAccounts] =
    await Promise.all([
      getSupplierReturnCreditState(supplierReturn.id),

      getSupplierReturnCreditApplications(supplierReturn.id),

      getSupplierReturnCreditRefunds(supplierReturn.id),

      getFinancialAccounts(),
    ]);

  const eligibleCreditPurchases =
    supplierCredit &&
    supplierReturn.status === "posted" &&
    supplierCredit.supplierCreditAvailable > 0
      ? await getSupplierReturnCreditEligiblePurchases(supplierReturn.id)
      : [];

  const eligibleRefundAccounts = financialAccounts
    .filter(
      (account) =>
        account.isActive &&
        account.currencyCode === supplierReturn.currencyCode,
    )
    .map((account) => ({
      id: account.id,

      accountName: account.accountName,

      accountCode: account.accountCode,

      accountType: account.accountType,

      currencyCode: account.currencyCode,

      currentBalance: account.currentBalance,
    }));

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <header className="space-y-4">
        <Link
          href="/admin/purchasing/returns"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Supplier Returns
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
              <RotateCcw className="size-5" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {supplierReturn.returnNumber}
                </h1>

                <span
                  className={[
                    "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                    statusClassName(supplierReturn.status),
                  ].join(" ")}
                >
                  {statusLabel(supplierReturn.status)}
                </span>
              </div>

              <p className="mt-1 text-sm text-muted-foreground">
                Supplier Return against {supplierReturn.purchaseNumber} for{" "}
                {supplierReturn.supplierName}.
              </p>
            </div>
          </div>

          <SupplierReturnWorkflowActions
            supplierReturnId={supplierReturn.id}
            status={supplierReturn.status}
          />
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard label="Supplier" value={supplierReturn.supplierName} />

        <InfoCard
          label="Quick Purchase"
          value={supplierReturn.purchaseNumber}
        />

        <InfoCard label="Warehouse" value={supplierReturn.warehouseName} />

        <InfoCard label="Return Date" value={supplierReturn.returnDate} />

        <InfoCard label="Posting Date" value={supplierReturn.postingDate} />

        <InfoCard
          label="Supplier Invoice"
          value={supplierReturn.supplierInvoiceNumber ?? "—"}
        />

        <InfoCard
          label="Tax Treatment"
          value={statusLabel(supplierReturn.taxTreatment)}
        />

        <InfoCard label="Currency" value={supplierReturn.currencyCode} />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AmountCard
          label="Subtotal"
          value={`${supplierReturn.currencyCode} ${money(
            supplierReturn.subtotal,
          )}`}
        />

        <AmountCard
          label="VAT"
          value={`${supplierReturn.currencyCode} ${money(
            supplierReturn.taxAmount,
          )}`}
        />

        <AmountCard
          label="Return Value"
          value={`${supplierReturn.currencyCode} ${money(
            supplierReturn.grandTotal,
          )}`}
        />

        <AmountCard
          label="Inventory Cost"
          value={`AED ${money(supplierReturn.inventoryCost)}`}
        />

        <AmountCard
          label="Exchange Rate"
          value={String(supplierReturn.exchangeRate)}
        />
      </section>

      {supplierReturn.status === "posted" &&
      supplierCredit &&
      supplierCredit.supplierCreditAmount > 0 ? (
        <SupplierReturnCreditPanel
          credit={supplierCredit}
          eligiblePurchases={eligibleCreditPurchases}
          applications={creditApplications}
          refunds={creditRefunds}
          financialAccounts={eligibleRefundAccounts}
        />
      ) : null}

      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold">Return Reason</h2>

        <p className="mt-2 text-sm">{supplierReturn.reason}</p>

        {supplierReturn.notes ? (
          <>
            <h3 className="mt-5 text-sm font-semibold">Notes</h3>

            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
              {supplierReturn.notes}
            </p>
          </>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Returned Items</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Commercial value and original inventory cost for each returned line.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">#</th>

                <th className="px-4 py-3">Product</th>

                <th className="px-4 py-3 text-right">Qty</th>

                <th className="px-4 py-3 text-right">Original Cost</th>

                <th className="px-4 py-3 text-right">Inventory Cost</th>

                <th className="px-4 py-3 text-right">Subtotal</th>

                <th className="px-4 py-3 text-right">VAT</th>

                <th className="px-4 py-3 text-right">Total</th>

                <th className="px-4 py-3">Reason</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {supplierReturn.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-4 text-muted-foreground">
                    {item.lineNumber}
                  </td>

                  <td className="px-4 py-4">
                    <p className="font-medium">{item.productName}</p>

                    {item.productSku ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.productSku}
                      </p>
                    ) : null}
                  </td>

                  <td className="px-4 py-4 text-right">
                    {item.quantityReturned}
                  </td>

                  <td className="px-4 py-4 text-right">
                    AED {money(item.originalUnitCost)}
                  </td>

                  <td className="px-4 py-4 text-right">
                    AED {money(item.returnCost)}
                  </td>

                  <td className="px-4 py-4 text-right">
                    {supplierReturn.currencyCode} {money(item.lineSubtotal)}
                  </td>

                  <td className="px-4 py-4 text-right">
                    {supplierReturn.currencyCode} {money(item.taxAmount)}
                  </td>

                  <td className="px-4 py-4 text-right font-semibold">
                    {supplierReturn.currencyCode} {money(item.lineTotal)}
                  </td>

                  <td className="px-4 py-4 text-muted-foreground">
                    {item.reason ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <ReferenceCard
          label="Inventory Transaction"
          value={
            supplierReturn.inventoryTransactionNumber ?? "Not dispatched yet"
          }
        />

        <ReferenceCard
          label="General Ledger Journal"
          value={supplierReturn.journalNumber ?? "Not posted yet"}
        />
      </section>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}

function AmountCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>

      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

function ReferenceCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>

      <p className="mt-2 font-mono text-sm font-semibold">{value}</p>
    </div>
  );
}

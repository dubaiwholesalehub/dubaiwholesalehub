import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getPurchaseOrderDetailSummary,
  getPurchaseOrderHeaderById,
} from "@/lib/repositories/purchase-orders";

import { PurchaseOrderStatusBadge } from "@/components/admin/purchase-orders/purchase-order-status-badge";

import {
  PurchaseOrderGeneralInformation,
  PurchaseOrderQuantitySummary,
  PurchaseOrderSummaryCards,
} from "@/components/admin/purchase-orders/detail";

interface PurchaseOrderDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PurchaseOrderDetailPage({
  params,
}: PurchaseOrderDetailPageProps) {
  const { id } = await params;

  const [purchaseOrder, summary] =
    await Promise.all([
      getPurchaseOrderHeaderById(id),
      getPurchaseOrderDetailSummary(id),
    ]);

  if (!purchaseOrder) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/purchase-orders"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          &larr; Back to Purchase Orders
        </Link>
      </div>

      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Purchase Order
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {purchaseOrder.po_number}
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Supplier:{" "}
            <span className="font-medium text-foreground">
              {
                purchaseOrder.supplier
                  .company_name
              }
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {purchaseOrder.status === "draft" ? (
            <Link
              href={`/admin/purchase-orders/${purchaseOrder.id}/edit`}
              className="inline-flex h-10 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
            >
              Edit Purchase Order
            </Link>
          ) : null}

          <PurchaseOrderStatusBadge
            status={purchaseOrder.status}
          />
        </div>
      </header>

      <section className="rounded-lg border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">
            Financial Summary
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Purchase Order value and commercial
            charges.
          </p>
        </div>

        <div className="p-6">
          <PurchaseOrderSummaryCards
            currencyCode={
              purchaseOrder.currency_code
            }
            subtotal={Number(
              purchaseOrder.subtotal ?? 0,
            )}
            discountAmount={Number(
              purchaseOrder.discount_amount ?? 0,
            )}
            shippingAmount={Number(
              purchaseOrder.shipping_amount ?? 0,
            )}
            taxAmount={Number(
              purchaseOrder.tax_amount ?? 0,
            )}
            otherCharges={Number(
              purchaseOrder.other_charges ?? 0,
            )}
            totalAmount={Number(
              purchaseOrder.total_amount ?? 0,
            )}
          />
        </div>
      </section>

      <section className="rounded-lg border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">
            Order Progress
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Item and receiving quantity overview.
          </p>
        </div>

        <div className="p-6">
          <PurchaseOrderQuantitySummary
            summary={summary}
          />
        </div>
      </section>

      <PurchaseOrderGeneralInformation
        purchaseOrder={purchaseOrder}
      />
    </div>
  );
}
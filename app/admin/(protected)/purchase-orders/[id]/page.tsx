import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getPurchaseOrderDetailSummary,
  getPurchaseOrderHeaderById,
  getPurchaseOrderItems,
} from "@/lib/repositories/purchase-orders";

import { PurchaseOrderStatusBadge } from "@/components/admin/purchase-orders/purchase-order-status-badge";

import {
  PurchaseOrderApprovalButton,
  PurchaseOrderApprovalIntelligence,
  PurchaseOrderAttachments,
  PurchaseOrderGeneralInformation,
  PurchaseOrderItems,
  PurchaseOrderNotes,
  PurchaseOrderQuantitySummary,
  PurchaseOrderReference,
  PurchaseOrderSendButton,
  PurchaseOrderSummaryCards,
  PurchaseOrderWorkflow,
} from "@/components/admin/purchase-orders/detail";

import { getPurchaseOrderApprovalIntelligence } from "@/lib/purchasing/purchase-order-approval-intelligence.repository";
import { getOpenGoodsReceiptForPurchaseOrder } from "@/lib/repositories/goods-receipts";
interface PurchaseOrderDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PurchaseOrderDetailPage({
  params,
}: PurchaseOrderDetailPageProps) {
  const { id } = await params;

  const [
    purchaseOrder,
    summary,
    items,
    approvalIntelligence,
    openGoodsReceipt,
  ] = await Promise.all([
    getPurchaseOrderHeaderById(id),
    getPurchaseOrderDetailSummary(id),
    getPurchaseOrderItems(id),
    getPurchaseOrderApprovalIntelligence(id),
    getOpenGoodsReceiptForPurchaseOrder(id),
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
              {purchaseOrder.supplier.company_name}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {purchaseOrder.status === "draft" ? (
            <>
              <Link
                href={`/admin/purchase-orders/${purchaseOrder.id}/edit`}
                className="inline-flex h-10 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
              >
                Edit Purchase Order
              </Link>

              <PurchaseOrderApprovalButton
                purchaseOrderId={purchaseOrder.id}
                approvalDecision={approvalIntelligence.summary.decision}
              />
            </>
          ) : null}
          {purchaseOrder.status === "approved" ? (
            <PurchaseOrderSendButton
              purchaseOrderId={purchaseOrder.id}
              supplierName={purchaseOrder.supplier.company_name}
            />
          ) : null}
          {purchaseOrder.status === "sent" ||
          purchaseOrder.status === "partially_received" ? (
            openGoodsReceipt ? (
              <Link
                href={`/admin/goods-receipts/${openGoodsReceipt.id}`}
                className="inline-flex h-10 items-center justify-center rounded-md bg-orange-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
              >
                Continue {openGoodsReceipt.receipt_number}
              </Link>
            ) : (
              <Link
                href={`/admin/goods-receipts/new?purchaseOrderId=${purchaseOrder.id}`}
                className="inline-flex h-10 items-center justify-center rounded-md bg-orange-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
              >
                Receive Goods
              </Link>
            )
          ) : null}
          <PurchaseOrderStatusBadge status={purchaseOrder.status} />
        </div>
      </header>

      <section className="rounded-lg border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">Financial Summary</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Purchase Order value and commercial charges.
          </p>
        </div>

        <div className="p-6">
          <PurchaseOrderSummaryCards
            currencyCode={purchaseOrder.currency_code}
            subtotal={Number(purchaseOrder.subtotal ?? 0)}
            discountAmount={Number(purchaseOrder.discount_amount ?? 0)}
            shippingAmount={Number(purchaseOrder.shipping_amount ?? 0)}
            taxAmount={Number(purchaseOrder.tax_amount ?? 0)}
            otherCharges={Number(purchaseOrder.other_charges ?? 0)}
            totalAmount={Number(purchaseOrder.total_amount ?? 0)}
          />
        </div>
      </section>

      <section className="rounded-lg border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">Order Progress</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Item and receiving quantity overview.
          </p>
        </div>

        <div className="p-6">
          <PurchaseOrderQuantitySummary summary={summary} />
        </div>
      </section>
      <PurchaseOrderItems
        items={items}
        currencyCode={purchaseOrder.currency_code}
      />

      <PurchaseOrderApprovalIntelligence intelligence={approvalIntelligence} />

      <PurchaseOrderGeneralInformation purchaseOrder={purchaseOrder} />

      <div className="grid gap-6 lg:grid-cols-2">
        <PurchaseOrderWorkflow purchaseOrder={purchaseOrder} />

        <PurchaseOrderNotes purchaseOrder={purchaseOrder} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <PurchaseOrderReference purchaseOrder={purchaseOrder} />
        <PurchaseOrderAttachments />
      </div>
    </div>
  );
}

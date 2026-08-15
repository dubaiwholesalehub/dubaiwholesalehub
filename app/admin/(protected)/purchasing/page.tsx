import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock3,
  FileText,
  PackageCheck,
  ReceiptText,
  ShoppingCart,
  Truck,
} from "lucide-react";

import { getPurchasingDashboard } from "@/lib/purchasing/purchasing-dashboard.repository";

import { getPurchasingOperations } from "@/lib/purchasing/purchasing-operations.repository";
import { getSupplierAnalytics } from "@/lib/purchasing/supplier-analytics.repository";
import PayablesDashboardSection from "@/components/admin/purchasing/PayablesDashboardSection";

import { getPayablesDashboard } from "@/lib/purchasing/payables-dashboard.repository";

/* =========================================================
 * Purchasing Dashboard
 * ========================================================= */

export default async function PurchasingDashboardPage() {
  const [summary, operations, supplierAnalytics, payables] = await Promise.all([
    getPurchasingDashboard(),
    getPurchasingOperations(),
    getSupplierAnalytics(),
    getPayablesDashboard(),
  ]);

  return (
    <div className="space-y-8">
      {/* ===================================================
       * Header
       * =================================================== */}

      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-orange-600">
            Procurement Management
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">
            Purchasing Dashboard
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
            Monitor Purchase Orders, incoming goods, supplier commitments,
            overdue deliveries and monthly purchasing activity.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/purchase-orders"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 transition hover:border-orange-200 hover:text-orange-600"
          >
            <FileText className="size-4" />
            Purchase Orders
          </Link>

          <Link
            href="/admin/goods-receipts"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 text-sm font-semibold text-white transition hover:bg-orange-700"
          >
            <PackageCheck className="size-4" />
            Goods Receipts
          </Link>
        </div>
      </section>

      {/* ===================================================
       * Main KPIs
       * =================================================== */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Open Purchase Orders"
          value={summary.openPurchaseOrders}
          description="Orders still requiring procurement action."
          icon={ShoppingCart}
          href="/admin/purchase-orders"
        />

        <MetricCard
          title="Partially Received"
          value={summary.partiallyReceivedPurchaseOrders}
          description="Purchase Orders with stock still outstanding."
          icon={Truck}
          href="/admin/purchase-orders"
        />

        <MetricCard
          title="Pending Goods Receipts"
          value={summary.pendingGoodsReceipts}
          description="Goods receipt documents not yet completed."
          icon={PackageCheck}
          href="/admin/goods-receipts"
        />

        <MetricCard
          title="Purchase Value This Month"
          value={formatCurrency(summary.purchaseValueThisMonth)}
          description="Purchase Order value created this month."
          icon={ReceiptText}
          href="/admin/purchase-orders"
        />
      </section>

      {/* ===================================================
       * Attention
       * =================================================== */}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">
            Attention Needed
          </h2>

          <p className="mt-1 text-sm text-neutral-600">
            Purchasing conditions that may require action from your team.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AttentionCard
            title="Overdue Purchase Orders"
            value={summary.overduePurchaseOrders}
            description="Expected delivery date has passed and the order is still open."
            icon={AlertTriangle}
            tone="danger"
            href="/admin/purchase-orders"
          />

          <AttentionCard
            title="Draft Purchase Orders"
            value={summary.draftPurchaseOrders}
            description="Purchase Orders still waiting to progress."
            icon={Clock3}
            tone="warning"
            href="/admin/purchase-orders"
          />

          <AttentionCard
            title="Suppliers With Open Orders"
            value={summary.suppliersWithOpenOrders}
            description="Suppliers currently responsible for outstanding Purchase Orders."
            icon={Building2}
            tone="neutral"
            href="/admin/suppliers"
          />

          <AttentionCard
            title="Received Purchase Orders"
            value={summary.receivedPurchaseOrders}
            description="Purchase Orders fully received into inventory."
            icon={CheckCircle2}
            tone="success"
            href="/admin/purchase-orders"
          />
        </div>
      </section>
      {/* ===================================================
       * Supplier Payables / Financial Overview
       * =================================================== */}

      <PayablesDashboardSection payables={payables} />
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">
            Purchasing Operations
          </h2>

          <p className="mt-1 text-sm text-neutral-600">
            Live Purchase Orders, expected deliveries and recent receiving
            activity.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {/* ===================================================
           * Urgent Purchase Orders
           * =================================================== */}

          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-5 py-4">
              <div>
                <h3 className="font-semibold text-neutral-950">
                  Urgent Purchase Orders
                </h3>

                <p className="mt-1 text-sm text-neutral-500">
                  Orders currently past their expected delivery date.
                </p>
              </div>

              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700">
                <AlertTriangle className="size-5" />
              </div>
            </div>

            {operations.urgentPurchaseOrders.length === 0 ? (
              <EmptyOperationalState
                icon={CheckCircle2}
                title="No overdue Purchase Orders"
                description="There are currently no open Purchase Orders past their expected delivery date."
              />
            ) : (
              <div className="divide-y divide-neutral-100">
                {operations.urgentPurchaseOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/admin/purchase-orders/${order.id}`}
                    className="block px-5 py-4 transition hover:bg-red-50/40"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-neutral-950">
                            {order.poNumber}
                          </p>

                          <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                            {order.daysLate} day
                            {order.daysLate === 1 ? "" : "s"} late
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-neutral-600">
                          {order.supplierName}
                        </p>

                        <p className="mt-1 text-xs text-neutral-500">
                          Expected{" "}
                          {order.expectedDeliveryDate
                            ? formatDate(order.expectedDeliveryDate)
                            : "date not specified"}
                        </p>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="font-semibold text-neutral-950">
                          {formatCurrencyCode(
                            order.totalAmount,
                            order.currencyCode,
                          )}
                        </p>

                        <p className="mt-1 text-xs text-neutral-500">
                          {formatStatus(order.status)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <div className="border-t border-neutral-100 px-5 py-3">
              <Link
                href="/admin/purchase-orders"
                className="text-sm font-semibold text-orange-600 transition hover:text-orange-700"
              >
                View Purchase Orders →
              </Link>
            </div>
          </div>

          {/* ===================================================
           * Expected Arrivals
           * =================================================== */}

          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-5 py-4">
              <div>
                <h3 className="font-semibold text-neutral-950">
                  Expected Arrivals
                </h3>

                <p className="mt-1 text-sm text-neutral-500">
                  Open Purchase Orders expected during the next seven days.
                </p>
              </div>

              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Truck className="size-5" />
              </div>
            </div>

            {operations.expectedArrivals.length === 0 ? (
              <EmptyOperationalState
                icon={Truck}
                title="No scheduled arrivals"
                description="No open Purchase Orders are currently expected during the next seven days."
              />
            ) : (
              <div className="divide-y divide-neutral-100">
                {operations.expectedArrivals.map((order) => (
                  <Link
                    key={order.id}
                    href={`/admin/purchase-orders/${order.id}`}
                    className="block px-5 py-4 transition hover:bg-blue-50/40"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-neutral-950">
                            {order.poNumber}
                          </p>

                          <ArrivalBadge date={order.expectedDeliveryDate} />
                        </div>

                        <p className="mt-1 text-sm text-neutral-600">
                          {order.supplierName}
                        </p>

                        <p className="mt-1 text-xs text-neutral-500">
                          Expected {formatDate(order.expectedDeliveryDate)}
                        </p>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="font-semibold text-neutral-950">
                          {formatCurrencyCode(
                            order.totalAmount,
                            order.currencyCode,
                          )}
                        </p>

                        <p className="mt-1 text-xs text-neutral-500">
                          {formatStatus(order.status)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* =====================================================
         * Recent Goods Receipts
         * ===================================================== */}

        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-neutral-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-neutral-950">
                Recent Goods Receipts
              </h3>

              <p className="mt-1 text-sm text-neutral-500">
                Latest warehouse receipts linked to purchasing activity.
              </p>
            </div>

            <Link
              href="/admin/goods-receipts"
              className="text-sm font-semibold text-orange-600 transition hover:text-orange-700"
            >
              View all receipts →
            </Link>
          </div>

          {operations.recentGoodsReceipts.length === 0 ? (
            <EmptyOperationalState
              icon={PackageCheck}
              title="No Goods Receipts yet"
              description="Recent receiving documents will appear here once stock begins arriving."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Receipt</th>

                    <th className="px-4 py-3 font-medium">Supplier</th>

                    <th className="px-4 py-3 font-medium">Received</th>

                    <th className="px-4 py-3 font-medium">Status</th>

                    <th className="px-4 py-3 font-medium">Purchase Order</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-100">
                  {operations.recentGoodsReceipts.map((receipt) => (
                    <tr
                      key={receipt.id}
                      className="transition hover:bg-neutral-50"
                    >
                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/goods-receipts/${receipt.id}`}
                          className="font-semibold text-neutral-950 transition hover:text-orange-600"
                        >
                          {receipt.receiptNumber}
                        </Link>
                      </td>

                      <td className="px-4 py-4 text-sm text-neutral-700">
                        {receipt.supplierName}
                      </td>

                      <td className="px-4 py-4 text-sm text-neutral-600">
                        {receipt.receivedDate
                          ? formatDate(receipt.receivedDate)
                          : formatDateTime(receipt.createdAt)}
                      </td>

                      <td className="px-4 py-4">
                        <StatusPill status={receipt.status} />
                      </td>

                      <td className="px-4 py-4">
                        {receipt.purchaseOrderId ? (
                          <Link
                            href={`/admin/purchase-orders/${receipt.purchaseOrderId}`}
                            className="text-sm font-semibold text-orange-600 hover:text-orange-700"
                          >
                            View PO →
                          </Link>
                        ) : (
                          <span className="text-sm text-neutral-400">
                            Not linked
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-950">
              Supplier Analytics
            </h2>

            <p className="mt-1 text-sm text-neutral-600">
              Purchasing value, open commitments and supplier order performance.
            </p>
          </div>

          <Link
            href="/admin/suppliers"
            className="text-sm font-semibold text-orange-600 transition hover:text-orange-700"
          >
            Manage suppliers →
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SupplierMetricCard
            title="Suppliers Used"
            value={formatNumber(supplierAnalytics.totalSuppliers)}
            description="Suppliers with Purchase Order history."
            icon={Building2}
          />

          <SupplierMetricCard
            title="Total Purchase Value"
            value={formatCurrency(supplierAnalytics.totalPurchaseValue)}
            description="Combined Purchase Order value."
            icon={ReceiptText}
          />

          <SupplierMetricCard
            title="Open Order Value"
            value={formatCurrency(supplierAnalytics.totalOpenOrderValue)}
            description="Value still committed to open Purchase Orders."
            icon={ShoppingCart}
          />

          <SupplierMetricCard
            title="Overdue Orders"
            value={formatNumber(supplierAnalytics.totalOverdueOrders)}
            description="Open supplier orders past expected delivery."
            icon={AlertTriangle}
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-100 px-5 py-4">
            <h3 className="font-semibold text-neutral-950">
              Supplier Performance
            </h3>

            <p className="mt-1 text-sm text-neutral-500">
              Ranked by total purchasing value.
            </p>
          </div>

          {supplierAnalytics.suppliers.length === 0 ? (
            <EmptyOperationalState
              icon={Building2}
              title="No supplier purchase history"
              description="Supplier analytics will appear once Purchase Orders have been created."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-left">
                <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Supplier</th>

                    <th className="px-4 py-3 text-right font-medium">Orders</th>

                    <th className="px-4 py-3 text-right font-medium">
                      Purchase Value
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      Avg. Order
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      Open Orders
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      Open Value
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      Overdue
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      Received
                    </th>

                    <th className="px-4 py-3 font-medium">Last Purchase</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-100">
                  {supplierAnalytics.suppliers.map((supplier) => (
                    <tr
                      key={supplier.supplierId}
                      className="transition hover:bg-neutral-50"
                    >
                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/suppliers/${supplier.supplierId}`}
                          className="font-semibold text-neutral-950 transition hover:text-orange-600"
                        >
                          {supplier.supplierName}
                        </Link>
                      </td>

                      <td className="px-4 py-4 text-right font-medium">
                        {formatNumber(supplier.totalOrders)}
                      </td>

                      <td className="px-4 py-4 text-right font-semibold">
                        {formatCurrency(supplier.totalPurchaseValue)}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {formatCurrency(supplier.averageOrderValue)}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {formatNumber(supplier.openOrders)}
                      </td>

                      <td className="px-4 py-4 text-right font-medium">
                        {formatCurrency(supplier.openOrderValue)}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {supplier.overdueOrders > 0 ? (
                          <span className="inline-flex min-w-8 justify-center rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                            {formatNumber(supplier.overdueOrders)}
                          </span>
                        ) : (
                          <span className="text-sm text-neutral-400">0</span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <div>
                          <p className="font-medium">
                            {formatNumber(supplier.receivedOrders)}
                          </p>

                          {supplier.partiallyReceivedOrders > 0 ? (
                            <p className="mt-1 text-xs text-amber-600">
                              {formatNumber(supplier.partiallyReceivedOrders)}{" "}
                              partial
                            </p>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-sm text-neutral-600">
                        {supplier.lastPurchaseDate
                          ? formatDate(supplier.lastPurchaseDate)
                          : "Never"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ===================================================
       * Procurement Workflow
       * =================================================== */}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">
            Procurement Workflow
          </h2>

          <p className="mt-1 text-sm text-neutral-600">
            Access the major purchasing and receiving workflows.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <QuickLinkCard
            href="/admin/rfqs"
            title="Supplier RFQs"
            description="Review sourcing requirements and supplier quotation activity."
            icon={FileText}
          />

          <QuickLinkCard
            href="/admin/purchase-orders"
            title="Purchase Orders"
            description="Review supplier orders, delivery dates and receiving progress."
            icon={ShoppingCart}
          />

          <QuickLinkCard
            href="/admin/goods-receipts"
            title="Goods Receipts"
            description="Receive Purchase Order stock and complete warehouse receipt."
            icon={PackageCheck}
          />

          <QuickLinkCard
            href="/admin/suppliers"
            title="Suppliers"
            description="Review supplier information, sourcing relationships and purchasing options."
            icon={Building2}
          />
        </div>
      </section>

      {/* ===================================================
       * Purchase Position
       * =================================================== */}

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-neutral-950">
              Purchase Position
            </p>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-500">
              HM ERP is now tracking the complete flow from Purchase Order
              through Goods Receipt and inventory posting.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            <MiniMetric label="Total POs" value={summary.totalPurchaseOrders} />

            <MiniMetric label="Open" value={summary.openPurchaseOrders} />

            <MiniMetric
              label="Partial"
              value={summary.partiallyReceivedPurchaseOrders}
            />

            <MiniMetric
              label="Received"
              value={summary.receivedPurchaseOrders}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

/* =========================================================
 * Components
 * ========================================================= */

interface MetricCardProps {
  title: string;

  value: number | string;

  description: string;

  icon: typeof ShoppingCart;

  href: string;
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  href,
}: MetricCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-orange-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-500">{title}</p>

          <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
            {typeof value === "number" ? formatNumber(value) : value}
          </p>

          <p className="mt-2 text-xs leading-5 text-neutral-500">
            {description}
          </p>
        </div>

        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 transition group-hover:bg-orange-100">
          <Icon className="size-5" />
        </div>
      </div>
    </Link>
  );
}

type AttentionTone = "danger" | "warning" | "success" | "neutral";

interface AttentionCardProps {
  title: string;

  value: number;

  description: string;

  icon: typeof AlertTriangle;

  href: string;

  tone: AttentionTone;
}

function AttentionCard({
  title,
  value,
  description,
  icon: Icon,
  href,
  tone,
}: AttentionCardProps) {
  const toneClasses: Record<
    AttentionTone,
    {
      container: string;
      icon: string;
    }
  > = {
    danger: {
      container: "border-red-200 bg-red-50/50",
      icon: "bg-red-100 text-red-700",
    },

    warning: {
      container: "border-amber-200 bg-amber-50/50",
      icon: "bg-amber-100 text-amber-700",
    },

    success: {
      container: "border-emerald-200 bg-emerald-50/50",
      icon: "bg-emerald-100 text-emerald-700",
    },

    neutral: {
      container: "border-neutral-200 bg-white",
      icon: "bg-neutral-100 text-neutral-700",
    },
  };

  const classes = toneClasses[tone];

  return (
    <Link
      href={href}
      className={[
        "group rounded-xl border p-5 shadow-sm transition hover:shadow-md",
        classes.container,
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-neutral-600">{title}</p>

          <p className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">
            {formatNumber(value)}
          </p>

          <p className="mt-2 text-xs leading-5 text-neutral-500">
            {description}
          </p>
        </div>

        <div
          className={[
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            classes.icon,
          ].join(" ")}
        >
          <Icon className="size-5" />
        </div>
      </div>

      <p className="mt-4 text-sm font-semibold text-orange-600">Review →</p>
    </Link>
  );
}

interface QuickLinkCardProps {
  href: string;

  title: string;

  description: string;

  icon: typeof ShoppingCart;
}

function QuickLinkCard({
  href,
  title,
  description,
  icon: Icon,
}: QuickLinkCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-orange-200 hover:shadow-md"
    >
      <div className="flex size-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 transition group-hover:bg-orange-50 group-hover:text-orange-600">
        <Icon className="size-5" />
      </div>

      <h3 className="mt-4 font-semibold text-neutral-950">{title}</h3>

      <p className="mt-1 text-sm leading-6 text-neutral-600">{description}</p>

      <p className="mt-4 text-sm font-semibold text-orange-600">Open →</p>
    </Link>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[90px]">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </p>

      <p className="mt-1 text-xl font-semibold text-neutral-950">
        {formatNumber(value)}
      </p>
    </div>
  );
}

function EmptyOperationalState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof ShoppingCart;
  title: string;
  description: string;
}) {
  return (
    <div className="px-6 py-10 text-center">
      <Icon className="mx-auto size-9 text-neutral-400" />

      <p className="mt-3 font-semibold text-neutral-950">{title}</p>

      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-neutral-500">
        {description}
      </p>
    </div>
  );
}

function ArrivalBadge({ date }: { date: string }) {
  const today = new Date();

  const target = new Date(`${date}T00:00:00`);

  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const difference = Math.round(
    (target.getTime() - todayOnly.getTime()) / 86_400_000,
  );

  let label = formatDate(date);

  if (difference === 0) {
    label = "Today";
  } else if (difference === 1) {
    label = "Tomorrow";
  } else if (difference > 1) {
    label = `In ${difference} days`;
  }

  return (
    <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
      {label}
    </span>
  );
}
function SupplierMetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof ShoppingCart;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-neutral-500">{title}</p>

          <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
            {value}
          </p>

          <p className="mt-2 text-xs leading-5 text-neutral-500">
            {description}
          </p>
        </div>

        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  let classes = "border-neutral-200 bg-neutral-100 text-neutral-700";

  if (normalized === "completed") {
    classes = "border-emerald-200 bg-emerald-50 text-emerald-700";
  } else if (normalized === "cancelled") {
    classes = "border-red-200 bg-red-50 text-red-700";
  } else if (normalized === "draft" || normalized === "pending") {
    classes = "border-amber-200 bg-amber-50 text-amber-700";
  }

  return (
    <span
      className={[
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
        classes,
      ].join(" ")}
    >
      {formatStatus(status)}
    </span>
  );
}

function formatStatus(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatCurrencyCode(value: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: currencyCode || "AED",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currencyCode} ${value.toFixed(2)}`;
  }
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/* =========================================================
 * Formatting
 * ========================================================= */

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-AE", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

import Link from "next/link";
import {
  ClipboardList,
  PackageSearch,
  ReceiptText,
  Warehouse,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  Clock3,
  PackagePlus,
  Scale,
  Truck,
} from "lucide-react";

import { InventorySummaryCards } from "@/components/admin/inventory/InventorySummaryCards";
import { getInventoryDashboard } from "@/lib/inventory/inventory-dashboard.repository";
import { getInventoryIntelligence } from "@/lib/inventory/inventory-intelligence.repository";
import { InventoryTransactionTypeBadge } from "@/components/admin/inventory/InventoryTransactionTypeBadge";
import { getInventoryProductHealth } from "@/lib/inventory/inventory-product-health.repository";

export default async function InventoryDashboardPage() {
  const [summary, intelligence, productHealth] = await Promise.all([
    getInventoryDashboard(),
    getInventoryIntelligence(),
    getInventoryProductHealth(12),
  ]);

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-orange-600">
            Inventory Management
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">
            Inventory Dashboard
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-neutral-600">
            Monitor warehouse stock, inventory value, availability, and stock
            alerts across the business.
          </p>
        </div>

        <Link
          href="/admin/goods-receipts"
          className="inline-flex h-10 items-center justify-center rounded-md bg-orange-600 px-4 text-sm font-medium text-white transition hover:bg-orange-700"
        >
          View Goods Receipts
        </Link>
      </section>

      <InventorySummaryCards summary={summary} />
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">
            Today&apos;s Operations
          </h2>

          <p className="mt-1 text-sm text-neutral-600">
            Inventory activity posted today across all warehouses.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardMetricCard
            title="Received Today"
            value={formatQuantity(intelligence.today.receivedQuantity)}
            description={formatCurrency(intelligence.today.receivedValue)}
            icon={ArrowDownRight}
          />

          <DashboardMetricCard
            title="Issued Today"
            value={formatQuantity(intelligence.today.issuedQuantity)}
            description={formatCurrency(intelligence.today.issuedValue)}
            icon={ArrowUpRight}
          />

          <DashboardMetricCard
            title="Local Purchases"
            value={formatQuantity(intelligence.today.localPurchaseQuantity)}
            description={formatCurrency(intelligence.today.localPurchaseValue)}
            icon={PackagePlus}
          />

          <DashboardMetricCard
            title="Transactions Today"
            value={formatQuantity(intelligence.today.transactionCount)}
            description={`${intelligence.today.stockCountTransactions} stock count${
              intelligence.today.stockCountTransactions === 1 ? "" : "s"
            }`}
            icon={Clock3}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">
            Attention Needed
          </h2>

          <p className="mt-1 text-sm text-neutral-600">
            Inventory conditions that may need action from the team.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AttentionCard
            title="Low Stock"
            value={summary.lowStockProducts}
            description="Published products with low on-hand stock."
            href="/admin/inventory/stock?stockStatus=low_stock"
            icon={AlertTriangle}
          />

          <AttentionCard
            title="Out of Stock"
            value={summary.outOfStockProducts}
            description="Published products currently unavailable."
            href="/admin/inventory/stock?stockStatus=out_of_stock"
            icon={Boxes}
          />

          <AttentionCard
            title="Pending Transfers"
            value={intelligence.attention.pendingTransfers}
            description="Warehouse transfers not yet completed."
            href="/admin/inventory/transfers"
            icon={Truck}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">
            Product Health
          </h2>

          <p className="mt-1 text-sm text-neutral-600">
            Understand which products are moving, slowing down, or tying up
            inventory value.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <HealthSummaryCard
            title="Fast Moving"
            value={productHealth.summary.fastMoving}
            description="Strong recent stock movement."
            tone="success"
          />

          <HealthSummaryCard
            title="Slow Moving"
            value={productHealth.summary.slowMoving}
            description="Previously sold but no recent movement."
            tone="warning"
          />

          <HealthSummaryCard
            title="Dead Stock"
            value={productHealth.summary.deadStock}
            description="No sales for 180+ days."
            tone="danger"
          />

          <HealthSummaryCard
            title="Never Sold"
            value={productHealth.summary.noSales}
            description="Stock exists but no sales issue recorded."
            tone="neutral"
          />

          <HealthSummaryCard
            title="Dormant Value"
            value={formatCurrency(productHealth.summary.dormantInventoryValue)}
            description="Capital tied up in dead or never-sold stock."
            tone="danger"
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-neutral-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-neutral-950">
                Products Requiring Attention
              </h3>

              <p className="mt-1 text-sm text-neutral-500">
                Prioritized using stock position and real inventory movement
                history.
              </p>
            </div>

            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Showing up to {productHealth.items.length} products
            </p>
          </div>

          {productHealth.items.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <Boxes className="mx-auto size-9 text-neutral-400" />

              <p className="mt-3 font-semibold text-neutral-950">
                No product health issues
              </p>

              <p className="mt-1 text-sm text-neutral-500">
                Products requiring attention will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left">
                <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Product</th>

                    <th className="px-4 py-3 font-medium">Health</th>

                    <th className="px-4 py-3 text-right font-medium">
                      On Hand
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      Available
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      Sold 30d
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      Sold 90d
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      Stock Value
                    </th>

                    <th className="px-4 py-3 font-medium">Last Sale</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-100">
                  {productHealth.items.map((item) => (
                    <tr
                      key={item.productId}
                      className="transition hover:bg-neutral-50"
                    >
                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/products/${item.productId}`}
                          className="font-semibold text-neutral-950 transition hover:text-orange-600 hover:underline"
                        >
                          {item.productName}
                        </Link>

                        <p className="mt-1 text-xs text-neutral-500">
                          {item.sku ? `SKU: ${item.sku}` : "No SKU"}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <ProductHealthBadge status={item.healthStatus} />
                      </td>

                      <td className="px-4 py-4 text-right font-medium">
                        {formatQuantity(item.quantityOnHand)}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {formatQuantity(item.quantityAvailable)}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {formatQuantity(item.sold30Days)}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {formatQuantity(item.sold90Days)}
                      </td>

                      <td className="px-4 py-4 text-right font-semibold">
                        {formatCurrency(item.inventoryValue)}
                      </td>

                      <td className="px-4 py-4 text-sm text-neutral-500">
                        {item.lastSaleDate
                          ? formatDate(item.lastSaleDate)
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

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-950">
              Recent Inventory Activity
            </h2>

            <p className="mt-1 text-sm text-neutral-600">
              Latest posted and recorded inventory movements.
            </p>
          </div>

          <Link
            href="/admin/inventory/transactions"
            className="text-sm font-semibold text-orange-600 transition hover:text-orange-700"
          >
            View all transactions →
          </Link>
        </div>

        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          {intelligence.recentTransactions.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <ClipboardList className="mx-auto size-9 text-neutral-400" />

              <p className="mt-3 font-semibold text-neutral-950">
                No inventory transactions yet
              </p>

              <p className="mt-1 text-sm text-neutral-500">
                Posted stock movements will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {intelligence.recentTransactions.map((transaction) => (
                <Link
                  key={transaction.id}
                  href={`/admin/inventory/transactions/${transaction.id}`}
                  className="flex flex-col gap-4 px-5 py-4 transition hover:bg-neutral-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600">
                      <ClipboardList className="size-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-neutral-950">
                          {transaction.transaction_number}
                        </p>

                        <InventoryTransactionTypeBadge
                          type={transaction.transaction_type}
                        />
                      </div>

                      <p className="mt-1 text-sm text-neutral-500">
                        {transaction.warehouse_name}
                      </p>

                      <p className="mt-1 text-xs text-neutral-400">
                        {formatDate(transaction.transaction_date)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-6 sm:justify-end">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-neutral-950">
                        {formatQuantity(transaction.total_quantity)}
                      </p>

                      <p className="mt-1 text-xs text-neutral-500">
                        {transaction.line_count} line
                        {transaction.line_count === 1 ? "" : "s"}
                      </p>
                    </div>

                    <div className="min-w-[110px] text-right">
                      <p className="text-sm font-semibold text-neutral-950">
                        {formatCurrency(transaction.total_value)}
                      </p>

                      <p className="mt-1 text-xs text-neutral-500">
                        Transaction value
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">
            Inventory Operations
          </h2>

          <p className="mt-1 text-sm text-neutral-600">
            Access common stock and warehouse operations.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <QuickLinkCard
            href="/admin/inventory/operations"
            title="Inventory Operations"
            description="Opening stock, local purchases, adjustments and physical counts."
            icon={Scale}
          />
          <QuickLinkCard
            href="/admin/inventory/stock"
            title="Warehouse Stock"
            description="View stock quantities by product and warehouse."
            icon={Warehouse}
          />

          <QuickLinkCard
            href="/admin/inventory/transactions"
            title="Transactions"
            description="Review inventory receipts, issues, and adjustments."
            icon={ClipboardList}
          />

          <QuickLinkCard
            href="/admin/products"
            title="Product Inquiry"
            description="Search products and review product information."
            icon={PackageSearch}
          />

          <QuickLinkCard
            href="/admin/goods-receipts"
            title="Goods Receipts"
            description="Review and complete incoming stock receipts."
            icon={ReceiptText}
          />
        </div>
      </section>
    </div>
  );
}

interface QuickLinkCardProps {
  href: string;
  title: string;
  description: string;
  icon: typeof Warehouse;
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
      <div className="flex size-10 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 transition group-hover:bg-orange-50 group-hover:text-orange-600">
        <Icon className="size-5" aria-hidden="true" />
      </div>

      <h3 className="mt-4 font-semibold text-neutral-950">{title}</h3>

      <p className="mt-1 text-sm leading-6 text-neutral-600">{description}</p>
    </Link>
  );
}
interface DashboardMetricCardProps {
  title: string;
  value: string;
  description: string;
  icon: typeof Warehouse;
}

function DashboardMetricCard({
  title,
  value,
  description,
  icon: Icon,
}: DashboardMetricCardProps) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-500">{title}</p>

          <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
            {value}
          </p>

          <p className="mt-2 text-xs text-neutral-500">{description}</p>
        </div>

        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

interface AttentionCardProps {
  title: string;
  value: number;
  description: string;
  href: string;
  icon: typeof Warehouse;
}

function AttentionCard({
  title,
  value,
  description,
  href,
  icon: Icon,
}: AttentionCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-orange-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-neutral-600">{title}</p>

          <p className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">
            {value}
          </p>

          <p className="mt-2 text-sm leading-6 text-neutral-500">
            {description}
          </p>
        </div>

        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
          <Icon className="size-5" />
        </div>
      </div>

      <p className="mt-4 text-sm font-semibold text-orange-600">Review →</p>
    </Link>
  );
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("en-AE", {
    maximumFractionDigits: 4,
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

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

type HealthTone = "success" | "warning" | "danger" | "neutral";

interface HealthSummaryCardProps {
  title: string;
  value: number | string;
  description: string;
  tone: HealthTone;
}

function HealthSummaryCard({
  title,
  value,
  description,
  tone,
}: HealthSummaryCardProps) {
  const toneClasses: Record<HealthTone, string> = {
    success: "border-emerald-200 bg-emerald-50/50",

    warning: "border-amber-200 bg-amber-50/50",

    danger: "border-red-200 bg-red-50/50",

    neutral: "border-neutral-200 bg-white",
  };

  return (
    <div
      className={["rounded-xl border p-5 shadow-sm", toneClasses[tone]].join(
        " ",
      )}
    >
      <p className="text-sm font-medium text-neutral-600">{title}</p>

      <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
        {typeof value === "number" ? formatQuantity(value) : value}
      </p>

      <p className="mt-2 text-xs leading-5 text-neutral-500">{description}</p>
    </div>
  );
}

function ProductHealthBadge({
  status,
}: {
  status:
    | "fast_moving"
    | "slow_moving"
    | "dead_stock"
    | "no_sales"
    | "low_stock"
    | "out_of_stock"
    | "healthy";
}) {
  const config = {
    fast_moving: {
      label: "Fast Moving",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },

    slow_moving: {
      label: "Slow Moving",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    },

    dead_stock: {
      label: "Dead Stock",
      className: "border-red-200 bg-red-50 text-red-700",
    },

    no_sales: {
      label: "Never Sold",
      className: "border-neutral-200 bg-neutral-100 text-neutral-700",
    },

    low_stock: {
      label: "Low Stock",
      className: "border-orange-200 bg-orange-50 text-orange-700",
    },

    out_of_stock: {
      label: "Out of Stock",
      className: "border-red-200 bg-red-50 text-red-700",
    },

    healthy: {
      label: "Healthy",
      className: "border-blue-200 bg-blue-50 text-blue-700",
    },
  } as const;

  const item = config[status];

  return (
    <span
      className={[
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
        item.className,
      ].join(" ")}
    >
      {item.label}
    </span>
  );
}

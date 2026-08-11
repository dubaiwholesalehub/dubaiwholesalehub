import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Building2,
  Clock3,
  PackageCheck,
  ReceiptText,
  ShoppingCart,
  Star,
} from "lucide-react";

import { getSupplierIntelligence } from "@/lib/purchasing/supplier-intelligence.repository";

import { getSupplierPerformance } from "@/lib/purchasing/supplier-performance.repository";
import { getSupplierPriceIntelligence } from "@/lib/purchasing/supplier-price-intelligence.repository";

export default async function SupplierIntelligencePage({
  params,
}: {
  params: Promise<{
    supplierId: string;
  }>;
}) {
  const { supplierId } = await params;

  const [result, performanceResult, priceIntelligence] = await Promise.all([
    getSupplierIntelligence(supplierId),

    getSupplierPerformance(supplierId),

    getSupplierPriceIntelligence(supplierId),
  ]);
  const performance = performanceResult.metrics;
  const { summary, monthlySpend, topProducts } = result;

  return (
    <div className="space-y-8">
      <section>
        <Link
          href="/admin/purchasing"
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 transition hover:text-orange-600"
        >
          <ArrowLeft className="size-4" />
          Purchasing Dashboard
        </Link>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium text-orange-600">
              Supplier Intelligence
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">
              {summary.supplierName}
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
              Purchasing history, open commitments, goods receiving position,
              lead-time information and product-level supplier activity.
            </p>
          </div>

          <Link
            href="/admin/suppliers"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 transition hover:border-orange-200 hover:text-orange-600"
          >
            Back to Suppliers
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Purchase Value"
          value={formatCurrency(summary.totalPurchaseValue)}
          description="Combined value of all Purchase Orders."
          icon={ReceiptText}
        />

        <MetricCard
          title="Open Commitment"
          value={formatCurrency(summary.openPurchaseValue)}
          description="Value still committed to open Purchase Orders."
          icon={ShoppingCart}
        />

        <MetricCard
          title="Purchase Orders"
          value={formatNumber(summary.totalPurchaseOrders)}
          description="Total Purchase Orders created for this supplier."
          icon={ShoppingCart}
        />

        <MetricCard
          title="Products Supplied"
          value={formatNumber(summary.productsSupplied)}
          description="Distinct products purchased from this supplier."
          icon={Building2}
        />
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.1fr_2fr]">
        {/* =====================================================
         * Overall Supplier Score
         * ===================================================== */}

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">
            Overall Supplier Score
          </p>

          <div className="mt-5 flex items-end gap-3">
            <p className="text-5xl font-bold tracking-tight text-neutral-950">
              {formatScore(performance.overallScore)}
            </p>

            <p className="pb-1 text-lg font-semibold text-neutral-400">/ 100</p>
          </div>

          <div className="mt-5">
            <PerformanceBar value={performance.overallScore} />
          </div>

          <p className="mt-4 text-sm leading-6 text-neutral-500">
            Score uses evidence-backed delivery, lead-time, fill-rate, receiving
            quality and price-stability performance.
          </p>

          <SupplierRatingLabel score={performance.overallScore} />
        </div>

        {/* =====================================================
         * Score Breakdown
         * ===================================================== */}

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="font-semibold text-neutral-950">
              Performance Scorecard
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Supplier operational performance based on actual purchasing and
              receiving history.
            </p>
          </div>

          <div className="mt-6 space-y-5">
            <PerformanceMetric
              label="Delivery Performance"
              value={performance.deliveryScore}
              description={`On-time delivery: ${formatPercent(
                performance.onTimeDeliveryRate,
              )}`}
            />

            <PerformanceMetric
              label="Lead-Time Performance"
              value={performance.leadTimeScore}
              description={
                performance.leadTimeVariance !== null
                  ? `Average variance: ${formatSignedDays(
                      performance.leadTimeVariance,
                    )}`
                  : "No completed delivery evidence yet."
              }
            />

            <PerformanceMetric
              label="Fill Rate"
              value={performance.fillRateScore}
              description={`${formatQuantity(
                performance.receivedQuantity,
              )} received from ${formatQuantity(
                performance.orderedQuantity,
              )} ordered`}
            />

            <PerformanceMetric
              label="Quality Performance"
              value={performance.qualityScore}
              description={`${formatPercent(
                performance.acceptanceRate,
              )} accepted across ${formatNumber(
                performance.completedGoodsReceipts,
              )} completed GRNs`}
            />

            <PerformanceMetric
              label="Price Stability"
              value={performance.priceStabilityScore}
              description="Price-history scoring will be added in the next performance layer."
              unavailable={performance.averagePriceVariance === null}
            />
          </div>
        </div>
      </section>
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">
            Supplier Position
          </h2>

          <p className="mt-1 text-sm text-neutral-600">
            Operational purchasing and receiving indicators.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatusCard
            title="Open Purchase Orders"
            value={summary.openPurchaseOrders}
            description="Orders still requiring procurement or receiving action."
            icon={ShoppingCart}
            tone="orange"
          />

          <StatusCard
            title="Overdue Orders"
            value={summary.overdueOrders}
            description="Open orders past their expected delivery date."
            icon={AlertTriangle}
            tone="red"
          />

          <StatusCard
            title="Pending Goods Receipts"
            value={summary.pendingGoodsReceipts}
            description="Receiving documents that are not yet completed."
            icon={PackageCheck}
            tone="blue"
          />

          <StatusCard
            title="Preferred Mappings"
            value={summary.preferredProductMappings}
            description="Products where this supplier is marked preferred."
            icon={Star}
            tone="violet"
          />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">
            Delivery Performance
          </h2>

          <p className="mt-1 text-sm text-neutral-600">
            Actual supplier delivery performance derived from completed Goods
            Receipts.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <PerformanceStatCard
            title="On-Time Delivery"
            value={formatPercent(performance.onTimeDeliveryRate)}
            description={`${formatNumber(
              performance.onTimePurchaseOrders,
            )} on-time deliveries`}
          />

          <PerformanceStatCard
            title="Late Deliveries"
            value={formatNumber(performance.latePurchaseOrders)}
            description="Completed Purchase Orders received after expected delivery."
          />

          <PerformanceStatCard
            title="Actual Lead Time"
            value={
              performance.averageActualLeadTime !== null
                ? `${formatNumber(performance.averageActualLeadTime)} days`
                : "—"
            }
            description="Average time from PO date to completed receipt."
          />

          <PerformanceStatCard
            title="Lead-Time Variance"
            value={
              performance.leadTimeVariance !== null
                ? formatSignedDays(performance.leadTimeVariance)
                : "—"
            }
            description="Difference between actual and promised lead time."
          />
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-neutral-950">
              Receiving Reliability
            </h2>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-500">
              Measures how much of the ordered supplier quantity has actually
              been received.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            <InfoMetric
              label="Ordered"
              value={formatQuantity(performance.orderedQuantity)}
            />

            <InfoMetric
              label="Received"
              value={formatQuantity(performance.receivedQuantity)}
            />

            <InfoMetric
              label="Fill Rate"
              value={formatPercent(performance.fillRate)}
            />

            <InfoMetric
              label="Overdue POs"
              value={formatNumber(performance.overduePurchaseOrders)}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">
            Quality & Receiving Performance
          </h2>

          <p className="mt-1 text-sm text-neutral-600">
            Supplier quality measured from completed Goods Receipts, including
            accepted, rejected and damaged quantities.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <PerformanceStatCard
            title="Quality Score"
            value={`${formatScore(performance.qualityScore)}/100`}
            description={`${formatNumber(
              performance.completedGoodsReceipts,
            )} completed GRNs evaluated`}
          />

          <PerformanceStatCard
            title="Acceptance Rate"
            value={formatPercent(performance.acceptanceRate)}
            description={`${formatQuantity(
              performance.acceptedQuantity,
            )} units accepted`}
          />

          <PerformanceStatCard
            title="Rejection Rate"
            value={formatPercent(performance.rejectionRate)}
            description={`${formatQuantity(
              performance.rejectedQuantity,
            )} units rejected`}
          />

          <PerformanceStatCard
            title="Damage Rate"
            value={formatPercent(performance.damageRate)}
            description={`${formatQuantity(
              performance.damagedQuantity,
            )} units damaged`}
          />
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <InfoMetric
              label="Accepted Quantity"
              value={formatQuantity(performance.acceptedQuantity)}
            />

            <InfoMetric
              label="Rejected Quantity"
              value={formatQuantity(performance.rejectedQuantity)}
            />

            <InfoMetric
              label="Damaged Quantity"
              value={formatQuantity(performance.damagedQuantity)}
            />

            <InfoMetric
              label="Completed GRNs"
              value={formatNumber(performance.completedGoodsReceipts)}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-neutral-950">
            Purchase Performance
          </h2>

          <div className="mt-5 grid grid-cols-2 gap-5">
            <InfoMetric
              label="Average PO Value"
              value={formatCurrency(summary.averageOrderValue)}
            />

            <InfoMetric
              label="Average Lead Time"
              value={
                summary.averageLeadTimeDays !== null
                  ? `${formatNumber(summary.averageLeadTimeDays)} days`
                  : "—"
              }
            />

            <InfoMetric
              label="Received Orders"
              value={formatNumber(summary.receivedPurchaseOrders)}
            />

            <InfoMetric
              label="Partially Received"
              value={formatNumber(summary.partiallyReceivedOrders)}
            />

            <InfoMetric
              label="Cancelled Orders"
              value={formatNumber(summary.cancelledPurchaseOrders)}
            />

            <InfoMetric
              label="Last Purchase"
              value={
                summary.lastPurchaseDate
                  ? formatDate(summary.lastPurchaseDate)
                  : "—"
              }
            />
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-neutral-950">Goods Receiving</h2>

          <div className="mt-5 grid grid-cols-2 gap-5">
            <InfoMetric
              label="Total GRNs"
              value={formatNumber(summary.totalGoodsReceipts)}
            />

            <InfoMetric
              label="Completed GRNs"
              value={formatNumber(summary.completedGoodsReceipts)}
            />

            <InfoMetric
              label="Pending GRNs"
              value={formatNumber(summary.pendingGoodsReceipts)}
            />

            <InfoMetric
              label="Open POs"
              value={formatNumber(summary.openPurchaseOrders)}
            />
          </div>
        </div>
      </section>
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">
            Price Intelligence
          </h2>

          <p className="mt-1 text-sm text-neutral-600">
            Historical supplier pricing behavior across purchased products.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <PerformanceStatCard
            title="Price Stability Score"
            value={
              priceIntelligence.summary.overallPriceStabilityScore !== null
                ? `${formatScore(
                    priceIntelligence.summary.overallPriceStabilityScore,
                  )}/100`
                : "N/A"
            }
            description="Overall price consistency across products with repeat purchase history."
          />

          <PerformanceStatCard
            title="Average Volatility"
            value={
              priceIntelligence.summary.averagePriceVolatilityPercent !== null
                ? formatPercent(
                    priceIntelligence.summary.averagePriceVolatilityPercent,
                  )
                : "N/A"
            }
            description="Average historical unit-price variation."
          />

          <PerformanceStatCard
            title="Rising Prices"
            value={formatNumber(
              priceIntelligence.summary.productsWithRisingPrices,
            )}
            description="Products whose latest price increased versus the previous purchase."
          />

          <PerformanceStatCard
            title="Falling Prices"
            value={formatNumber(
              priceIntelligence.summary.productsWithFallingPrices,
            )}
            description="Products whose latest price decreased versus the previous purchase."
          />
        </div>

        {priceIntelligence.products.length === 0 ? (
          <EmptyState
            title="No price history"
            description="Price intelligence will appear once Purchase Orders contain supplier product price history."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1400px] text-left">
                <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Product</th>

                    <th className="px-4 py-3 text-right font-medium">
                      Purchases
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      Latest Price
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      Previous
                    </th>

                    <th className="px-4 py-3 text-right font-medium">Change</th>

                    <th className="px-4 py-3 text-right font-medium">Lowest</th>

                    <th className="px-4 py-3 text-right font-medium">
                      Highest
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      Avg. Price
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      Volatility
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      Stability
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-100">
                  {priceIntelligence.products.map((product) => (
                    <tr
                      key={product.productId}
                      className="transition hover:bg-neutral-50"
                    >
                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/products/${product.productId}`}
                          className="font-semibold text-neutral-950 transition hover:text-orange-600"
                        >
                          {product.productName}
                        </Link>

                        <p className="mt-1 text-xs text-neutral-500">
                          {product.sku ? `SKU: ${product.sku}` : "No SKU"}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-right">
                        {formatNumber(product.purchaseCount)}
                      </td>

                      <td className="px-4 py-4 text-right font-semibold">
                        {product.latestUnitPrice !== null
                          ? formatCurrencyCode(
                              product.latestUnitPrice,
                              product.currencyCode,
                            )
                          : "—"}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {product.previousUnitPrice !== null
                          ? formatCurrencyCode(
                              product.previousUnitPrice,
                              product.currencyCode,
                            )
                          : "—"}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <PriceChangeBadge
                          value={product.latestPriceChangePercent}
                        />
                      </td>

                      <td className="px-4 py-4 text-right">
                        {product.lowestUnitPrice !== null
                          ? formatCurrencyCode(
                              product.lowestUnitPrice,
                              product.currencyCode,
                            )
                          : "—"}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {product.highestUnitPrice !== null
                          ? formatCurrencyCode(
                              product.highestUnitPrice,
                              product.currencyCode,
                            )
                          : "—"}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {product.weightedAverageUnitPrice !== null
                          ? formatCurrencyCode(
                              product.weightedAverageUnitPrice,
                              product.currencyCode,
                            )
                          : "—"}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {product.priceVolatilityPercent !== null
                          ? formatPercent(product.priceVolatilityPercent)
                          : "N/A"}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {product.priceStabilityScore !== null ? (
                          <span className="inline-flex min-w-16 justify-center rounded-lg bg-neutral-950 px-3 py-1.5 text-sm font-bold text-white">
                            {formatScore(product.priceStabilityScore)}
                          </span>
                        ) : (
                          <span className="text-neutral-400">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">
            Monthly Purchase Spend
          </h2>

          <p className="mt-1 text-sm text-neutral-600">
            Last 12 active purchasing months for this supplier.
          </p>
        </div>

        {monthlySpend.length === 0 ? (
          <EmptyState
            title="No purchase history"
            description="Monthly spend will appear once Purchase Orders exist for this supplier."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left">
                <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Month</th>

                    <th className="px-4 py-3 text-right font-medium">Orders</th>

                    <th className="px-4 py-3 text-right font-medium">
                      Purchase Value
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-100">
                  {monthlySpend.map((month) => (
                    <tr
                      key={month.month}
                      className="transition hover:bg-neutral-50"
                    >
                      <td className="px-4 py-4 font-medium text-neutral-950">
                        {formatMonth(month.month)}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {formatNumber(month.orderCount)}
                      </td>

                      <td className="px-4 py-4 text-right font-semibold">
                        {formatCurrency(month.purchaseValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">
            Top Purchased Products
          </h2>

          <p className="mt-1 text-sm text-neutral-600">
            Products ranked by total Purchase Order value with this supplier.
          </p>
        </div>

        {topProducts.length === 0 ? (
          <EmptyState
            title="No purchased products"
            description="Product intelligence will appear after Purchase Order items are recorded."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">
                <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Product</th>

                    <th className="px-4 py-3 text-right font-medium">
                      PO Lines
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      Ordered
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      Received
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      Avg. Unit Price
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      Purchase Value
                    </th>

                    <th className="px-4 py-3 font-medium">Last Purchase</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-100">
                  {topProducts.map((product) => (
                    <tr
                      key={product.productId}
                      className="transition hover:bg-neutral-50"
                    >
                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/products/${product.productId}`}
                          className="font-semibold text-neutral-950 transition hover:text-orange-600"
                        >
                          {product.productName}
                        </Link>

                        <p className="mt-1 text-xs text-neutral-500">
                          {product.sku ? `SKU: ${product.sku}` : "No SKU"}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-right">
                        {formatNumber(product.purchaseOrderCount)}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {formatQuantity(product.totalOrderedQuantity)}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {formatQuantity(product.totalReceivedQuantity)}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {formatCurrency(product.averageUnitPrice)}
                      </td>

                      <td className="px-4 py-4 text-right font-semibold">
                        {formatCurrency(product.totalPurchaseValue)}
                      </td>

                      <td className="px-4 py-4 text-sm text-neutral-600">
                        {product.lastPurchaseDate
                          ? formatDate(product.lastPurchaseDate)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-orange-200 bg-orange-50/50 p-6">
        <div className="flex items-start gap-3">
          <BadgeCheck className="mt-0.5 size-5 shrink-0 text-orange-700" />

          <div>
            <h2 className="font-semibold text-orange-950">
              Supplier Intelligence v1
            </h2>

            <p className="mt-1 text-sm leading-6 text-orange-800">
              This dashboard currently uses purchasing, configured lead-time and
              receiving data. Actual on-time delivery percentage, price
              competitiveness, fill rate and quality score will be added in the
              next supplier performance layer.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
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

type StatusTone = "orange" | "red" | "blue" | "violet";

function StatusCard({
  title,
  value,
  description,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number;
  description: string;
  icon: typeof ShoppingCart;
  tone: StatusTone;
}) {
  const tones: Record<
    StatusTone,
    {
      container: string;
      icon: string;
    }
  > = {
    orange: {
      container: "border-orange-200 bg-orange-50/40",
      icon: "bg-orange-100 text-orange-700",
    },

    red: {
      container: "border-red-200 bg-red-50/40",
      icon: "bg-red-100 text-red-700",
    },

    blue: {
      container: "border-blue-200 bg-blue-50/40",
      icon: "bg-blue-100 text-blue-700",
    },

    violet: {
      container: "border-violet-200 bg-violet-50/40",
      icon: "bg-violet-100 text-violet-700",
    },
  };

  const classes = tones[tone];

  return (
    <div
      className={["rounded-xl border p-5 shadow-sm", classes.container].join(
        " ",
      )}
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
    </div>
  );
}

function InfoMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </p>

      <p className="mt-1 font-semibold text-neutral-950">{value}</p>
    </div>
  );
}
function PerformanceMetric({
  label,
  value,
  description,
  unavailable = false,
}: {
  label: string;
  value: number;
  description: string;
  unavailable?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-neutral-800">{label}</p>

          <p className="mt-1 text-xs text-neutral-500">{description}</p>
        </div>

        <p className="text-sm font-bold text-neutral-950">
          {unavailable ? "N/A" : `${formatScore(value)}/100`}
        </p>
      </div>

      <div className="mt-3">
        <PerformanceBar value={unavailable ? 0 : value} />
      </div>
    </div>
  );
}

function PerformanceBar({ value }: { value: number }) {
  const width = Math.max(0, Math.min(100, value));

  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100">
      <div
        className="h-full rounded-full bg-orange-500 transition-all"
        style={{
          width: `${width}%`,
        }}
      />
    </div>
  );
}

function SupplierRatingLabel({ score }: { score: number }) {
  let label = "Insufficient Data";

  if (score >= 90) {
    label = "Excellent";
  } else if (score >= 75) {
    label = "Good";
  } else if (score >= 60) {
    label = "Acceptable";
  } else if (score > 0) {
    label = "Needs Attention";
  }

  return (
    <span className="mt-5 inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
      {label}
    </span>
  );
}

function PerformanceStatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-neutral-500">{title}</p>

      <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-neutral-500">{description}</p>
    </div>
  );
}

function formatScore(value: number): string {
  return new Intl.NumberFormat("en-AE", {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${new Intl.NumberFormat("en-AE", {
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

function formatSignedDays(value: number): string {
  if (value === 0) {
    return "0 days";
  }

  const sign = value > 0 ? "+" : "";

  const formatted = new Intl.NumberFormat("en-AE", {
    maximumFractionDigits: 1,
  }).format(value);

  return `${sign}${formatted} day${Math.abs(value) === 1 ? "" : "s"}`;
}
function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-10 text-center shadow-sm">
      <Clock3 className="mx-auto size-9 text-neutral-400" />

      <p className="mt-3 font-semibold text-neutral-950">{title}</p>

      <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-neutral-500">
        {description}
      </p>
    </div>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-AE", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("en-AE", {
    maximumFractionDigits: 2,
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

function formatMonth(value: string): string {
  const date = new Date(`${value}-01T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-AE", {
    month: "short",
    year: "numeric",
  }).format(date);
}

function PriceChangeBadge({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-sm text-neutral-400">N/A</span>;
  }

  if (value > 0) {
    return (
      <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
        +{formatPercent(value)}
      </span>
    );
  }

  if (value < 0) {
    return (
      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        {formatPercent(value)}
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-semibold text-neutral-600">
      0%
    </span>
  );
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
    return `${currencyCode || "AED"} ${value.toFixed(2)}`;
  }
}

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  PackageSearch,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";

import {
  getReorderIntelligence,
  type ReorderPriority,
} from "@/lib/purchasing/reorder-intelligence.repository";
import ReorderPurchasePlanner from "@/components/admin/purchasing/ReorderPurchasePlanner";
import { getReorderSupplierAdvice } from "@/lib/purchasing/reorder-supplier-advisor.repository";

/* =========================================================
 * Reorder Intelligence Page
 * ========================================================= */

export default async function ReorderIntelligencePage() {
  const [result, supplierAdvice] = await Promise.all([
    getReorderIntelligence(),
    getReorderSupplierAdvice(),
  ]);
  return (
    <div className="space-y-8">
      {/* ===================================================
       * Header
       * =================================================== */}

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
              Procurement Intelligence
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">
              Reorder Intelligence
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
              HM ERP analyzes current stock, reserved quantity, incoming
              Purchase Orders, recent sales velocity, supplier lead time, safety
              stock and MOQ to recommend what should be purchased.
            </p>
          </div>

          <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-orange-700">
              Reorder Policy v1
            </p>

            <p className="mt-1 text-sm font-semibold text-orange-950">
              7 Days Safety Stock
            </p>
          </div>
        </div>
      </section>

      {/* ===================================================
       * Summary KPIs
       * =================================================== */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Products to Reorder"
          value={formatNumber(result.summary.productsToReorder)}
          description="Products with a recommended purchase quantity."
          icon={ShoppingCart}
          tone="orange"
        />

        <SummaryCard
          title="Critical Products"
          value={formatNumber(result.summary.criticalProducts)}
          description="Products at immediate stockout risk."
          icon={AlertTriangle}
          tone="red"
        />

        <SummaryCard
          title="Estimated Budget"
          value={formatCurrency(result.summary.estimatedPurchaseBudget)}
          description="Estimated using mapped supplier purchase cost."
          icon={TrendingUp}
          tone="blue"
        />

        <SummaryCard
          title="Suppliers Required"
          value={formatNumber(result.summary.suppliersRequired)}
          description="Mapped suppliers needed for current recommendations."
          icon={Building2}
          tone="neutral"
        />

        <SummaryCard
          title="Potential Stockouts"
          value={formatNumber(result.summary.potentialStockouts)}
          description="Products likely to run out before replenishment."
          icon={PackageSearch}
          tone="red"
        />
      </section>

      {/* ===================================================
       * Priority Overview
       * =================================================== */}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">
            Priority Overview
          </h2>

          <p className="mt-1 text-sm text-neutral-600">
            Current inventory purchasing risk across active stock products.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <PrioritySummaryCard
            title="Critical"
            value={result.summary.criticalProducts}
            description="Stock may finish before replenishment arrives."
            priority="critical"
          />

          <PrioritySummaryCard
            title="High"
            value={result.summary.highPriorityProducts}
            description="Projected stock is below the reorder point."
            priority="high"
          />

          <PrioritySummaryCard
            title="Medium"
            value={result.summary.mediumPriorityProducts}
            description="Less than approximately 30 days of coverage."
            priority="medium"
          />

          <PrioritySummaryCard
            title="Healthy"
            value={result.summary.healthyProducts}
            description="No immediate purchasing action required."
            priority="healthy"
          />
        </div>
      </section>

      {/* ===================================================
       * Recommendations
       * =================================================== */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">
            Supplier Recommendations
          </h2>

          <p className="mt-1 text-sm text-neutral-600">
            HM ERP combines reorder demand with Supplier Comparison v2 to
            recommend the best supplier and final purchase quantity.
          </p>
        </div>

        {supplierAdvice.recommendations.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-10 text-center shadow-sm">
            <p className="font-semibold text-neutral-950">
              No supplier recommendations required
            </p>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-neutral-500">
              There are currently no products requiring replenishment.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1750px] text-left">
                <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Product</th>

                    <th className="px-4 py-3 font-medium">Priority</th>

                    <th className="px-4 py-3 text-right font-medium">
                      Reorder Qty
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      Final Buy Qty
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Recommended Supplier
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      Unit Cost
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      Supplier Score
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      On-Time
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      Fill Rate
                    </th>

                    <th className="px-4 py-3 font-medium">Confidence</th>

                    <th className="px-4 py-3 text-right font-medium">
                      Estimated Value
                    </th>

                    <th className="px-4 py-3 font-medium">Why</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-100">
                  {supplierAdvice.recommendations.map((item) => (
                    <tr
                      key={item.productId}
                      className="align-top transition hover:bg-neutral-50"
                    >
                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/products/${item.productId}`}
                          className="font-semibold text-neutral-950 transition hover:text-orange-600"
                        >
                          {item.productName}
                        </Link>

                        <p className="mt-1 text-xs text-neutral-500">
                          {item.sku ? `SKU: ${item.sku}` : "No SKU"}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <span className="capitalize">{item.priority}</span>
                      </td>

                      <td className="px-4 py-4 text-right">
                        {formatQuantity(item.originalSuggestedQuantity)}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <span className="inline-flex rounded-lg bg-orange-50 px-3 py-1.5 text-sm font-bold text-orange-700">
                          {formatQuantity(item.recommendedPurchaseQuantity)}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        {item.recommendedSupplierId &&
                        item.recommendedSupplierName ? (
                          <div>
                            <Link
                              href={`/admin/purchasing/supplier-intelligence/${item.recommendedSupplierId}`}
                              className="font-semibold text-neutral-950 transition hover:text-orange-600"
                            >
                              {item.recommendedSupplierName}
                            </Link>

                            <p className="mt-1 text-xs text-neutral-500">
                              Compared against {item.supplierCount} supplier
                              {item.supplierCount === 1 ? "" : "s"}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm font-medium text-red-700">
                            No recommendation
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {item.recommendedUnitCost !== null
                          ? formatCurrencyCode(
                              item.recommendedUnitCost,
                              item.currencyCode,
                            )
                          : "—"}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {item.supplierScore !== null
                          ? `${formatScore(item.supplierScore)}/100`
                          : "N/A"}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {item.onTimeDeliveryRate !== null
                          ? formatPercent(item.onTimeDeliveryRate)
                          : "N/A"}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {item.fillRate !== null
                          ? formatPercent(item.fillRate)
                          : "N/A"}
                      </td>

                      <td className="px-4 py-4">
                        <span className="capitalize">
                          {item.comparisonConfidence}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right font-semibold">
                        {item.recommendedUnitCost !== null
                          ? formatCurrencyCode(
                              item.estimatedPurchaseValue,
                              item.currencyCode,
                            )
                          : "—"}
                      </td>

                      <td className="px-4 py-4">
                        <p className="max-w-[420px] text-xs leading-5 text-neutral-500">
                          {item.reason}
                        </p>
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
            Purchase Recommendations
          </h2>

          <p className="mt-1 text-sm text-neutral-600">
            Select recommended products and generate draft Purchase Orders
            automatically by supplier.
          </p>
        </div>

        <ReorderPurchasePlanner recommendations={result.recommendations} />
      </section>

      {/* ===================================================
       * All Product Health
       * =================================================== */}

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-neutral-950">
              Reorder Engine Coverage
            </h2>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-500">
              The engine evaluated {formatNumber(result.summary.totalProducts)}{" "}
              stock products using recent inventory sales and procurement data.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            <MiniMetric
              label="Critical"
              value={result.summary.criticalProducts}
            />

            <MiniMetric
              label="High"
              value={result.summary.highPriorityProducts}
            />

            <MiniMetric
              label="Medium"
              value={result.summary.mediumPriorityProducts}
            />

            <MiniMetric
              label="Healthy"
              value={result.summary.healthyProducts}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

/* =========================================================
 * Summary Card
 * ========================================================= */

type SummaryTone = "orange" | "red" | "blue" | "neutral";

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof ShoppingCart;
  tone: SummaryTone;
}) {
  const tones: Record<
    SummaryTone,
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

    neutral: {
      container: "border-neutral-200 bg-white",
      icon: "bg-neutral-100 text-neutral-700",
    },
  };

  const classes = tones[tone];

  return (
    <div
      className={["rounded-xl border p-5 shadow-sm", classes.container].join(
        " ",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-neutral-600">{title}</p>

          <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
            {value}
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

/* =========================================================
 * Priority Summary
 * ========================================================= */

function PrioritySummaryCard({
  title,
  value,
  description,
  priority,
}: {
  title: string;
  value: number;
  description: string;
  priority: ReorderPriority;
}) {
  const config = getPriorityConfig(priority);

  return (
    <div className={["rounded-xl border p-5 shadow-sm", config.card].join(" ")}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-neutral-950">{title}</p>

        <span className={["size-2.5 rounded-full", config.dot].join(" ")} />
      </div>

      <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
        {formatNumber(value)}
      </p>

      <p className="mt-2 text-xs leading-5 text-neutral-500">{description}</p>
    </div>
  );
}

/* =========================================================
 * Priority Badge
 * ========================================================= */

function getPriorityConfig(priority: ReorderPriority) {
  switch (priority) {
    case "critical":
      return {
        label: "Critical",

        card: "border-red-200 bg-red-50/50",

        badge: "border-red-200 bg-red-50 text-red-700",

        dot: "bg-red-600",
      };

    case "high":
      return {
        label: "High",

        card: "border-orange-200 bg-orange-50/50",

        badge: "border-orange-200 bg-orange-50 text-orange-700",

        dot: "bg-orange-500",
      };

    case "medium":
      return {
        label: "Medium",

        card: "border-amber-200 bg-amber-50/50",

        badge: "border-amber-200 bg-amber-50 text-amber-700",

        dot: "bg-amber-500",
      };

    default:
      return {
        label: "Healthy",

        card: "border-emerald-200 bg-emerald-50/50",

        badge: "border-emerald-200 bg-emerald-50 text-emerald-700",

        dot: "bg-emerald-500",
      };
  }
}

/* =========================================================
 * Mini Metric
 * ========================================================= */

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[80px]">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </p>

      <p className="mt-1 text-xl font-semibold text-neutral-950">
        {formatNumber(value)}
      </p>
    </div>
  );
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
function formatQuantity(value: number): string {
  return new Intl.NumberFormat("en-AE", {
    maximumFractionDigits: 2,
  }).format(value);
}

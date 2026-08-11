import Link from "next/link";
import {
  ArrowLeft,
  BadgeDollarSign,
  CheckCircle2,
  Clock3,
  PackageSearch,
  Star,
  Trophy,
} from "lucide-react";

import {
  compareSuppliersForProduct,
  type SupplierComparisonItem,
} from "@/lib/purchasing/supplier-comparison.repository";

/* =========================================================
 * Page
 * ========================================================= */

export default async function SupplierComparisonPage({
  params,
  searchParams,
}: {
  params: Promise<{
    productId: string;
  }>;

  searchParams: Promise<{
    quantity?: string;
  }>;
}) {
  const { productId } = await params;

  const { quantity } = await searchParams;

  const requestedQuantity = parseQuantity(quantity);

  const result = await compareSuppliersForProduct(productId, requestedQuantity);

  return (
    <div className="space-y-8">
      {/* ===================================================
       * Header
       * =================================================== */}

      <section>
        <Link
          href="/admin/purchasing/reorder"
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 transition hover:text-orange-600"
        >
          <ArrowLeft className="size-4" />
          Reorder Intelligence
        </Link>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium text-orange-600">
              Supplier Intelligence
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">
              Supplier Comparison
            </h1>

            <p className="mt-2 text-lg font-semibold text-neutral-900">
              {result.productName}
            </p>

            <p className="mt-1 text-sm text-neutral-500">
              {result.sku ? `SKU: ${result.sku}` : "No SKU"}
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Required Quantity
            </p>

            <p className="mt-1 text-2xl font-semibold text-neutral-950">
              {formatQuantity(result.requiredQuantity)}
            </p>
          </div>
        </div>
      </section>

      {/* ===================================================
       * Empty State
       * =================================================== */}

      {result.suppliers.length === 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <PackageSearch className="mx-auto size-10 text-amber-700" />

          <h2 className="mt-3 font-semibold text-amber-950">
            No active suppliers mapped
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-amber-800">
            Add one or more active supplier mappings to this product before HM
            ERP can compare purchasing options.
          </p>

          <Link
            href={`/admin/products/${result.productId}`}
            className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-orange-600 px-4 text-sm font-semibold text-white transition hover:bg-orange-700"
          >
            Configure Product Suppliers
          </Link>
        </section>
      ) : (
        <>
          {/* =================================================
           * Top Recommendations
           * ================================================= */}

          <section className="grid gap-4 lg:grid-cols-3">
            <RecommendationCard
              title="Best Overall"
              description="Highest weighted supplier score."
              supplier={result.bestSupplier}
              icon={Trophy}
              tone="orange"
            />

            <RecommendationCard
              title="Lowest Price"
              description="Lowest available effective unit cost."
              supplier={result.lowestPriceSupplier}
              icon={BadgeDollarSign}
              tone="emerald"
            />

            <RecommendationCard
              title="Fastest Supplier"
              description="Shortest mapped procurement lead time."
              supplier={result.fastestSupplier}
              icon={Clock3}
              tone="blue"
            />
          </section>

          {/* =================================================
           * Score Model
           * ================================================= */}

          <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-semibold text-neutral-950">
                  Supplier Score Model
                </h2>

                <p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-500">
                  Supplier ranking combines commercial terms with
                  evidence-backed historical performance including delivery
                  reliability, actual lead time, fill rate, receiving quality,
                  and price stability.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-5 sm:grid-cols-5">
                <WeightMetric label="Price" value="30%" />

                <WeightMetric label="Lead Time" value="15%" />

                <WeightMetric label="MOQ" value="10%" />

                <WeightMetric label="Preferred" value="5%" />

                <WeightMetric label="Performance" value="40%" />
              </div>
            </div>
          </section>

          {/* =================================================
           * Supplier Comparison Table
           * ================================================= */}

          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-950">
                Supplier Comparison
              </h2>

              <p className="mt-1 text-sm text-neutral-600">
                Ranked by overall supplier score for the required quantity.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[2800px] text-left">
                  <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Rank</th>

                      <th className="px-4 py-3 font-medium">Supplier</th>

                      <th className="px-4 py-3 text-right font-medium">
                        Unit Cost
                      </th>

                      <th className="px-4 py-3 text-right font-medium">MOQ</th>

                      <th className="px-4 py-3 text-right font-medium">
                        Buy Qty
                      </th>

                      <th className="px-4 py-3 text-right font-medium">
                        Estimated Value
                      </th>

                      <th className="px-4 py-3 text-right font-medium">
                        Lead Time
                      </th>

                      <th className="px-4 py-3 text-right font-medium">
                        Price Score
                      </th>

                      <th className="px-4 py-3 text-right font-medium">
                        Lead Score
                      </th>

                      <th className="px-4 py-3 text-right font-medium">
                        MOQ Score
                      </th>

                      <th className="px-4 py-3 text-right font-medium">
                        Overall
                      </th>

                      <th className="px-4 py-3 text-right font-medium">
                        Performance
                      </th>

                      <th className="px-4 py-3 text-right font-medium">
                        On-Time
                      </th>

                      <th className="px-4 py-3 text-right font-medium">
                        Fill Rate
                      </th>

                      <th className="px-4 py-3 text-right font-medium">
                        Quality
                      </th>

                      <th className="px-4 py-3 text-right font-medium">
                        Acceptance
                      </th>

                      <th className="px-4 py-3 text-right font-medium">
                        Rejected
                      </th>

                      <th className="px-4 py-3 text-right font-medium">
                        Damaged
                      </th>

                      <th className="px-4 py-3 text-right font-medium">GRNs</th>

                      <th className="px-4 py-3 text-right font-medium">
                        Actual Lead
                      </th>

                      <th className="px-4 py-3 text-right font-medium">
                        Price Stability
                      </th>

                      <th className="px-4 py-3 font-medium">Confidence</th>

                      <th className="px-4 py-3 font-medium">Recommendation</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-neutral-100">
                    {result.suppliers.map((supplier) => (
                      <tr
                        key={supplier.supplierId}
                        className={[
                          "align-top transition",
                          supplier.overallRank === 1
                            ? "bg-orange-50/40"
                            : "hover:bg-neutral-50",
                        ].join(" ")}
                      >
                        <td className="px-4 py-4">
                          <RankBadge rank={supplier.overallRank} />
                        </td>

                        <td className="px-4 py-4">
                          <Link
                            href={`/admin/purchasing/supplier-intelligence/${supplier.supplierId}`}
                            className="font-semibold text-neutral-950 transition hover:text-orange-600"
                          >
                            {supplier.supplierName}
                          </Link>

                          <div className="mt-2 flex flex-wrap gap-2">
                            {supplier.isPreferred ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700">
                                <Star className="size-3" />
                                Preferred
                              </span>
                            ) : null}

                            {supplier.priceRank === 1 ? (
                              <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                                Lowest Price
                              </span>
                            ) : null}

                            {supplier.leadTimeRank === 1 ? (
                              <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                                Fastest
                              </span>
                            ) : null}
                          </div>

                          {supplier.reasons.length > 0 ? (
                            <div className="mt-3 space-y-1">
                              {supplier.reasons.map((reason, index) => (
                                <p
                                  key={`${supplier.supplierId}-${index}`}
                                  className="text-xs leading-5 text-neutral-500"
                                >
                                  • {reason}
                                </p>
                              ))}
                            </div>
                          ) : null}
                        </td>

                        <td className="px-4 py-4 text-right">
                          {supplier.effectiveCost !== null
                            ? formatCurrencyCode(
                                supplier.effectiveCost,
                                supplier.currencyCode,
                              )
                            : "—"}
                        </td>

                        <td className="px-4 py-4 text-right">
                          {formatQuantity(supplier.moq)}
                        </td>

                        <td className="px-4 py-4 text-right font-semibold">
                          {formatQuantity(supplier.purchaseQuantity)}
                        </td>

                        <td className="px-4 py-4 text-right font-semibold">
                          {supplier.estimatedPurchaseValue !== null
                            ? formatCurrencyCode(
                                supplier.estimatedPurchaseValue,
                                supplier.currencyCode,
                              )
                            : "—"}
                        </td>

                        <td className="px-4 py-4 text-right">
                          {formatNumber(supplier.leadTimeDays)} day
                          {supplier.leadTimeDays === 1 ? "" : "s"}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <ScoreValue value={supplier.priceScore} />
                        </td>

                        <td className="px-4 py-4 text-right">
                          <ScoreValue value={supplier.leadTimeScore} />
                        </td>

                        <td className="px-4 py-4 text-right">
                          <ScoreValue value={supplier.moqScore} />
                        </td>

                        <td className="px-4 py-4 text-right">
                          <span className="inline-flex min-w-16 justify-center rounded-lg bg-neutral-950 px-3 py-1.5 text-sm font-bold text-white">
                            {formatScore(supplier.overallScore)}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-right">
                          {supplier.historicalPerformanceScore !== null ? (
                            <span className="inline-flex min-w-16 justify-center rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700">
                              {formatScore(supplier.historicalPerformanceScore)}
                            </span>
                          ) : (
                            <span className="text-neutral-400">N/A</span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-right">
                          {supplier.onTimeDeliveryRate !== null
                            ? formatPercent(supplier.onTimeDeliveryRate)
                            : "N/A"}
                        </td>

                        <td className="px-4 py-4 text-right">
                          {supplier.fillRate !== null
                            ? formatPercent(supplier.fillRate)
                            : "N/A"}
                        </td>

                        <td className="px-4 py-4 text-right">
                          {supplier.qualityScore !== null ? (
                            <span className="inline-flex min-w-16 justify-center rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-700">
                              {formatScore(supplier.qualityScore)}
                            </span>
                          ) : (
                            <span className="text-neutral-400">N/A</span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-right">
                          {supplier.acceptanceRate !== null
                            ? formatPercent(supplier.acceptanceRate)
                            : "N/A"}
                        </td>

                        <td className="px-4 py-4 text-right">
                          {supplier.rejectionRate !== null
                            ? formatPercent(supplier.rejectionRate)
                            : "N/A"}
                        </td>

                        <td className="px-4 py-4 text-right">
                          {supplier.damageRate !== null
                            ? formatPercent(supplier.damageRate)
                            : "N/A"}
                        </td>

                        <td className="px-4 py-4 text-right">
                          {supplier.completedGoodsReceipts > 0
                            ? formatNumber(supplier.completedGoodsReceipts)
                            : "N/A"}
                        </td>

                        <td className="px-4 py-4 text-right">
                          {supplier.actualLeadTimeDays !== null
                            ? `${formatNumber(
                                supplier.actualLeadTimeDays,
                              )} days`
                            : "N/A"}
                        </td>

                        <td className="px-4 py-4 text-right">
                          {supplier.priceStabilityScore !== null
                            ? `${formatScore(supplier.priceStabilityScore)}/100`
                            : "N/A"}
                        </td>

                        <td className="px-4 py-4">
                          <ConfidenceBadge
                            confidence={supplier.comparisonConfidence}
                          />
                        </td>

                        <td className="px-4 py-4">
                          <RecommendationBadge
                            recommendation={supplier.recommendation}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/* =========================================================
 * Recommendation Card
 * ========================================================= */

type RecommendationTone = "orange" | "emerald" | "blue";

function RecommendationCard({
  title,
  description,
  supplier,
  icon: Icon,
  tone,
}: {
  title: string;
  description: string;
  supplier: SupplierComparisonItem | null;
  icon: typeof Trophy;
  tone: RecommendationTone;
}) {
  const tones: Record<
    RecommendationTone,
    {
      container: string;
      icon: string;
    }
  > = {
    orange: {
      container: "border-orange-200 bg-orange-50/40",
      icon: "bg-orange-100 text-orange-700",
    },

    emerald: {
      container: "border-emerald-200 bg-emerald-50/40",
      icon: "bg-emerald-100 text-emerald-700",
    },

    blue: {
      container: "border-blue-200 bg-blue-50/40",
      icon: "bg-blue-100 text-blue-700",
    },
  };

  const classes = tones[tone];

  return (
    <div
      className={["rounded-2xl border p-5 shadow-sm", classes.container].join(
        " ",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-neutral-600">{title}</p>

          <p className="mt-1 text-xs text-neutral-500">{description}</p>
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

      {supplier ? (
        <div className="mt-5">
          <Link
            href={`/admin/purchasing/supplier-intelligence/${supplier.supplierId}`}
            className="font-semibold text-neutral-950 transition hover:text-orange-600"
          >
            {supplier.supplierName}
          </Link>

          <div className="mt-3 grid grid-cols-2 gap-4">
            <MiniDetail
              label="Unit Cost"
              value={
                supplier.effectiveCost !== null
                  ? formatCurrencyCode(
                      supplier.effectiveCost,
                      supplier.currencyCode,
                    )
                  : "—"
              }
            />

            <MiniDetail
              label="Lead Time"
              value={`${formatNumber(supplier.leadTimeDays)} days`}
            />

            <MiniDetail label="MOQ" value={formatQuantity(supplier.moq)} />

            <MiniDetail
              label="Score"
              value={`${formatScore(supplier.overallScore)}/100`}
            />
          </div>

          {/* ADD THE NEW HISTORICAL PERFORMANCE BLOCK HERE */}
          {supplier.historicalPerformanceScore !== null ? (
            <div className="mt-4 border-t border-neutral-200 pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                Historical Performance
              </p>

              <div className="mt-3 grid grid-cols-2 gap-4">
                <MiniDetail
                  label="Performance"
                  value={`${formatScore(
                    supplier.historicalPerformanceScore,
                  )}/100`}
                />

                <MiniDetail
                  label="On-Time"
                  value={
                    supplier.onTimeDeliveryRate !== null
                      ? formatPercent(supplier.onTimeDeliveryRate)
                      : "N/A"
                  }
                />

                <MiniDetail
                  label="Fill Rate"
                  value={
                    supplier.fillRate !== null
                      ? formatPercent(supplier.fillRate)
                      : "N/A"
                  }
                />

                <MiniDetail
                  label="Quality"
                  value={
                    supplier.qualityScore !== null
                      ? `${formatScore(supplier.qualityScore)}/100`
                      : "N/A"
                  }
                />

                <MiniDetail
                  label="Acceptance"
                  value={
                    supplier.acceptanceRate !== null
                      ? formatPercent(supplier.acceptanceRate)
                      : "N/A"
                  }
                />

                <MiniDetail
                  label="Rejected"
                  value={
                    supplier.rejectionRate !== null
                      ? formatPercent(supplier.rejectionRate)
                      : "N/A"
                  }
                />

                <MiniDetail
                  label="Damaged"
                  value={
                    supplier.damageRate !== null
                      ? formatPercent(supplier.damageRate)
                      : "N/A"
                  }
                />

                <MiniDetail
                  label="Completed GRNs"
                  value={
                    supplier.completedGoodsReceipts > 0
                      ? formatNumber(supplier.completedGoodsReceipts)
                      : "N/A"
                  }
                />

                <MiniDetail
                  label="Confidence"
                  value={
                    supplier.comparisonConfidence === "high"
                      ? "High"
                      : supplier.comparisonConfidence === "medium"
                        ? "Medium"
                        : "Limited"
                  }
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-5 text-sm text-neutral-500">No supplier available.</p>
      )}
    </div>
  );
}

/* =========================================================
 * Misc Components
 * ========================================================= */

function WeightMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[80px]">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </p>

      <p className="mt-1 text-xl font-semibold text-neutral-950">{value}</p>
    </div>
  );
}

function MiniDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-neutral-950">{value}</p>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex size-8 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-700">
        1
      </span>
    );
  }

  return (
    <span className="inline-flex size-8 items-center justify-center rounded-full bg-neutral-100 font-semibold text-neutral-600">
      {rank}
    </span>
  );
}

function ScoreValue({ value }: { value: number }) {
  return (
    <span className="font-medium text-neutral-700">{formatScore(value)}</span>
  );
}

function RecommendationBadge({
  recommendation,
}: {
  recommendation: SupplierComparisonItem["recommendation"];
}) {
  switch (recommendation) {
    case "best_overall":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
          <CheckCircle2 className="size-3" />
          Best Overall
        </span>
      );

    case "lowest_price":
      return (
        <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          Lowest Price
        </span>
      );

    case "fastest":
      return (
        <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
          Fastest
        </span>
      );

    default:
      return (
        <span className="inline-flex rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-semibold text-neutral-600">
          Alternative
        </span>
      );
  }
}

/* =========================================================
 * Formatting
 * ========================================================= */

function parseQuantity(value: string | undefined): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }

  return parsed;
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

function formatScore(value: number): string {
  return new Intl.NumberFormat("en-AE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
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

function ConfidenceBadge({
  confidence,
}: {
  confidence: "high" | "medium" | "limited";
}) {
  switch (confidence) {
    case "high":
      return (
        <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          High
        </span>
      );

    case "medium":
      return (
        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
          Medium
        </span>
      );

    default:
      return (
        <span className="inline-flex rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-semibold text-neutral-600">
          Limited
        </span>
      );
  }
}

function formatPercent(value: number): string {
  return `${new Intl.NumberFormat("en-AE", {
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

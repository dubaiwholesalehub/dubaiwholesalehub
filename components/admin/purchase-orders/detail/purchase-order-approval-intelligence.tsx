import {
  AlertTriangle,
  BadgeCheck,
  CircleAlert,
  Info,
  ShieldCheck,
} from "lucide-react";

import type {
  PurchaseOrderApprovalDecision,
  PurchaseOrderApprovalIntelligenceResult,
  PurchaseOrderApprovalWarningSeverity,
} from "@/lib/purchasing/purchase-order-approval-intelligence.repository";

interface PurchaseOrderApprovalIntelligenceProps {
  intelligence:
    PurchaseOrderApprovalIntelligenceResult;
}

export function PurchaseOrderApprovalIntelligence({
  intelligence,
}: PurchaseOrderApprovalIntelligenceProps) {
  const {
    summary,
    supplier,
    lines,
    warnings,
  } = intelligence;

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-200 px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium text-orange-600">
              Approval Intelligence
            </p>

            <h2 className="mt-1 text-lg font-semibold text-neutral-950">
              Purchase Order Risk Assessment
            </h2>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-500">
              HM ERP evaluates supplier performance, historical pricing,
              supplier ranking and commercial risks before approval.
            </p>
          </div>

          <DecisionBadge
            decision={
              summary.decision
            }
          />
        </div>
      </div>

      <div className="space-y-8 p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Approval Score"
            value={`${formatScore(
              summary.approvalScore,
            )}/100`}
          />

          <MetricCard
            label="Critical Warnings"
            value={formatNumber(
              summary.criticalWarnings,
            )}
          />

          <MetricCard
            label="Review Warnings"
            value={formatNumber(
              summary.warnings,
            )}
          />

          <MetricCard
            label="Lines Reviewed"
            value={formatNumber(
              summary.linesReviewed,
            )}
          />
        </div>

        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-orange-600" />

            <div>
              <p className="font-semibold text-neutral-950">
                Approval Recommendation
              </p>

              <p className="mt-1 text-sm leading-6 text-neutral-600">
                {summary.recommendation}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-xl border border-neutral-200 p-5">
            <h3 className="font-semibold text-neutral-950">
              Supplier Assessment
            </h3>

            <div className="mt-5 grid grid-cols-2 gap-5">
              <InfoMetric
                label="Performance"
                value={
                  supplier.performanceScore !==
                  null
                    ? `${formatScore(
                        supplier.performanceScore,
                      )}/100`
                    : "N/A"
                }
              />

              <InfoMetric
                label="On-Time Delivery"
                value={
                  supplier.onTimeDeliveryRate !==
                  null
                    ? formatPercent(
                        supplier.onTimeDeliveryRate,
                      )
                    : "N/A"
                }
              />

              <InfoMetric
                label="Fill Rate"
                value={
                  supplier.fillRate !==
                  null
                    ? formatPercent(
                        supplier.fillRate,
                      )
                    : "N/A"
                }
              />

              <InfoMetric
                label="Actual Lead Time"
                value={
                  supplier.averageActualLeadTime !==
                  null
                    ? `${formatNumber(
                        supplier.averageActualLeadTime,
                      )} days`
                    : "N/A"
                }
              />

              <InfoMetric
                label="Price Stability"
                value={
                  supplier.priceStabilityScore !==
                  null
                    ? `${formatScore(
                        supplier.priceStabilityScore,
                      )}/100`
                    : "N/A"
                }
              />

              <InfoMetric
                label="Price Volatility"
                value={
                  supplier.averagePriceVolatility !==
                  null
                    ? formatPercent(
                        supplier.averagePriceVolatility,
                      )
                    : "N/A"
                }
              />
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 p-5">
            <h3 className="font-semibold text-neutral-950">
              Supplier Selection
            </h3>

            <div className="mt-5 grid grid-cols-2 gap-5">
              <InfoMetric
                label="Supplier"
                value={
                  supplier.supplierName
                }
              />

              <InfoMetric
                label="Best Supplier Lines"
                value={`${formatNumber(
                  summary.linesWhereSupplierIsBest,
                )}/${formatNumber(
                  summary.linesReviewed,
                )}`}
              />

              <InfoMetric
                label="Not Best Ranked"
                value={formatNumber(
                  summary.linesWhereSupplierIsNotBest,
                )}
              />

              <InfoMetric
                label="Price Warning Lines"
                value={formatNumber(
                  summary.linesWithPriceWarning,
                )}
              />

              <InfoMetric
                label="Delivery Evidence"
                value={formatNumber(
                  supplier.completedOrdersWithDeliveryData,
                )}
              />

              <InfoMetric
                label="History"
                value={
                  supplier.performanceEvidenceAvailable
                    ? "Available"
                    : "Limited"
                }
              />
            </div>
          </div>
        </div>

        {warnings.length > 0 ? (
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-neutral-950">
                Approval Warnings
              </h3>

              <p className="mt-1 text-sm text-neutral-500">
                Review these findings before approving the Purchase Order.
              </p>
            </div>

            <div className="space-y-3">
              {warnings.map(
                (
                  warning,
                  index,
                ) => (
                  <WarningCard
                    key={`${warning.code}-${index}`}
                    severity={
                      warning.severity
                    }
                    title={
                      warning.title
                    }
                    message={
                      warning.message
                    }
                  />
                ),
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-start gap-3">
              <BadgeCheck className="mt-0.5 size-5 shrink-0 text-emerald-700" />

              <div>
                <p className="font-semibold text-emerald-950">
                  No approval warnings detected
                </p>

                <p className="mt-1 text-sm text-emerald-800">
                  Current supplier, pricing and quantity checks did not
                  produce any material warning.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-neutral-950">
              Line Assessment
            </h3>

            <p className="mt-1 text-sm text-neutral-500">
              Current PO lines compared against supplier ranking and price
              history.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-neutral-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1500px] text-left">
                <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">
                      Product
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      Qty
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      PO Price
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      Current Cost
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      Previous Price
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      Best Market
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      MOQ
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Supplier Rank
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Best Supplier
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Confidence
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-100">
                  {lines.map(
                    (line) => (
                      <tr
                        key={
                          line.purchaseOrderItemId
                        }
                        className="align-top"
                      >
                        <td className="px-4 py-4">
                          <p className="font-semibold text-neutral-950">
                            {line.productName}
                          </p>

                          <p className="mt-1 text-xs text-neutral-500">
                            {line.sku
                              ? `SKU: ${line.sku}`
                              : "No SKU"}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-right">
                          {formatQuantity(
                            line.orderedQuantity,
                          )}
                        </td>

                        <td className="px-4 py-4 text-right font-semibold">
                          {formatCurrencyCode(
                            line.poUnitPrice,
                            summary.currencyCode,
                          )}
                        </td>

                        <td className="px-4 py-4 text-right">
                          {line.currentSupplierMappedPrice !==
                          null
                            ? formatCurrencyCode(
                                line.currentSupplierMappedPrice,
                                summary.currencyCode,
                              )
                            : "N/A"}
                        </td>

                        <td className="px-4 py-4 text-right">
                          {line.previousHistoricalPrice !==
                          null
                            ? formatCurrencyCode(
                                line.previousHistoricalPrice,
                                summary.currencyCode,
                              )
                            : "N/A"}
                        </td>

                        <td className="px-4 py-4 text-right">
                          {line.bestMarketPrice !==
                          null
                            ? formatCurrencyCode(
                                line.bestMarketPrice,
                                summary.currencyCode,
                              )
                            : "N/A"}
                        </td>

                        <td className="px-4 py-4 text-right">
                          {line.supplierMoq !==
                          null
                            ? formatQuantity(
                                line.supplierMoq,
                              )
                            : "N/A"}
                        </td>

                        <td className="px-4 py-4">
                          {line.supplierOverallRank !==
                          null
                            ? `#${line.supplierOverallRank}`
                            : "N/A"}
                        </td>

                        <td className="px-4 py-4">
                          {line.currentSupplierIsBest ===
                          true
                            ? "Yes"
                            : line.currentSupplierIsBest ===
                                false
                              ? line.bestSupplierName ??
                                "No"
                              : "N/A"}
                        </td>

                        <td className="px-4 py-4 capitalize">
                          {line.recommendationConfidence ??
                            "N/A"}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DecisionBadge({
  decision,
}: {
  decision:
    PurchaseOrderApprovalDecision;
}) {
  switch (decision) {
    case "ready":
      return (
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
          <BadgeCheck className="size-4" />
          Ready
        </span>
      );

    case "review":
      return (
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700">
          <AlertTriangle className="size-4" />
          Review
        </span>
      );

    default:
      return (
        <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700">
          <CircleAlert className="size-4" />
          High Risk
        </span>
      );
  }
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </p>

      <p className="mt-2 text-xl font-semibold text-neutral-950">
        {value}
      </p>
    </div>
  );
}

function InfoMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-neutral-950">
        {value}
      </p>
    </div>
  );
}

function WarningCard({
  severity,
  title,
  message,
}: {
  severity:
    PurchaseOrderApprovalWarningSeverity;
  title: string;
  message: string;
}) {
  if (
    severity ===
    "critical"
  ) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-red-700" />

          <div>
            <p className="font-semibold text-red-950">
              {title}
            </p>

            <p className="mt-1 text-sm leading-6 text-red-800">
              {message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (
    severity ===
    "warning"
  ) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" />

          <div>
            <p className="font-semibold text-amber-950">
              {title}
            </p>

            <p className="mt-1 text-sm leading-6 text-amber-800">
              {message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-start gap-3">
        <Info className="mt-0.5 size-5 shrink-0 text-blue-700" />

        <div>
          <p className="font-semibold text-blue-950">
            {title}
          </p>

          <p className="mt-1 text-sm leading-6 text-blue-800">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}

function formatNumber(
  value: number,
): string {
  return new Intl.NumberFormat(
    "en-AE",
    {
      maximumFractionDigits: 1,
    },
  ).format(value);
}

function formatScore(
  value: number,
): string {
  return formatNumber(
    value,
  );
}

function formatPercent(
  value: number,
): string {
  return `${formatNumber(
    value,
  )}%`;
}

function formatQuantity(
  value: number,
): string {
  return new Intl.NumberFormat(
    "en-AE",
    {
      maximumFractionDigits: 3,
    },
  ).format(value);
}

function formatCurrencyCode(
  value: number,
  currencyCode: string,
): string {
  try {
    return new Intl.NumberFormat(
      "en-AE",
      {
        style: "currency",
        currency:
          currencyCode ||
          "AED",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    ).format(value);
  } catch {
    return `${currencyCode || "AED"} ${value.toFixed(
      2,
    )}`;
  }
}
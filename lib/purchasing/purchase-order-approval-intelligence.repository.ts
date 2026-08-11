import {
  getPurchaseOrderHeaderById,
  getPurchaseOrderItems,
} from "@/lib/repositories/purchase-orders";

import {
  compareSuppliersForProduct,
} from "@/lib/purchasing/supplier-comparison.repository";

import {
  getSupplierPerformance,
} from "@/lib/purchasing/supplier-performance.repository";

import {
  getSupplierPriceIntelligence,
} from "@/lib/purchasing/supplier-price-intelligence.repository";

/* =========================================================
 * Types
 * ========================================================= */

export type PurchaseOrderApprovalDecision =
  | "ready"
  | "review"
  | "high_risk";

export type PurchaseOrderApprovalWarningSeverity =
  | "info"
  | "warning"
  | "critical";

export interface PurchaseOrderApprovalWarning {
  severity:
    PurchaseOrderApprovalWarningSeverity;

  code: string;

  title: string;

  message: string;
}

export interface PurchaseOrderApprovalLineAssessment {
  purchaseOrderItemId: string;

  productId: string | null;

  productName: string;

  sku: string | null;

  orderedQuantity: number;

  poUnitPrice: number;

  lineTotal: number;

  currentSupplierMappedPrice:
    number | null;

  previousHistoricalPrice:
    number | null;

  bestMarketPrice:
    number | null;

  poVsMappedPricePercent:
    number | null;

  poVsHistoricalPricePercent:
    number | null;

  poVsBestPricePercent:
    number | null;

  supplierMoq:
    number | null;

  meetsMoq:
    boolean | null;

  supplierOverallRank:
    number | null;

  bestSupplierId:
    string | null;

  bestSupplierName:
    string | null;

  currentSupplierIsBest:
    boolean | null;

  currentSupplierScore:
    number | null;

  recommendationConfidence:
    | "high"
    | "medium"
    | "limited"
    | null;

  warnings:
    PurchaseOrderApprovalWarning[];
}

export interface PurchaseOrderApprovalSupplierAssessment {
  supplierId: string;

  supplierName: string;

  performanceScore:
    number | null;

  onTimeDeliveryRate:
    number | null;

  fillRate:
    number | null;

  averageActualLeadTime:
    number | null;

  leadTimeVariance:
    number | null;

  priceStabilityScore:
    number | null;

  averagePriceVolatility:
    number | null;

  completedOrdersWithDeliveryData:
    number;

  performanceEvidenceAvailable:
    boolean;
}

export interface PurchaseOrderApprovalSummary {
  purchaseOrderId: string;

  poNumber: string;

  status: string;

  currencyCode: string;

  totalAmount: number;

  decision:
    PurchaseOrderApprovalDecision;

  approvalScore: number;

  criticalWarnings: number;

  warnings: number;

  informationNotices: number;

  linesReviewed: number;

  linesWhereSupplierIsBest: number;

  linesWhereSupplierIsNotBest: number;

  linesWithPriceWarning: number;

  recommendation: string;
}

export interface PurchaseOrderApprovalIntelligenceResult {
  summary:
    PurchaseOrderApprovalSummary;

  supplier:
    PurchaseOrderApprovalSupplierAssessment;

  lines:
    PurchaseOrderApprovalLineAssessment[];

  warnings:
    PurchaseOrderApprovalWarning[];
}

/* =========================================================
 * Helpers
 * ========================================================= */

function round(
  value: number,
  decimals = 2,
): number {
  const factor =
    10 ** decimals;

  return (
    Math.round(
      value *
        factor,
    ) /
    factor
  );
}

function percentageVariance(
  actual: number,
  reference: number | null,
): number | null {
  if (
    reference ===
      null ||
    reference <=
      0
  ) {
    return null;
  }

  return round(
    (
      (
        actual -
        reference
      ) /
      reference
    ) *
      100,
    2,
  );
}

function clampScore(
  value: number,
): number {
  return Math.max(
    0,
    Math.min(
      100,
      value,
    ),
  );
}

/* =========================================================
 * Approval Intelligence
 * ========================================================= */

export async function getPurchaseOrderApprovalIntelligence(
  purchaseOrderId: string,
): Promise<PurchaseOrderApprovalIntelligenceResult> {
  const id =
    purchaseOrderId.trim();

  if (!id) {
    throw new Error(
      "Purchase Order ID is required.",
    );
  }

  const [
    purchaseOrder,
    items,
  ] = await Promise.all([
    getPurchaseOrderHeaderById(
      id,
    ),

    getPurchaseOrderItems(
      id,
    ),
  ]);

  if (!purchaseOrder) {
    throw new Error(
      "Purchase Order was not found.",
    );
  }

  /* =======================================================
   * Supplier-level intelligence
   * ======================================================= */

  const [
    supplierPerformance,
    supplierPriceIntelligence,
  ] = await Promise.all([
    getSupplierPerformance(
      purchaseOrder.supplier_id,
    ),

    getSupplierPriceIntelligence(
      purchaseOrder.supplier_id,
    ),
  ]);

  const performance =
    supplierPerformance.metrics;

  const priceSummary =
    supplierPriceIntelligence.summary;

  const performanceEvidenceAvailable =
    performance
      .completedOrdersWithDeliveryData >
      0 ||
    performance
      .orderedQuantity >
      0 ||
    performance
      .averagePriceVariance !==
      null;

  const supplierAssessment:
    PurchaseOrderApprovalSupplierAssessment =
    {
      supplierId:
        purchaseOrder.supplier_id,

      supplierName:
        purchaseOrder.supplier
          .company_name,

      performanceScore:
        performanceEvidenceAvailable
          ? performance.overallScore
          : null,

      onTimeDeliveryRate:
        performance
          .completedOrdersWithDeliveryData >
        0
          ? performance.onTimeDeliveryRate
          : null,

      fillRate:
        performance.orderedQuantity >
        0
          ? performance.fillRate
          : null,

      averageActualLeadTime:
        performance
          .averageActualLeadTime,

      leadTimeVariance:
        performance
          .leadTimeVariance,

      priceStabilityScore:
        priceSummary
          .overallPriceStabilityScore,

      averagePriceVolatility:
        priceSummary
          .averagePriceVolatilityPercent,

      completedOrdersWithDeliveryData:
        performance
          .completedOrdersWithDeliveryData,

      performanceEvidenceAvailable,
    };

  /* =======================================================
   * Global warnings
   * ======================================================= */

  const globalWarnings:
    PurchaseOrderApprovalWarning[] =
    [];

  if (
    performanceEvidenceAvailable &&
    performance.overallScore <
      60
  ) {
    globalWarnings.push({
      severity:
        performance.overallScore <
        40
          ? "critical"
          : "warning",

      code:
        "supplier_performance_low",

      title:
        "Supplier performance requires attention",

      message:
        `Historical supplier performance is ${round(
          performance.overallScore,
          1,
        )}/100.`,
    });
  }

  if (
    performance
      .completedOrdersWithDeliveryData >
      0 &&
    performance.onTimeDeliveryRate <
      80
  ) {
    globalWarnings.push({
      severity:
        performance.onTimeDeliveryRate <
        60
          ? "critical"
          : "warning",

      code:
        "supplier_delivery_risk",

      title:
        "Delivery reliability risk",

      message:
        `Historical on-time delivery is ${round(
          performance.onTimeDeliveryRate,
          1,
        )}%.`,
    });
  }

  if (
    performance.orderedQuantity >
      0 &&
    performance.fillRate <
      90
  ) {
    globalWarnings.push({
      severity:
        performance.fillRate <
        75
          ? "critical"
          : "warning",

      code:
        "supplier_fill_rate_low",

      title:
        "Supplier fill rate is below target",

      message:
        `Historical fill rate is ${round(
          performance.fillRate,
          1,
        )}%.`,
    });
  }

  if (
    priceSummary
      .overallPriceStabilityScore !==
      null &&
    priceSummary
      .overallPriceStabilityScore <
      70
  ) {
    globalWarnings.push({
      severity:
        priceSummary
          .overallPriceStabilityScore <
        45
          ? "critical"
          : "warning",

      code:
        "supplier_price_instability",

      title:
        "Supplier pricing is volatile",

      message:
        `Historical price stability score is ${round(
          priceSummary
            .overallPriceStabilityScore,
          1,
        )}/100.`,
    });
  }

  if (
    !performanceEvidenceAvailable
  ) {
    globalWarnings.push({
      severity:
        "info",

      code:
        "limited_supplier_history",

      title:
        "Limited supplier history",

      message:
        "There is not yet enough historical purchasing and receiving evidence to fully assess this supplier.",
    });
  }

  /* =======================================================
   * Product price history map
   * ======================================================= */

  const priceHistoryByProduct =
    new Map(
      supplierPriceIntelligence.products.map(
        (product) => [
          product.productId,
          product,
        ],
      ),
    );

  /* =======================================================
   * Line-by-line intelligence
   * ======================================================= */

  const lines =
    await Promise.all(
      items.map(
        async (
          item,
        ): Promise<PurchaseOrderApprovalLineAssessment> => {
          const warnings:
            PurchaseOrderApprovalWarning[] =
            [];

          if (
            !item.product_id
          ) {
            warnings.push({
              severity:
                "info",

              code:
                "custom_po_line",

              title:
                "Custom Purchase Order line",

              message:
                "This line is not linked to a product master record, so supplier comparison and price intelligence are unavailable.",
            });

            return {
              purchaseOrderItemId:
                item.id,

              productId:
                null,

              productName:
                item.product_name,

              sku:
                item.sku,

              orderedQuantity:
                item.ordered_quantity,

              poUnitPrice:
                item.unit_price,

              lineTotal:
                item.line_total,

              currentSupplierMappedPrice:
                null,

              previousHistoricalPrice:
                null,

              bestMarketPrice:
                null,

              poVsMappedPricePercent:
                null,

              poVsHistoricalPricePercent:
                null,

              poVsBestPricePercent:
                null,

              supplierMoq:
                null,

              meetsMoq:
                null,

              supplierOverallRank:
                null,

              bestSupplierId:
                null,

              bestSupplierName:
                null,

              currentSupplierIsBest:
                null,

              currentSupplierScore:
                null,

              recommendationConfidence:
                null,

              warnings,
            };
          }

          /*
           * Supplier Comparison is recalculated
           * using the actual quantity on this PO.
           */

          let comparison:
            Awaited<
              ReturnType<
                typeof compareSuppliersForProduct
              >
            > | null =
            null;

          try {
            comparison =
              await compareSuppliersForProduct(
                item.product_id,
                item.ordered_quantity,
              );
          } catch {
            warnings.push({
              severity:
                "info",

              code:
                "supplier_comparison_unavailable",

              title:
                "Supplier comparison unavailable",

              message:
                "HM ERP could not calculate a live supplier comparison for this line.",
            });
          }

          const currentSupplier =
            comparison
              ?.suppliers.find(
                (supplier) =>
                  supplier.supplierId ===
                  purchaseOrder.supplier_id,
              ) ??
            null;

          const bestSupplier =
            comparison
              ?.bestSupplier ??
            null;

          /*
           * Historical price:
           *
           * Exclude the current PO itself so a
           * newly generated draft PO does not
           * become its own historical benchmark.
           */

          const productPriceHistory =
            priceHistoryByProduct.get(
              item.product_id,
            );

          const historicalPrices =
            productPriceHistory
              ?.history
              .filter(
                (history) =>
                  history.purchaseOrderId !==
                    purchaseOrder.id &&
                  history.unitPrice >
                    0,
              )
              .sort(
                (
                  first,
                  second,
                ) =>
                  first.orderDate.localeCompare(
                    second.orderDate,
                  ),
              ) ??
            [];

          const previousHistoricalPrice =
            historicalPrices[
              historicalPrices.length -
                1
            ]
              ?.unitPrice ??
            null;

          const currentSupplierMappedPrice =
            currentSupplier
              ?.effectiveCost ??
            null;

          const bestMarketPrice =
            comparison?.suppliers
              .map(
                (supplier) =>
                  supplier.effectiveCost,
              )
              .filter(
                (
                  value,
                ): value is number =>
                  value !==
                    null &&
                  value >
                    0,
              )
              .sort(
                (
                  first,
                  second,
                ) =>
                  first -
                  second,
              )[0] ??
            null;

          const poVsMappedPricePercent =
            percentageVariance(
              item.unit_price,
              currentSupplierMappedPrice,
            );

          const poVsHistoricalPricePercent =
            percentageVariance(
              item.unit_price,
              previousHistoricalPrice,
            );

          const poVsBestPricePercent =
            percentageVariance(
              item.unit_price,
              bestMarketPrice,
            );

          const supplierMoq =
            currentSupplier
              ?.moq ??
            null;

          const meetsMoq =
            supplierMoq !==
            null
              ? item.ordered_quantity >=
                supplierMoq
              : null;

          if (
            meetsMoq ===
            false
          ) {
            warnings.push({
              severity:
                "critical",

              code:
                "below_supplier_moq",

              title:
                "Quantity is below supplier MOQ",

              message:
                `PO quantity is ${item.ordered_quantity}, while the supplier MOQ is ${supplierMoq}.`,
            });
          }

          if (
            poVsMappedPricePercent !==
              null &&
            poVsMappedPricePercent >
              5
          ) {
            warnings.push({
              severity:
                poVsMappedPricePercent >
                15
                  ? "critical"
                  : "warning",

              code:
                "price_above_supplier_mapping",

              title:
                "PO price is above current supplier price",

              message:
                `PO unit price is ${round(
                  poVsMappedPricePercent,
                  1,
                )}% above the currently mapped supplier cost.`,
            });
          }

          if (
            poVsHistoricalPricePercent !==
              null &&
            poVsHistoricalPricePercent >
              10
          ) {
            warnings.push({
              severity:
                poVsHistoricalPricePercent >
                20
                  ? "critical"
                  : "warning",

              code:
                "price_above_history",

              title:
                "PO price increased materially",

              message:
                `PO unit price is ${round(
                  poVsHistoricalPricePercent,
                  1,
                )}% above the previous historical purchase price.`,
            });
          }

          const currentSupplierIsBest =
            bestSupplier
              ? bestSupplier.supplierId ===
                purchaseOrder.supplier_id
              : null;

          if (
            currentSupplierIsBest ===
            false
          ) {
            warnings.push({
              severity:
                "warning",

              code:
                "supplier_not_best_overall",

              title:
                "Current supplier is not ranked Best Overall",

              message:
                `${bestSupplier?.supplierName ?? "Another supplier"} currently ranks higher for this product and quantity.`,
            });
          }

          if (
            currentSupplier &&
            currentSupplier
              .comparisonConfidence ===
              "limited"
          ) {
            warnings.push({
              severity:
                "info",

              code:
                "limited_comparison_confidence",

              title:
                "Limited recommendation confidence",

              message:
                "Supplier ranking is based on limited historical evidence.",
            });
          }

          return {
            purchaseOrderItemId:
              item.id,

            productId:
              item.product_id,

            productName:
              item.product_name,

            sku:
              item.sku,

            orderedQuantity:
              item.ordered_quantity,

            poUnitPrice:
              item.unit_price,

            lineTotal:
              item.line_total,

            currentSupplierMappedPrice,

            previousHistoricalPrice,

            bestMarketPrice,

            poVsMappedPricePercent,

            poVsHistoricalPricePercent,

            poVsBestPricePercent,

            supplierMoq,

            meetsMoq,

            supplierOverallRank:
              currentSupplier
                ?.overallRank ??
              null,

            bestSupplierId:
              bestSupplier
                ?.supplierId ??
              null,

            bestSupplierName:
              bestSupplier
                ?.supplierName ??
              null,

            currentSupplierIsBest,

            currentSupplierScore:
              currentSupplier
                ?.overallScore ??
              null,

            recommendationConfidence:
              currentSupplier
                ?.comparisonConfidence ??
              null,

            warnings,
          };
        },
      ),
    );

  /* =======================================================
   * Combine warnings
   * ======================================================= */

  const lineWarnings =
    lines.flatMap(
      (line) =>
        line.warnings,
    );

  const warnings = [
    ...globalWarnings,
    ...lineWarnings,
  ];

  const criticalWarnings =
    warnings.filter(
      (warning) =>
        warning.severity ===
        "critical",
    ).length;

  const warningCount =
    warnings.filter(
      (warning) =>
        warning.severity ===
        "warning",
    ).length;

  const informationNotices =
    warnings.filter(
      (warning) =>
        warning.severity ===
        "info",
    ).length;

  /* =======================================================
   * Approval Score
   * ======================================================= */

  const scoreParts: {
    score: number;
    weight: number;
  }[] = [];

  if (
    performanceEvidenceAvailable
  ) {
    scoreParts.push({
      score:
        performance.overallScore,

      weight:
        0.4,
    });
  }

  if (
    priceSummary
      .overallPriceStabilityScore !==
    null
  ) {
    scoreParts.push({
      score:
        priceSummary
          .overallPriceStabilityScore,

      weight:
        0.15,
    });
  }

  const comparableLines =
    lines.filter(
      (line) =>
        line.currentSupplierScore !==
        null,
    );

  if (
    comparableLines.length >
    0
  ) {
    const averageLineSupplierScore =
      comparableLines.reduce(
        (
          total,
          line,
        ) =>
          total +
          (
            line.currentSupplierScore ??
            0
          ),
        0,
      ) /
      comparableLines.length;

    scoreParts.push({
      score:
        averageLineSupplierScore,

      weight:
        0.3,
    });
  }

  /*
   * Commercial compliance score.
   */

  let commercialScore =
    100;

  commercialScore -=
    criticalWarnings *
    25;

  commercialScore -=
    warningCount *
    10;

  commercialScore =
    clampScore(
      commercialScore,
    );

  scoreParts.push({
    score:
      commercialScore,

    weight:
      0.15,
  });

  const totalWeight =
    scoreParts.reduce(
      (
        total,
        part,
      ) =>
        total +
        part.weight,
      0,
    );

  const approvalScore =
    totalWeight >
    0
      ? round(
          scoreParts.reduce(
            (
              total,
              part,
            ) =>
              total +
              part.score *
                part.weight,
            0,
          ) /
            totalWeight,
          1,
        )
      : 0;

  /* =======================================================
   * Decision
   * ======================================================= */

  let decision:
    PurchaseOrderApprovalDecision =
    "ready";

  if (
    criticalWarnings >
      0 ||
    approvalScore <
      50
  ) {
    decision =
      "high_risk";
  } else if (
    warningCount >
      0 ||
    approvalScore <
      75
  ) {
    decision =
      "review";
  }

  const linesWhereSupplierIsBest =
    lines.filter(
      (line) =>
        line.currentSupplierIsBest ===
        true,
    ).length;

  const linesWhereSupplierIsNotBest =
    lines.filter(
      (line) =>
        line.currentSupplierIsBest ===
        false,
    ).length;

  const linesWithPriceWarning =
    lines.filter(
      (line) =>
        line.warnings.some(
          (warning) =>
            warning.code ===
              "price_above_supplier_mapping" ||
            warning.code ===
              "price_above_history",
        ),
    ).length;

  let recommendation =
    "Purchase Order appears ready for approval.";

  if (
    decision ===
    "review"
  ) {
    recommendation =
      "Review the highlighted commercial or supplier-performance warnings before approving this Purchase Order.";
  }

  if (
    decision ===
    "high_risk"
  ) {
    recommendation =
      "Do not approve without reviewing the critical supplier, pricing, or quantity risks highlighted below.";
  }

  return {
    summary: {
      purchaseOrderId:
        purchaseOrder.id,

      poNumber:
        purchaseOrder.po_number,

      status:
        purchaseOrder.status,

      currencyCode:
        purchaseOrder.currency_code,

      totalAmount:
        Number(
          purchaseOrder.total_amount ??
          0,
        ),

      decision,

      approvalScore,

      criticalWarnings,

      warnings:
        warningCount,

      informationNotices,

      linesReviewed:
        lines.length,

      linesWhereSupplierIsBest,

      linesWhereSupplierIsNotBest,

      linesWithPriceWarning,

      recommendation,
    },

    supplier:
      supplierAssessment,

    lines,

    warnings,
  };
}
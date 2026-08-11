import {
    getReorderIntelligence,
    type ReorderPriority,
} from "@/lib/purchasing/reorder-intelligence.repository";

import {
    compareSuppliersForProduct,
    type SupplierComparisonItem,
} from "@/lib/purchasing/supplier-comparison.repository";

/* =========================================================
 * Types
 * ========================================================= */

export interface ReorderSupplierAdvice {
    productId: string;
    productName: string;
    sku: string | null;

    priority: ReorderPriority;

    availableQuantity: number;
    incomingQuantity: number;
    plannedReorderQuantity: number;

    averageDailySales: number;

    daysOfStockRemaining:
    number | null;

    originalSuggestedQuantity: number;

    recommendedPurchaseQuantity: number;

    recommendedSupplierId:
    string | null;

    recommendedSupplierName:
    string | null;

    recommendedUnitCost:
    number | null;

    currencyCode: string;

    estimatedPurchaseValue: number;

    supplierScore: number | null;

    historicalPerformanceScore:
    number | null;

    onTimeDeliveryRate:
    number | null;

    fillRate:
    number | null;

    actualLeadTimeDays:
    number | null;
    recommendedLeadTimeDays: number;
    priceStabilityScore:
    number | null;

    comparisonConfidence:
    | "high"
    | "medium"
    | "limited"
    | "unavailable";

    supplierCount: number;

    reason: string;

    supplierReasons: string[];

    hasSupplierRecommendation: boolean;
}

export interface ReorderSupplierAdvisorSummary {
    productsToReorder: number;

    productsWithSupplierRecommendation:
    number;

    productsWithoutSupplierRecommendation:
    number;

    highConfidenceRecommendations:
    number;

    mediumConfidenceRecommendations:
    number;

    limitedConfidenceRecommendations:
    number;

    recommendedSuppliers: number;

    estimatedPurchaseBudget: number;
}

export interface ReorderSupplierAdvisorResult {
    summary:
    ReorderSupplierAdvisorSummary;

    recommendations:
    ReorderSupplierAdvice[];
}

/* =========================================================
 * Helpers
 * ========================================================= */

function buildRecommendationReason(
    supplier:
        SupplierComparisonItem | null,
    reorderReason: string,
): string {
    if (!supplier) {
        return (
            `${reorderReason} ` +
            "No eligible supplier recommendation is currently available."
        );
    }

    const parts:
        string[] = [];

    parts.push(
        reorderReason,
    );

    parts.push(
        `${supplier.supplierName} is currently ranked as the best overall supplier.`,
    );

    if (
        supplier.effectiveCost !==
        null
    ) {
        parts.push(
            `Unit cost is ${supplier.currencyCode} ${supplier.effectiveCost.toFixed(
                2,
            )}.`,
        );
    }

    if (
        supplier.historicalPerformanceScore !==
        null
    ) {
        parts.push(
            `Historical performance score is ${supplier.historicalPerformanceScore.toFixed(
                1,
            )}/100.`,
        );
    }

    if (
        supplier.onTimeDeliveryRate !==
        null
    ) {
        parts.push(
            `On-time delivery is ${supplier.onTimeDeliveryRate.toFixed(
                1,
            )}%.`,
        );
    }

    if (
        supplier.fillRate !==
        null
    ) {
        parts.push(
            `Fill rate is ${supplier.fillRate.toFixed(
                1,
            )}%.`,
        );
    }

    parts.push(
        `Recommendation confidence is ${supplier.comparisonConfidence}.`,
    );

    return parts.join(
        " ",
    );
}

/* =========================================================
 * Reorder Supplier Advisor
 * ========================================================= */

export async function getReorderSupplierAdvice():
    Promise<ReorderSupplierAdvisorResult> {
    /*
     * Start with the existing trusted reorder engine.
     */

    const reorder =
        await getReorderIntelligence();

    const reorderRecommendations =
        reorder.recommendations.filter(
            (item) =>
                item.suggestedQuantity >
                0,
        );

    /*
     * Compare suppliers only for products that
     * genuinely require replenishment.
     *
     * This avoids running supplier intelligence
     * for healthy products unnecessarily.
     */

    const comparisonResults =
        await Promise.all(
            reorderRecommendations.map(
                async (item) => {
                    try {
                        const comparison =
                            await compareSuppliersForProduct(
                                item.productId,
                                item.suggestedQuantity,
                            );

                        return {
                            productId:
                                item.productId,

                            comparison,

                            error:
                                null as string | null,
                        };
                    } catch (error) {
                        return {
                            productId:
                                item.productId,

                            comparison:
                                null,

                            error:
                                error instanceof
                                    Error
                                    ? error.message
                                    : "Unable to compare suppliers.",
                        };
                    }
                },
            ),
        );

    const comparisonByProduct =
        new Map(
            comparisonResults.map(
                (result) => [
                    result.productId,
                    result,
                ],
            ),
        );

    const recommendations:
        ReorderSupplierAdvice[] =
        reorderRecommendations.map(
            (item) => {
                const comparisonResult =
                    comparisonByProduct.get(
                        item.productId,
                    );

                const comparison =
                    comparisonResult
                        ?.comparison ??
                    null;

                const bestSupplier =
                    comparison
                        ?.bestSupplier ??
                    null;

                /*
                 * Supplier MOQ can change the final
                 * purchase quantity.
                 *
                 * Example:
                 *
                 * Reorder requirement = 170
                 * Supplier MOQ        = 100
                 *
                 * Final buy quantity  = 200
                 */

                const recommendedPurchaseQuantity =
                    bestSupplier
                        ?.purchaseQuantity ??
                    item.suggestedQuantity;

                const recommendedUnitCost =
                    bestSupplier
                        ?.effectiveCost ??
                    null;

                const estimatedPurchaseValue =
                    recommendedUnitCost !==
                        null
                        ? recommendedPurchaseQuantity *
                        recommendedUnitCost
                        : 0;

                const confidence =
                    bestSupplier
                        ?.comparisonConfidence ??
                    "unavailable";

                const supplierReasons =
                    bestSupplier
                        ?.reasons ??
                    [];

                let reason =
                    buildRecommendationReason(
                        bestSupplier,
                        item.reason,
                    );

                if (
                    comparisonResult
                        ?.error
                ) {
                    reason =
                        `${item.reason} Supplier comparison could not be completed: ${comparisonResult.error}`;
                }

                return {
                    productId:
                        item.productId,

                    productName:
                        item.productName,

                    sku:
                        item.sku,

                    priority:
                        item.priority,

                    availableQuantity:
                        item.quantityAvailable,

                    incomingQuantity:
                        item.incomingQuantity,

                    plannedReorderQuantity:
                        item.plannedReorderQuantity,

                    averageDailySales:
                        item.averageDailySales,

                    daysOfStockRemaining:
                        item.daysOfStockRemaining,

                    originalSuggestedQuantity:
                        item.suggestedQuantity,

                    recommendedPurchaseQuantity,

                    recommendedSupplierId:
                        bestSupplier
                            ?.supplierId ??
                        null,

                    recommendedSupplierName:
                        bestSupplier
                            ?.supplierName ??
                        null,

                    recommendedUnitCost,

                    currencyCode:
                        bestSupplier
                            ?.currencyCode ??
                        "AED",

                    estimatedPurchaseValue,

                    supplierScore:
                        bestSupplier
                            ?.overallScore ??
                        null,

                    historicalPerformanceScore:
                        bestSupplier
                            ?.historicalPerformanceScore ??
                        null,

                    onTimeDeliveryRate:
                        bestSupplier
                            ?.onTimeDeliveryRate ??
                        null,

                    fillRate:
                        bestSupplier
                            ?.fillRate ??
                        null,

                    actualLeadTimeDays:
                        bestSupplier
                            ?.actualLeadTimeDays ??
                        null,
                    recommendedLeadTimeDays:
                        bestSupplier
                            ?.leadTimeDays ??
                        item.leadTimeDays,
                    priceStabilityScore:
                        bestSupplier
                            ?.priceStabilityScore ??
                        null,

                    comparisonConfidence:
                        confidence,

                    supplierCount:
                        comparison
                            ?.suppliers.length ??
                        0,

                    reason,

                    supplierReasons,

                    hasSupplierRecommendation:
                        Boolean(
                            bestSupplier &&
                            bestSupplier
                                .supplierId &&
                            bestSupplier
                                .effectiveCost !==
                            null,
                        ),
                };
            },
        );

    /* =======================================================
     * Summary
     * ======================================================= */

    const withSupplier =
        recommendations.filter(
            (item) =>
                item.hasSupplierRecommendation,
        );

    const recommendedSupplierIds =
        new Set(
            withSupplier
                .map(
                    (item) =>
                        item.recommendedSupplierId,
                )
                .filter(
                    (
                        value,
                    ): value is string =>
                        Boolean(value),
                ),
        );

    return {
        summary: {
            productsToReorder:
                recommendations.length,

            productsWithSupplierRecommendation:
                withSupplier.length,

            productsWithoutSupplierRecommendation:
                recommendations.length -
                withSupplier.length,

            highConfidenceRecommendations:
                recommendations.filter(
                    (item) =>
                        item.comparisonConfidence ===
                        "high",
                ).length,

            mediumConfidenceRecommendations:
                recommendations.filter(
                    (item) =>
                        item.comparisonConfidence ===
                        "medium",
                ).length,

            limitedConfidenceRecommendations:
                recommendations.filter(
                    (item) =>
                        item.comparisonConfidence ===
                        "limited" ||
                        item.comparisonConfidence ===
                        "unavailable",
                ).length,

            recommendedSuppliers:
                recommendedSupplierIds.size,

            estimatedPurchaseBudget:
                withSupplier.reduce(
                    (
                        total,
                        item,
                    ) =>
                        total +
                        item
                            .estimatedPurchaseValue,
                    0,
                ),
        },

        recommendations,
    };
}
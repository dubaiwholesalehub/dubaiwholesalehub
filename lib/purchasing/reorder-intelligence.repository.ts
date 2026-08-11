import { createClient } from "@/lib/supabase/server";
import {
    compareSuppliersForProduct,
} from "@/lib/purchasing/supplier-comparison.repository";
/* =========================================================
 * Reorder Intelligence Types
 * ========================================================= */

export type ReorderPriority =
    | "critical"
    | "high"
    | "medium"
    | "healthy";

export interface ReorderRecommendation {
    productId: string;

    productName: string;
    sku: string | null;

    quantityOnHand: number;
    quantityReserved: number;
    quantityAvailable: number;

    incomingQuantity: number;
    plannedReorderQuantity: number;

    projectedStock: number;

    sold30Days: number;
    sold90Days: number;

    averageDailySales: number;

    daysOfStockRemaining:
    number | null;

    leadTimeDays: number;

    safetyStockDays: number;

    safetyStockQuantity: number;

    reorderPoint: number;

    suggestedQuantity: number;

    moq: number;

    priority: ReorderPriority;

    supplierId: string | null;

    supplierName: string | null;

    supplierCost: number | null;

    currencyCode: string;

    estimatedPurchaseValue: number;

    reason: string;
}

export interface ReorderIntelligenceSummary {
    totalProducts: number;

    criticalProducts: number;
    highPriorityProducts: number;
    mediumPriorityProducts: number;
    healthyProducts: number;

    productsToReorder: number;

    estimatedPurchaseBudget: number;

    suppliersRequired: number;

    potentialStockouts: number;
}

export interface ReorderIntelligenceResult {
    summary:
    ReorderIntelligenceSummary;

    recommendations:
    ReorderRecommendation[];
}

/* =========================================================
 * Helpers
 * ========================================================= */

function toNumber(
    value: unknown,
): number {
    if (
        typeof value === "number"
    ) {
        return Number.isFinite(value)
            ? value
            : 0;
    }

    if (
        typeof value === "string"
    ) {
        const parsed =
            Number(value);

        return Number.isFinite(parsed)
            ? parsed
            : 0;
    }

    return 0;
}

function nullableString(
    value: unknown,
): string | null {
    return typeof value ===
        "string" &&
        value.trim()
        ? value
        : null;
}

function supplierName(
    supplier:
        | {
            company_name: string;
        }
        | {
            company_name: string;
        }[]
        | null,
): string | null {
    if (!supplier) {
        return null;
    }

    if (
        Array.isArray(
            supplier,
        )
    ) {
        return (
            supplier[0]
                ?.company_name ??
            null
        );
    }

    return (
        supplier.company_name ??
        null
    );
}

function roundUpToMultiple(
    quantity: number,
    multiple: number,
): number {
    if (quantity <= 0) {
        return 0;
    }

    const safeMultiple =
        multiple > 0
            ? multiple
            : 1;

    return (
        Math.ceil(
            quantity /
            safeMultiple,
        ) *
        safeMultiple
    );
}

function getDateDaysAgo(
    days: number,
): string {
    const date =
        new Date();

    date.setDate(
        date.getDate() -
        days,
    );

    return date
        .toISOString()
        .slice(0, 10);
}

/* =========================================================
 * Reorder Intelligence
 * ========================================================= */

export async function getReorderIntelligence():
    Promise<ReorderIntelligenceResult> {
    const supabase =
        await createClient();

    const date30 =
        getDateDaysAgo(30);

    const date90 =
        getDateDaysAgo(90);

    const [
        productsResult,
        stockResult,
        salesResult,
        incomingResult,
        draftReorderResult,
        supplierResult,
    ] = await Promise.all([
        /* =====================================================
         * Products
         * ===================================================== */

        supabase
            .from("products")
            .select(`
        id,
        name,
        sku,
        status,
        fulfilment_method,
        procurement_lead_time_days,
        minimum_stock_quantity,
        reorder_quantity,
        safety_stock_days,
        moq
      `)
            .neq(
                "status",
                "archived",
            ),

        /* =====================================================
         * Current warehouse stock
         * ===================================================== */

        supabase
            .from("warehouse_stock")
            .select(`
        product_id,
        quantity_on_hand,
        quantity_reserved,
        quantity_available
      `),

        /* =====================================================
         * Actual sales issues during last 90 days
         * ===================================================== */

        supabase
            .from(
                "inventory_transaction_items",
            )
            .select(`
        product_id,
        quantity_change,

        transaction:inventory_transactions!inner (
          transaction_date,
          transaction_type,
          status
        )
      `)
            .eq(
                "transaction.status",
                "posted",
            )
            .eq(
                "transaction.transaction_type",
                "sales_issue",
            )
            .gte(
                "transaction.transaction_date",
                date90,
            ),

        /* =====================================================
         * Incoming Purchase Order stock
         * ===================================================== */

        supabase
            .from(
                "purchase_order_items",
            )
            .select(`
        product_id,
        ordered_quantity,
        received_quantity,

        purchase_order:purchase_orders!inner (
          status
        )
      `)
            .in(
                "purchase_order.status",
                [
                    "approved",
                    "sent",
                    "partially_received",
                ],
            ),

        /* =====================================================
* Draft Reorder Purchase Order stock
*
* Draft reorder POs are not yet physical incoming
* inventory, but they are already planned procurement.
*
* Including them prevents duplicate PO generation while
* still allowing additional purchasing if the draft
* quantity does not fully cover the shortage.
* ===================================================== */

        supabase
            .from(
                "purchase_order_items",
            )
            .select(`
    product_id,
    ordered_quantity,
    received_quantity,

    purchase_order:purchase_orders!inner (
      source,
      status
    )
  `)
            .eq(
                "purchase_order.source",
                "reorder",
            )
            .eq(
                "purchase_order.status",
                "draft",
            ),
        /* =====================================================
         * Supplier intelligence
         * ===================================================== */

        supabase
            .from(
                "product_suppliers",
            )
            .select(`
        product_id,
        supplier_id,
        cost_price,
        currency_code,
        moq,
        lead_time_days,
        priority,
        last_purchase_price,
        is_preferred,
        is_active,

        supplier:suppliers (
          id,
          company_name,
          is_active
        )
      `)
            .eq(
                "is_active",
                true,
            )
            .order(
                "is_preferred",
                {
                    ascending: false,
                },
            )
            .order(
                "priority",
                {
                    ascending: true,
                },
            ),
    ]);

    const firstError =
        productsResult.error ??
        stockResult.error ??
        salesResult.error ??
        incomingResult.error ??
        supplierResult.error;

    if (firstError) {
        throw new Error(
            `Unable to load reorder intelligence: ${firstError.message}`,
        );
    }

    /* =======================================================
     * Aggregate Stock
     * ======================================================= */

    const stockByProduct =
        new Map<
            string,
            {
                onHand: number;
                reserved: number;
                available: number;
            }
        >();

    for (
        const row of
        stockResult.data ?? []
    ) {
        const current =
            stockByProduct.get(
                row.product_id,
            ) ?? {
                onHand: 0,
                reserved: 0,
                available: 0,
            };

        current.onHand +=
            toNumber(
                row.quantity_on_hand,
            );

        current.reserved +=
            toNumber(
                row.quantity_reserved,
            );

        current.available +=
            toNumber(
                row.quantity_available,
            );

        stockByProduct.set(
            row.product_id,
            current,
        );
    }

    /* =======================================================
     * Aggregate Sales
     * ======================================================= */

    const salesByProduct =
        new Map<
            string,
            {
                sold30Days: number;
                sold90Days: number;
            }
        >();

    for (
        const row of
        salesResult.data ?? []
    ) {
        const transaction =
            row.transaction;

        if (!transaction) {
            continue;
        }

        const transactionDate =
            transaction
                .transaction_date;

        const quantity =
            Math.abs(
                toNumber(
                    row.quantity_change,
                ),
            );

        const current =
            salesByProduct.get(
                row.product_id,
            ) ?? {
                sold30Days: 0,
                sold90Days: 0,
            };

        current.sold90Days +=
            quantity;

        if (
            transactionDate >=
            date30
        ) {
            current.sold30Days +=
                quantity;
        }

        salesByProduct.set(
            row.product_id,
            current,
        );
    }

    /* =======================================================
     * Aggregate Incoming Stock
     * ======================================================= */

    const incomingByProduct =
        new Map<
            string,
            number
        >();

    for (
        const row of
        incomingResult.data ?? []
    ) {
        const ordered =
            toNumber(
                row.ordered_quantity,
            );

        const received =
            toNumber(
                row.received_quantity,
            );

        const remaining =
            Math.max(
                ordered -
                received,
                0,
            );

        if (!row.product_id) {
            continue;
        }

        incomingByProduct.set(
            row.product_id,
            (
                incomingByProduct.get(
                    row.product_id,
                ) ??
                0
            ) +
            remaining,
        );
    }

    /* =======================================================
 * Aggregate Draft Reorder Procurement
 * ======================================================= */

    const draftReorderByProduct =
        new Map<
            string,
            number
        >();

    for (
        const row of
        draftReorderResult.data ?? []
    ) {
        if (!row.product_id) {
            continue;
        }

        const ordered =
            toNumber(
                row.ordered_quantity,
            );

        const received =
            toNumber(
                row.received_quantity,
            );

        const remaining =
            Math.max(
                ordered -
                received,
                0,
            );

        draftReorderByProduct.set(
            row.product_id,
            (
                draftReorderByProduct.get(
                    row.product_id,
                ) ??
                0
            ) +
            remaining,
        );
    }

    /* =======================================================
     * Select Supplier Per Product
     * ======================================================= */

    const supplierByProduct =
        new Map<
            string,
            {
                supplierId: string;
                supplierName: string | null;
                cost: number | null;
                currencyCode: string;
                moq: number | null;
                leadTimeDays: number | null;
            }
        >();

    for (
        const mapping of
        supplierResult.data ?? []
    ) {
        if (
            supplierByProduct.has(
                mapping.product_id,
            )
        ) {
            continue;
        }

        if (
            mapping.supplier &&
            !Array.isArray(
                mapping.supplier,
            ) &&
            mapping.supplier
                .is_active ===
            false
        ) {
            continue;
        }

        const cost =
            mapping.last_purchase_price !==
                null
                ? toNumber(
                    mapping.last_purchase_price,
                )
                : mapping.cost_price !==
                    null
                    ? toNumber(
                        mapping.cost_price,
                    )
                    : null;

        supplierByProduct.set(
            mapping.product_id,
            {
                supplierId:
                    mapping.supplier_id,

                supplierName:
                    supplierName(
                        mapping.supplier,
                    ),

                cost,

                currencyCode:
                    mapping.currency_code ||
                    "AED",

                moq:
                    mapping.moq !==
                        null
                        ? toNumber(
                            mapping.moq,
                        )
                        : null,

                leadTimeDays:
                    mapping.lead_time_days !==
                        null
                        ? toNumber(
                            mapping.lead_time_days,
                        )
                        : null,
            },
        );
    }

    /* =======================================================
     * Build Recommendations
     * ======================================================= */

    const recommendations:
        ReorderRecommendation[] =
        [];

    for (
        const product of
        productsResult.data ??
        []
    ) {
        if (
            product
                .fulfilment_method ===
            "service"
        ) {
            continue;
        }

        const stock =
            stockByProduct.get(
                product.id,
            ) ?? {
                onHand: 0,
                reserved: 0,
                available: 0,
            };

        const sales =
            salesByProduct.get(
                product.id,
            ) ?? {
                sold30Days: 0,
                sold90Days: 0,
            };

        const incomingQuantity =
            incomingByProduct.get(
                product.id,
            ) ??
            0;
        const plannedReorderQuantity =
            draftReorderByProduct.get(
                product.id,
            ) ??
            0;
        const fallbackSupplier =
            supplierByProduct.get(
                product.id,
            );

        /*
         * Sales velocity:
         *
         * Prefer the latest 30 days when sales
         * exist. Otherwise use a 90-day average.
         */
        const averageDailySales =
            sales.sold30Days >
                0
                ? sales.sold30Days /
                30
                : sales.sold90Days >
                    0
                    ? sales.sold90Days /
                    90
                    : 0;

        const productLeadTime =
            toNumber(
                product
                    .procurement_lead_time_days,
            );

        let selectedSupplier =
            fallbackSupplier;

        let leadTimeDays =
            selectedSupplier
                ?.leadTimeDays !==
                null &&
                selectedSupplier
                    ?.leadTimeDays !==
                undefined
                ? selectedSupplier.leadTimeDays
                : productLeadTime;
        /*
 * Product-specific safety stock policy.
 *
 * Defaults to 7 days at database level,
 * but can now be configured per product.
 */
        const safetyStockDays =
            Math.max(
                toNumber(
                    product.safety_stock_days,
                ),
                0,
            );

        const safetyStockQuantity =
            averageDailySales *
            safetyStockDays;

        const minimumStockQuantity =
            Math.max(
                toNumber(
                    product.minimum_stock_quantity,
                ),
                0,
            );

        const fallbackReorderQuantity =
            Math.max(
                toNumber(
                    product.reorder_quantity,
                ),
                0,
            );

        /*
         * Reorder point =
         * expected demand during supplier
         * lead time + safety stock.
         */
        let reorderPoint =
            averageDailySales *
            leadTimeDays +
            safetyStockQuantity;
        /*
         * Stock expected to be available once
         * currently open POs arrive.
         */
        const projectedStock =
            stock.available +
            incomingQuantity +
            plannedReorderQuantity;

        let rawSuggestedQuantity =
            Math.max(
                reorderPoint -
                projectedStock,
                0,
            );

        /*
         * Minimum-stock fallback.
         *
         * This handles products that do not yet have
         * enough sales history for demand forecasting.
         *
         * Incoming stock and planned reorder POs are
         * already included in projectedStock, so this
         * does not blindly generate duplicate demand.
         */
        const minimumStockTriggered =
            minimumStockQuantity > 0 &&
            projectedStock <=
            minimumStockQuantity;

        if (
            averageDailySales === 0 &&
            minimumStockTriggered
        ) {
            rawSuggestedQuantity =
                Math.max(
                    fallbackReorderQuantity,
                    minimumStockQuantity -
                    projectedStock,
                    0,
                );
        }

        /*
 * =======================================================
 * Smart Supplier Selection
 *
 * Only run full Supplier Comparison for products that
 * actually require replenishment.
 *
 * The existing preferred / priority supplier remains
 * the fallback if comparison cannot produce a usable
 * supplier.
 * =======================================================
 */

        if (
            rawSuggestedQuantity >
            0 ||
            minimumStockTriggered
        ) {
            try {
                const comparison =
                    await compareSuppliersForProduct(
                        product.id,
                        Math.max(
                            rawSuggestedQuantity,
                            1,
                        ),
                    );

                /*
                 * Automatic PO generation requires a supplier
                 * with a usable purchase cost.
                 *
                 * Comparison results are already sorted by
                 * overall supplier ranking, therefore the first
                 * priced supplier is the strongest purchaseable
                 * recommendation.
                 */

                const bestPurchaseableSupplier =
                    comparison.suppliers.find(
                        (candidate) =>
                            candidate.effectiveCost !==
                            null &&
                            candidate.effectiveCost >=
                            0,
                    );

                if (
                    bestPurchaseableSupplier
                ) {
                    selectedSupplier = {
                        supplierId:
                            bestPurchaseableSupplier.supplierId,

                        supplierName:
                            bestPurchaseableSupplier.supplierName,

                        cost:
                            bestPurchaseableSupplier.effectiveCost,

                        currencyCode:
                            bestPurchaseableSupplier.currencyCode,

                        moq:
                            bestPurchaseableSupplier.moq,

                        leadTimeDays:
                            bestPurchaseableSupplier.leadTimeDays,
                    };

                    /*
                     * Supplier selection can change lead time,
                     * therefore demand during lead time must be
                     * recalculated using the selected supplier.
                     */

                    leadTimeDays =
                        bestPurchaseableSupplier.leadTimeDays >
                            0
                            ? bestPurchaseableSupplier.leadTimeDays
                            : productLeadTime;

                    reorderPoint =
                        averageDailySales *
                        leadTimeDays +
                        safetyStockQuantity;

                    rawSuggestedQuantity =
                        Math.max(
                            reorderPoint -
                            projectedStock,
                            0,
                        );

                    /*
                     * No-sales products continue using the
                     * minimum-stock policy.
                     */

                    if (
                        averageDailySales ===
                        0 &&
                        minimumStockTriggered
                    ) {
                        rawSuggestedQuantity =
                            Math.max(
                                fallbackReorderQuantity,
                                minimumStockQuantity -
                                projectedStock,
                                0,
                            );
                    }
                }
            } catch {
                /*
                 * Supplier intelligence must never prevent
                 * Reorder Intelligence itself from loading.
                 *
                 * Preserve the existing preferred / priority
                 * supplier when comparison is unavailable.
                 */
            }
        }

        const productMoq =
            toNumber(
                product.moq,
            );

        const effectiveMoq =
            selectedSupplier?.moq &&
                selectedSupplier.moq >
                0
                ? selectedSupplier.moq
                : productMoq >
                    0
                    ? productMoq
                    : 1;

        const suggestedQuantity =
            roundUpToMultiple(
                rawSuggestedQuantity,
                effectiveMoq,
            );

        const daysOfStockRemaining =
            averageDailySales >
                0
                ? stock.available /
                averageDailySales
                : null;

        let priority:
            ReorderPriority =
            "healthy";

        /*
         * Critical:
         * current available stock will run out
         * before replenishment can arrive.
         */
        if (
            (
                averageDailySales > 0 &&
                stock.available <=
                averageDailySales *
                leadTimeDays
            ) ||
            (
                averageDailySales === 0 &&
                minimumStockTriggered &&
                stock.available <= 0
            )
        ) {
            priority =
                "critical";
        }

        /*
         * High:
         * stock is below reorder point even
         * after considering open PO stock.
         */
        else if (
            projectedStock <
            reorderPoint ||
            (
                averageDailySales === 0 &&
                minimumStockTriggered
            )
        ) {
            priority =
                "high";
        }

        /*
         * Medium:
         * less than 30 days of available stock.
         */
        else if (
            daysOfStockRemaining !==
            null &&
            daysOfStockRemaining <=
            30
        ) {
            priority =
                "medium";
        }

        const supplierCost =
            selectedSupplier?.cost ??
            null;

        const estimatedPurchaseValue =
            supplierCost !== null
                ? suggestedQuantity *
                supplierCost
                : 0;

        let reason =
            "Current stock coverage is sufficient.";

        if (
            averageDailySales === 0 &&
            minimumStockTriggered
        ) {
            reason =
                `No recent sales velocity is available. Projected stock of ${projectedStock} is at or below the configured minimum stock level of ${minimumStockQuantity}, so the minimum-stock fallback policy recommends replenishment.`;
        } else if (
            averageDailySales === 0
        ) {
            reason =
                minimumStockQuantity > 0
                    ? `No recent sales velocity is available. Projected stock remains above the configured minimum stock level of ${minimumStockQuantity}.`
                    : "No recent sales velocity is available and no minimum stock policy has been configured.";
        } else if (
            priority ===
            "critical"
        ) {
            reason =
                `Available stock may finish before the ${leadTimeDays}-day replenishment lead time.`;
        } else if (
            priority ===
            "high"
        ) {
            reason =
                "Projected stock after incoming and planned reorder Purchase Orders is below the calculated reorder point.";
        } else if (
            priority ===
            "medium"
        ) {
            reason =
                "Stock coverage is below 30 days and should be monitored.";
        }

        recommendations.push({
            productId:
                product.id,

            productName:
                product.name,

            sku:
                nullableString(
                    product.sku,
                ),

            quantityOnHand:
                stock.onHand,

            quantityReserved:
                stock.reserved,

            quantityAvailable:
                stock.available,

            incomingQuantity,
            plannedReorderQuantity,

            projectedStock,

            sold30Days:
                sales.sold30Days,

            sold90Days:
                sales.sold90Days,

            averageDailySales,

            daysOfStockRemaining,

            leadTimeDays,

            safetyStockDays,

            safetyStockQuantity,

            reorderPoint,

            suggestedQuantity,

            moq:
                effectiveMoq,

            priority,

            supplierId:
                selectedSupplier
                    ?.supplierId ??
                null,

            supplierName:
                selectedSupplier
                    ?.supplierName ??
                null,

            supplierCost,

            currencyCode:
                selectedSupplier
                    ?.currencyCode ??
                "AED",

            estimatedPurchaseValue,

            reason,
        });
    }

    /* =======================================================
     * Sort Highest Risk First
     * ======================================================= */

    const priorityWeight:
        Record<
            ReorderPriority,
            number
        > = {
        critical: 1,
        high: 2,
        medium: 3,
        healthy: 4,
    };

    recommendations.sort(
        (
            first,
            second,
        ) => {
            const priorityDifference =
                priorityWeight[
                first.priority
                ] -
                priorityWeight[
                second.priority
                ];

            if (
                priorityDifference !==
                0
            ) {
                return priorityDifference;
            }

            return (
                second
                    .estimatedPurchaseValue -
                first
                    .estimatedPurchaseValue
            );
        },
    );

    /* =======================================================
     * Summary
     * ======================================================= */

    const productsToReorder =
        recommendations.filter(
            (item) =>
                item.suggestedQuantity >
                0,
        );

    const suppliersRequired =
        new Set(
            productsToReorder
                .map(
                    (item) =>
                        item.supplierId,
                )
                .filter(
                    (
                        value,
                    ): value is string =>
                        Boolean(value),
                ),
        ).size;

    return {
        summary: {
            totalProducts:
                recommendations.length,

            criticalProducts:
                recommendations.filter(
                    (item) =>
                        item.priority ===
                        "critical",
                ).length,

            highPriorityProducts:
                recommendations.filter(
                    (item) =>
                        item.priority ===
                        "high",
                ).length,

            mediumPriorityProducts:
                recommendations.filter(
                    (item) =>
                        item.priority ===
                        "medium",
                ).length,

            healthyProducts:
                recommendations.filter(
                    (item) =>
                        item.priority ===
                        "healthy",
                ).length,

            productsToReorder:
                productsToReorder.length,

            estimatedPurchaseBudget:
                productsToReorder.reduce(
                    (
                        total,
                        item,
                    ) =>
                        total +
                        item
                            .estimatedPurchaseValue,
                    0,
                ),

            suppliersRequired,

            potentialStockouts:
                recommendations.filter(
                    (item) =>
                        item.priority ===
                        "critical",
                ).length,
        },

        recommendations,
    };
}
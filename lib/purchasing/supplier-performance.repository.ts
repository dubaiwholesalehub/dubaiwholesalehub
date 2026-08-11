import { createClient } from "@/lib/supabase/server";
import {
    getSupplierPriceIntelligence,
} from "@/lib/purchasing/supplier-price-intelligence.repository";

/* =========================================================
 * Types
 * ========================================================= */

export interface SupplierPerformanceMetrics {
    supplierId: string;
    supplierName: string;

    overallScore: number;

    deliveryScore: number;
    leadTimeScore: number;
    fillRateScore: number;
    priceStabilityScore: number;

    qualityScore: number;

    onTimeDeliveryRate: number;

    averagePromisedLeadTime: number | null;
    averageActualLeadTime: number | null;

    leadTimeVariance: number | null;

    orderedQuantity: number;
    receivedQuantity: number;

    acceptedQuantity: number;
    rejectedQuantity: number;
    damagedQuantity: number;

    acceptanceRate: number;
    rejectionRate: number;
    damageRate: number;

    completedGoodsReceipts: number;

    fillRate: number;

    averagePriceVariance: number | null;

    completedPurchaseOrders: number;
    completedOrdersWithDeliveryData: number;
    onTimePurchaseOrders: number;
    latePurchaseOrders: number;

    overduePurchaseOrders: number;
}

export interface SupplierPerformanceResult {
    metrics: SupplierPerformanceMetrics;
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

function round(
    value: number,
): number {
    return (
        Math.round(
            value * 100,
        ) / 100
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

function dateOnly(
    value: string,
): string {
    return value.slice(
        0,
        10,
    );
}

function daysBetween(
    startDate: string,
    endDate: string,
): number {
    const start =
        new Date(
            `${dateOnly(
                startDate,
            )}T00:00:00Z`,
        );

    const end =
        new Date(
            `${dateOnly(
                endDate,
            )}T00:00:00Z`,
        );

    if (
        Number.isNaN(
            start.getTime(),
        ) ||
        Number.isNaN(
            end.getTime(),
        )
    ) {
        return 0;
    }

    return Math.max(
        Math.round(
            (
                end.getTime() -
                start.getTime()
            ) /
            86_400_000,
        ),
        0,
    );
}

/* =========================================================
 * Supplier Performance
 * ========================================================= */

export async function getSupplierPerformance(
    supplierId: string,
): Promise<SupplierPerformanceResult> {
    const id =
        supplierId.trim();

    if (!id) {
        throw new Error(
            "Supplier ID is required.",
        );
    }

    const supabase =
        await createClient();
    const priceIntelligencePromise =
        getSupplierPriceIntelligence(
            id,
        );

    const [
        supplierResult,
        purchaseOrdersResult,
        purchaseOrderItemsResult,
        goodsReceiptsResult,
    ] = await Promise.all([
        /* =====================================================
         * Supplier
         * ===================================================== */

        supabase
            .from("suppliers")
            .select(`
        id,
        company_name
      `)
            .eq(
                "id",
                id,
            )
            .maybeSingle(),

        /* =====================================================
         * Purchase Orders
         * ===================================================== */

        supabase
            .from(
                "purchase_orders",
            )
            .select(`
        id,
        status,
        order_date,
        expected_delivery_date,
        lead_time_days
      `)
            .eq(
                "supplier_id",
                id,
            ),

        /* =====================================================
         * Purchase Order Items
         * ===================================================== */

        supabase
            .from(
                "purchase_order_items",
            )
            .select(`
        purchase_order_id,
        product_id,
        ordered_quantity,
        received_quantity,
        unit_price,

        purchase_order:purchase_orders!inner (
          supplier_id
        )
      `)
            .eq(
                "purchase_order.supplier_id",
                id,
            ),

        /* =====================================================
         * Goods Receipts
         * ===================================================== */

        supabase
            .from(
                "goods_receipts",
            )
            .select(`
        id,
        purchase_order_id,
        status,
        received_date,
        created_at
      `)
            .eq(
                "supplier_id",
                id,
            ),
    ]);

    const firstError =
        supplierResult.error ??
        purchaseOrdersResult.error ??
        purchaseOrderItemsResult.error ??
        goodsReceiptsResult.error;
    const priceIntelligence =
        await priceIntelligencePromise;

    if (firstError) {
        throw new Error(
            `Unable to load supplier performance: ${firstError.message}`,
        );
    }

    const supplier =
        supplierResult.data;

    if (!supplier) {
        throw new Error(
            "Supplier not found.",
        );
    }

    const purchaseOrders =
        purchaseOrdersResult.data ??
        [];

    const purchaseOrderItems =
        purchaseOrderItemsResult.data ??
        [];

    const goodsReceipts =
        goodsReceiptsResult.data ??
        [];

    /*
* Only completed Goods Receipts count toward
* supplier quality performance.
*
* Draft receiving documents must never affect
* supplier scoring.
*/

    const completedGoodsReceiptIds =
        goodsReceipts
            .filter(
                (receipt) =>
                    receipt.status ===
                    "completed",
            )
            .map(
                (receipt) =>
                    receipt.id,
            );

    const completedGoodsReceipts =
        completedGoodsReceiptIds.length;

    let completedGoodsReceiptItems: {
        goods_receipt_id: string;
        accepted_quantity: number | null;
        rejected_quantity: number | null;
        damaged_quantity: number | null;
    }[] = [];

    if (
        completedGoodsReceiptIds.length >
        0
    ) {
        const {
            data,
            error,
        } = await supabase
            .from(
                "goods_receipt_items",
            )
            .select(`
            goods_receipt_id,
            accepted_quantity,
            rejected_quantity,
            damaged_quantity
        `)
            .in(
                "goods_receipt_id",
                completedGoodsReceiptIds,
            );

        if (error) {
            throw new Error(
                `Unable to load Goods Receipt quality data: ${error.message}`,
            );
        }

        completedGoodsReceiptItems =
            data ?? [];
    }

    const today =
        new Date()
            .toISOString()
            .slice(
                0,
                10,
            );

    /* =======================================================
     * Goods Receipt Completion Date By PO
     *
     * If a PO has multiple completed receipts, use the latest
     * completed receipt as the date the PO was fully received.
     * ======================================================= */

    const completedReceiptDateByPo =
        new Map<
            string,
            string
        >();

    for (
        const receipt of
        goodsReceipts
    ) {
        if (
            receipt.status !==
            "completed"
        ) {
            continue;
        }

        if (
            !receipt.purchase_order_id
        ) {
            continue;
        }

        const completionDate =
            receipt.received_date ??
            dateOnly(
                receipt.created_at,
            );

        const existing =
            completedReceiptDateByPo.get(
                receipt.purchase_order_id,
            );

        if (
            !existing ||
            completionDate >
            existing
        ) {
            completedReceiptDateByPo.set(
                receipt.purchase_order_id,
                completionDate,
            );
        }
    }

    /* =======================================================
     * Purchase Order Delivery Performance
     * ======================================================= */

    let completedPurchaseOrders =
        0;

    let completedOrdersWithDeliveryData =
        0;

    let onTimePurchaseOrders =
        0;

    let latePurchaseOrders =
        0;

    let overduePurchaseOrders =
        0;

    let promisedLeadTimeTotal =
        0;

    let promisedLeadTimeCount =
        0;

    let actualLeadTimeTotal =
        0;

    let actualLeadTimeCount =
        0;

    let leadTimeVarianceTotal =
        0;

    let leadTimeVarianceCount =
        0;

    const openStatuses =
        new Set([
            "draft",
            "approved",
            "sent",
            "partially_received",
        ]);

    for (
        const po of
        purchaseOrders
    ) {
        if (
            po.lead_time_days !==
            null &&
            po.lead_time_days >=
            0
        ) {
            promisedLeadTimeTotal +=
                po.lead_time_days;

            promisedLeadTimeCount +=
                1;
        }

        if (
            po.status ===
            "received"
        ) {
            completedPurchaseOrders +=
                1;

            const completedDate =
                completedReceiptDateByPo.get(
                    po.id,
                );

            if (
                completedDate
            ) {
                completedOrdersWithDeliveryData +=
                    1;

                const actualLeadTime =
                    daysBetween(
                        po.order_date,
                        completedDate,
                    );

                actualLeadTimeTotal +=
                    actualLeadTime;

                actualLeadTimeCount +=
                    1;

                if (
                    po.lead_time_days !==
                    null
                ) {
                    leadTimeVarianceTotal +=
                        actualLeadTime -
                        po.lead_time_days;

                    leadTimeVarianceCount +=
                        1;
                }

                if (
                    po.expected_delivery_date
                ) {
                    if (
                        completedDate <=
                        po.expected_delivery_date
                    ) {
                        onTimePurchaseOrders +=
                            1;
                    } else {
                        latePurchaseOrders +=
                            1;
                    }
                }
            }
        }

        if (
            po.expected_delivery_date &&
            po.expected_delivery_date <
            today &&
            openStatuses.has(
                String(
                    po.status,
                ),
            )
        ) {
            overduePurchaseOrders +=
                1;
        }
    }

    const deliveryEvaluatedOrders =
        onTimePurchaseOrders +
        latePurchaseOrders;

    const onTimeDeliveryRate =
        deliveryEvaluatedOrders >
            0
            ? (
                onTimePurchaseOrders /
                deliveryEvaluatedOrders
            ) *
            100
            : 0;

    const deliveryScore =
        deliveryEvaluatedOrders >
            0
            ? clampScore(
                onTimeDeliveryRate,
            )
            : 0;

    /* =======================================================
     * Quantity / Fill Rate
     * ======================================================= */

    let orderedQuantity =
        0;

    let receivedQuantity =
        0;

    for (
        const item of
        purchaseOrderItems
    ) {
        orderedQuantity +=
            toNumber(
                item.ordered_quantity,
            );

        receivedQuantity +=
            toNumber(
                item.received_quantity,
            );
    }

    const fillRate =
        orderedQuantity >
            0
            ? (
                receivedQuantity /
                orderedQuantity
            ) *
            100
            : 0;

    const fillRateScore =
        clampScore(
            fillRate,
        );

    /* =======================================================
* Goods Receipt Quality
*
* Quality performance uses completed GRNs only.
*
* Accepted + Rejected + Damaged represents the quantity
* that has actually gone through completed receiving.
* ======================================================= */

    let acceptedQuantity =
        0;

    let rejectedQuantity =
        0;

    let damagedQuantity =
        0;

    for (
        const item of
        completedGoodsReceiptItems
    ) {
        acceptedQuantity +=
            toNumber(
                item.accepted_quantity,
            );

        rejectedQuantity +=
            toNumber(
                item.rejected_quantity,
            );

        damagedQuantity +=
            toNumber(
                item.damaged_quantity,
            );
    }

    const inspectedQuantity =
        acceptedQuantity +
        rejectedQuantity +
        damagedQuantity;

    const acceptanceRate =
        inspectedQuantity >
            0
            ? (
                acceptedQuantity /
                inspectedQuantity
            ) *
            100
            : 0;

    const rejectionRate =
        inspectedQuantity >
            0
            ? (
                rejectedQuantity /
                inspectedQuantity
            ) *
            100
            : 0;

    const damageRate =
        inspectedQuantity >
            0
            ? (
                damagedQuantity /
                inspectedQuantity
            ) *
            100
            : 0;

    /*
     * Quality Score
     *
     * 100 = everything accepted.
     *
     * Rejected and damaged quantities reduce the
     * successful acceptance percentage naturally.
     */

    const qualityScore =
        inspectedQuantity >
            0
            ? clampScore(
                acceptanceRate,
            )
            : 0;
    /* =======================================================
     * Lead-Time Performance
     * ======================================================= */

    const averagePromisedLeadTime =
        promisedLeadTimeCount >
            0
            ? round(
                promisedLeadTimeTotal /
                promisedLeadTimeCount,
            )
            : null;

    const averageActualLeadTime =
        actualLeadTimeCount >
            0
            ? round(
                actualLeadTimeTotal /
                actualLeadTimeCount,
            )
            : null;

    const leadTimeVariance =
        leadTimeVarianceCount >
            0
            ? round(
                leadTimeVarianceTotal /
                leadTimeVarianceCount,
            )
            : null;

    /*
     * Lead-Time Score
     *
     * Variance <= 0:
     * Supplier meets or beats promised lead time.
     *
     * Every average day late reduces score by 10 points.
     */

    const leadTimeScore =
        leadTimeVariance ===
            null
            ? 0
            : leadTimeVariance <=
                0
                ? 100
                : clampScore(
                    100 -
                    leadTimeVariance *
                    10,
                );

    /* =======================================================
     * Price Stability
     *
     * Real price-history scoring comes in v3.
     * Do NOT award a fake 100 score when evidence is absent.
     * ======================================================= */

    const priceStabilityScore =
        priceIntelligence.summary
            .overallPriceStabilityScore ??
        0;

    const averagePriceVariance =
        priceIntelligence.summary
            .averagePriceVolatilityPercent;

    /* =======================================================
     * Overall Supplier Score
     *
     * Only evidence-backed metrics are used.
     *
     * Delivery   30%
     * Lead Time  15%
     * Fill Rate  25%
     * Receiving Quality 20%
     * Price Stability 10%
     *
     * Price stability will be introduced once v3 calculates
     * historical product-level price movement.
     * ======================================================= */

    const availableScores: {
        score: number;
        weight: number;
    }[] = [];

    if (
        deliveryEvaluatedOrders >
        0
    ) {
        availableScores.push({
            score:
                deliveryScore,

            weight:
                0.30,
        });
    }

    if (
        leadTimeVariance !==
        null
    ) {
        availableScores.push({
            score:
                leadTimeScore,

            weight:
                0.15,
        });
    }

    if (
        orderedQuantity >
        0
    ) {
        availableScores.push({
            score:
                fillRateScore,

            weight:
                0.25,
        });
    }

    if (
        inspectedQuantity >
        0
    ) {
        availableScores.push({
            score:
                qualityScore,

            weight:
                0.20,
        });
    }

    if (
        priceIntelligence.summary
            .overallPriceStabilityScore !==
        null
    ) {
        availableScores.push({
            score:
                priceStabilityScore,

            weight:
                0.10,
        });
    }

    const totalAvailableWeight =
        availableScores.reduce(
            (
                total,
                item,
            ) =>
                total +
                item.weight,
            0,
        );

    const overallScore =
        totalAvailableWeight >
            0
            ? round(
                availableScores.reduce(
                    (
                        total,
                        item,
                    ) =>
                        total +
                        item.score *
                        item.weight,
                    0,
                ) /
                totalAvailableWeight,
            )
            : 0;

    return {
        metrics: {
            supplierId:
                id,

            supplierName:
                supplier.company_name,

            overallScore,

            deliveryScore:
                round(
                    deliveryScore,
                ),

            leadTimeScore:
                round(
                    leadTimeScore,
                ),

            fillRateScore:
                round(
                    fillRateScore,
                ),

            priceStabilityScore:
                round(
                    priceStabilityScore,
                ),

            qualityScore:
                round(
                    qualityScore,
                ),

            onTimeDeliveryRate:
                round(
                    onTimeDeliveryRate,
                ),

            averagePromisedLeadTime,

            averageActualLeadTime,

            leadTimeVariance,

            orderedQuantity:
                round(
                    orderedQuantity,
                ),

            receivedQuantity:
                round(
                    receivedQuantity,
                ),

            acceptedQuantity:
                round(
                    acceptedQuantity,
                ),

            rejectedQuantity:
                round(
                    rejectedQuantity,
                ),

            damagedQuantity:
                round(
                    damagedQuantity,
                ),

            acceptanceRate:
                round(
                    acceptanceRate,
                ),

            rejectionRate:
                round(
                    rejectionRate,
                ),

            damageRate:
                round(
                    damageRate,
                ),

            completedGoodsReceipts,

            fillRate:
                round(
                    fillRate,
                ),

            averagePriceVariance,

            completedPurchaseOrders,

            completedOrdersWithDeliveryData,

            onTimePurchaseOrders,

            latePurchaseOrders,

            overduePurchaseOrders,
        },
    };
}
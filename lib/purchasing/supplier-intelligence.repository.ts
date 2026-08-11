import { createClient } from "@/lib/supabase/server";

/* =========================================================
 * Types
 * ========================================================= */

export interface SupplierIntelligenceSummary {
    supplierId: string;
    supplierName: string;

    totalPurchaseOrders: number;
    openPurchaseOrders: number;
    receivedPurchaseOrders: number;
    cancelledPurchaseOrders: number;

    totalPurchaseValue: number;
    openPurchaseValue: number;
    averageOrderValue: number;

    partiallyReceivedOrders: number;
    overdueOrders: number;

    totalGoodsReceipts: number;
    completedGoodsReceipts: number;
    pendingGoodsReceipts: number;

    productsSupplied: number;

    lastPurchaseDate: string | null;

    averageLeadTimeDays: number | null;

    preferredProductMappings: number;
}

export interface SupplierMonthlySpend {
    month: string;
    purchaseValue: number;
    orderCount: number;
}

export interface SupplierProductItem {
    productId: string;
    productName: string;
    sku: string | null;

    purchaseOrderCount: number;

    totalOrderedQuantity: number;
    totalReceivedQuantity: number;

    totalPurchaseValue: number;

    averageUnitPrice: number;

    lastPurchaseDate: string | null;
}

export interface SupplierIntelligenceResult {
    summary: SupplierIntelligenceSummary;

    monthlySpend: SupplierMonthlySpend[];

    topProducts: SupplierProductItem[];
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

function getProductName(
    product:
        | {
            name: string;
            sku: string | null;
        }
        | {
            name: string;
            sku: string | null;
        }[]
        | null,
): {
    name: string;
    sku: string | null;
} {
    if (!product) {
        return {
            name:
                "Unknown product",
            sku:
                null,
        };
    }

    if (
        Array.isArray(
            product,
        )
    ) {
        return {
            name:
                product[0]
                    ?.name ??
                "Unknown product",

            sku:
                product[0]
                    ?.sku ??
                null,
        };
    }

    return {
        name:
            product.name,

        sku:
            product.sku,
    };
}

function monthKey(
    value: string,
): string {
    return value.slice(
        0,
        7,
    );
}

/* =========================================================
 * Supplier Intelligence
 * ========================================================= */

export async function getSupplierIntelligence(
    supplierId: string,
): Promise<SupplierIntelligenceResult> {
    const id =
        supplierId.trim();

    if (!id) {
        throw new Error(
            "Supplier ID is required.",
        );
    }

    const supabase =
        await createClient();

    const today =
        new Date()
            .toISOString()
            .slice(0, 10);

    const [
        supplierResult,
        purchaseOrdersResult,
        purchaseOrderItemsResult,
        goodsReceiptsResult,
        productMappingsResult,
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
        supplier_id,
        status,
        order_date,
        expected_delivery_date,
        total_amount,
        lead_time_days,

        suppliers!purchase_orders_supplier_id_fkey (
          company_name
        )
      `)
            .eq(
                "supplier_id",
                id,
            )
            .order(
                "order_date",
                {
                    ascending: false,
                },
            ),

        /* =====================================================
         * Purchase Order Items
         * ===================================================== */

        supabase
            .from(
                "purchase_order_items",
            )
            .select(`
        id,
        purchase_order_id,
        product_id,
        ordered_quantity,
        received_quantity,
        unit_price,
        line_total,

        product:products (
          name,
          sku
        ),

        purchase_order:purchase_orders!inner (
          supplier_id,
          order_date
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
        supplier_id,
        status,
        received_date,
        created_at
      `)
            .eq(
                "supplier_id",
                id,
            )
            .order(
                "created_at",
                {
                    ascending: false,
                },
            ),

        /* =====================================================
         * Product Supplier Mappings
         * ===================================================== */

        supabase
            .from(
                "product_suppliers",
            )
            .select(`
        product_id,
        is_preferred,
        is_active
      `)
            .eq(
                "supplier_id",
                id,
            )
            .eq(
                "is_active",
                true,
            ),
    ]);

    const firstError =
        supplierResult.error ??
        purchaseOrdersResult.error ??
        purchaseOrderItemsResult.error ??
        goodsReceiptsResult.error ??
        productMappingsResult.error;

    if (firstError) {
        throw new Error(
            `Unable to load Supplier Intelligence: ${firstError.message}`,
        );
    }

    if (
        !supplierResult.data
    ) {
        throw new Error(
            "Supplier was not found.",
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

    const productMappings =
        productMappingsResult.data ??
        [];

    const supplierName =
        supplierResult.data
            .company_name;

    /* =======================================================
     * Purchase Order Summary
     * ======================================================= */

    const openStatuses =
        new Set([
            "draft",
            "approved",
            "sent",
            "partially_received",
        ]);

    const openPurchaseOrders =
        purchaseOrders.filter(
            (order) =>
                openStatuses.has(
                    String(
                        order.status,
                    ),
                ),
        );

    const totalPurchaseValue =
        purchaseOrders.reduce(
            (
                total,
                order,
            ) =>
                total +
                toNumber(
                    order.total_amount,
                ),
            0,
        );

    const openPurchaseValue =
        openPurchaseOrders.reduce(
            (
                total,
                order,
            ) =>
                total +
                toNumber(
                    order.total_amount,
                ),
            0,
        );

    const overdueOrders =
        purchaseOrders.filter(
            (order) =>
                Boolean(
                    order.expected_delivery_date,
                ) &&
                order
                    .expected_delivery_date! <
                today &&
                openStatuses.has(
                    String(
                        order.status,
                    ),
                ),
        ).length;

    const leadTimes =
        purchaseOrders
            .map(
                (order) =>
                    order.lead_time_days,
            )
            .filter(
                (
                    value,
                ): value is number =>
                    typeof value ===
                    "number" &&
                    value >= 0,
            );

    const averageLeadTimeDays =
        leadTimes.length > 0
            ? leadTimes.reduce(
                (
                    total,
                    value,
                ) =>
                    total +
                    value,
                0,
            ) /
            leadTimes.length
            : null;

    /* =======================================================
     * Monthly Spend
     * ======================================================= */

    const monthlyMap =
        new Map<
            string,
            SupplierMonthlySpend
        >();

    for (
        const order of
        purchaseOrders
    ) {
        const key =
            monthKey(
                order.order_date,
            );

        const existing =
            monthlyMap.get(
                key,
            ) ?? {
                month:
                    key,

                purchaseValue:
                    0,

                orderCount:
                    0,
            };

        existing.purchaseValue +=
            toNumber(
                order.total_amount,
            );

        existing.orderCount +=
            1;

        monthlyMap.set(
            key,
            existing,
        );
    }

    const monthlySpend =
        [...monthlyMap.values()]
            .sort(
                (
                    first,
                    second,
                ) =>
                    first.month.localeCompare(
                        second.month,
                    ),
            )
            .slice(
                -12,
            );

    /* =======================================================
     * Product Intelligence
     * ======================================================= */

    const productMap =
        new Map<
            string,
            SupplierProductItem
        >();

    for (
        const item of
        purchaseOrderItems
    ) {
        if (
            !item.product_id
        ) {
            continue;
        }

        const productInfo =
            getProductName(
                item.product,
            );

        const order =
            item.purchase_order;

        const orderDate =
            Array.isArray(
                order,
            )
                ? order[0]
                    ?.order_date ??
                null
                : order
                    ?.order_date ??
                null;

        const existing =
            productMap.get(
                item.product_id,
            ) ?? {
                productId:
                    item.product_id,

                productName:
                    productInfo.name,

                sku:
                    productInfo.sku,

                purchaseOrderCount:
                    0,

                totalOrderedQuantity:
                    0,

                totalReceivedQuantity:
                    0,

                totalPurchaseValue:
                    0,

                averageUnitPrice:
                    0,

                lastPurchaseDate:
                    null,
            };

        existing.purchaseOrderCount +=
            1;

        existing.totalOrderedQuantity +=
            toNumber(
                item.ordered_quantity,
            );

        existing.totalReceivedQuantity +=
            toNumber(
                item.received_quantity,
            );

        existing.totalPurchaseValue +=
            toNumber(
                item.line_total,
            );

        if (
            orderDate &&
            (
                !existing.lastPurchaseDate ||
                orderDate >
                existing.lastPurchaseDate
            )
        ) {
            existing.lastPurchaseDate =
                orderDate;
        }

        productMap.set(
            item.product_id,
            existing,
        );
    }

    const topProducts =
        [...productMap.values()]
            .map(
                (product) => ({
                    ...product,

                    averageUnitPrice:
                        product.totalOrderedQuantity >
                            0
                            ? product
                                .totalPurchaseValue /
                            product
                                .totalOrderedQuantity
                            : 0,
                }),
            )
            .sort(
                (
                    first,
                    second,
                ) =>
                    second.totalPurchaseValue -
                    first.totalPurchaseValue,
            )
            .slice(
                0,
                20,
            );

    /* =======================================================
     * Goods Receipt Summary
     * ======================================================= */

    const completedGoodsReceipts =
        goodsReceipts.filter(
            (receipt) =>
                receipt.status ===
                "completed",
        ).length;

    const pendingGoodsReceipts =
        goodsReceipts.filter(
            (receipt) =>
                receipt.status !==
                "completed" &&
                receipt.status !==
                "cancelled",
        ).length;

    /* =======================================================
     * Final Summary
     * ======================================================= */

    return {
        summary: {
            supplierId:
                id,

            supplierName,

            totalPurchaseOrders:
                purchaseOrders.length,

            openPurchaseOrders:
                openPurchaseOrders.length,

            receivedPurchaseOrders:
                purchaseOrders.filter(
                    (order) =>
                        order.status ===
                        "received",
                ).length,

            cancelledPurchaseOrders:
                purchaseOrders.filter(
                    (order) =>
                        order.status ===
                        "cancelled",
                ).length,

            totalPurchaseValue,

            openPurchaseValue,

            averageOrderValue:
                purchaseOrders.length >
                    0
                    ? totalPurchaseValue /
                    purchaseOrders.length
                    : 0,

            partiallyReceivedOrders:
                purchaseOrders.filter(
                    (order) =>
                        order.status ===
                        "partially_received",
                ).length,

            overdueOrders,

            totalGoodsReceipts:
                goodsReceipts.length,

            completedGoodsReceipts,

            pendingGoodsReceipts,

            productsSupplied:
                productMap.size,

            lastPurchaseDate:
                purchaseOrders[0]
                    ?.order_date ??
                null,

            averageLeadTimeDays,

            preferredProductMappings:
                productMappings.filter(
                    (mapping) =>
                        mapping.is_preferred,
                ).length,
        },

        monthlySpend,

        topProducts,
    };
}
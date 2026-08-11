import { createClient } from "@/lib/supabase/server";

export interface SupplierAnalyticsItem {
    supplierId: string;
    supplierName: string;

    totalOrders: number;
    totalPurchaseValue: number;
    averageOrderValue: number;

    openOrders: number;
    openOrderValue: number;

    overdueOrders: number;

    receivedOrders: number;
    partiallyReceivedOrders: number;

    lastPurchaseDate: string | null;
}

export interface SupplierAnalyticsResult {
    suppliers: SupplierAnalyticsItem[];

    totalSuppliers: number;

    totalPurchaseValue: number;

    totalOpenOrderValue: number;

    totalOverdueOrders: number;
}

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

function supplierName(
    supplier:
        | {
            company_name: string;
        }
        | {
            company_name: string;
        }[]
        | null,
): string {
    if (!supplier) {
        return "Unknown supplier";
    }

    if (
        Array.isArray(
            supplier,
        )
    ) {
        return (
            supplier[0]
                ?.company_name ??
            "Unknown supplier"
        );
    }

    return (
        supplier.company_name ??
        "Unknown supplier"
    );
}

export async function getSupplierAnalytics():
    Promise<SupplierAnalyticsResult> {
    const supabase =
        await createClient();

    const today =
        new Date()
            .toISOString()
            .slice(0, 10);

    const {
        data,
        error,
    } = await supabase
        .from("purchase_orders")
        .select(`
      id,
      supplier_id,
      status,
      order_date,
      expected_delivery_date,
      total_amount,

      suppliers!purchase_orders_supplier_id_fkey (
        company_name
      )
    `)
        .order(
            "order_date",
            {
                ascending: false,
            },
        );

    if (error) {
        throw new Error(
            `Unable to load supplier analytics: ${error.message}`,
        );
    }

    const openStatuses =
        new Set([
            "draft",
            "approved",
            "sent",
            "partially_received",
        ]);

    const supplierMap =
        new Map<
            string,
            SupplierAnalyticsItem
        >();

    for (
        const order of
        data ?? []
    ) {
        const supplierId =
            order.supplier_id;

        const orderValue =
            toNumber(
                order.total_amount,
            );

        const existing =
            supplierMap.get(
                supplierId,
            ) ?? {
                supplierId,

                supplierName:
                    supplierName(
                        order.suppliers,
                    ),

                totalOrders: 0,

                totalPurchaseValue:
                    0,

                averageOrderValue:
                    0,

                openOrders: 0,

                openOrderValue:
                    0,

                overdueOrders: 0,

                receivedOrders: 0,

                partiallyReceivedOrders:
                    0,

                lastPurchaseDate:
                    null,
            };

        existing.totalOrders +=
            1;

        existing.totalPurchaseValue +=
            orderValue;

        if (
            openStatuses.has(
                String(
                    order.status,
                ),
            )
        ) {
            existing.openOrders +=
                1;

            existing.openOrderValue +=
                orderValue;
        }

        if (
            order.status ===
            "received"
        ) {
            existing.receivedOrders +=
                1;
        }

        if (
            order.status ===
            "partially_received"
        ) {
            existing.partiallyReceivedOrders +=
                1;
        }

        if (
            order.expected_delivery_date &&
            order.expected_delivery_date <
            today &&
            openStatuses.has(
                String(
                    order.status,
                ),
            )
        ) {
            existing.overdueOrders +=
                1;
        }

        if (
            !existing.lastPurchaseDate ||
            order.order_date >
            existing.lastPurchaseDate
        ) {
            existing.lastPurchaseDate =
                order.order_date;
        }

        supplierMap.set(
            supplierId,
            existing,
        );
    }

    const suppliers =
        [...supplierMap.values()]
            .map(
                (supplier) => ({
                    ...supplier,

                    averageOrderValue:
                        supplier.totalOrders >
                            0
                            ? supplier
                                .totalPurchaseValue /
                            supplier
                                .totalOrders
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
            );

    return {
        suppliers,

        totalSuppliers:
            suppliers.length,

        totalPurchaseValue:
            suppliers.reduce(
                (
                    total,
                    supplier,
                ) =>
                    total +
                    supplier
                        .totalPurchaseValue,
                0,
            ),

        totalOpenOrderValue:
            suppliers.reduce(
                (
                    total,
                    supplier,
                ) =>
                    total +
                    supplier
                        .openOrderValue,
                0,
            ),

        totalOverdueOrders:
            suppliers.reduce(
                (
                    total,
                    supplier,
                ) =>
                    total +
                    supplier
                        .overdueOrders,
                0,
            ),
    };
}
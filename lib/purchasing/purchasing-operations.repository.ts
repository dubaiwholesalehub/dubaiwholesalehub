import { createClient } from "@/lib/supabase/server";

export interface UrgentPurchaseOrder {
    id: string;
    poNumber: string;
    supplierId: string;
    supplierName: string;
    expectedDeliveryDate: string | null;
    totalAmount: number;
    currencyCode: string;
    status: string;
    daysLate: number;
}

export interface ExpectedArrival {
    id: string;
    poNumber: string;
    supplierId: string;
    supplierName: string;
    expectedDeliveryDate: string;
    totalAmount: number;
    currencyCode: string;
    status: string;
}

export interface RecentGoodsReceipt {
    id: string;
    receiptNumber: string;
    purchaseOrderId: string | null;
    supplierId: string;
    supplierName: string;
    status: string;
    receivedDate: string | null;
    createdAt: string;
}

export interface PurchasingOperations {
    urgentPurchaseOrders: UrgentPurchaseOrder[];
    expectedArrivals: ExpectedArrival[];
    recentGoodsReceipts: RecentGoodsReceipt[];
}

function toNumber(
    value: unknown,
): number {
    if (typeof value === "number") {
        return Number.isFinite(value)
            ? value
            : 0;
    }

    if (typeof value === "string") {
        const parsed =
            Number(value);

        return Number.isFinite(parsed)
            ? parsed
            : 0;
    }

    return 0;
}

function getDateString(
    date: Date,
): string {
    return date
        .toISOString()
        .slice(0, 10);
}

function daysBetween(
    earlier: string,
    later: string,
): number {
    const first =
        new Date(
            `${earlier}T00:00:00Z`,
        );

    const second =
        new Date(
            `${later}T00:00:00Z`,
        );

    if (
        Number.isNaN(
            first.getTime(),
        ) ||
        Number.isNaN(
            second.getTime(),
        )
    ) {
        return 0;
    }

    const milliseconds =
        second.getTime() -
        first.getTime();

    return Math.max(
        Math.floor(
            milliseconds /
            86_400_000,
        ),
        0,
    );
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

export async function getPurchasingOperations():
    Promise<PurchasingOperations> {
    const supabase =
        await createClient();

    const todayDate =
        new Date();

    const today =
        getDateString(
            todayDate,
        );

    const arrivalEnd =
        new Date(
            todayDate,
        );

    arrivalEnd.setDate(
        arrivalEnd.getDate() +
        7,
    );

    const arrivalEndDate =
        getDateString(
            arrivalEnd,
        );

    const openStatuses = [
        "draft",
        "approved",
        "sent",
        "partially_received",
    ] as const;

    const [
        urgentResult,
        arrivalsResult,
        receiptsResult,
    ] = await Promise.all([
        supabase
            .from(
                "purchase_orders",
            )
            .select(`
        id,
        po_number,
        supplier_id,
        expected_delivery_date,
        total_amount,
        currency_code,
        status,

        suppliers!purchase_orders_supplier_id_fkey (
          company_name
        )
      `)
            .in(
                "status",
                openStatuses,
            )
            .not(
                "expected_delivery_date",
                "is",
                null,
            )
            .lt(
                "expected_delivery_date",
                today,
            )
            .order(
                "expected_delivery_date",
                {
                    ascending: true,
                },
            )
            .limit(8),

        supabase
            .from(
                "purchase_orders",
            )
            .select(`
        id,
        po_number,
        supplier_id,
        expected_delivery_date,
        total_amount,
        currency_code,
        status,

        suppliers!purchase_orders_supplier_id_fkey (
          company_name
        )
      `)
            .in(
                "status",
                openStatuses,
            )
            .not(
                "expected_delivery_date",
                "is",
                null,
            )
            .gte(
                "expected_delivery_date",
                today,
            )
            .lte(
                "expected_delivery_date",
                arrivalEndDate,
            )
            .order(
                "expected_delivery_date",
                {
                    ascending: true,
                },
            )
            .limit(8),

        supabase
            .from(
                "goods_receipts",
            )
            .select(`
        id,
        receipt_number,
        purchase_order_id,
        supplier_id,
        status,
        received_date,
        created_at,

        suppliers!goods_receipts_supplier_id_fkey (
          company_name
        )
      `)
            .order(
                "created_at",
                {
                    ascending: false,
                },
            )
            .limit(8),
    ]);

    const firstError =
        urgentResult.error ??
        arrivalsResult.error ??
        receiptsResult.error;

    if (firstError) {
        throw new Error(
            `Unable to load purchasing operations: ${firstError.message}`,
        );
    }

    const urgentPurchaseOrders:
        UrgentPurchaseOrder[] =
        (
            urgentResult.data ??
            []
        ).map(
            (row) => ({
                id:
                    row.id,

                poNumber:
                    row.po_number,

                supplierId:
                    row.supplier_id,

                supplierName:
                    supplierName(
                        row.suppliers,
                    ),

                expectedDeliveryDate:
                    row.expected_delivery_date,

                totalAmount:
                    toNumber(
                        row.total_amount,
                    ),

                currencyCode:
                    row.currency_code,

                status:
                    String(
                        row.status,
                    ),

                daysLate:
                    row
                        .expected_delivery_date
                        ? daysBetween(
                            row
                                .expected_delivery_date,
                            today,
                        )
                        : 0,
            }),
        );

    const expectedArrivals:
        ExpectedArrival[] =
        (
            arrivalsResult.data ??
            []
        )
            .filter(
                (
                    row,
                ): row is typeof row & {
                    expected_delivery_date:
                    string;
                } =>
                    Boolean(
                        row.expected_delivery_date,
                    ),
            )
            .map(
                (row) => ({
                    id:
                        row.id,

                    poNumber:
                        row.po_number,

                    supplierId:
                        row.supplier_id,

                    supplierName:
                        supplierName(
                            row.suppliers,
                        ),

                    expectedDeliveryDate:
                        row.expected_delivery_date,

                    totalAmount:
                        toNumber(
                            row.total_amount,
                        ),

                    currencyCode:
                        row.currency_code,

                    status:
                        String(
                            row.status,
                        ),
                }),
            );

    const recentGoodsReceipts:
        RecentGoodsReceipt[] =
        (
            receiptsResult.data ??
            []
        ).map(
            (row) => ({
                id:
                    row.id,

                receiptNumber:
                    row.receipt_number,

                purchaseOrderId:
                    row.purchase_order_id,

                supplierId:
                    row.supplier_id,

                supplierName:
                    supplierName(
                        row.suppliers,
                    ),

                status:
                    String(
                        row.status,
                    ),

                receivedDate:
                    row.received_date,

                createdAt:
                    row.created_at,
            }),
        );

    return {
        urgentPurchaseOrders,
        expectedArrivals,
        recentGoodsReceipts,
    };
}
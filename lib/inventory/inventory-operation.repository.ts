import { createClient } from "@/lib/supabase/server";

export type ManualInventoryTransactionType =
    | "opening_balance"
    | "adjustment_in"
    | "adjustment_out"
    | "stock_count";

export interface ManualInventoryItemInput {
    productId: string;
    quantity: number;
    unitCost?: number;
    notes?: string;
}

export interface ManualInventoryTransactionInput {
    transactionType: ManualInventoryTransactionType;

    warehouseId: string;

    transactionDate: string;

    referenceNumber?: string;

    description?: string;

    internalNotes?: string;

    items: ManualInventoryItemInput[];
}

/* =========================================================
 * Manual Inventory Posting
 * ========================================================= */

export async function postManualInventoryTransaction(
    input: ManualInventoryTransactionInput,
): Promise<string> {
    const supabase =
        await createClient();

    const items = input.items.map(
        (item) => ({
            product_id:
                item.productId,

            quantity:
                item.quantity,

            unit_cost:
                item.unitCost ??
                null,

            notes:
                item.notes?.trim() ||
                null,
        }),
    );

    const {
        data,
        error,
    } = await supabase.rpc(
        "post_manual_inventory_transaction",
        {
            p_transaction_type:
                input.transactionType,

            p_warehouse_id:
                input.warehouseId,

            p_transaction_date:
                input.transactionDate,

            p_reference_number:
                input.referenceNumber?.trim() ??
                "",

            p_description:
                input.description?.trim() ??
                "",

            p_internal_notes:
                input.internalNotes?.trim() ??
                "",

            p_items:
                items,
        },
    );

    if (error) {
        throw new Error(
            `Unable to post inventory transaction: ${error.message}`,
        );
    }

    if (
        typeof data !== "string" ||
        !data
    ) {
        throw new Error(
            "Inventory transaction was posted but no transaction ID was returned.",
        );
    }

    return data;
}

/* =========================================================
 * Opening Stock Form Options
 * ========================================================= */

export async function getInventoryOperationOptions() {
    const supabase =
        await createClient();

    const [
        warehousesResult,
        productsResult,
    ] = await Promise.all([
        supabase
            .from("warehouses")
            .select(`
        id,
        code,
        name,
        is_default
      `)
            .eq("is_active", true)
            .order("is_default", {
                ascending: false,
            })
            .order("name"),

        supabase
            .from("products")
            .select(`
        id,
        name,
        sku,
        unit_id,
        fulfilment_method,
        status,
        unit:units (
          id,
          name,
          short_name
        )
      `)
            .neq(
                "fulfilment_method",
                "service",
            )
            .in(
                "status",
                [
                    "draft",
                    "pending_review",
                    "published",
                ],
            )
            .order("name"),
    ]);

    const firstError =
        warehousesResult.error ??
        productsResult.error;

    if (firstError) {
        throw new Error(
            `Unable to load inventory operation options: ${firstError.message}`,
        );
    }

    return {
        warehouses:
            warehousesResult.data ??
            [],

        products:
            productsResult.data ??
            [],
    };
}

export type InventoryOperationOptions =
    Awaited<
        ReturnType<
            typeof getInventoryOperationOptions
        >
    >;

/* =========================================================
* Stock Adjustment Options
* ========================================================= */

export async function getStockAdjustmentOptions() {
    const supabase =
        await createClient();

    const [
        warehousesResult,
        productsResult,
        stockResult,
    ] = await Promise.all([
        supabase
            .from("warehouses")
            .select(`
        id,
        code,
        name,
        is_default
      `)
            .eq("is_active", true)
            .order("is_default", {
                ascending: false,
            })
            .order("name"),

        supabase
            .from("products")
            .select(`
        id,
        name,
        sku,
        unit_id,
        fulfilment_method,
        status,
        unit:units (
          id,
          name,
          short_name
        )
      `)
            .neq(
                "fulfilment_method",
                "service",
            )
            .in(
                "status",
                [
                    "draft",
                    "pending_review",
                    "published",
                ],
            )
            .order("name"),

        supabase
            .from("warehouse_stock")
            .select(`
        id,
        warehouse_id,
        product_id,
        quantity_on_hand,
        quantity_reserved,
        quantity_available,
        average_unit_cost
      `),
    ]);

    const firstError =
        warehousesResult.error ??
        productsResult.error ??
        stockResult.error;

    if (firstError) {
        throw new Error(
            `Unable to load stock adjustment options: ${firstError.message}`,
        );
    }

    return {
        warehouses:
            warehousesResult.data ??
            [],

        products:
            productsResult.data ??
            [],

        stock:
            (
                stockResult.data ??
                []
            ).map((row) => ({
                id: row.id,

                warehouseId:
                    row.warehouse_id,

                productId:
                    row.product_id,

                quantityOnHand:
                    Number(
                        row.quantity_on_hand,
                    ),

                quantityReserved:
                    Number(
                        row.quantity_reserved,
                    ),

                quantityAvailable:
                    Number(
                        row.quantity_available,
                    ),

                averageUnitCost:
                    Number(
                        row.average_unit_cost,
                    ),
            })),
    };
}

export type StockAdjustmentOptions =
    Awaited<
        ReturnType<
            typeof getStockAdjustmentOptions
        >
    >;

/* =========================================================
 * Local Purchase
 * ========================================================= */

export interface LocalPurchaseItemInput {
    productId: string;
    quantity: number;
    unitCost: number;
    notes?: string;
}

export interface LocalPurchaseInput {
    warehouseId: string;
    transactionDate: string;

    supplierId?: string;

    storeName?: string;
    receiptNumber?: string;

    paymentMethod?: string;
    internalNotes?: string;

    items: LocalPurchaseItemInput[];
}

export async function postLocalPurchaseInventory(
    input: LocalPurchaseInput,
): Promise<string> {
    const supabase =
        await createClient();

    const {
        data,
        error,
    } = await supabase.rpc(
        "post_local_purchase_inventory",
        {
            p_warehouse_id:
                input.warehouseId,

            p_transaction_date:
                input.transactionDate,

            p_supplier_id:
                (input.supplierId || null) as string,

            p_store_name:
                input.storeName?.trim() ??
                "",

            p_receipt_number:
                input.receiptNumber?.trim() ??
                "",

            p_payment_method:
                input.paymentMethod?.trim() ??
                "",

            p_internal_notes:
                input.internalNotes?.trim() ??
                "",

            p_items:
                input.items.map(
                    (item) => ({
                        product_id:
                            item.productId,

                        quantity:
                            item.quantity,

                        unit_cost:
                            item.unitCost,

                        notes:
                            item.notes?.trim() ||
                            null,
                    }),
                ),
        },
    );

    if (error) {
        throw new Error(
            `Unable to post local purchase: ${error.message}`,
        );
    }

    if (
        typeof data !== "string" ||
        !data
    ) {
        throw new Error(
            "Local purchase was posted but no transaction ID was returned.",
        );
    }

    return data;
}
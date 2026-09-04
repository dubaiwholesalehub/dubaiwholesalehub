"use server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
    revalidatePath,
} from "next/cache";
import {
    redirect,
} from "next/navigation";

import {
    createClient,
} from "@/lib/supabase/server";

/* =========================================================
 * Types
 * ========================================================= */

interface SalesReturnFormItem {
    salesOrderItemId: string;
    deliveryOrderItemId: string;
    quantityReturned: number;
    condition: string;
    reason: string | null;
    notes: string | null;
}

/* =========================================================
 * Helpers
 * ========================================================= */

function getRequiredString(
    formData: FormData,
    key: string,
): string {
    const value =
        formData.get(
            key,
        );

    if (
        typeof value !== "string" ||
        !value.trim()
    ) {
        throw new Error(
            `${key} is required.`,
        );
    }

    return value.trim();
}

function getOptionalString(
    formData: FormData,
    key: string,
): string | null {
    const value =
        formData.get(
            key,
        );

    if (
        typeof value !== "string"
    ) {
        return null;
    }

    const normalized =
        value.trim();

    return normalized ||
        null;
}

/* =========================================================
 * Create Sales Return
 * ========================================================= */

export async function createSalesReturnAction(
    formData: FormData,
): Promise<void> {
    await requireAdmin();
    const salesOrderId =
        getRequiredString(
            formData,
            "salesOrderId",
        );

    const returnDate =
        getRequiredString(
            formData,
            "returnDate",
        );

    const postingDate =
        getRequiredString(
            formData,
            "postingDate",
        );

    const reason =
        getRequiredString(
            formData,
            "reason",
        );

    const notes =
        getOptionalString(
            formData,
            "notes",
        );

    const rawItems =
        getRequiredString(
            formData,
            "items",
        );

    let items:
        SalesReturnFormItem[];

    try {
        items =
            JSON.parse(
                rawItems,
            ) as SalesReturnFormItem[];
    } catch {
        throw new Error(
            "Sales Return items are invalid.",
        );
    }

    if (
        !Array.isArray(
            items,
        ) ||
        items.length ===
        0
    ) {
        throw new Error(
            "Select at least one item to return.",
        );
    }

    /*
     * Lightweight request validation.
     *
     * The database RPC remains the authoritative validator for
     * delivered quantity, previous returns, historical pricing,
     * warehouse, original cost and accounting values.
     */

    for (
        const item
        of items
    ) {
        if (
            !item.salesOrderItemId ||
            !item.deliveryOrderItemId
        ) {
            throw new Error(
                "A selected return line is missing its source document reference.",
            );
        }

        if (
            !Number.isFinite(
                item.quantityReturned,
            ) ||
            item.quantityReturned <=
            0
        ) {
            throw new Error(
                "Return quantity must be greater than zero.",
            );
        }

        if (
            !item.condition
        ) {
            throw new Error(
                "Return condition is required.",
            );
        }
    }

    const rpcItems =
        items.map(
            (item) => ({
                salesOrderItemId:
                    item.salesOrderItemId,

                deliveryOrderItemId:
                    item.deliveryOrderItemId,

                quantityReturned:
                    item.quantityReturned,

                condition:
                    item.condition,

                reason:
                    item.reason,

                notes:
                    item.notes,
            }),
        );
    const supabase =
        await createClient();

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "create_sales_return",
            {
                p_sales_order_id:
                    salesOrderId,

                p_return_date:
                    returnDate,

                p_posting_date:
                    postingDate,

                p_reason:
                    reason,

                p_items:
                    rpcItems,

                p_notes:
                    notes ??
                    undefined,
            },
        );

    if (error) {
        throw new Error(
            `Unable to create Sales Return: ${error.message}`,
        );
    }

    if (
        !data ||
        typeof data !==
        "string"
    ) {
        throw new Error(
            "Sales Return was created but its ID was not returned.",
        );
    }

    revalidatePath(
        "/admin/sales/returns",
    );

    redirect(
        `/admin/sales/returns/${data}`,
    );
}
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";

import {
    cancelDeliveryOrder,
    confirmDeliveryPacked,
    confirmDeliveryPicked,
    createDeliveryFromSalesOrder,
    dispatchDeliveryOrder,
    markDeliveryDelivered,
    startDeliveryPacking,
    startDeliveryPicking,
    updateDeliveryOrderItem,
} from "@/lib/repositories/delivery-order.repository";

const DELIVERY_LIST_URL =
    "/admin/sales/deliveries";

function getErrorMessage(
    error: unknown,
    fallback: string,
): string {
    if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string"
    ) {
        return error.message;
    }

    return fallback;
}

/* =========================================================
 * Create Delivery
 * ========================================================= */

export async function createDeliveryAction(
    salesOrderId: string,
): Promise<void> {
    await requireAdmin();
    const id = salesOrderId.trim();

    if (!id) {
        throw new Error(
            "Sales order ID is required.",
        );
    }

    let deliveryId: string;

    try {
        const delivery =
            await createDeliveryFromSalesOrder(
                id,
            );

        deliveryId = delivery.id;
    } catch (error) {
        throw new Error(
            getErrorMessage(
                error,
                "Unable to create the delivery order.",
            ),
        );
    }

    revalidatePath(
        DELIVERY_LIST_URL,
    );

    revalidatePath(
        `/admin/sales/orders/${id}`,
    );
    revalidatePath(
        `/admin/sales/deliveries/${deliveryId}`,
    );
    redirect(
        `/admin/sales/deliveries/${deliveryId}`,
    );
}

/* =========================================================
 * Shared Delivery Workflow
 * ========================================================= */

async function runDeliveryWorkflowAction(
    deliveryOrderId: string,
    action: (id: string) => Promise<unknown>,
    fallbackMessage: string,
): Promise<void> {
    const id = deliveryOrderId.trim();

    if (!id) {
        throw new Error(
            "Delivery order ID is required.",
        );
    }

    try {
        await action(id);
    } catch (error) {
        throw new Error(
            getErrorMessage(
                error,
                fallbackMessage,
            ),
        );
    }

    revalidatePath(
        DELIVERY_LIST_URL,
    );

    revalidatePath(
        `/admin/sales/deliveries/${id}`,
    );

    redirect(
        `/admin/sales/deliveries/${id}`,
    );
}

/* =========================================================
 * Start Picking
 * ========================================================= */

export async function startDeliveryPickingAction(
    deliveryOrderId: string,
): Promise<void> {
    await requireAdmin();
    return runDeliveryWorkflowAction(
        deliveryOrderId,
        startDeliveryPicking,
        "Unable to start delivery picking.",
    );
}

/* =========================================================
 * Confirm Picked
 * ========================================================= */

export async function confirmDeliveryPickedAction(
    deliveryOrderId: string,
): Promise<void> {
    await requireAdmin();
    return runDeliveryWorkflowAction(
        deliveryOrderId,
        confirmDeliveryPicked,
        "Unable to confirm delivery picking.",
    );
}

/* =========================================================
 * Start Packing
 * ========================================================= */

export async function startDeliveryPackingAction(
    deliveryOrderId: string,
): Promise<void> {
    await requireAdmin();
    return runDeliveryWorkflowAction(
        deliveryOrderId,
        startDeliveryPacking,
        "Unable to start delivery packing.",
    );
}

/* =========================================================
 * Confirm Packed
 * ========================================================= */

export async function confirmDeliveryPackedAction(
    deliveryOrderId: string,
): Promise<void> {
    await requireAdmin();
    return runDeliveryWorkflowAction(
        deliveryOrderId,
        confirmDeliveryPacked,
        "Unable to confirm delivery packing.",
    );
}

/* =========================================================
 * Dispatch Delivery
 * ========================================================= */

export async function dispatchDeliveryOrderAction(
    deliveryOrderId: string,
): Promise<void> {
    await requireAdmin();
    return runDeliveryWorkflowAction(
        deliveryOrderId,
        dispatchDeliveryOrder,
        "Unable to dispatch the delivery order.",
    );
}

/* =========================================================
 * Mark Delivered
 * ========================================================= */

export async function markDeliveryDeliveredAction(
    deliveryOrderId: string,
): Promise<void> {
    await requireAdmin();
    return runDeliveryWorkflowAction(
        deliveryOrderId,
        markDeliveryDelivered,
        "Unable to mark the delivery as delivered.",
    );
}

/* =========================================================
 * Cancel Delivery
 * ========================================================= */

export async function cancelDeliveryOrderAction(
    deliveryOrderId: string,
): Promise<void> {
    await requireAdmin();
    return runDeliveryWorkflowAction(
        deliveryOrderId,
        cancelDeliveryOrder,
        "Unable to cancel the delivery order.",
    );
}

/* =========================================================
 * Update Delivery Item Quantities
 * ========================================================= */

export interface UpdateDeliveryItemQuantitiesInput {
    deliveryQuantity?: number;
    pickedQuantity?: number;
    packedQuantity?: number;
}

export async function updateDeliveryItemQuantitiesAction(
    deliveryOrderId: string,
    deliveryOrderItemId: string,
    values: UpdateDeliveryItemQuantitiesInput,
): Promise<void> {
    await requireAdmin();
    const orderId =
        deliveryOrderId.trim();

    const itemId =
        deliveryOrderItemId.trim();

    if (!orderId) {
        throw new Error(
            "Delivery order ID is required.",
        );
    }

    if (!itemId) {
        throw new Error(
            "Delivery order item ID is required.",
        );
    }

    try {
        await updateDeliveryOrderItem(
            orderId,
            itemId,
            {
                delivery_quantity:
                    values.deliveryQuantity,

                picked_quantity:
                    values.pickedQuantity,

                packed_quantity:
                    values.packedQuantity,
            },
        );
    } catch (error) {
        throw new Error(
            getErrorMessage(
                error,
                "Unable to update the delivery item quantities.",
            ),
        );
    }

    revalidatePath(
        DELIVERY_LIST_URL,
    );

    revalidatePath(
        `/admin/sales/deliveries/${orderId}`,
    );
}
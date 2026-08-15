"use server";

import {
    revalidatePath,
} from "next/cache";

import {
    requireAdmin,
} from "@/lib/auth/require-admin";

import {
    cancelSupplierPayment,
} from "@/lib/repositories/supplier-payment.repository";

export type CancelSupplierPaymentResult =
    | {
        success: true;
        message: string;
    }
    | {
        success: false;
        message: string;
    };

export async function cancelSupplierPaymentAction(
    paymentId: string,
    reason: string,
): Promise<CancelSupplierPaymentResult> {
    await requireAdmin();

    try {
        if (!paymentId) {
            throw new Error(
                "Supplier payment ID is required.",
            );
        }

        if (!reason.trim()) {
            throw new Error(
                "Please enter a cancellation reason.",
            );
        }

        await cancelSupplierPayment(
            paymentId,
            reason,
        );

        revalidatePath(
            "/admin/purchasing/supplier-payments",
        );

        revalidatePath(
            `/admin/purchasing/supplier-payments/${paymentId}`,
        );

        revalidatePath(
            "/admin/purchasing/quick-purchase",
        );

        revalidatePath(
            "/admin/purchasing",
        );

        return {
            success: true,

            message:
                "Supplier payment cancelled successfully.",
        };
    } catch (error) {
        return {
            success: false,

            message:
                error instanceof Error
                    ? error.message
                    : "Unable to cancel supplier payment.",
        };
    }
}
"use server";

import {
    revalidatePath,
} from "next/cache";

import {
    requireAdmin,
} from "@/lib/auth/require-admin";

import {
    cancelCustomerReceipt,
} from "@/lib/repositories/customer-receipt.repository";

export type CancelReceiptResult =
    | {
          success: true;
          message: string;
      }
    | {
          success: false;
          message: string;
      };

export async function cancelReceiptAction(
    receiptId: string,
    reason: string,
): Promise<CancelReceiptResult> {
    await requireAdmin();

    try {
        if (!receiptId) {
            throw new Error(
                "Receipt ID is required.",
            );
        }

        if (!reason.trim()) {
            throw new Error(
                "Please enter a cancellation reason.",
            );
        }

        await cancelCustomerReceipt(
            receiptId,
            reason,
        );

        revalidatePath(
            "/admin/sales/receipts",
        );

        revalidatePath(
            `/admin/sales/receipts/${receiptId}`,
        );

        revalidatePath(
            "/admin/sales/orders",
        );

        revalidatePath(
            "/admin/customers",
        );

        return {
            success: true,

            message:
                "Customer receipt cancelled successfully.",
        };
    } catch (error) {
        return {
            success: false,

            message:
                error instanceof Error
                    ? error.message
                    : "Unable to cancel customer receipt.",
        };
    }
}
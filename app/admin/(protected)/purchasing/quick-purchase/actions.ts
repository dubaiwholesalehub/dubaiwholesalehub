"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  requireAdmin,
} from "@/lib/auth/require-admin";

import {
  createQuickPurchase,
  type CreateQuickPurchaseInput,
} from "@/lib/repositories/quick-purchase.repository";

export type CompleteQuickPurchaseResult =
  | {
      success: true;

      purchaseId: string;
      purchaseNumber: string;

      inventoryTransactionId: string;

      message: string;
    }
  | {
      success: false;
      message: string;
    };

export async function completeQuickPurchase(
  input: CreateQuickPurchaseInput,
): Promise<CompleteQuickPurchaseResult> {
  await requireAdmin();

  try {
    const result =
      await createQuickPurchase(
        input,
      );

    revalidatePath(
      "/admin/purchasing/quick-purchase",
    );

    revalidatePath(
      "/admin/inventory",
    );

    revalidatePath(
      "/admin/inventory/stock",
    );

    revalidatePath(
      "/admin/inventory/transactions",
    );

    revalidatePath(
      "/admin/purchasing",
    );

    return {
      success: true,

      purchaseId:
        result.id,

      purchaseNumber:
        result.purchaseNumber,

      inventoryTransactionId:
        result.inventoryTransactionId,

      message:
        result.paymentStatus ===
        "paid"
          ? "Quick Purchase posted successfully and marked paid."
          : result.paymentStatus ===
              "partially_paid"
            ? "Quick Purchase posted successfully with partial payment."
            : "Quick Purchase posted successfully as credit purchase.",
    };
  } catch (error) {
    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Unable to post Quick Purchase.",
    };
  }
}
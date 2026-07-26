"use server";

import { createPurchaseOrderFromAward } from "@/lib/repositories/purchase-orders";

export type CreatePurchaseOrderActionResult =
  | {
      success: true;
      purchaseOrderId: string;
      purchaseOrderNumber: string;
    }
  | {
      success: false;
      message: string;
    };

export async function createPurchaseOrderFromAwardAction(
  rfqId: string,
): Promise<CreatePurchaseOrderActionResult> {
  try {
    const purchaseOrder =
      await createPurchaseOrderFromAward(rfqId);

    return {
      success: true,
      purchaseOrderId: purchaseOrder.id,
      purchaseOrderNumber: purchaseOrder.po_number,
    };
  } catch (error) {
    console.error(
      "Failed to create Purchase Order:",
      error,
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to create Purchase Order.",
    };
  }
}
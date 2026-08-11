"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";

export interface SendPurchaseOrderActionResult {
  success: boolean;
  message: string;
}

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

export async function markPurchaseOrderSentAction(
  purchaseOrderId: string,
): Promise<SendPurchaseOrderActionResult> {
  try {
    const id =
      purchaseOrderId.trim();

    if (!id) {
      return {
        success: false,
        message:
          "Purchase Order ID is required.",
      };
    }

    const {
      supabase,
      profile,
    } = await requireAdmin();

    const {
      data: purchaseOrder,
      error: loadError,
    } = await supabase
      .from("purchase_orders")
      .select(`
        id,
        po_number,
        status
      `)
      .eq("id", id)
      .maybeSingle();

    if (loadError) {
      return {
        success: false,
        message:
          `Unable to load Purchase Order: ${loadError.message}`,
      };
    }

    if (!purchaseOrder) {
      return {
        success: false,
        message:
          "Purchase Order was not found.",
      };
    }

    if (
      purchaseOrder.status !==
      "approved"
    ) {
      return {
        success: false,
        message:
          `Purchase Order ${purchaseOrder.po_number} cannot be marked as sent because its current status is ${purchaseOrder.status}.`,
      };
    }

    const now =
      new Date().toISOString();

    const {
      data: updatedPurchaseOrder,
      error: updateError,
    } = await supabase
      .from("purchase_orders")
      .update({
        status:
          "sent",

        sent_at:
          now,

        updated_at:
          now,

        updated_by:
          profile.id,
      })
      .eq(
        "id",
        id,
      )
      .eq(
        "status",
        "approved",
      )
      .select(`
        id,
        po_number,
        status,
        sent_at
      `)
      .maybeSingle();

    if (updateError) {
      return {
        success: false,
        message:
          `Unable to mark Purchase Order as sent: ${updateError.message}`,
      };
    }

    if (!updatedPurchaseOrder) {
      return {
        success: false,
        message:
          "The Purchase Order changed before it could be marked as sent. Refresh and try again.",
      };
    }

    revalidatePath(
      `/admin/purchase-orders/${id}`,
    );

    revalidatePath(
      "/admin/purchase-orders",
    );

    revalidatePath(
      "/admin/purchasing",
    );

    return {
      success: true,
      message:
        `${updatedPurchaseOrder.po_number} marked as sent to supplier.`,
    };
  } catch (error) {
    return {
      success: false,

      message:
        getErrorMessage(
          error,
          "Unable to mark Purchase Order as sent.",
        ),
    };
  }
}
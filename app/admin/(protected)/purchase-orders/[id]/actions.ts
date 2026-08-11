"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";

export interface ApprovePurchaseOrderActionResult {
  success: boolean;
  message: string;
}

/* =========================================================
 * Helpers
 * ========================================================= */

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
 * Approve Purchase Order
 * ========================================================= */

export async function approvePurchaseOrderAction(
  purchaseOrderId: string,
): Promise<ApprovePurchaseOrderActionResult> {
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

    /*
     * Read the current status first.
     *
     * Approval is only valid from Draft.
     */
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
      "draft"
    ) {
      return {
        success: false,
        message:
          `Purchase Order ${purchaseOrder.po_number} cannot be approved because its current status is ${purchaseOrder.status}.`,
      };
    }

    const approvedAt =
      new Date().toISOString();

    /*
     * The additional status = draft filter provides
     * optimistic concurrency protection.
     *
     * If another user approves/cancels the PO between
     * the SELECT and UPDATE, this UPDATE will not match.
     */
    const {
      data: approvedPurchaseOrder,
      error: updateError,
    } = await supabase
      .from("purchase_orders")
      .update({
        status:
          "approved",

        approved_at:
          approvedAt,

        approved_by:
          profile.id,

        updated_at:
          approvedAt,

        updated_by:
          profile.id,
      })
      .eq(
        "id",
        id,
      )
      .eq(
        "status",
        "draft",
      )
      .select(`
        id,
        po_number,
        status
      `)
      .maybeSingle();

    if (updateError) {
      return {
        success: false,
        message:
          `Unable to approve Purchase Order: ${updateError.message}`,
      };
    }

    if (!approvedPurchaseOrder) {
      return {
        success: false,
        message:
          "The Purchase Order changed before approval could be completed. Refresh the page and try again.",
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

    revalidatePath(
      "/admin/purchasing/reorder",
    );

    return {
      success: true,
      message:
        `${approvedPurchaseOrder.po_number} approved successfully.`,
    };
  } catch (error) {
    return {
      success: false,

      message:
        getErrorMessage(
          error,
          "Unable to approve Purchase Order.",
        ),
    };
  }
}
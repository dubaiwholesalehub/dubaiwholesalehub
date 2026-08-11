"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";

export interface UpdateGoodsReceiptItemsState {
  status:
    | "idle"
    | "success"
    | "error";

  message: string;
}

function numberFromForm(
  formData: FormData,
  key: string,
): number {
  const value =
    Number(
      formData.get(key) ??
        0,
    );

  return Number.isFinite(value)
    ? value
    : 0;
}

export async function updateGoodsReceiptItemsAction(
  previousState:
    UpdateGoodsReceiptItemsState,
  formData: FormData,
): Promise<UpdateGoodsReceiptItemsState> {
  void previousState;

  try {
    const goodsReceiptId =
      String(
        formData.get(
          "goodsReceiptId",
        ) ?? "",
      ).trim();

    if (!goodsReceiptId) {
      return {
        status: "error",
        message:
          "Goods Receipt ID is missing.",
      };
    }

    const {
      supabase,
    } =
      await requireAdmin();

    /*
     * Make sure this GRN is still editable.
     */
    const {
      data: receipt,
      error: receiptError,
    } = await supabase
      .from("goods_receipts")
      .select(`
        id,
        receipt_number,
        status
      `)
      .eq(
        "id",
        goodsReceiptId,
      )
      .maybeSingle();

    if (receiptError) {
      return {
        status: "error",
        message:
          `Unable to load Goods Receipt: ${receiptError.message}`,
      };
    }

    if (!receipt) {
      return {
        status: "error",
        message:
          "Goods Receipt was not found.",
      };
    }

    if (
      receipt.status ===
        "completed" ||
      receipt.status ===
        "cancelled"
    ) {
      return {
        status: "error",
        message:
          `${receipt.receipt_number} can no longer be edited.`,
      };
    }

    /*
     * Browser submits item IDs only.
     * Load authoritative values from database.
     */
    const itemIds =
      formData
        .getAll("itemId")
        .map((value) =>
          String(value).trim(),
        )
        .filter(Boolean);

    if (
      itemIds.length ===
      0
    ) {
      return {
        status: "error",
        message:
          "Goods Receipt does not contain any items.",
      };
    }

    const {
      data: databaseItems,
      error: itemLoadError,
    } = await supabase
      .from(
        "goods_receipt_items",
      )
      .select(`
        id,
        goods_receipt_id,
        ordered_quantity,
        previously_received_quantity
      `)
      .eq(
        "goods_receipt_id",
        goodsReceiptId,
      )
      .in(
        "id",
        itemIds,
      );

    if (itemLoadError) {
      return {
        status: "error",
        message:
          `Unable to load Goods Receipt items: ${itemLoadError.message}`,
      };
    }

    if (
      databaseItems.length !==
      itemIds.length
    ) {
      return {
        status: "error",
        message:
          "One or more Goods Receipt items could not be found.",
      };
    }

    for (
      const item of
      databaseItems
    ) {
      const receiving =
        numberFromForm(
          formData,
          `receiving:${item.id}`,
        );

      const accepted =
        numberFromForm(
          formData,
          `accepted:${item.id}`,
        );

      const rejected =
        numberFromForm(
          formData,
          `rejected:${item.id}`,
        );

      const damaged =
        numberFromForm(
          formData,
          `damaged:${item.id}`,
        );

      const rejectionReason =
        String(
          formData.get(
            `rejectionReason:${item.id}`,
          ) ?? "",
        ).trim();

      const notes =
        String(
          formData.get(
            `notes:${item.id}`,
          ) ?? "",
        ).trim();

      const orderedQuantity =
        Number(
          item.ordered_quantity ??
            0,
        );

      const previouslyReceived =
        Number(
          item.previously_received_quantity ??
            0,
        );

      const maximumReceiving =
        Math.max(
          orderedQuantity -
            previouslyReceived,
          0,
        );

      /*
       * Basic quantity validation.
       */
      if (
        receiving <
          0 ||
        accepted <
          0 ||
        rejected <
          0 ||
        damaged <
          0
      ) {
        return {
          status: "error",
          message:
            "Receiving quantities cannot be negative.",
        };
      }

      if (
        receiving >
        maximumReceiving
      ) {
        return {
          status: "error",
          message:
            `Receiving quantity cannot exceed the remaining quantity of ${maximumReceiving}.`,
        };
      }

      /*
       * Zero receiving is allowed while editing a draft.
       * Completion will require valid positive receiving
       * quantities.
       */

      const inspectionTotal =
        accepted +
        rejected +
        damaged;

      /*
       * All inspection fields zero means:
       *
       * accepted = receiving
       *
       * automatically during Complete Goods Receipt.
       */
      if (
        inspectionTotal >
          0 &&
        Math.abs(
          inspectionTotal -
            receiving,
        ) >
          0.0001
      ) {
        return {
          status: "error",
          message:
            "Accepted + Rejected + Damaged must equal Receiving quantity.",
        };
      }

      if (
        rejected >
          0 &&
        !rejectionReason
      ) {
        return {
          status: "error",
          message:
            "Please enter a rejection reason when rejected quantity is greater than zero.",
        };
      }

      let inspectionStatus:
        | "pending"
        | "accepted"
        | "partially_accepted"
        | "rejected";

      if (
        inspectionTotal ===
        0
      ) {
        inspectionStatus =
          "pending";
      } else if (
        accepted ===
          receiving &&
        rejected ===
          0 &&
        damaged ===
          0
      ) {
        inspectionStatus =
          "accepted";
      } else if (
        accepted ===
          0 &&
        rejected +
          damaged ===
          receiving
      ) {
        inspectionStatus =
          "rejected";
      } else {
        inspectionStatus =
          "partially_accepted";
      }

      const {
        error:
          updateError,
      } = await supabase
        .from(
          "goods_receipt_items",
        )
        .update({
          receiving_quantity:
            receiving,

          accepted_quantity:
            accepted,

          rejected_quantity:
            rejected,

          damaged_quantity:
            damaged,

          inspection_status:
            inspectionStatus,

          rejection_reason:
            rejectionReason ||
            null,

          notes:
            notes ||
            null,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          item.id,
        )
        .eq(
          "goods_receipt_id",
          goodsReceiptId,
        );

      if (updateError) {
        return {
          status: "error",

          message:
            `Unable to update Goods Receipt item: ${updateError.message}`,
        };
      }
    }

    revalidatePath(
      `/admin/goods-receipts/${goodsReceiptId}`,
    );

    revalidatePath(
      "/admin/goods-receipts",
    );

    return {
      status: "success",
      message:
        "Receiving quantities saved successfully.",
    };
  } catch (error) {
    return {
      status: "error",

      message:
        error instanceof Error
          ? error.message
          : "Unable to save Goods Receipt quantities.",
    };
  }
}
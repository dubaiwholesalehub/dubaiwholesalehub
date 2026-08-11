"use server";

import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import {
  postManualInventoryTransaction,
} from "@/lib/inventory/inventory-operation.repository";
import {
  stockAdjustmentSchema,
} from "@/schemas/stock-adjustment.schema";

function redirectWithMessage(
  type: "success" | "error",
  message: string,
): never {
  redirect(
    `/admin/inventory/operations/adjust-stock?${type}=${encodeURIComponent(
      message,
    )}`,
  );
}

function formatReason(
  reason: string,
): string {
  return reason
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1),
    )
    .join(" ");
}

export async function postStockAdjustment(
  formData: FormData,
): Promise<void> {
  await requireAdmin();

  const rawItems = String(
    formData.get("items") ??
      "[]",
  );

  let items: unknown;

  try {
    items =
      JSON.parse(rawItems);
  } catch {
    redirectWithMessage(
      "error",
      "Adjustment items could not be read.",
    );
  }

  const parsed =
    stockAdjustmentSchema.safeParse({
      adjustmentType: String(
        formData.get(
          "adjustmentType",
        ) ?? "",
      ),

      warehouseId: String(
        formData.get(
          "warehouseId",
        ) ?? "",
      ),

      transactionDate: String(
        formData.get(
          "transactionDate",
        ) ?? "",
      ),

      reason: String(
        formData.get("reason") ??
          "",
      ),

      referenceNumber:
        String(
          formData.get(
            "referenceNumber",
          ) ?? "",
        ) || undefined,

      internalNotes:
        String(
          formData.get(
            "internalNotes",
          ) ?? "",
        ) || undefined,

      items,
    });

  if (!parsed.success) {
    redirectWithMessage(
      "error",
      parsed.error.issues[0]
        ?.message ??
        "Please check the stock adjustment.",
    );
  }

  const reasonLabel =
    formatReason(
      parsed.data.reason,
    );

  const transactionId =
    await postManualInventoryTransaction({
      transactionType:
        parsed.data
          .adjustmentType,

      warehouseId:
        parsed.data.warehouseId,

      transactionDate:
        parsed.data
          .transactionDate,

      referenceNumber:
        parsed.data
          .referenceNumber,

      description:
        `${reasonLabel} stock adjustment`,

      internalNotes:
        parsed.data
          .internalNotes,

      items:
        parsed.data.items.map(
          (item) => ({
            productId:
              item.productId,

            quantity:
              item.quantity,

            unitCost:
              typeof item.unitCost ===
              "number"
                ? item.unitCost
                : undefined,

            notes:
              [
                `Reason: ${reasonLabel}`,
                item.notes,
              ]
                .filter(Boolean)
                .join(" — "),
          }),
        ),
    });

  redirect(
    `/admin/inventory/transactions/${transactionId}`,
  );
}
"use server";

import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import {
  postManualInventoryTransaction,
} from "@/lib/inventory/inventory-operation.repository";
import {
  stockCountSchema,
} from "@/schemas/stock-count.schema";

function redirectWithMessage(
  type: "success" | "error",
  message: string,
): never {
  redirect(
    `/admin/inventory/operations/stock-count?${type}=${encodeURIComponent(
      message,
    )}`,
  );
}

export async function postStockCount(
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
      "Stock count items could not be read.",
    );
  }

  const parsed =
    stockCountSchema.safeParse({
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
        "Please check the stock count.",
    );
  }

  const transactionId =
    await postManualInventoryTransaction({
      transactionType:
        "stock_count",

      warehouseId:
        parsed.data.warehouseId,

      transactionDate:
        parsed.data
          .transactionDate,

      referenceNumber:
        parsed.data
          .referenceNumber,

      description:
        "Physical stock count",

      internalNotes:
        parsed.data
          .internalNotes,

      items:
        parsed.data.items.map(
          (item) => ({
            productId:
              item.productId,

            quantity:
              item.countedQuantity,

            unitCost:
              typeof item.unitCost ===
              "number"
                ? item.unitCost
                : undefined,

            notes:
              item.notes,
          }),
        ),
    });

  redirect(
    `/admin/inventory/transactions/${transactionId}`,
  );
}
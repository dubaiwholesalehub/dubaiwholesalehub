"use server";

import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import {
  postManualInventoryTransaction,
} from "@/lib/inventory/inventory-operation.repository";
import {
  openingStockSchema,
} from "@/schemas/opening-stock.schema";

function redirectWithMessage(
  type: "success" | "error",
  message: string,
): never {
  redirect(
    `/admin/inventory/operations/opening-stock?${type}=${encodeURIComponent(
      message,
    )}`,
  );
}

export async function postOpeningStock(
  formData: FormData,
): Promise<void> {
  await requireAdmin();

  const rawItems = String(
    formData.get("items") ?? "[]",
  );

  let items: unknown;

  try {
    items = JSON.parse(rawItems);
  } catch {
    redirectWithMessage(
      "error",
      "Opening stock items could not be read.",
    );
  }

  const parsed =
    openingStockSchema.safeParse({
      warehouseId: String(
        formData.get("warehouseId") ?? "",
      ),

      transactionDate: String(
        formData.get("transactionDate") ?? "",
      ),

      referenceNumber:
        String(
          formData.get("referenceNumber") ?? "",
        ) || undefined,

      description:
        String(
          formData.get("description") ?? "",
        ) || undefined,

      internalNotes:
        String(
          formData.get("internalNotes") ?? "",
        ) || undefined,

      items,
    });

  if (!parsed.success) {
    redirectWithMessage(
      "error",
      parsed.error.issues[0]?.message ??
        "Please check the opening stock details.",
    );
  }

  const transactionId =
    await postManualInventoryTransaction({
      transactionType:
        "opening_balance",

      warehouseId:
        parsed.data.warehouseId,

      transactionDate:
        parsed.data.transactionDate,

      referenceNumber:
        parsed.data.referenceNumber,

      description:
        parsed.data.description,

      internalNotes:
        parsed.data.internalNotes,

      items:
        parsed.data.items,
    });

  redirect(
    `/admin/inventory/transactions/${transactionId}`,
  );
}
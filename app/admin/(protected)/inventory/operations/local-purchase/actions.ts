"use server";

import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import {
  postLocalPurchaseInventory,
} from "@/lib/inventory/inventory-operation.repository";
import {
  localPurchaseSchema,
} from "@/schemas/local-purchase.schema";

function redirectWithMessage(
  type: "success" | "error",
  message: string,
): never {
  redirect(
    `/admin/inventory/operations/local-purchase?${type}=${encodeURIComponent(
      message,
    )}`,
  );
}

export async function postLocalPurchase(
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
      "Purchase items could not be read.",
    );
  }

  const parsed =
    localPurchaseSchema.safeParse({
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

      supplierId:
        String(
          formData.get(
            "supplierId",
          ) ?? "",
        ) || undefined,

      storeName:
        String(
          formData.get(
            "storeName",
          ) ?? "",
        ) || undefined,

      receiptNumber:
        String(
          formData.get(
            "receiptNumber",
          ) ?? "",
        ) || undefined,

      paymentMethod: String(
        formData.get(
          "paymentMethod",
        ) ?? "",
      ),

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
        "Please check the local purchase details.",
    );
  }

  const transactionId =
    await postLocalPurchaseInventory({
      warehouseId:
        parsed.data.warehouseId,

      transactionDate:
        parsed.data
          .transactionDate,

      supplierId:
        parsed.data.supplierId,

      storeName:
        parsed.data.storeName,

      receiptNumber:
        parsed.data
          .receiptNumber,

      paymentMethod:
        parsed.data
          .paymentMethod,

      internalNotes:
        parsed.data
          .internalNotes,

      items:
        parsed.data.items,
    });

  redirect(
    `/admin/inventory/transactions/${transactionId}`,
  );
}
"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function requireFormValue(
  formData: FormData,
  fieldName: string,
): string {
  const value = formData.get(fieldName);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} is required.`);
  }

  return value.trim();
}

export async function createDraftGoodsReceiptAction(
  formData: FormData,
): Promise<never> {
  const purchaseOrderId = requireFormValue(
    formData,
    "purchaseOrderId",
  );

  const warehouseId = requireFormValue(
    formData,
    "warehouseId",
  );

  const supabase = await createClient();

  const {
    data: {
      user,
    },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(
      "You must be signed in to create a Goods Receipt.",
    );
  }

  const { data, error } = await supabase.rpc(
    "create_draft_goods_receipt",
    {
      target_purchase_order_id: purchaseOrderId,
      target_warehouse_id: warehouseId,
    },
  );

  if (error) {
    throw new Error(
      `Unable to create draft Goods Receipt: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "The Goods Receipt was not created.",
    );
  }

  redirect(`/admin/goods-receipts/${data}`);
}
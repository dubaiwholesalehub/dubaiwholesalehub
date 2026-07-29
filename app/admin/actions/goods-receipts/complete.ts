"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export interface CompleteGoodsReceiptState {
    status: "idle" | "success" | "error";
    message: string;
}

export async function completeGoodsReceipt(
    _previousState: CompleteGoodsReceiptState,
    formData: FormData,
): Promise<CompleteGoodsReceiptState> {
    const goodsReceiptId = formData.get("goodsReceiptId");

    if (
        typeof goodsReceiptId !== "string" ||
        goodsReceiptId.trim().length === 0
    ) {
        return {
            status: "error",
            message: "Goods Receipt ID is missing.",
        };
    }

    const supabase = await createClient();

    const {
        data: inventoryTransactionId,
        error,
    } = await supabase.rpc("complete_goods_receipt", {
        p_goods_receipt_id: goodsReceiptId,
    });

    if (error) {
        return {
            status: "error",
            message: error.message,
        };
    }

    revalidatePath("/admin/goods-receipts");
    revalidatePath(`/admin/goods-receipts/${goodsReceiptId}`);
    revalidatePath("/admin/purchase-orders");
    revalidatePath("/admin/inventory");

    return {
        status: "success",
        message: inventoryTransactionId
            ? `Goods Receipt completed successfully. Inventory transaction: ${inventoryTransactionId}`
            : "Goods Receipt completed successfully.",
    };
}
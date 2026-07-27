import { createClient } from "@/lib/supabase/server";

import type {
    GoodsReceiptItem,
    InspectionStatus,
} from "./goods-receipt.repository";

export interface GoodsReceiptItemDetail
    extends GoodsReceiptItem {
    product: {
        id: string;
        sku: string;
        name: string;
    };

    purchase_order_item: {
        id: string;
        line_number: number;
        ordered_quantity: number;
        unit_price: number;
    };
}

export async function getGoodsReceiptItems(
    goodsReceiptId: string,
): Promise<GoodsReceiptItemDetail[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("goods_receipt_items")
        .select(`
            *,
            product:products (
            id,
            sku,
            name
            ),
            purchase_order_item:purchase_order_items!goods_receipt_items_purchase_order_item_id_fkey (
            id,
            line_number,
            ordered_quantity,
            unit_price
            )
        `)
        .eq("goods_receipt_id", goodsReceiptId)
        .order("line_number");

    if (error) {
        throw new Error(
            `Failed to load goods receipt items: ${error.message}`,
        );
    }

    return (data ?? []) as GoodsReceiptItemDetail[];
}

interface UpdateGoodsReceiptItemInput {
    receiving_quantity?: number;

    accepted_quantity?: number;

    rejected_quantity?: number;

    damaged_quantity?: number;

    inspection_status?: InspectionStatus;

    rejection_reason?: string | null;

    notes?: string | null;
}

export async function updateGoodsReceiptItem(
    id: string,
    input: UpdateGoodsReceiptItemInput,
): Promise<GoodsReceiptItem> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("goods_receipt_items")
        .update({
            ...input,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();

    if (error) {
        throw new Error(
            `Failed to update goods receipt item: ${error.message}`,
        );
    }

    return data as GoodsReceiptItem;
}

export async function deleteGoodsReceiptItem(
    id: string,
): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("goods_receipt_items")
        .delete()
        .eq("id", id);

    if (error) {
        throw new Error(
            `Failed to delete goods receipt item: ${error.message}`,
        );
    }
}


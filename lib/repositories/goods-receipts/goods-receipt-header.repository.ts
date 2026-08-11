import { createClient } from "@/lib/supabase/server";

import type {
  GoodsReceiptHeader,
  GoodsReceiptStatus,
} from "./goods-receipt.repository";

export interface GoodsReceiptHeaderDetail
  extends GoodsReceiptHeader {
  purchase_order: {
    id: string;
    po_number: string;
    status: string;
  };

  supplier: {
    id: string;
    company_name: string;
  };

  warehouse: {
    id: string;
    code: string;
    name: string;
  };
}

interface UpdateGoodsReceiptHeaderInput {
  warehouse_id?: string;
  status?: GoodsReceiptStatus;

  supplier_delivery_note_number?: string | null;
  supplier_invoice_number?: string | null;

  carrier_name?: string | null;
  vehicle_number?: string | null;
  tracking_number?: string | null;

  received_date?: string | null;

  internal_notes?: string | null;
  supplier_notes?: string | null;
}

export async function getGoodsReceiptHeaders(): Promise<
  GoodsReceiptHeaderDetail[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("goods_receipts")
    .select(`
      *,
      purchase_order:purchase_orders (
        id,
        po_number,
        status
      ),
      supplier:suppliers (
        id,
        company_name
      ),
      warehouse:warehouses (
        id,
        code,
        name
      )
    `)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Failed to load goods receipts: ${error.message}`,
    );
  }

  return (data ?? []) as GoodsReceiptHeaderDetail[];
}

export async function getGoodsReceiptHeaderById(
  id: string,
): Promise<GoodsReceiptHeaderDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("goods_receipts")
    .select(`
      *,
      purchase_order:purchase_orders (
        id,
        po_number,
        status
      ),
      supplier:suppliers (
        id,
        company_name
      ),
      warehouse:warehouses (
        id,
        code,
        name
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to load goods receipt: ${error.message}`,
    );
  }

  return data as GoodsReceiptHeaderDetail | null;
}

export async function updateGoodsReceiptHeader(
  id: string,
  input: UpdateGoodsReceiptHeaderInput,
): Promise<GoodsReceiptHeader> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("goods_receipts")
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Failed to update goods receipt: ${error.message}`,
    );
  }

  return data as GoodsReceiptHeader;
}
export async function getOpenGoodsReceiptForPurchaseOrder(
  purchaseOrderId: string,
): Promise<GoodsReceiptHeaderDetail | null> {
  const id =
    purchaseOrderId.trim();

  if (!id) {
    return null;
  }

  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase
    .from("goods_receipts")
    .select(`
      *,
      purchase_order:purchase_orders (
        id,
        po_number,
        status
      ),
      supplier:suppliers (
        id,
        company_name
      ),
      warehouse:warehouses (
        id,
        code,
        name
      )
    `)
    .eq(
      "purchase_order_id",
      id,
    )
    .neq(
      "status",
      "completed",
    )
    .neq(
      "status",
      "cancelled",
    )
    .order(
      "created_at",
      {
        ascending: false,
      },
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load open Goods Receipt: ${error.message}`,
    );
  }

  return data as
    | GoodsReceiptHeaderDetail
    | null;
}
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export type PurchaseOrder =
  Database["public"]["Tables"]["purchase_orders"]["Row"];

export type PurchaseOrderStatus =
  Database["public"]["Enums"]["purchase_order_status"];

export type PurchaseOrderSource =
  Database["public"]["Enums"]["purchase_order_source"];

function requireId(
  value: string,
  fieldName: string,
): string {
  const id = value.trim();

  if (!id) {
    throw new Error(`${fieldName} is required.`);
  }

  return id;
}

/**
 * Creates a draft Purchase Order from the quotation
 * awarded to an RFQ.
 */
export async function createPurchaseOrderFromAward(
  rfqId: string,
): Promise<PurchaseOrder> {
  const id = requireId(rfqId, "RFQ ID");

  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "create_purchase_order_from_award",
    {
      target_rfq_id: id,
    },
  );

  if (error) {
    throw new Error(
      `Unable to create Purchase Order: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "The Purchase Order was not created.",
    );
  }

  return data;
}
import { createClient } from "@/lib/supabase/server";

import type {
  PurchaseOrderDetailSummary,
} from "./purchase-order.repository";

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
 * Returns item and quantity totals for a Purchase Order.
 */
export async function getPurchaseOrderDetailSummary(
  purchaseOrderId: string,
): Promise<PurchaseOrderDetailSummary> {
  const id = requireId(
    purchaseOrderId,
    "Purchase Order ID",
  );

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("purchase_order_items")
    .select(
      `
        ordered_quantity,
        received_quantity
      `,
    )
    .eq("purchase_order_id", id);

  if (error) {
    throw new Error(
      `Unable to load Purchase Order summary: ${error.message}`,
    );
  }

  const items = data ?? [];

  const totalOrderedQuantity = items.reduce(
    (total, item) =>
      total + Number(item.ordered_quantity ?? 0),
    0,
  );

  const totalReceivedQuantity = items.reduce(
    (total, item) =>
      total + Number(item.received_quantity ?? 0),
    0,
  );

  return {
    itemCount: items.length,
    totalOrderedQuantity,
    totalReceivedQuantity,
    remainingQuantity: Math.max(
      totalOrderedQuantity - totalReceivedQuantity,
      0,
    ),
  };
}
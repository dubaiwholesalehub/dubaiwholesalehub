import { createClient } from "@/lib/supabase/server";

export interface PurchaseOrderItem {
  id: string;
  product_id: string | null;
  sku: string | null;
  product_name: string;
  unit_name: string | null;

  ordered_quantity: number;
  received_quantity: number;
  remaining_quantity: number;

  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  line_total: number;
}

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

export async function getPurchaseOrderItems(
  purchaseOrderId: string,
): Promise<PurchaseOrderItem[]> {
  const id = requireId(
    purchaseOrderId,
    "Purchase Order ID",
  );

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("purchase_order_items")
    .select(`
      id,
      product_id,
      ordered_quantity,
      received_quantity,
      unit_price,
      discount_amount,
      tax_amount,
      line_total,

      products (
        sku,
        name
      ),

      units (
        name
      )
    `)
    .eq("purchase_order_id", id)
    .order("created_at");

  if (error) {
    throw new Error(
      `Unable to load Purchase Order Items: ${error.message}`,
    );
  }

  return (data ?? []).map((item: any) => ({
    id: item.id,

    product_id: item.product_id,

    sku: item.products?.sku ?? null,

    product_name:
      item.products?.name ??
      "Unknown Product",

    unit_name:
      item.units?.name ?? null,

    ordered_quantity:
      Number(item.ordered_quantity ?? 0),

    received_quantity:
      Number(item.received_quantity ?? 0),

    remaining_quantity:
      Math.max(
        Number(item.ordered_quantity ?? 0) -
          Number(item.received_quantity ?? 0),
        0,
      ),

    unit_price:
      Number(item.unit_price ?? 0),

    discount_amount:
      Number(item.discount_amount ?? 0),

    tax_amount:
      Number(item.tax_amount ?? 0),

    line_total:
      Number(item.line_total ?? 0),
  }));
}
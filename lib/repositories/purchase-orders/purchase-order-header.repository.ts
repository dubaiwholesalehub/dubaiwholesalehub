import { createClient } from "@/lib/supabase/server";

import type {
  PurchaseOrderHeader,
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
 * Returns a Purchase Order together with its supplier
 * contact information.
 */
export async function getPurchaseOrderHeaderById(
  purchaseOrderId: string,
): Promise<PurchaseOrderHeader | null> {
  const id = requireId(
    purchaseOrderId,
    "Purchase Order ID",
  );

  const supabase = await createClient();

  const { data: purchaseOrder, error } =
    await supabase
      .from("purchase_orders")
      .select("*")
      .eq("id", id)
      .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load Purchase Order: ${error.message}`,
    );
  }

  if (!purchaseOrder) {
    return null;
  }

  const { data: supplier, error: supplierError } =
    await supabase
      .from("suppliers")
      .select(
        `
          id,
          company_name,
          contact_name,
          phone,
          whatsapp,
          email,
          address,
          city
        `,
      )
      .eq("id", purchaseOrder.supplier_id)
      .maybeSingle();

  if (supplierError) {
    throw new Error(
      `Unable to load Purchase Order supplier: ${supplierError.message}`,
    );
  }

  if (!supplier) {
    throw new Error(
      "The supplier connected to this Purchase Order could not be found.",
    );
  }

  return {
    ...purchaseOrder,
    supplier,
  };
}
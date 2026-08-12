"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  requireAdmin,
} from "@/lib/auth/require-admin";

export async function mapPurchaseOrderItemProduct(
  formData: FormData,
) {
  const purchaseOrderId =
    String(
      formData.get(
        "purchaseOrderId",
      ) ?? "",
    ).trim();

  const purchaseOrderItemId =
    String(
      formData.get(
        "purchaseOrderItemId",
      ) ?? "",
    ).trim();

  const productId =
    String(
      formData.get(
        "productId",
      ) ?? "",
    ).trim();

  if (
    !purchaseOrderId ||
    !purchaseOrderItemId ||
    !productId
  ) {
    throw new Error(
      "Purchase Order item and product are required.",
    );
  }

  const {
    supabase,
  } = await requireAdmin();

  /*
   * Confirm this PO can still receive stock.
   */
  const {
    data: purchaseOrder,
    error: purchaseOrderError,
  } = await supabase
    .from("purchase_orders")
    .select(`
      id,
      status
    `)
    .eq(
      "id",
      purchaseOrderId,
    )
    .maybeSingle();

  if (purchaseOrderError) {
    throw new Error(
      `Unable to load Purchase Order: ${purchaseOrderError.message}`,
    );
  }

  if (!purchaseOrder) {
    throw new Error(
      "Purchase Order was not found.",
    );
  }

  if (
    ![
      "draft",
      "approved",
      "sent",
      "partially_received",
    ].includes(
      purchaseOrder.status,
    )
  ) {
    throw new Error(
      "Products cannot be remapped on this Purchase Order status.",
    );
  }

  /*
   * Verify selected product really exists.
   */
  const {
    data: product,
    error: productError,
  } = await supabase
    .from("products")
    .select(`
      id,
      name,
      status
    `)
    .eq(
      "id",
      productId,
    )
    .maybeSingle();

  if (productError) {
    throw new Error(
      `Unable to verify product: ${productError.message}`,
    );
  }

  if (!product) {
    throw new Error(
      "Selected product was not found.",
    );
  }

  /*
   * Verify this item belongs to this PO and
   * has not already been received.
   */
  const {
    data: purchaseOrderItem,
    error: itemError,
  } = await supabase
    .from(
      "purchase_order_items",
    )
    .select(`
      id,
      product_id,
      received_quantity
    `)
    .eq(
      "id",
      purchaseOrderItemId,
    )
    .eq(
      "purchase_order_id",
      purchaseOrderId,
    )
    .maybeSingle();

  if (itemError) {
    throw new Error(
      `Unable to load Purchase Order item: ${itemError.message}`,
    );
  }

  if (!purchaseOrderItem) {
    throw new Error(
      "Purchase Order item was not found.",
    );
  }

  if (
    Number(
      purchaseOrderItem.received_quantity ??
        0,
    ) > 0
  ) {
    throw new Error(
      "A Purchase Order item that has already been received cannot be remapped.",
    );
  }

  const {
    error: updateError,
  } = await supabase
    .from(
      "purchase_order_items",
    )
    .update({
      product_id:
        productId,
    })
    .eq(
      "id",
      purchaseOrderItemId,
    )
    .eq(
      "purchase_order_id",
      purchaseOrderId,
    );

  if (updateError) {
    throw new Error(
      `Unable to map product: ${updateError.message}`,
    );
  }

  revalidatePath(
    `/admin/purchase-orders/${purchaseOrderId}`,
  );

  revalidatePath(
    "/admin/purchase-orders",
  );
}
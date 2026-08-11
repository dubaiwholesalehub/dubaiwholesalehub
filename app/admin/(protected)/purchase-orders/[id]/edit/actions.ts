"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";

interface EditablePoItemInput {
  id: string;
  quantity: number;
  unitPrice: number;
}

function toFiniteNumber(
  value: FormDataEntryValue | null,
): number {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

export async function updatePurchaseOrderAction(
  formData: FormData,
): Promise<void> {
  const purchaseOrderId =
    String(
      formData.get("purchaseOrderId") ??
        "",
    ).trim();

  if (!purchaseOrderId) {
    throw new Error(
      "Purchase Order ID is required.",
    );
  }

  const {
    supabase,
    profile,
  } = await requireAdmin();

  const {
    data: purchaseOrder,
    error: poError,
  } = await supabase
    .from("purchase_orders")
    .select(`
      id,
      po_number,
      status
    `)
    .eq(
      "id",
      purchaseOrderId,
    )
    .maybeSingle();

  if (poError) {
    throw new Error(
      `Unable to load Purchase Order: ${poError.message}`,
    );
  }

  if (!purchaseOrder) {
    throw new Error(
      "Purchase Order was not found.",
    );
  }

  if (
    purchaseOrder.status !==
    "draft"
  ) {
    throw new Error(
      "Only draft Purchase Orders can be edited.",
    );
  }

  const itemIds =
    formData
      .getAll("itemId")
      .map(
        (value) =>
          String(value).trim(),
      )
      .filter(Boolean);

  const items:
    EditablePoItemInput[] =
    itemIds.map(
      (itemId) => ({
        id: itemId,

        quantity:
          toFiniteNumber(
            formData.get(
              `quantity:${itemId}`,
            ),
          ),

        unitPrice:
          toFiniteNumber(
            formData.get(
              `unitPrice:${itemId}`,
            ),
          ),
      }),
    );

  if (
    items.length === 0
  ) {
    throw new Error(
      "Purchase Order must contain at least one item.",
    );
  }

  for (
    const item of
    items
  ) {
    if (
      item.quantity <=
      0
    ) {
      throw new Error(
        "Quantity must be greater than zero.",
      );
    }

    if (
      item.unitPrice <
      0
    ) {
      throw new Error(
        "Unit price cannot be negative.",
      );
    }
  }

  /*
   * Load current item-level discount/tax values.
   * We preserve them in v1 and only change quantity/price.
   */

  const {
    data: existingItems,
    error: itemLoadError,
  } = await supabase
    .from(
      "purchase_order_items",
    )
    .select(`
      id,
      discount_amount,
      tax_amount
    `)
    .eq(
      "purchase_order_id",
      purchaseOrderId,
    );

  if (itemLoadError) {
    throw new Error(
      `Unable to load Purchase Order items: ${itemLoadError.message}`,
    );
  }

  const existingById =
    new Map(
      (
        existingItems ??
        []
      ).map(
        (item) => [
          item.id,
          item,
        ],
      ),
    );

  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;

  for (
    const item of
    items
  ) {
    const existing =
      existingById.get(
        item.id,
      );

    if (!existing) {
      throw new Error(
        "One of the Purchase Order items is no longer available.",
      );
    }

    const gross =
      item.quantity *
      item.unitPrice;

    const discount =
      Number(
        existing.discount_amount ??
          0,
      );

    const tax =
      Number(
        existing.tax_amount ??
          0,
      );

    const lineTotal =
      Math.max(
        gross -
          discount +
          tax,
        0,
      );

    const {
      error: updateItemError,
    } = await supabase
      .from(
        "purchase_order_items",
      )
      .update({
        ordered_quantity:
          item.quantity,

        unit_price:
          item.unitPrice,

        line_total:
          lineTotal,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        item.id,
      )
      .eq(
        "purchase_order_id",
        purchaseOrderId,
      );

    if (updateItemError) {
      throw new Error(
        `Unable to update Purchase Order item: ${updateItemError.message}`,
      );
    }

    subtotal += gross;
    totalDiscount +=
      discount;
    totalTax += tax;
  }

  /*
   * Preserve existing header charges and recalculate grand total.
   */

  const {
    data: totals,
    error: totalsError,
  } = await supabase
    .from("purchase_orders")
    .select(`
      shipping_amount,
      other_charges
    `)
    .eq(
      "id",
      purchaseOrderId,
    )
    .single();

  if (totalsError) {
    throw new Error(
      `Unable to load Purchase Order charges: ${totalsError.message}`,
    );
  }

  const shippingAmount =
    Number(
      totals.shipping_amount ??
        0,
    );

  const otherCharges =
    Number(
      totals.other_charges ??
        0,
    );

  const totalAmount =
    subtotal -
    totalDiscount +
    totalTax +
    shippingAmount +
    otherCharges;

  const now =
    new Date().toISOString();

  const {
    error: headerUpdateError,
  } = await supabase
    .from("purchase_orders")
    .update({
      subtotal,

      discount_amount:
        totalDiscount,

      tax_amount:
        totalTax,

      total_amount:
        totalAmount,

      updated_at:
        now,

      updated_by:
        profile.id,
    })
    .eq(
      "id",
      purchaseOrderId,
    )
    .eq(
      "status",
      "draft",
    );

  if (
    headerUpdateError
  ) {
    throw new Error(
      `Unable to update Purchase Order totals: ${headerUpdateError.message}`,
    );
  }

  revalidatePath(
    `/admin/purchase-orders/${purchaseOrderId}`,
  );

  revalidatePath(
    "/admin/purchase-orders",
  );

  revalidatePath(
    "/admin/purchasing",
  );

  revalidatePath(
    "/admin/purchasing/reorder",
  );

  redirect(
    `/admin/purchase-orders/${purchaseOrderId}`,
  );
}
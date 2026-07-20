import { createClient } from "@/lib/supabase/server";

import type { Database } from "@/lib/database.types";

type RfqItemInsert =
  Database["public"]["Tables"]["rfq_items"]["Insert"];

type RfqItemUpdate =
  Database["public"]["Tables"]["rfq_items"]["Update"];

export type CreateRfqItemInput = {
  rfqId: string;
  productId?: string;
  itemName: string;
  itemDescription?: string;
  productSku?: string;
  requestedQuantity: number;
  unitId?: string;
  targetUnitPrice?: number;
  targetCurrencyCode?: string;
  targetDeliveryDate?: string;
  specifications?: string;
  packagingRequirements?: string;
  notes?: string;
};

export type UpdateRfqItemInput = {
  id: string;
  productId?: string;
  itemName: string;
  itemDescription?: string;
  productSku?: string;
  requestedQuantity: number;
  unitId?: string;
  targetUnitPrice?: number;
  targetCurrencyCode?: string;
  targetDeliveryDate?: string;
  specifications?: string;
  packagingRequirements?: string;
  notes?: string;
};

function emptyToNull(
  value: string | undefined,
): string | null {
  const cleaned = value?.trim();

  return cleaned ? cleaned : null;
}

function normalizeOptionalCurrencyCode(
  value: string | undefined,
): string | null {
  const currencyCode =
    value?.trim().toUpperCase();

  if (!currencyCode) {
    return null;
  }

  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    throw new Error(
      "Currency code must contain exactly three letters.",
    );
  }

  return currencyCode;
}

function validateQuantity(
  quantity: number,
): number {
  if (
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    throw new Error(
      "Requested quantity must be greater than zero.",
    );
  }

  return quantity;
}

function validateOptionalPrice(
  price: number | undefined,
): number | null {
  if (price === undefined) {
    return null;
  }

  if (
    !Number.isFinite(price) ||
    price < 0
  ) {
    throw new Error(
      "Target unit price cannot be negative.",
    );
  }

  return price;
}

function buildRfqItemPayload(
  input:
    | CreateRfqItemInput
    | UpdateRfqItemInput,
) {
  const itemName = input.itemName.trim();

  if (!itemName) {
    throw new Error(
      "RFQ item name is required.",
    );
  }

  return {
    product_id:
      emptyToNull(input.productId),
    item_name: itemName,
    item_description:
      emptyToNull(input.itemDescription),
    product_sku:
      emptyToNull(input.productSku),
    requested_quantity:
      validateQuantity(
        input.requestedQuantity,
      ),
    unit_id:
      emptyToNull(input.unitId),
    target_unit_price:
      validateOptionalPrice(
        input.targetUnitPrice,
      ),
    target_currency_code:
      normalizeOptionalCurrencyCode(
        input.targetCurrencyCode,
      ),
    target_delivery_date:
      emptyToNull(
        input.targetDeliveryDate,
      ),
    specifications:
      emptyToNull(input.specifications),
    packaging_requirements:
      emptyToNull(
        input.packagingRequirements,
      ),
    notes:
      emptyToNull(input.notes),
  };
}

export async function getRfqItems(
  rfqId: string,
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rfq_items")
    .select(`
      id,
      rfq_id,
      product_id,
      line_number,
      item_name,
      item_description,
      product_sku,
      requested_quantity,
      unit_id,
      target_unit_price,
      target_currency_code,
      target_delivery_date,
      specifications,
      packaging_requirements,
      notes,
      created_at,
      updated_at,
      product:products (
        id,
        sku,
        slug,
        status
      ),
      unit:units (
        id,
        name,
        short_name
      )
    `)
    .eq("rfq_id", rfqId)
    .order("line_number", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Unable to load RFQ items: ${error.message}`,
    );
  }

  return data ?? [];
}

export async function getRfqItemById(
  itemId: string,
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rfq_items")
    .select(`
      id,
      rfq_id,
      product_id,
      line_number,
      item_name,
      item_description,
      product_sku,
      requested_quantity,
      unit_id,
      target_unit_price,
      target_currency_code,
      target_delivery_date,
      specifications,
      packaging_requirements,
      notes,
      created_at,
      updated_at,
      product:products (
        id,
        sku,
        slug,
        status
      ),
      unit:units (
        id,
        name,
        short_name
      )
    `)
    .eq("id", itemId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load RFQ item: ${error.message}`,
    );
  }

  return data;
}

export async function createRfqItem(
  input: CreateRfqItemInput,
) {
  const supabase = await createClient();

  const { data: existingItems, error: countError } =
    await supabase
      .from("rfq_items")
      .select("line_number")
      .eq("rfq_id", input.rfqId)
      .order("line_number", {
        ascending: false,
      })
      .limit(1);

  if (countError) {
    throw new Error(
      `Unable to determine RFQ item position: ${countError.message}`,
    );
  }

  const highestLineNumber =
    existingItems?.[0]?.line_number ?? 0;

  const payload: RfqItemInsert = {
    rfq_id: input.rfqId,
    line_number:
      highestLineNumber + 1,
    ...buildRfqItemPayload(input),
  };

  const { data, error } = await supabase
    .from("rfq_items")
    .insert(payload)
    .select(`
      id,
      rfq_id,
      product_id,
      line_number,
      item_name,
      item_description,
      product_sku,
      requested_quantity,
      unit_id,
      target_unit_price,
      target_currency_code,
      target_delivery_date,
      specifications,
      packaging_requirements,
      notes,
      created_at,
      updated_at
    `)
    .single();

  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "The selected RFQ, product, or unit does not exist.",
      );
    }

    if (error.code === "23514") {
      throw new Error(
        "The RFQ item contains invalid quantity, price, or currency information.",
      );
    }

    if (error.code === "23505") {
      throw new Error(
        "An RFQ item already exists at this line position.",
      );
    }

    throw new Error(
      `Unable to create RFQ item: ${error.message}`,
    );
  }

  return data;
}
export async function bulkCreateRfqItems(
  rfqId: string,
  items: CreateRfqItemInput[],
) {
  if (items.length === 0) {
    return [];
  }

  const supabase = await createClient();

  const { data: existingItems, error: existingError } =
    await supabase
      .from("rfq_items")
      .select("line_number")
      .eq("rfq_id", rfqId)
      .order("line_number", {
        ascending: false,
      })
      .limit(1);

  if (existingError) {
    throw new Error(
      `Unable to determine line numbers: ${existingError.message}`,
    );
  }

  let nextLine =
    (existingItems?.[0]?.line_number ?? 0) + 1;

  const payload = items.map((item) => ({
    rfq_id: rfqId,
    line_number: nextLine++,
    ...buildRfqItemPayload(item),
  }));

  const { data, error } = await supabase
    .from("rfq_items")
    .insert(payload)
    .select();

  if (error) {
    throw new Error(
      `Unable to create RFQ items: ${error.message}`,
    );
  }

  return data;
}

export async function duplicateRfqItem(
  itemId: string,
) {
  const item = await getRfqItemById(itemId);

  if (!item) {
    throw new Error(
      "RFQ item not found.",
    );
  }

  return createRfqItem({
    rfqId: item.rfq_id,
    productId: item.product_id ?? undefined,
    itemName: item.item_name,
    itemDescription:
      item.item_description ?? undefined,
    productSku:
      item.product_sku ?? undefined,
    requestedQuantity:
      item.requested_quantity,
    unitId: item.unit_id ?? undefined,
    targetUnitPrice:
      item.target_unit_price ?? undefined,
    targetCurrencyCode:
      item.target_currency_code ??
      undefined,
    targetDeliveryDate:
      item.target_delivery_date ??
      undefined,
    specifications:
      item.specifications ?? undefined,
    packagingRequirements:
      item.packaging_requirements ??
      undefined,
    notes: item.notes ?? undefined,
  });
}

export async function reorderRfqItems(
  rfqId: string,
  orderedIds: string[],
) {
  const supabase = await createClient();

  for (
    let index = 0;
    index < orderedIds.length;
    index++
  ) {
    const { error } = await supabase
      .from("rfq_items")
      .update({
        line_number: index + 1,
      })
      .eq("rfq_id", rfqId)
      .eq("id", orderedIds[index]);

    if (error) {
      throw new Error(
        `Unable to reorder items: ${error.message}`,
      );
    }
  }

  return true;
}


export async function updateRfqItem(
  input: UpdateRfqItemInput,
) {
  const supabase = await createClient();

  const payload: RfqItemUpdate =
    buildRfqItemPayload(input);

  const { data, error } = await supabase
    .from("rfq_items")
    .update(payload)
    .eq("id", input.id)
    .select(`
      id,
      rfq_id,
      product_id,
      line_number,
      item_name,
      item_description,
      product_sku,
      requested_quantity,
      unit_id,
      target_unit_price,
      target_currency_code,
      target_delivery_date,
      specifications,
      packaging_requirements,
      notes,
      created_at,
      updated_at
    `)
    .maybeSingle();

  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "The selected product or unit does not exist.",
      );
    }

    if (error.code === "23514") {
      throw new Error(
        "The RFQ item contains invalid quantity, price, or currency information.",
      );
    }

    throw new Error(
      `Unable to update RFQ item: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "RFQ item was not found.",
    );
  }

  return data;
}

export async function deleteRfqItem(
  itemId: string,
) {
  const supabase = await createClient();

  const { data: item, error: itemError } =
    await supabase
      .from("rfq_items")
      .select(`
        id,
        rfq_id,
        line_number
      `)
      .eq("id", itemId)
      .maybeSingle();

  if (itemError) {
    throw new Error(
      `Unable to find RFQ item: ${itemError.message}`,
    );
  }

  if (!item) {
    throw new Error(
      "RFQ item was not found.",
    );
  }

  const { error: deleteError } =
    await supabase
      .from("rfq_items")
      .delete()
      .eq("id", item.id);

  if (deleteError) {
    if (deleteError.code === "23503") {
      throw new Error(
        "This RFQ item cannot be deleted because it is already referenced by a supplier quotation.",
      );
    }

    throw new Error(
      `Unable to delete RFQ item: ${deleteError.message}`,
    );
  }

  return item;
}

export type RfqItemList = Awaited<
  ReturnType<typeof getRfqItems>
>;

export type RfqItemSummary =
  RfqItemList[number];

export type RfqItemDetails = NonNullable<
  Awaited<
    ReturnType<typeof getRfqItemById>
  >
>;

export type CreatedRfqItem = Awaited<
  ReturnType<typeof createRfqItem>
>;

export type UpdatedRfqItem = Awaited<
  ReturnType<typeof updateRfqItem>
>;

export type DeletedRfqItem = Awaited<
  ReturnType<typeof deleteRfqItem>
>;

export type BulkCreatedRfqItems =
  Awaited<
    ReturnType<
      typeof bulkCreateRfqItems
    >
  >;
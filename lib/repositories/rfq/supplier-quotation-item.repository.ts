import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type SupplierQuotationItemInsert =
  Database["public"]["Tables"]["supplier_quotation_items"]["Insert"];

type SupplierQuotationItemUpdate =
  Database["public"]["Tables"]["supplier_quotation_items"]["Update"];

  export interface CreateSupplierQuotationItemInput {
  quotationId: string;
  rfqItemId: string;

  quotedQuantity: number;
  unitPrice: number;

  discountPercent?: number;
  discountAmount?: number;

  taxPercent?: number;
  taxAmount?: number;

  supplierSku?: string;

  availableQuantity?: number;

  moq?: number;

  leadTime?: string;
  leadTimeDays?: number;

  packaging?: string;
  warranty?: string;

  countryOfOriginId?: string;

  complianceNotes?: string;
  itemNotes?: string;

  isCompliant?: boolean;
}

export interface UpdateSupplierQuotationItemInput
  extends Partial<CreateSupplierQuotationItemInput> {
  id: string;
}

export interface SupplierQuotationItemFilters {
  quotationId?: string;
  rfqItemId?: string;
}

function validatePositiveNumber(
  value: number,
  field: string,
) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(
      `${field} must be greater than zero.`,
    );
  }

  return value;
}

function validatePercentage(
  value: number | undefined,
) {
  if (value == null) return 0;

  if (value < 0 || value > 100) {
    throw new Error(
      "Percentage must be between 0 and 100.",
    );
  }

  return value;
}

function buildQuotationItemPayload(
  input: CreateSupplierQuotationItemInput,
): SupplierQuotationItemInsert {
  return {
    quotation_id: input.quotationId,

    rfq_item_id: input.rfqItemId,

    quoted_quantity:
      validatePositiveNumber(
        input.quotedQuantity,
        "Quoted quantity",
      ),

    unit_price:
      validatePositiveNumber(
        input.unitPrice,
        "Unit price",
      ),

    discount_percent:
      validatePercentage(
        input.discountPercent,
      ),

    discount_amount:
      input.discountAmount ?? 0,

    tax_percent:
      validatePercentage(
        input.taxPercent,
      ),

    tax_amount:
      input.taxAmount ?? 0,

    supplier_sku:
      input.supplierSku?.trim(),

    available_quantity:
      input.availableQuantity,

    moq:
      input.moq,

    lead_time:
      input.leadTime?.trim(),

    lead_time_days:
      input.leadTimeDays,

    packaging:
      input.packaging?.trim(),

    warranty:
      input.warranty?.trim(),

    compliance_notes:
      input.complianceNotes?.trim(),

    item_notes:
      input.itemNotes?.trim(),

    country_of_origin_id:
      input.countryOfOriginId,

    is_compliant:
      input.isCompliant ?? true,
  };
}

export async function getSupplierQuotationItems(
  filters: SupplierQuotationItemFilters = {},
) {
  const supabase = await createClient();

  let query = supabase
    .from("supplier_quotation_items")
    .select(`
      *,
      rfq_item:rfq_items(
        id,
        line_number,
        item_name,
        requested_quantity,
        product_sku
      ),
      country_of_origin:countries(
        id,
        name,
        iso2
      )
    `)
    .order("created_at", {
      ascending: true,
    });

  if (filters.quotationId) {
    query = query.eq(
      "quotation_id",
      filters.quotationId,
    );
  }

  if (filters.rfqItemId) {
    query = query.eq(
      "rfq_item_id",
      filters.rfqItemId,
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `Unable to load quotation items: ${error.message}`,
    );
  }

  return data;
}

export async function getSupplierQuotationItemById(
  itemId: string,
) {
  const supabase = await createClient();

  const { data, error } =
    await supabase
      .from("supplier_quotation_items")
      .select(`
        *,
        rfq_item:rfq_items(
          *
        ),
        country_of_origin:countries(
          id,
          name,
          iso2,
          iso3
        ),
        quotation:supplier_quotations(
          id,
          quotation_number,
          status,
          currency_code
        )
      `)
      .eq("id", itemId)
      .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load quotation item: ${error.message}`,
    );
  }

  return data;
}

export async function createSupplierQuotationItem(
  input: CreateSupplierQuotationItemInput,
) {
  const supabase = await createClient();

  const payload =
    buildQuotationItemPayload(input);

  const { data, error } =
    await supabase
      .from("supplier_quotation_items")
      .insert(payload)
      .select(`
        id,
        quotation_id,
        rfq_item_id,
        quoted_quantity,
        unit_price,
        line_total
      `)
      .single();

  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "The quotation or RFQ item does not exist.",
      );
    }

    throw new Error(
      `Unable to create quotation item: ${error.message}`,
    );
  }

  await supabase.rpc(
    "recalculate_quotation_totals",
    {
      target_quotation_id:
        input.quotationId,
    },
  );

  return data;
}

export async function updateSupplierQuotationItem(
  input: UpdateSupplierQuotationItemInput,
) {
  const supabase = await createClient();

  const {
    id,
    ...changes
  } = input;

  const existing =
    await getSupplierQuotationItemById(id);

  if (!existing) {
    throw new Error(
      "Quotation item not found.",
    );
  }

  const payload: SupplierQuotationItemUpdate = {};

  if (changes.quotedQuantity !== undefined) {
    payload.quoted_quantity =
      validatePositiveNumber(
        changes.quotedQuantity,
        "Quoted quantity",
      );
  }

  if (changes.unitPrice !== undefined) {
    payload.unit_price =
      validatePositiveNumber(
        changes.unitPrice,
        "Unit price",
      );
  }

  if (changes.discountPercent !== undefined) {
    payload.discount_percent =
      validatePercentage(
        changes.discountPercent,
      );
  }

  if (changes.discountAmount !== undefined) {
    payload.discount_amount =
      changes.discountAmount;
  }

  if (changes.taxPercent !== undefined) {
    payload.tax_percent =
      validatePercentage(
        changes.taxPercent,
      );
  }

  if (changes.taxAmount !== undefined) {
    payload.tax_amount =
      changes.taxAmount;
  }

  if (changes.availableQuantity !== undefined) {
    payload.available_quantity =
      changes.availableQuantity;
  }

  if (changes.moq !== undefined) {
    payload.moq =
      changes.moq;
  }

  if (changes.leadTime !== undefined) {
    payload.lead_time =
      changes.leadTime?.trim();
  }

  if (changes.leadTimeDays !== undefined) {
    payload.lead_time_days =
      changes.leadTimeDays;
  }

  if (changes.packaging !== undefined) {
    payload.packaging =
      changes.packaging?.trim();
  }

  if (changes.warranty !== undefined) {
    payload.warranty =
      changes.warranty?.trim();
  }

  if (changes.countryOfOriginId !== undefined) {
    payload.country_of_origin_id =
      changes.countryOfOriginId;
  }

  if (changes.complianceNotes !== undefined) {
    payload.compliance_notes =
      changes.complianceNotes?.trim();
  }

  if (changes.itemNotes !== undefined) {
    payload.item_notes =
      changes.itemNotes?.trim();
  }

  if (changes.supplierSku !== undefined) {
    payload.supplier_sku =
      changes.supplierSku?.trim();
  }

  if (changes.isCompliant !== undefined) {
    payload.is_compliant =
      changes.isCompliant;
  }

  const { data, error } =
    await supabase
      .from("supplier_quotation_items")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

  if (error) {
    throw new Error(
      `Unable to update quotation item: ${error.message}`,
    );
  }

  await supabase.rpc(
    "recalculate_quotation_totals",
    {
      target_quotation_id:
        data.quotation_id,
    },
  );

  return data;
}

export async function deleteSupplierQuotationItem(
  itemId: string,
) {
  const supabase = await createClient();

  const existing =
    await getSupplierQuotationItemById(itemId);

  if (!existing) {
    throw new Error(
      "Quotation item not found.",
    );
  }

  const { error } =
    await supabase
      .from("supplier_quotation_items")
      .delete()
      .eq("id", itemId);

  if (error) {
    throw new Error(
      `Unable to delete quotation item: ${error.message}`,
    );
  }

  await supabase.rpc(
    "recalculate_quotation_totals",
    {
      target_quotation_id:
        existing.quotation_id,
    },
  );

  return true;
}

export async function replaceSupplierQuotationItems(
  quotationId: string,
  items: CreateSupplierQuotationItemInput[],
) {
  const supabase = await createClient();

  const { error: deleteError } =
    await supabase
      .from("supplier_quotation_items")
      .delete()
      .eq("quotation_id", quotationId);

  if (deleteError) {
    throw new Error(
      `Unable to replace quotation items: ${deleteError.message}`,
    );
  }

  for (const item of items) {
    await createSupplierQuotationItem({
      ...item,
      quotationId,
    });
  }

  await supabase.rpc(
    "recalculate_quotation_totals",
    {
      target_quotation_id:
        quotationId,
    },
  );
}


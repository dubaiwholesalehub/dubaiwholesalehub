import { createClient } from "@/lib/supabase/server";

import type {
  Database,
} from "@/lib/database.types";

type SupplierQuotationStatus =
  Database["public"]["Enums"]["supplier_quotation_status"];

type SupplierQuotationInsert =
  Database["public"]["Tables"]["supplier_quotations"]["Insert"];

type SupplierQuotationUpdate =
  Database["public"]["Tables"]["supplier_quotations"]["Update"];

export type CreateSupplierQuotationLineInput = {
  rfqItemId: string;
  quotedQuantity: number;
  unitPrice: number;
  moq?: number;
  leadTimeDays?: number;
  isCompliant?: boolean;
};

export type CreateSupplierQuotationInput = {
  rfqId: string;
  rfqSupplierId: string;
  supplierId: string;

  quotationNumber?: string;
  currencyCode: string;
  quotationDate?: string;
  validUntil?: string;

  discountAmount?: number;
  shippingAmount?: number;
  taxAmount?: number;
  otherCharges?: number;

  paymentTerms?: string;
  incoterm?: string;
  loadingPort?: string;
  deliveryLocation?: string;

  leadTime?: string;
  leadTimeDays?: number;

  packaging?: string;
  warranty?: string;

  supplierNotes?: string;
  internalNotes?: string;

  items: CreateSupplierQuotationLineInput[];
};

export type UpdateSupplierQuotationInput =
  CreateSupplierQuotationInput & {
    id: string;
    status?: SupplierQuotationStatus;
  };

export type SupplierQuotationListFilters = {
  rfqId?: string;
  rfqSupplierId?: string;
  supplierId?: string;
  status?:
  | SupplierQuotationStatus
  | "all";
  currencyCode?: string;
};

function emptyToNull(
  value: string | undefined,
): string | null {
  const cleaned = value?.trim();

  return cleaned ? cleaned : null;
}

function emptyToUndefined(
  value: string | undefined,
): string | undefined {
  const cleaned = value?.trim();

  return cleaned || undefined;
}

function normalizeCurrencyCode(
  value: string,
): string {
  const currencyCode =
    value.trim().toUpperCase();

  if (
    !/^[A-Z]{3}$/.test(currencyCode)
  ) {
    throw new Error(
      "Currency code must contain exactly three letters.",
    );
  }

  return currencyCode;
}

function validateOptionalAmount(
  value: number | undefined,
  fieldName: string,
): number {
  if (value === undefined) {
    return 0;
  }

  if (
    !Number.isFinite(value) ||
    value < 0
  ) {
    throw new Error(
      `${fieldName} cannot be negative.`,
    );
  }

  return value;
}

function validateOptionalDays(
  value: number | undefined,
): number | null {
  if (value === undefined) {
    return null;
  }

  if (
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new Error(
      "Lead time days must be a non-negative whole number.",
    );
  }

  return value;
}

export async function getSupplierQuotations(
  filters: SupplierQuotationListFilters = {},
) {
  const supabase = await createClient();

  let query = supabase
    .from("supplier_quotations")
    .select(`
      id,
      rfq_id,
      rfq_supplier_id,
      supplier_id,
      quotation_number,
      revision_number,
      status,
      currency_code,
      quotation_date,
      valid_until,
      subtotal,
      discount_amount,
      shipping_amount,
      tax_amount,
      other_charges,
      total_amount,
      payment_terms,
      incoterm,
      loading_port,
      delivery_location,
      lead_time,
      lead_time_days,
      packaging,
      warranty,
      submitted_at,
      reviewed_at,
      accepted_at,
      rejected_at,
      created_at,
      updated_at,
      supplier:suppliers (
        id,
        company_name,
        contact_name,
        email,
        phone,
        whatsapp,
        city
      ),
      items:supplier_quotation_items (
        id
      )
    `)
    .order("created_at", {
      ascending: false,
    });

  if (filters.rfqId) {
    query = query.eq(
      "rfq_id",
      filters.rfqId,
    );
  }

  if (filters.rfqSupplierId) {
    query = query.eq(
      "rfq_supplier_id",
      filters.rfqSupplierId,
    );
  }

  if (filters.supplierId) {
    query = query.eq(
      "supplier_id",
      filters.supplierId,
    );
  }

  if (
    filters.status &&
    filters.status !== "all"
  ) {
    query = query.eq(
      "status",
      filters.status,
    );
  }

  if (filters.currencyCode) {
    query = query.eq(
      "currency_code",
      normalizeCurrencyCode(
        filters.currencyCode,
      ),
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `Unable to load supplier quotations: ${error.message}`,
    );
  }

  return data ?? [];
}

export async function getSupplierQuotationById(
  quotationId: string,
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("supplier_quotations")
    .select(`
      id,
      rfq_id,
      rfq_supplier_id,
      supplier_id,
      quotation_number,
      revision_number,
      status,
      currency_code,
      quotation_date,
      valid_until,
      subtotal,
      discount_amount,
      shipping_amount,
      tax_amount,
      other_charges,
      total_amount,
      payment_terms,
      incoterm,
      loading_port,
      delivery_location,
      lead_time,
      lead_time_days,
      packaging,
      warranty,
      supplier_notes,
      internal_notes,
      submitted_at,
      reviewed_at,
      accepted_at,
      rejected_at,
      created_by,
      updated_by,
      created_at,
      updated_at,
      supplier:suppliers (
        id,
        company_name,
        contact_name,
        email,
        phone,
        whatsapp,
        website,
        address,
        city,
        is_active,
        country:countries (
          id,
          name,
          iso2,
          iso3,
          currency_code
        )
      ),
      rfq:rfqs (
        id,
        rfq_number,
        title,
        status,
        priority,
        currency_code,
        response_deadline,
        required_delivery_date
      ),
      rfq_supplier:rfq_suppliers (
        id,
        status,
        contact_name,
        contact_email,
        contact_phone,
        contact_whatsapp
      ),
      items:supplier_quotation_items (
        id,
        quotation_id,
        rfq_item_id,
        supplier_sku,
        quoted_quantity,
        moq,
        unit_price,
        discount_percent,
        discount_amount,
        line_subtotal,
        tax_percent,
        tax_amount,
        line_total,
        available_quantity,
        lead_time,
        lead_time_days,
        packaging,
        country_of_origin_id,
        warranty,
        item_notes,
        is_compliant,
        compliance_notes,
        created_at,
        updated_at,
        rfq_item:rfq_items (
          id,
          line_number,
          item_name,
          item_description,
          product_sku,
          requested_quantity,
          target_unit_price,
          target_currency_code
        ),
        country_of_origin:countries (
          id,
          name,
          iso2
        )
      )
    `)
    .eq("id", quotationId)
    .order("created_at", {
      referencedTable:
        "supplier_quotation_items",
      ascending: true,
    })
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load supplier quotation: ${error.message}`,
    );
  }

  return data;
}

function buildQuotationPayload(
  input: CreateSupplierQuotationInput,
): SupplierQuotationInsert {
  return {
    rfq_id: input.rfqId,
    rfq_supplier_id: input.rfqSupplierId,
    supplier_id: input.supplierId,
    quotation_number: emptyToNull(
      input.quotationNumber,
    ),
    currency_code:
      normalizeCurrencyCode(
        input.currencyCode,
      ),
    quotation_date:
      emptyToUndefined(
        input.quotationDate,
      ),

    valid_until:
      emptyToUndefined(
        input.validUntil,
      ),
    discount_amount:
      validateOptionalAmount(
        input.discountAmount,
        "Discount amount",
      ),
    shipping_amount:
      validateOptionalAmount(
        input.shippingAmount,
        "Shipping amount",
      ),
    tax_amount:
      validateOptionalAmount(
        input.taxAmount,
        "Tax amount",
      ),
    other_charges:
      validateOptionalAmount(
        input.otherCharges,
        "Other charges",
      ),
    payment_terms:
      emptyToNull(input.paymentTerms),
    incoterm:
      emptyToNull(input.incoterm),
    loading_port:
      emptyToNull(input.loadingPort),
    delivery_location:
      emptyToNull(
        input.deliveryLocation,
      ),
    lead_time:
      emptyToNull(input.leadTime),
    lead_time_days:
      validateOptionalDays(
        input.leadTimeDays,
      ),
    packaging:
      emptyToNull(input.packaging),
    warranty:
      emptyToNull(input.warranty),
    supplier_notes:
      emptyToNull(
        input.supplierNotes,
      ),
    internal_notes:
      emptyToNull(
        input.internalNotes,
      ),
  };
}

export async function createSupplierQuotation(
  input: CreateSupplierQuotationInput,
): Promise<string> {
  const supabase = await createClient();

  if (!input.items.length) {
    throw new Error(
      "At least one quotation item is required.",
    );
  }

  const quotationDate =
    emptyToUndefined(input.quotationDate) ??
    new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase.rpc(
    "create_supplier_quotation",
    {
      p_rfq_id: input.rfqId,
      p_rfq_supplier_id: input.rfqSupplierId,

      p_quotation_number:
        input.quotationNumber?.trim() ?? "",

      p_quotation_date:
        input.quotationDate?.trim() ||
        new Date().toISOString().slice(0, 10),

      p_valid_until:
        input.validUntil?.trim() ?? "",

      p_currency_code:
        normalizeCurrencyCode(input.currencyCode),

      p_payment_terms:
        input.paymentTerms?.trim() ?? "",

      p_lead_time_days:
        validateOptionalDays(
          input.leadTimeDays,
        ) ?? 0,

      p_incoterm:
        input.incoterm?.trim() ?? "",

      p_loading_port:
        input.loadingPort?.trim() ?? "",

      p_delivery_location:
        input.deliveryLocation?.trim() ?? "",

      p_packaging:
        input.packaging?.trim() ?? "",

      p_warranty:
        input.warranty?.trim() ?? "",

      p_supplier_notes:
        input.supplierNotes?.trim() ?? "",

      p_internal_notes:
        input.internalNotes?.trim() ?? "",

      p_discount_amount:
        validateOptionalAmount(
          input.discountAmount,
          "Discount amount",
        ) ?? 0,

      p_shipping_amount:
        validateOptionalAmount(
          input.shippingAmount,
          "Shipping amount",
        ) ?? 0,

      p_other_charges:
        validateOptionalAmount(
          input.otherCharges,
          "Other charges",
        ) ?? 0,

      p_tax_amount:
        validateOptionalAmount(
          input.taxAmount,
          "Tax amount",
        ) ?? 0,

      p_items: input.items.map((item) => ({
        rfq_item_id: item.rfqItemId,
        quoted_quantity: item.quotedQuantity,
        unit_price: item.unitPrice,
        moq: item.moq ?? 0,
        lead_time_days:
          item.leadTimeDays ?? 0,
        is_compliant:
          item.isCompliant ?? true,
      })),
    },
  );

  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "The selected RFQ, supplier, or RFQ item does not exist.",
      );
    }

    if (error.code === "23505") {
      throw new Error(
        "A quotation with this number already exists.",
      );
    }

    throw new Error(
      `Unable to create supplier quotation: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "The quotation was created, but no quotation ID was returned.",
    );
  }

  return data;
}

export async function updateSupplierQuotation(
  input: UpdateSupplierQuotationInput,
) {
  const supabase = await createClient();

  const payload: SupplierQuotationUpdate =
  {
    ...buildQuotationPayload(
      input,
    ),
    ...(input.status
      ? {
        status: input.status,
      }
      : {}),
  };

  const { data, error } =
    await supabase
      .from("supplier_quotations")
      .update(payload)
      .eq("id", input.id)
      .select(`
        id,
        quotation_number,
        status,
        currency_code,
        total_amount,
        updated_at
      `)
      .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to update supplier quotation: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "Supplier quotation not found.",
    );
  }

  return data;
}

export async function submitSupplierQuotation(
  quotationId: string,
) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "submit_supplier_quotation",
    {
      target_quotation_id: quotationId,
    },
  );

  if (error) {
    throw new Error(
      `Unable to submit supplier quotation: ${error.message}`,
    );
  }

  return data;
}

export async function reviewSupplierQuotation(
  quotationId: string,
) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "review_supplier_quotation",
    {
      target_quotation_id: quotationId,
    },
  );

  if (error) {
    throw new Error(
      `Unable to review supplier quotation: ${error.message}`,
    );
  }

  return data;
}

export async function rejectSupplierQuotation(
  quotationId: string,
  reason?: string,
) {
  const supabase = await createClient();

  const cleanedReason = reason?.trim();

  const { data, error } = await supabase.rpc(
    "reject_supplier_quotation",
    {
      target_quotation_id: quotationId,
      rejection_reason:
        cleanedReason || undefined,
    },
  );

  if (error) {
    throw new Error(
      `Unable to reject supplier quotation: ${error.message}`,
    );
  }

  return data;
}

export async function deleteDraftSupplierQuotation(
  quotationId: string,
) {
  const supabase = await createClient();

  const { data, error } =
    await supabase
      .from("supplier_quotations")
      .delete()
      .eq("id", quotationId)
      .eq("status", "draft")
      .select("id")
      .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to delete quotation: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "Only draft quotations can be deleted.",
    );
  }

  return data;
}

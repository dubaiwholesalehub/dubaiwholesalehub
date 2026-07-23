import { createClient } from "@/lib/supabase/server";

export interface RfqComparisonItem {
    id: string;
    lineNumber: number;
    productId: string | null;
    productName: string;
    description: string | null;
    quantity: number;
    unitId: string | null;
}

export interface RfqComparisonSupplier {
    id: string;
    supplierId: string;
    supplierName: string;
    status: string;
    sentAt: string | null;
    viewedAt: string | null;
    respondedAt: string | null;
    awardedAt: string | null;
    quotation: RfqSupplierQuotation | null;
}

export interface RfqComparisonQuoteItem {
    id: string;
    quotationId: string;
    rfqItemId: string;
    supplierId: string;
    unitPrice: number | null;
    quantity: number | null;
    totalPrice: number | null;
    brand: string | null;
    originCountry: string | null;
    leadTimeDays: number | null;
    notes: string | null;
}

export interface RfqComparisonData {
    rfqId: string;

    items: RfqComparisonItem[];

    suppliers: RfqComparisonSupplier[];
}

export async function getRfqComparisonData(
    rfqId: string
): Promise<RfqComparisonData> {
    const supabase = await createClient();

    const { data: rfqItems, error: rfqItemsError } = await supabase
        .from("rfq_items")
        .select(`
      id,
      line_number,
      product_id,
      item_name,
      item_description,
      requested_quantity,
      unit_id
    `)
        .eq("rfq_id", rfqId)
        .order("line_number", { ascending: true });

    if (rfqItemsError) {
        throw rfqItemsError;
    }

    const { data: rfqSuppliers, error: suppliersError } =
  await supabase
    .from("rfq_suppliers")
    .select(`
      id,
      supplier_id,
      status,
      sent_at,
      viewed_at,
      responded_at,
      awarded_at,
      supplier:suppliers (
        id,
        company_name
      )
    `)
    .eq("rfq_id", rfqId);

    if (suppliersError) {
        throw suppliersError;
    }

    const items: RfqComparisonItem[] = (rfqItems ?? []).map((item) => ({
        id: item.id,
        lineNumber: item.line_number,
        productId: item.product_id,
        productName: item.item_name,
        description: item.item_description,
        quantity: item.requested_quantity,
        unitId: item.unit_id,
    }));

    const { data: quotations, error: quotationsError } = await supabase
        .from("supplier_quotations")
        .select(`
    id,
    rfq_supplier_id,
    quotation_number,
    status,
    currency_code,
    subtotal,
    total_amount,
    lead_time_days,
    payment_terms,
    revision_number
  `)
        .eq("rfq_id", rfqId)
        .order("revision_number", { ascending: false });

    if (quotationsError) {
        throw quotationsError;
    }

    const quotationLookup = new Map(
        (quotations ?? []).map((quotation) => [
            quotation.rfq_supplier_id,
            quotation,
        ])
    );
    const quotationIds = (quotations ?? []).map((quotation) => quotation.id);

    const { data: quotationItems, error: quotationItemsError } =
        quotationIds.length === 0
            ? { data: [], error: null }
            : await supabase
                .from("supplier_quotation_items")
                .select(`
          id,
          quotation_id,
          rfq_item_id,
          quoted_quantity,
          unit_price,
          line_total,
          lead_time_days,
          moq,
          is_compliant,
          compliance_notes,
          supplier_sku,
          packaging,
          warranty,
          country_of_origin_id
        `)
                .in("quotation_id", quotationIds);

    if (quotationItemsError) {
        throw quotationItemsError;
    }

    const quotationItemsLookup = new Map<
        string,
        RfqSupplierQuotationItem[]
    >();

    for (const item of quotationItems ?? []) {
        const items =
            quotationItemsLookup.get(item.quotation_id) ?? [];

        items.push({
            id: item.id,
            rfqItemId: item.rfq_item_id,
            quotedQuantity: item.quoted_quantity,
            unitPrice: item.unit_price,
            lineTotal: item.line_total,
            leadTimeDays: item.lead_time_days,
            moq: item.moq,
            isCompliant: item.is_compliant,
            complianceNotes: item.compliance_notes,
            supplierSku: item.supplier_sku,
            packaging: item.packaging,
            warranty: item.warranty,
            countryOfOriginId: item.country_of_origin_id,
        });

        quotationItemsLookup.set(item.quotation_id, items);
    }

    const suppliers: RfqComparisonSupplier[] = (rfqSuppliers ?? []).map(
        (supplier) => ({
            id: supplier.id,
            supplierId: supplier.supplier_id,
            supplierName:
                supplier.supplier?.company_name ?? "Unnamed supplier",

            status: supplier.status,

            sentAt: supplier.sent_at,
            viewedAt: supplier.viewed_at,
            respondedAt: supplier.responded_at,
            awardedAt: supplier.awarded_at,

            quotation: (() => {
                const quotation = quotationLookup.get(supplier.id);

                if (!quotation) {
                    return null;
                }

                return {
                    id: quotation.id,
                    quotationNumber: quotation.quotation_number,
                    status: quotation.status,
                    currencyCode: quotation.currency_code,
                    subtotal: quotation.subtotal,
                    totalAmount: quotation.total_amount,
                    leadTimeDays: quotation.lead_time_days,
                    paymentTerms: quotation.payment_terms,
                    items: quotationItemsLookup.get(quotation.id) ?? [],
                };
            })(),
        })
    );

    return {
        rfqId,
        items,
        suppliers,
    };
}

export interface RfqSupplierQuotation {
    id: string;

    quotationNumber: string | null;

    status: string;

    currencyCode: string;

    subtotal: number;

    totalAmount: number;

    leadTimeDays: number | null;

    paymentTerms: string | null;

    items: RfqSupplierQuotationItem[];
}

export interface RfqSupplierQuotationItem {
    id: string;

    rfqItemId: string;

    quotedQuantity: number;

    unitPrice: number;

    lineTotal: number;

    leadTimeDays: number | null;

    moq: number | null;

    isCompliant: boolean;

    complianceNotes: string | null;

    supplierSku: string | null;

    packaging: string | null;

    warranty: string | null;

    countryOfOriginId: string | null;
}
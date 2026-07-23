import { createClient } from "@/lib/supabase/server";

export interface SupplierQuotationEntryItem {
  rfqItemId: string;
  lineNumber: number;
  itemName: string;
  itemDescription: string | null;
  requestedQuantity: number;
  unitId: string | null;
}

export interface SupplierQuotationEntrySupplier {
  rfqSupplierId: string;
  supplierId: string;
  supplierName: string;
  status: string;
}

export interface SupplierQuotationEntryData {
  rfqId: string;
  rfqNumber: string;
  title: string;
  currencyCode: string | null;
  suppliers: SupplierQuotationEntrySupplier[];
  items: SupplierQuotationEntryItem[];
}

export async function getSupplierQuotationEntryData(
  rfqId: string
): Promise<SupplierQuotationEntryData | null> {
  const supabase = await createClient();

  const { data: rfq, error: rfqError } = await supabase
    .from("rfqs")
    .select(`
      id,
      rfq_number,
      title,
      currency_code
    `)
    .eq("id", rfqId)
    .maybeSingle();

  if (rfqError) {
    throw rfqError;
  }

  if (!rfq) {
    return null;
  }

  const { data: rfqSuppliers, error: suppliersError } =
    await supabase
      .from("rfq_suppliers")
      .select(`
        id,
        supplier_id,
        status,
        supplier:suppliers (
          id,
          company_name
        )
      `)
      .eq("rfq_id", rfqId)
      .order("created_at", { ascending: true });

  if (suppliersError) {
    throw suppliersError;
  }

  const { data: rfqItems, error: itemsError } =
    await supabase
      .from("rfq_items")
      .select(`
        id,
        line_number,
        item_name,
        item_description,
        requested_quantity,
        unit_id
      `)
      .eq("rfq_id", rfqId)
      .order("line_number", { ascending: true });

  if (itemsError) {
    throw itemsError;
  }

  return {
    rfqId: rfq.id,
    rfqNumber: rfq.rfq_number,
    title: rfq.title,
    currencyCode: rfq.currency_code,

    suppliers: (rfqSuppliers ?? []).map((supplier) => ({
      rfqSupplierId: supplier.id,
      supplierId: supplier.supplier_id,
      supplierName:
        supplier.supplier?.company_name ?? "Unnamed supplier",
      status: supplier.status,
    })),

    items: (rfqItems ?? []).map((item) => ({
      rfqItemId: item.id,
      lineNumber: item.line_number,
      itemName: item.item_name,
      itemDescription: item.item_description,
      requestedQuantity: item.requested_quantity,
      unitId: item.unit_id,
    })),
  };
}
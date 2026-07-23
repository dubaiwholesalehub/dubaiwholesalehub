import { createClient } from "@/lib/supabase/server";

export interface RfqDetailSummary {
  itemCount: number;
  supplierCount: number;
  quotationCount: number;
  pendingSupplierCount: number;
  respondedSupplierCount: number;
}

function requireRfqId(rfqId: string): string {
  const id = rfqId.trim();

  if (!id) {
    throw new Error("RFQ ID is required.");
  }

  return id;
}

export async function getRfqDetailSummary(
  rfqId: string,
): Promise<RfqDetailSummary | null> {
  const id = requireRfqId(rfqId);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rfqs")
    .select(`
      id,
      items:rfq_items (
        id
      ),
      suppliers:rfq_suppliers (
        id,
        status
      ),
      quotations:supplier_quotations!supplier_quotations_rfq_id_fkey (
        id
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load RFQ summary: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  const suppliers = data.suppliers ?? [];

  const respondedSupplierCount =
    suppliers.filter((supplier) =>
      [
        "responded",
        "quoted",
        "awarded",
      ].includes(supplier.status),
    ).length;

  return {
    itemCount: data.items?.length ?? 0,
    supplierCount: suppliers.length,
    quotationCount:
      data.quotations?.length ?? 0,
    pendingSupplierCount:
      suppliers.length -
      respondedSupplierCount,
    respondedSupplierCount,
  };
}
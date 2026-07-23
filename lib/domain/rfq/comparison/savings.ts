import type { RfqComparisonData } from "@/lib/repositories/rfq";

export interface SupplierSavings {
  supplierId: string;
  saving: number;
}

export function getSupplierSavings(
  data: RfqComparisonData
): SupplierSavings[] {
  const totals = data.suppliers
    .filter(
      (supplier) =>
        typeof supplier.quotation?.totalAmount === "number"
    )
    .map((supplier) => ({
      supplierId: supplier.id,
      total: supplier.quotation!.totalAmount,
    }));

  if (totals.length === 0) {
    return [];
  }

  const bestTotal = Math.min(...totals.map((t) => t.total));

  return totals.map((supplier) => ({
    supplierId: supplier.supplierId,
    saving: supplier.total - bestTotal,
  }));
}
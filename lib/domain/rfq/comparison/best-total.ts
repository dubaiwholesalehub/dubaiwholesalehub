import type { RfqComparisonData } from "@/lib/repositories/rfq";

export function getBestTotalSupplier(data: RfqComparisonData): string | null {
  let bestSupplierId: string | null = null;
  let bestTotal = Number.POSITIVE_INFINITY;

  for (const supplier of data.suppliers) {
    const total = supplier.quotation?.totalAmount;

    if (
      typeof total !== "number" ||
      !Number.isFinite(total)
    ) {
      continue;
    }

    if (total < bestTotal) {
      bestTotal = total;
      bestSupplierId = supplier.id;
    }
  }

  return bestSupplierId;
}
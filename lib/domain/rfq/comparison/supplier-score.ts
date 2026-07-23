import type { RfqComparisonData } from "@/lib/repositories/rfq";

export interface SupplierScore {
  supplierId: string;
  score: number;
}

export function getSupplierScores(
  data: RfqComparisonData
): SupplierScore[] {
  return data.suppliers
    .filter((supplier) => supplier.quotation)
    .map((supplier) => {
      const quotation = supplier.quotation!;

      let score = 100;

      // Lower total = better
      if (quotation.totalAmount > 10000) {
        score -= 10;
      }

      // Faster delivery = better
      if (
        quotation.leadTimeDays &&
        quotation.leadTimeDays > 30
      ) {
        score -= 10;
      }

      // Penalize non-compliant items
      const nonCompliantItems = quotation.items.filter(
        (item) => item.isCompliant === false
      ).length;

      score -= nonCompliantItems * 5;

      return {
        supplierId: supplier.id,
        score: Math.max(score, 0),
      };
    });
}
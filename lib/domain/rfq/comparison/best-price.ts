import type {
  RfqComparisonData,
  RfqComparisonSupplier,
  RfqSupplierQuotationItem,
} from "@/lib/repositories/rfq";

export interface BestPriceResult {
  rfqItemId: string;
  supplierId: string;
  rfqSupplierId: string;
  quotationId: string;
  quotationItemId: string;
  unitPrice: number;
}

interface SupplierQuotationItemMatch {
  supplier: RfqComparisonSupplier;
  quotationItem: RfqSupplierQuotationItem;
}

function isValidPrice(value: number | null | undefined): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
  );
}

function findSupplierQuotationItems(
  data: RfqComparisonData,
  rfqItemId: string
): SupplierQuotationItemMatch[] {
  const matches: SupplierQuotationItemMatch[] = [];

  for (const supplier of data.suppliers) {
    const quotation = supplier.quotation;

    if (!quotation) {
      continue;
    }

    const quotationItem = quotation.items.find(
      (item) => item.rfqItemId === rfqItemId
    );

    if (
      !quotationItem ||
      !isValidPrice(quotationItem.unitPrice)
    ) {
      continue;
    }

    matches.push({
      supplier,
      quotationItem,
    });
  }

  return matches;
}

export function getBestPriceForItem(
  data: RfqComparisonData,
  rfqItemId: string
): BestPriceResult | null {
  const matches = findSupplierQuotationItems(
    data,
    rfqItemId
  );

  if (matches.length === 0) {
    return null;
  }

  const bestMatch = matches.reduce((currentBest, candidate) => {
    return candidate.quotationItem.unitPrice <
      currentBest.quotationItem.unitPrice
      ? candidate
      : currentBest;
  });

  const quotation = bestMatch.supplier.quotation;

  if (!quotation) {
    return null;
  }

  return {
    rfqItemId,
    supplierId: bestMatch.supplier.supplierId,
    rfqSupplierId: bestMatch.supplier.id,
    quotationId: quotation.id,
    quotationItemId: bestMatch.quotationItem.id,
    unitPrice: bestMatch.quotationItem.unitPrice,
  };
}

export function getBestPrices(
  data: RfqComparisonData
): Map<string, BestPriceResult> {
  const results = new Map<string, BestPriceResult>();

  for (const item of data.items) {
    const bestPrice = getBestPriceForItem(data, item.id);

    if (bestPrice) {
      results.set(item.id, bestPrice);
    }
  }

  return results;
}

export function isBestPrice(
  bestPrices: Map<string, BestPriceResult>,
  rfqItemId: string,
  quotationItemId: string
): boolean {
  return (
    bestPrices.get(rfqItemId)?.quotationItemId ===
    quotationItemId
  );
}
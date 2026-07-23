import type { RfqComparisonData } from "@/lib/repositories/rfq";

import { DetailSection } from "../detail";
import { ComparisonEmptyState } from "./comparison-empty-state";

interface ComparisonTableProps {
  data: RfqComparisonData;
}

export function ComparisonTable({
  data,
}: ComparisonTableProps) {
  const suppliersWithQuotations = data.suppliers.filter(
    (supplier) => supplier.quotation
  );

  return (
    <DetailSection title="Quotation Comparison">
      {suppliersWithQuotations.length === 0 ? (
        <ComparisonEmptyState />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left font-medium">
                  Item
                </th>

                <th className="px-4 py-3 text-right font-medium">
                  Quantity
                </th>

                {suppliersWithQuotations.map((supplier) => (
                  <th
                    key={supplier.id}
                    className="px-4 py-3 text-right font-medium"
                  >
                    Supplier
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {data.items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b last:border-b-0"
                >
                  <td className="px-4 py-4">
                    <p className="font-medium">
                      {item.productName}
                    </p>

                    {item.description ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    ) : null}
                  </td>

                  <td className="px-4 py-4 text-right tabular-nums">
                    {item.quantity}
                  </td>

                  {suppliersWithQuotations.map((supplier) => {
                    const quotationItem =
                      supplier.quotation?.items.find(
                        (quoteItem) =>
                          quoteItem.rfqItemId === item.id
                      );

                    return (
                      <td
                        key={supplier.id}
                        className="px-4 py-4 text-right tabular-nums"
                      >
                        {quotationItem
                          ? quotationItem.unitPrice.toFixed(2)
                          : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DetailSection>
  );
}
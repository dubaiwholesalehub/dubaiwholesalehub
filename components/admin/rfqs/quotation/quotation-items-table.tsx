import type { QuotationFormItem } from "./quotation-form";

interface QuotationItemsTableProps {
  items: QuotationFormItem[];
  onItemsChange: (items: QuotationFormItem[]) => void;
}

export function QuotationItemsTable({
  items,
  onItemsChange,
}: QuotationItemsTableProps) {
  function updateItem(
    rfqItemId: string,
    updates: Partial<QuotationFormItem>
  ) {
    onItemsChange(
      items.map((item) =>
        item.rfqItemId === rfqItemId
          ? { ...item, ...updates }
          : item
      )
    );
  }

  return (
    <section className="rounded-lg border">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold">
          Quotation Items
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[950px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left">Item</th>
              <th className="px-4 py-3 text-right">
                Requested
              </th>
              <th className="px-4 py-3 text-right">
                Quoted Qty
              </th>
              <th className="px-4 py-3 text-right">
                Unit Price
              </th>
              <th className="px-4 py-3 text-right">
                MOQ
              </th>
              <th className="px-4 py-3 text-right">
                Lead Time
              </th>
              <th className="px-4 py-3 text-center">
                Compliant
              </th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => (
              <tr
                key={item.rfqItemId}
                className="border-b last:border-b-0"
              >
                <td className="px-4 py-3 font-medium">
                  {item.itemName}
                </td>

                <td className="px-4 py-3 text-right tabular-nums">
                  {item.requestedQuantity}
                </td>

                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={0}
                    value={item.quotedQuantity}
                    onChange={(event) =>
                      updateItem(item.rfqItemId, {
                        quotedQuantity: Number(
                          event.target.value
                        ),
                      })
                    }
                    className="w-28 rounded-md border px-2 py-1.5 text-right"
                  />
                </td>

                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(event) =>
                      updateItem(item.rfqItemId, {
                        unitPrice: Number(
                          event.target.value
                        ),
                      })
                    }
                    className="w-28 rounded-md border px-2 py-1.5 text-right"
                  />
                </td>

                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={0}
                    value={item.moq}
                    onChange={(event) =>
                      updateItem(item.rfqItemId, {
                        moq: Number(event.target.value),
                      })
                    }
                    className="w-24 rounded-md border px-2 py-1.5 text-right"
                  />
                </td>

                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={0}
                    value={item.leadTimeDays}
                    onChange={(event) =>
                      updateItem(item.rfqItemId, {
                        leadTimeDays: Number(
                          event.target.value
                        ),
                      })
                    }
                    className="w-24 rounded-md border px-2 py-1.5 text-right"
                  />
                </td>

                <td className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={item.isCompliant}
                    onChange={(event) =>
                      updateItem(item.rfqItemId, {
                        isCompliant:
                          event.target.checked,
                      })
                    }
                    className="size-4"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
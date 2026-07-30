import type {
  InventoryTransactionDetailItem,
} from "@/lib/inventory/inventory.repository";

interface InventoryTransactionItemsTableProps {
  items: InventoryTransactionDetailItem[];
}

function formatNumber(
  value: number,
  minimumFractionDigits = 0,
): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits,
    maximumFractionDigits: 4,
  }).format(value);
}

function TrackingInformation({
  item,
}: {
  item: InventoryTransactionDetailItem;
}) {
  const values = [
    item.batch_number
      ? `Batch: ${item.batch_number}`
      : null,

    item.lot_number
      ? `Lot: ${item.lot_number}`
      : null,

    item.serial_number
      ? `Serial: ${item.serial_number}`
      : null,
  ].filter(Boolean);

  if (values.length === 0) {
    return null;
  }

  return (
    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {values.map((value) => (
        <span key={value}>{value}</span>
      ))}
    </div>
  );
}

export function InventoryTransactionItemsTable({
  items,
}: InventoryTransactionItemsTableProps) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="border-b px-5 py-4">
        <h2 className="font-semibold">Items</h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Products included in this inventory transaction.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="text-sm font-medium">
            No transaction items found
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            This transaction currently has no item lines.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="w-16 px-4 py-3 text-left font-medium text-muted-foreground">
                  #
                </th>

                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  SKU
                </th>

                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Product
                </th>

                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Quantity
                </th>

                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Unit Cost
                </th>

                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Total Cost
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="align-top transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-4 text-muted-foreground">
                    {item.line_number}
                  </td>

                  <td className="px-4 py-4 font-mono text-xs">
                    {item.sku || "—"}
                  </td>

                  <td className="px-4 py-4">
                    <p className="font-medium">
                      {item.product_name}
                    </p>

                    <TrackingInformation item={item} />

                    {item.notes ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.notes}
                      </p>
                    ) : null}
                  </td>

                  <td className="px-4 py-4 text-right tabular-nums">
                    {formatNumber(item.quantity)}
                  </td>

                  <td className="px-4 py-4 text-right tabular-nums">
                    {formatNumber(item.unit_cost, 2)}
                  </td>

                  <td className="px-4 py-4 text-right font-medium tabular-nums">
                    {formatNumber(item.total_cost, 2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
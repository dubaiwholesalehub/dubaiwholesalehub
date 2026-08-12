import type { PurchaseOrderItem } from "@/lib/repositories/purchase-orders";
import { mapPurchaseOrderItemProduct } from "@/app/admin/actions/purchase-orders/map-product";

import type { ProductLookupOption } from "@/lib/repositories/product.repository";

interface PurchaseOrderItemsProps {
  purchaseOrderId: string;

  items: PurchaseOrderItem[];

  currencyCode: string;

  productOptions: ProductLookupOption[];
}

function formatCurrency(value: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currencyCode} ${value.toFixed(2)}`;
  }
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value);
}

export function PurchaseOrderItems({
  purchaseOrderId,
  items,
  currencyCode,
  productOptions,
}: PurchaseOrderItemsProps) {
  if (items.length === 0) {
    return (
      <section className="rounded-lg border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">Purchase Order Items</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Products and quantities included in this Purchase Order.
          </p>
        </div>

        <div className="px-6 py-12 text-center">
          <p className="text-sm font-medium">No Purchase Order items found</p>

          <p className="mt-1 text-sm text-muted-foreground">
            This Purchase Order does not currently contain any line items.
          </p>
        </div>
      </section>
    );
  }

  const totalOrderedQuantity = items.reduce(
    (total, item) => total + item.ordered_quantity,
    0,
  );

  const totalReceivedQuantity = items.reduce(
    (total, item) => total + item.received_quantity,
    0,
  );

  const totalRemainingQuantity = items.reduce(
    (total, item) => total + item.remaining_quantity,
    0,
  );

  const grandTotal = items.reduce((total, item) => total + item.line_total, 0);

  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold">Purchase Order Items</h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Products, ordered quantities, receiving progress, and line values.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                Product
              </th>

              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Product Mapping
              </th>

              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                SKU
              </th>

              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Unit
              </th>

              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Ordered
              </th>

              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Received
              </th>

              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Remaining
              </th>

              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Unit Price
              </th>

              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Discount
              </th>

              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Tax
              </th>

              <th className="px-6 py-3 text-right font-medium text-muted-foreground">
                Line Total
              </th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {items.map((item) => (
              <tr key={item.id} className="transition-colors hover:bg-muted/30">
                <td className="px-6 py-4">
                  <div className="font-medium">{item.product_name}</div>
                </td>

                <td className="min-w-[320px] px-4 py-4">
                  {item.product_id ? (
                    <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      Mapped
                    </span>
                  ) : (
                    <form
                      action={mapPurchaseOrderItemProduct}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="hidden"
                        name="purchaseOrderId"
                        value={purchaseOrderId}
                      />

                      <input
                        type="hidden"
                        name="purchaseOrderItemId"
                        value={item.id}
                      />

                      <select
                        name="productId"
                        required
                        defaultValue=""
                        className="h-9 min-w-[190px] rounded-md border bg-background px-2 text-sm"
                      >
                        <option value="" disabled>
                          Select product
                        </option>

                        {productOptions.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                            {product.sku ? ` (${product.sku})` : ""}
                          </option>
                        ))}
                      </select>

                      <button
                        type="submit"
                        className="inline-flex h-9 items-center justify-center rounded-md bg-orange-600 px-3 text-xs font-semibold text-white transition hover:bg-orange-700"
                      >
                        Map Product
                      </button>
                    </form>
                  )}
                </td>

                <td className="px-4 py-4 text-muted-foreground">
                  {item.sku ?? "—"}
                </td>

                <td className="px-4 py-4 text-muted-foreground">
                  {item.unit_name ?? "—"}
                </td>

                <td className="px-4 py-4 text-right tabular-nums">
                  {formatQuantity(item.ordered_quantity)}
                </td>

                <td className="px-4 py-4 text-right tabular-nums">
                  {formatQuantity(item.received_quantity)}
                </td>

                <td className="px-4 py-4 text-right tabular-nums">
                  <span
                    className={
                      item.remaining_quantity > 0
                        ? "font-medium text-amber-700 dark:text-amber-400"
                        : "text-muted-foreground"
                    }
                  >
                    {formatQuantity(item.remaining_quantity)}
                  </span>
                </td>

                <td className="px-4 py-4 text-right tabular-nums">
                  {formatCurrency(item.unit_price, currencyCode)}
                </td>

                <td className="px-4 py-4 text-right tabular-nums text-muted-foreground">
                  {formatCurrency(item.discount_amount, currencyCode)}
                </td>

                <td className="px-4 py-4 text-right tabular-nums text-muted-foreground">
                  {formatCurrency(item.tax_amount, currencyCode)}
                </td>

                <td className="px-6 py-4 text-right font-medium tabular-nums">
                  {formatCurrency(item.line_total, currencyCode)}
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot className="border-t bg-muted/30">
            <tr>
              <td colSpan={4} className="px-6 py-4 font-semibold">
                Total
              </td>

              <td className="px-4 py-4 text-right font-semibold tabular-nums">
                {formatQuantity(totalOrderedQuantity)}
              </td>

              <td className="px-4 py-4 text-right font-semibold tabular-nums">
                {formatQuantity(totalReceivedQuantity)}
              </td>

              <td className="px-4 py-4 text-right font-semibold tabular-nums">
                {formatQuantity(totalRemainingQuantity)}
              </td>

              <td colSpan={4} />

              <td className="px-6 py-4 text-right font-semibold tabular-nums">
                {formatCurrency(grandTotal, currencyCode)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

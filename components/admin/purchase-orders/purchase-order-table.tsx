import type { PurchaseOrderListItem } from "@/lib/repositories/purchase-orders";
import { PurchaseOrderRowActions } from "./purchase-order-row-actions";
import { PurchaseOrderStatusBadge } from "./purchase-order-status-badge";

interface PurchaseOrderTableProps {
  purchaseOrders: PurchaseOrderListItem[];
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(value));
}

function formatMoney(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

function formatSource(source: PurchaseOrderListItem["source"]): string {
  switch (source) {
    case "rfq_award":
      return "RFQ Award";

    case "reorder":
      return "Reorder Intelligence";

    case "manual":
    default:
      return "Manual";
  }
}

export function PurchaseOrderTable({
  purchaseOrders,
}: PurchaseOrderTableProps) {
  if (purchaseOrders.length === 0) {
    return (
      <div className="flex h-60 flex-col items-center justify-center gap-1 px-6 text-center">
        <p className="text-sm font-medium">No Purchase Orders found</p>

        <p className="text-sm text-muted-foreground">
          Purchase Orders created from awarded RFQs will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px]">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium">
              PO Number
            </th>

            <th className="px-4 py-3 text-left text-sm font-medium">
              Supplier
            </th>

            <th className="px-4 py-3 text-left text-sm font-medium">
              Order Date
            </th>

            <th className="px-4 py-3 text-left text-sm font-medium">Source</th>

            <th className="px-4 py-3 text-left text-sm font-medium">Status</th>

            <th className="px-4 py-3 text-right text-sm font-medium">Total</th>

            <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
          </tr>
        </thead>

        <tbody>
          {purchaseOrders.map((purchaseOrder) => (
            <tr
              key={purchaseOrder.id}
              className="border-b transition-colors last:border-b-0 hover:bg-muted/30"
            >
              <td className="whitespace-nowrap px-4 py-3">
                <span className="font-medium">{purchaseOrder.po_number}</span>
              </td>

              <td className="px-4 py-3">
                <div className="max-w-64 truncate">
                  {purchaseOrder.supplier_name}
                </div>
              </td>

              <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                {formatDate(purchaseOrder.order_date)}
              </td>

              <td className="whitespace-nowrap px-4 py-3 text-sm">
                {formatSource(purchaseOrder.source)}
              </td>

              <td className="whitespace-nowrap px-4 py-3">
                <PurchaseOrderStatusBadge status={purchaseOrder.status} />
              </td>

              <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                {formatMoney(
                  purchaseOrder.total_amount,
                  purchaseOrder.currency_code,
                )}
              </td>

              <td className="whitespace-nowrap px-4 py-3">
                <PurchaseOrderRowActions
                  purchaseOrderId={purchaseOrder.id}
                  canEdit={purchaseOrder.status === "draft"}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

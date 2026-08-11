import DeliveryQuantityEditor from "@/components/admin/sales/deliveries/DeliveryQuantityEditor";
import type {
  DeliveryOrderItem,
  DeliveryOrderStatus,
} from "@/lib/repositories/delivery-order.repository";

interface DeliveryItemsTableProps {
  deliveryOrderId: string;
  status: DeliveryOrderStatus;
  items: DeliveryOrderItem[];
}

export default function DeliveryItemsTable({
  deliveryOrderId,
  status,
  items,
}: DeliveryItemsTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        No delivery items.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="min-w-full border-collapse">
        <thead className="bg-muted/40">
          <tr className="text-left text-sm">
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Warehouse</th>
            <th className="px-4 py-3 text-right">Ordered</th>
            <th className="px-4 py-3 text-right">Planned</th>
            <th className="px-4 py-3 text-right">Picked</th>
            <th className="px-4 py-3 text-right">Packed</th>
            <th className="px-4 py-3 text-right">Dispatched</th>
            <th className="px-4 py-3 text-right">Delivered</th>
            <th className="px-4 py-3 text-right">Remaining</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>

        <tbody>
          {items.map((item) => {
            const remaining = item.delivery_quantity - item.delivered_quantity;

            return (
              <tr key={item.id} className="border-t">
                <td className="px-4 py-4 font-medium">{item.line_number}</td>

                <td className="px-4 py-4">
                  <div>
                    <p className="font-medium">
                      {item.product?.name ?? "Unknown Product"}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.product?.sku ?? "-"}
                    </p>
                  </div>
                </td>

                <td className="px-4 py-4">{item.warehouse?.name ?? "-"}</td>

                <QuantityCell value={item.ordered_quantity} />

                <QuantityCell value={item.delivery_quantity} highlight />

                <QuantityCell value={item.picked_quantity} />

                <QuantityCell value={item.packed_quantity} />

                <QuantityCell value={item.dispatched_quantity} />

                <QuantityCell value={item.delivered_quantity} />

                <QuantityCell value={remaining} remaining />
                <td className="px-4 py-4">
                  <DeliveryQuantityEditor
                    deliveryOrderId={deliveryOrderId}
                    item={item}
                    status={status}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function QuantityCell({
  value,
  highlight = false,
  remaining = false,
}: {
  value: number;
  highlight?: boolean;
  remaining?: boolean;
}) {
  return (
    <td
      className={`px-4 py-4 text-right font-medium ${
        highlight
          ? "text-primary"
          : remaining
            ? value === 0
              ? "text-emerald-600"
              : "text-amber-600"
            : ""
      }`}
    >
      {new Intl.NumberFormat("en-AE", {
        maximumFractionDigits: 4,
      }).format(value)}
    </td>
  );
}

import Link from "next/link";
import { PackageOpen, Plus } from "lucide-react";
import type { InventoryTransferDetails } from "@/lib/repositories/inventory-transfer.repository";

interface InventoryTransferItemsSectionProps {
  transferId: string;
  status: string;
  items: InventoryTransferDetails["items"];
}

export function InventoryTransferItemsSection({
  transferId,
  status,
  items,
}: InventoryTransferItemsSectionProps) {
  const canEdit = status === "draft";

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-slate-950">Transfer Items</h2>

          <p className="mt-0.5 text-sm text-slate-500">
            Products being moved between warehouses.
          </p>
        </div>

        {canEdit && (
          <Link
            href={`/admin/inventory/transfers/${transferId}/items/new`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-700"
          >
            <Plus className="size-4" />
            Add Item
          </Link>
        )}
      </header>

      {items.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center px-5 py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <PackageOpen className="size-5" />
          </div>

          <h3 className="mt-4 font-semibold text-slate-900">
            No transfer items yet
          </h3>

          <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
            Add products and requested quantities before approving this
            inventory transfer.
          </p>

          {canEdit && (
            <Link
              href={`/admin/inventory/transfers/${transferId}/items/new`}
              className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Plus className="size-4" />
              Add First Item
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  SKU
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Product
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                  Requested
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                  Dispatched
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                  Received
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                  Unit Cost
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                  Total
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">{item.line_number}</td>

                  <td className="px-4 py-3">{item.product?.sku ?? "-"}</td>

                  <td className="px-4 py-3 font-medium">
                    {item.product?.name ?? "Unknown Product"}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {item.requested_quantity}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {item.dispatched_quantity}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {item.received_quantity}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {formatCurrency(item.unit_cost)}
                  </td>

                  <td className="px-4 py-3 text-right font-semibold">
                    {formatCurrency(item.requested_quantity * item.unit_cost)}
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
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
  }).format(value);
}

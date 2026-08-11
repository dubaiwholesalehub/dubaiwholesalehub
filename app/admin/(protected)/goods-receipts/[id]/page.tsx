import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getGoodsReceiptHeaderById,
  getGoodsReceiptItems,
} from "@/lib/repositories/goods-receipts";

import CompleteGoodsReceiptButton from "@/components/admin/goods-receipts/complete-button";
import GoodsReceiptItemEditor from "@/components/admin/goods-receipts/goods-receipt-item-editor";

interface GoodsReceiptDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 3,
  }).format(value);
}

export default async function GoodsReceiptDetailPage({
  params,
}: GoodsReceiptDetailPageProps) {
  const { id } = await params;

  const [header, items] = await Promise.all([
    getGoodsReceiptHeaderById(id),
    getGoodsReceiptItems(id),
  ]);

  const summary = items.reduce(
    (total, item) => ({
      total_lines: total.total_lines + 1,

      ordered_quantity: total.ordered_quantity + Number(item.ordered_quantity),

      previously_received_quantity:
        total.previously_received_quantity +
        Number(item.previously_received_quantity),

      receiving_quantity:
        total.receiving_quantity + Number(item.receiving_quantity),

      accepted_quantity:
        total.accepted_quantity + Number(item.accepted_quantity),

      rejected_quantity:
        total.rejected_quantity + Number(item.rejected_quantity),

      damaged_quantity: total.damaged_quantity + Number(item.damaged_quantity),
    }),
    {
      total_lines: 0,
      ordered_quantity: 0,
      previously_received_quantity: 0,
      receiving_quantity: 0,
      accepted_quantity: 0,
      rejected_quantity: 0,
      damaged_quantity: 0,
    },
  );

  if (!header) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-orange-600">Goods Receipt</p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">
            {header.receipt_number}
          </h1>

          <p className="mt-2 text-sm text-neutral-600">
            Draft receiving document for {header.purchase_order.po_number}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {header.status !== "completed" && header.status !== "cancelled" && (
            <CompleteGoodsReceiptButton goodsReceiptId={header.id} />
          )}

          <Link
            href="/admin/goods-receipts"
            className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
          >
            Back to Goods Receipts
          </Link>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Status"
          value={header.status.replaceAll("_", " ")}
        />
        <SummaryCard label="Supplier" value={header.supplier.company_name} />

        <SummaryCard label="Warehouse" value={header.warehouse.name} />

        <SummaryCard
          label="Receiving Quantity"
          value={formatNumber(summary.receiving_quantity)}
        />
      </section>
      {header.status !== "completed" && header.status !== "cancelled" ? (
        <GoodsReceiptItemEditor goodsReceiptId={header.id} items={items} />
      ) : (
        <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 px-5 py-4">
            <h2 className="font-semibold text-neutral-950">Receipt Items</h2>

            <p className="mt-1 text-sm text-neutral-600">
              {items.length} remaining Purchase Order line
              {items.length === 1 ? "" : "s"} copied into this draft.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    Line
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    Product
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    Ordered
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    Previously Received
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    Receiving
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-4 text-sm text-neutral-700">
                      {item.line_number}
                    </td>

                    <td className="px-4 py-4 text-sm font-medium text-neutral-950">
                      <div>
                        <p className="font-medium text-neutral-950">
                          {item.product.name}
                        </p>

                        <p className="mt-1 text-xs text-neutral-500">
                          {item.product.sku}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-right text-sm text-neutral-700">
                      {formatNumber(item.ordered_quantity)}
                    </td>

                    <td className="px-4 py-4 text-right text-sm text-neutral-700">
                      {formatNumber(item.previously_received_quantity)}
                    </td>

                    <td className="px-4 py-4 text-right text-sm font-semibold text-orange-700">
                      {formatNumber(item.receiving_quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: string;
}

function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </p>

      <p className="mt-2 capitalize font-semibold text-neutral-950">{value}</p>
    </div>
  );
}

import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import {
  getPurchaseOrderHeaderById,
  getPurchaseOrderItems,
} from "@/lib/repositories/purchase-orders";

import {
  updatePurchaseOrderAction,
} from "./actions";

interface PurchaseOrderEditPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PurchaseOrderEditPage({
  params,
}: PurchaseOrderEditPageProps) {
  const {
    id,
  } = await params;

  const [
    purchaseOrder,
    items,
  ] = await Promise.all([
    getPurchaseOrderHeaderById(
      id,
    ),

    getPurchaseOrderItems(
      id,
    ),
  ]);

  if (!purchaseOrder) {
    notFound();
  }

  if (
    purchaseOrder.status !==
    "draft"
  ) {
    redirect(
      `/admin/purchase-orders/${purchaseOrder.id}`,
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/purchase-orders/${purchaseOrder.id}`}
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          &larr; Back to Purchase Order
        </Link>
      </div>

      <header>
        <p className="text-sm font-medium text-muted-foreground">
          Edit Purchase Order
        </p>

        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {purchaseOrder.po_number}
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Supplier:{" "}
          <span className="font-medium text-foreground">
            {purchaseOrder.supplier.company_name}
          </span>
        </p>
      </header>

      <form
        action={
          updatePurchaseOrderAction
        }
        className="space-y-6"
      >
        <input
          type="hidden"
          name="purchaseOrderId"
          value={
            purchaseOrder.id
          }
        />

        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">
              Purchase Order Items
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Edit quantity and unit price. Totals are recalculated automatically when saved.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">
                    Product
                  </th>

                  <th className="px-5 py-3 text-right font-medium">
                    Quantity
                  </th>

                  <th className="px-5 py-3 text-right font-medium">
                    Unit Price
                  </th>

                  <th className="px-5 py-3 text-right font-medium">
                    Current Line Total
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {items.map(
                  (item) => (
                    <tr
                      key={
                        item.id
                      }
                    >
                      <td className="px-5 py-4">
                        <input
                          type="hidden"
                          name="itemId"
                          value={
                            item.id
                          }
                        />

                        <p className="font-medium">
                          {item.product_name}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.sku
                            ? `SKU: ${item.sku}`
                            : "No SKU"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <input
                          type="number"
                          name={`quantity:${item.id}`}
                          min={0.001}
                          step="0.001"
                          required
                          defaultValue={
                            item.ordered_quantity
                          }
                          className="h-10 w-32 rounded-md border bg-background px-3 text-right text-sm"
                        />
                      </td>

                      <td className="px-5 py-4 text-right">
                        <input
                          type="number"
                          name={`unitPrice:${item.id}`}
                          min={0}
                          step="0.0001"
                          required
                          defaultValue={
                            item.unit_price
                          }
                          className="h-10 w-36 rounded-md border bg-background px-3 text-right text-sm"
                        />
                      </td>

                      <td className="px-5 py-4 text-right font-medium">
                        {new Intl.NumberFormat(
                          "en-AE",
                          {
                            style:
                              "currency",
                            currency:
                              purchaseOrder.currency_code ||
                              "AED",
                            minimumFractionDigits:
                              2,
                            maximumFractionDigits:
                              2,
                          },
                        ).format(
                          item.line_total,
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex flex-wrap justify-end gap-3">
          <Link
            href={`/admin/purchase-orders/${purchaseOrder.id}`}
            className="inline-flex h-10 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium transition hover:bg-muted"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-md bg-orange-600 px-5 text-sm font-semibold text-white transition hover:bg-orange-700"
          >
            Save Purchase Order
          </button>
        </div>
      </form>
    </div>
  );
}
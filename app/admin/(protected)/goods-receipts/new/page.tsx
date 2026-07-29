import Link from "next/link";

import {
  getActiveWarehousesForGrn,
  getEligiblePurchaseOrdersForGrn,
  getPurchaseOrderForGrn,
} from "@/lib/repositories/goods-receipts";

import { createDraftGoodsReceiptAction } from "@/app/admin/actions/goods-receipts/create-draft";

interface NewGoodsReceiptPageProps {
  searchParams: Promise<{
    purchaseOrderId?: string;
  }>;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Not specified";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 3,
  }).format(value);
}

function formatCurrency(value: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currencyCode} ${formatNumber(value)}`;
  }
}

function formatStatus(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default async function NewGoodsReceiptPage({
  searchParams,
}: NewGoodsReceiptPageProps) {
  const params = await searchParams;

  const selectedPurchaseOrderId = params.purchaseOrderId?.trim() ?? "";

  const eligiblePurchaseOrders = await getEligiblePurchaseOrdersForGrn();

  const warehouses = await getActiveWarehousesForGrn();

  const defaultWarehouse =
    warehouses.find((warehouse) => warehouse.is_default) ??
    warehouses[0] ??
    null;

  const selectedPurchaseOrder = selectedPurchaseOrderId
    ? await getPurchaseOrderForGrn(selectedPurchaseOrderId)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-orange-600">
            Warehouse Receiving
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">
            New Goods Receipt
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-neutral-600">
            Select an eligible Purchase Order and review its remaining
            quantities before creating a draft Goods Receipt.
          </p>
        </div>

        <Link
          href="/admin/goods-receipts"
          className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50"
        >
          Back to Goods Receipts
        </Link>
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-neutral-950">
            Select Purchase Order
          </h2>

          <p className="mt-1 text-sm text-neutral-600">
            Only sent or partially received Purchase Orders with remaining
            quantities are shown.
          </p>
        </div>

        {eligiblePurchaseOrders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-5 py-10 text-center">
            <h3 className="text-sm font-semibold text-neutral-900">
              No Purchase Orders are ready for receiving
            </h3>

            <p className="mt-2 text-sm text-neutral-600">
              A Purchase Order must be sent and have at least one line with a
              remaining quantity.
            </p>

            <Link
              href="/admin/purchase-orders"
              className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              View Purchase Orders
            </Link>
          </div>
        ) : (
          <form
            method="GET"
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <label
                htmlFor="purchaseOrderId"
                className="mb-2 block text-sm font-medium text-neutral-800"
              >
                Purchase Order
              </label>

              <select
                id="purchaseOrderId"
                name="purchaseOrderId"
                defaultValue={selectedPurchaseOrderId}
                required
                className="h-11 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-950 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              >
                <option value="">Select a Purchase Order</option>

                {eligiblePurchaseOrders.map((purchaseOrder) => (
                  <option key={purchaseOrder.id} value={purchaseOrder.id}>
                    {purchaseOrder.po_number} — {purchaseOrder.supplier_name} —{" "}
                    {formatNumber(purchaseOrder.remaining_quantity)} remaining
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-md bg-orange-600 px-5 text-sm font-semibold text-white transition hover:bg-orange-700"
            >
              Load Purchase Order
            </button>
          </form>
        )}
      </section>

      {!selectedPurchaseOrder ? (
        eligiblePurchaseOrders.length > 0 && (
          <section className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-14 text-center">
            <div className="mx-auto max-w-md">
              <h2 className="text-base font-semibold text-neutral-900">
                Select a Purchase Order to continue
              </h2>

              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Supplier details, delivery information, and all remaining
                Purchase Order lines will appear here.
              </p>
            </div>
          </section>
        )
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm lg:col-span-2">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Purchase Order
                  </p>

                  <h2 className="mt-1 text-xl font-semibold text-neutral-950">
                    {selectedPurchaseOrder.po_number}
                  </h2>

                  <p className="mt-2 text-sm text-neutral-600">
                    {selectedPurchaseOrder.supplier.company_name}
                  </p>
                </div>

                <span className="inline-flex w-fit rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                  {formatStatus(selectedPurchaseOrder.status)}
                </span>
              </div>

              <dl className="mt-6 grid gap-5 border-t border-neutral-200 pt-5 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Order Date
                  </dt>

                  <dd className="mt-1 text-sm font-medium text-neutral-950">
                    {formatDate(selectedPurchaseOrder.order_date)}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Expected Delivery
                  </dt>

                  <dd className="mt-1 text-sm font-medium text-neutral-950">
                    {formatDate(selectedPurchaseOrder.expected_delivery_date)}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Purchase Order Value
                  </dt>

                  <dd className="mt-1 text-sm font-medium text-neutral-950">
                    {formatCurrency(
                      selectedPurchaseOrder.total_amount,
                      selectedPurchaseOrder.currency_code,
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Currency
                  </dt>

                  <dd className="mt-1 text-sm font-medium text-neutral-950">
                    {selectedPurchaseOrder.currency_code}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Supplier Contact
              </p>

              <h3 className="mt-2 font-semibold text-neutral-950">
                {selectedPurchaseOrder.supplier.company_name}
              </h3>

              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-neutral-500">Contact person</dt>

                  <dd className="mt-0.5 font-medium text-neutral-900">
                    {selectedPurchaseOrder.supplier.contact_name ??
                      "Not specified"}
                  </dd>
                </div>

                <div>
                  <dt className="text-neutral-500">Phone</dt>

                  <dd className="mt-0.5 font-medium text-neutral-900">
                    {selectedPurchaseOrder.supplier.phone ?? "Not specified"}
                  </dd>
                </div>

                <div>
                  <dt className="text-neutral-500">WhatsApp</dt>

                  <dd className="mt-0.5 font-medium text-neutral-900">
                    {selectedPurchaseOrder.supplier.whatsapp ?? "Not specified"}
                  </dd>
                </div>

                <div>
                  <dt className="text-neutral-500">Email</dt>

                  <dd className="mt-0.5 break-all font-medium text-neutral-900">
                    {selectedPurchaseOrder.supplier.email ?? "Not specified"}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Remaining Lines"
              value={formatNumber(selectedPurchaseOrder.summary.total_lines)}
            />

            <SummaryCard
              label="Ordered Quantity"
              value={formatNumber(
                selectedPurchaseOrder.summary.ordered_quantity,
              )}
            />

            <SummaryCard
              label="Previously Received"
              value={formatNumber(
                selectedPurchaseOrder.summary.previously_received_quantity,
              )}
            />

            <SummaryCard
              label="Remaining Quantity"
              value={formatNumber(
                selectedPurchaseOrder.summary.remaining_quantity,
              )}
              emphasized
            />
          </section>

          <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 px-5 py-4">
              <h2 className="text-base font-semibold text-neutral-950">
                Items Remaining to Receive
              </h2>

              <p className="mt-1 text-sm text-neutral-600">
                Fully received Purchase Order lines have already been excluded.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <TableHeading>Line</TableHeading>
                    <TableHeading>SKU</TableHeading>
                    <TableHeading>Product</TableHeading>
                    <TableHeading>Unit</TableHeading>
                    <TableHeading align="right">Ordered</TableHeading>
                    <TableHeading align="right">
                      Previously Received
                    </TableHeading>
                    <TableHeading align="right">Remaining</TableHeading>
                    <TableHeading align="right">Unit Cost</TableHeading>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-100 bg-white">
                  {selectedPurchaseOrder.items.map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-50">
                      <TableCell>{item.line_number}</TableCell>

                      <TableCell>
                        <span className="font-mono text-xs">
                          {item.product_sku ?? "—"}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="min-w-52">
                          <p className="font-medium text-neutral-950">
                            {item.product_name}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>{item.unit_name ?? "—"}</TableCell>

                      <TableCell align="right">
                        {formatNumber(item.ordered_quantity)}
                      </TableCell>

                      <TableCell align="right">
                        {formatNumber(item.previously_received_quantity)}
                      </TableCell>

                      <TableCell align="right">
                        <span className="font-semibold text-orange-700">
                          {formatNumber(item.remaining_quantity)}
                        </span>
                      </TableCell>

                      <TableCell align="right">
                        {formatCurrency(
                          item.unit_price,
                          selectedPurchaseOrder.currency_code,
                        )}
                      </TableCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-neutral-200 bg-neutral-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-neutral-600">
                A draft Goods Receipt will be created with all remaining
                Purchase Order lines.
              </p>

              {defaultWarehouse ? (
                <form
                  action={createDraftGoodsReceiptAction}
                  className="flex flex-col gap-3 sm:flex-row sm:items-end"
                >
                  <input
                    type="hidden"
                    name="purchaseOrderId"
                    value={selectedPurchaseOrder.id}
                  />

                  <div>
                    <label
                      htmlFor="warehouseId"
                      className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-600"
                    >
                      Receiving Warehouse
                    </label>

                    <select
                      id="warehouseId"
                      name="warehouseId"
                      defaultValue={defaultWarehouse.id}
                      required
                      className="h-11 min-w-56 rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-950 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    >
                      {warehouses.map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.code} — {warehouse.name}
                          {warehouse.is_default ? " (Default)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="inline-flex h-11 items-center justify-center rounded-md bg-orange-600 px-5 text-sm font-semibold text-white transition hover:bg-orange-700"
                  >
                    Create Draft Goods Receipt
                  </button>
                </form>
              ) : (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  No active warehouse is available. Create or activate a
                  warehouse before receiving goods.
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: string;
  emphasized?: boolean;
}

function SummaryCard({ label, value, emphasized = false }: SummaryCardProps) {
  return (
    <div
      className={
        emphasized
          ? "rounded-xl border border-orange-200 bg-orange-50 p-5"
          : "rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
      }
    >
      <p
        className={
          emphasized
            ? "text-xs font-medium uppercase tracking-wide text-orange-700"
            : "text-xs font-medium uppercase tracking-wide text-neutral-500"
        }
      >
        {label}
      </p>

      <p
        className={
          emphasized
            ? "mt-2 text-2xl font-semibold text-orange-800"
            : "mt-2 text-2xl font-semibold text-neutral-950"
        }
      >
        {value}
      </p>
    </div>
  );
}

interface TableHeadingProps {
  children: React.ReactNode;
  align?: "left" | "right";
}

function TableHeading({ children, align = "left" }: TableHeadingProps) {
  return (
    <th
      scope="col"
      className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-600 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

interface TableCellProps {
  children: React.ReactNode;
  align?: "left" | "right";
}

function TableCell({ children, align = "left" }: TableCellProps) {
  return (
    <td
      className={`whitespace-nowrap px-4 py-4 text-sm text-neutral-700 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </td>
  );
}

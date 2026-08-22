"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { ArrowLeft, PackageCheck, RotateCcw } from "lucide-react";

import { createSalesReturnAction } from "@/app/admin/(protected)/sales/returns/new/actions";

import type { SalesReturnEligibleOrder } from "@/lib/repositories/sales-return.repository";

/* =========================================================
 * Types
 * ========================================================= */

interface SalesReturnFormProps {
  orders: SalesReturnEligibleOrder[];
}

interface ReturnLineState {
  selected: boolean;
  quantity: string;
  condition: string;
  reason: string;
  notes: string;
}

/* =========================================================
 * Helpers
 * ========================================================= */

function getToday(): string {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(now.getMonth() + 1).padStart(2, "0");

  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatNumber(value: number, maximumFractionDigits = 4): string {
  return new Intl.NumberFormat("en-AE", {
    maximumFractionDigits,
  }).format(value);
}

function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

/* =========================================================
 * Component
 * ========================================================= */

export default function SalesReturnForm({ orders }: SalesReturnFormProps) {
  const [selectedOrderId, setSelectedOrderId] = useState("");

  const [returnDate, setReturnDate] = useState(getToday);

  const [postingDate, setPostingDate] = useState(getToday);

  const [reason, setReason] = useState("");

  const [notes, setNotes] = useState("");

  const [lines, setLines] = useState<Record<string, ReturnLineState>>({});

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );

  /* =======================================================
   * Selected Items Payload
   * ======================================================= */

  const selectedItems = useMemo(() => {
    if (!selectedOrder) {
      return [];
    }

    return selectedOrder.lines
      .filter((line) => lines[line.deliveryOrderItemId]?.selected)
      .map((line) => {
        const state = lines[line.deliveryOrderItemId];

        return {
          salesOrderItemId: line.salesOrderItemId,

          deliveryOrderItemId: line.deliveryOrderItemId,

          quantityReturned: Number(state?.quantity ?? 0),

          condition: state?.condition ?? "resalable",

          reason: state?.reason.trim() || null,

          notes: state?.notes.trim() || null,
        };
      });
  }, [selectedOrder, lines]);

  const selectedQuantity = useMemo(
    () =>
      selectedItems.reduce(
        (total, item) =>
          total +
          (Number.isFinite(item.quantityReturned) ? item.quantityReturned : 0),
        0,
      ),
    [selectedItems],
  );

  /* =======================================================
   * Line State
   * ======================================================= */

  function updateLine(
    deliveryOrderItemId: string,
    update: Partial<ReturnLineState>,
  ) {
    setLines((current) => {
      const existing = current[deliveryOrderItemId];

      const base: ReturnLineState = existing ?? {
        selected: false,
        quantity: "",
        condition: "resalable",
        reason: "",
        notes: "",
      };

      return {
        ...current,

        [deliveryOrderItemId]: {
          ...base,
          ...update,
        },
      };
    });
  }

  function handleOrderChange(orderId: string) {
    setSelectedOrderId(orderId);

    /*
     * Clear any selections belonging to the previous order.
     */

    setLines({});
  }

  /* =======================================================
   * Empty State
   * ======================================================= */

  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-white p-10 text-center">
        <PackageCheck className="mx-auto h-10 w-10 text-slate-400" />

        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          No returnable sales
        </h2>

        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
          There are currently no delivered Sales Order lines with a remaining
          returnable quantity.
        </p>

        <Link
          href="/admin/sales/returns"
          className="mt-6 inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sales Returns
        </Link>
      </div>
    );
  }

  return (
    <form action={createSalesReturnAction} className="space-y-6">
      {/* ===================================================
       * RPC Payload
       * =================================================== */}

      <input type="hidden" name="salesOrderId" value={selectedOrderId} />

      <input type="hidden" name="items" value={JSON.stringify(selectedItems)} />

      {/* ===================================================
       * Return Header
       * =================================================== */}

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-lg bg-orange-50 p-2 text-orange-700">
            <RotateCcw className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">Return Information</h2>

            <p className="text-sm text-slate-500">
              Select the original fulfilled Sales Order and enter the return
              details.
            </p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <label
              htmlFor="salesOrder"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Sales Order
            </label>

            <select
              id="salesOrder"
              value={selectedOrderId}
              onChange={(event) => handleOrderChange(event.target.value)}
              required
              className="h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
            >
              <option value="">Select a delivered Sales Order</option>

              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.orderNumber}
                  {" — "}
                  {order.customerName}
                  {" — "}
                  {order.lines.length} returnable line
                  {order.lines.length === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="returnDate"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Return Date
            </label>

            <input
              id="returnDate"
              name="returnDate"
              type="date"
              value={returnDate}
              onChange={(event) => setReturnDate(event.target.value)}
              required
              className="h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>

          <div>
            <label
              htmlFor="postingDate"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Posting Date
            </label>

            <input
              id="postingDate"
              name="postingDate"
              type="date"
              value={postingDate}
              onChange={(event) => setPostingDate(event.target.value)}
              required
              className="h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>

          <div className="lg:col-span-2">
            <label
              htmlFor="reason"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Return Reason
            </label>

            <input
              id="reason"
              name="reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
              placeholder="Example: Customer returned damaged item"
              className="h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>

          <div className="lg:col-span-2">
            <label
              htmlFor="notes"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Notes
            </label>

            <textarea
              id="notes"
              name="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Optional internal notes"
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>
        </div>
      </section>

      {/* ===================================================
       * Original Order
       * =================================================== */}

      {selectedOrder && (
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Sales Order
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {selectedOrder.orderNumber}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Customer
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {selectedOrder.customerName}
              </p>

              <p className="text-xs text-slate-500">
                {selectedOrder.customerNumber}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Order Date
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {selectedOrder.orderDate}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Currency
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {selectedOrder.currencyCode}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ===================================================
       * Return Lines
       * =================================================== */}

      {selectedOrder && (
        <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold text-slate-900">Return Items</h2>

            <p className="mt-1 text-sm text-slate-500">
              Select only the delivered lines being returned.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1150px] w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Return</th>

                  <th className="px-4 py-3">Item</th>

                  <th className="px-4 py-3">Warehouse</th>

                  <th className="px-4 py-3 text-right">Delivered</th>

                  <th className="px-4 py-3 text-right">Returned</th>

                  <th className="px-4 py-3 text-right">Available</th>

                  <th className="px-4 py-3">Qty</th>

                  <th className="px-4 py-3">Condition</th>

                  <th className="px-4 py-3 text-right">Price</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {selectedOrder.lines.map((line) => {
                  const state = lines[line.deliveryOrderItemId] ?? {
                    selected: false,

                    quantity: "",

                    condition: "resalable",

                    reason: "",

                    notes: "",
                  };

                  return (
                    <tr
                      key={line.deliveryOrderItemId}
                      className={state.selected ? "bg-orange-50/40" : ""}
                    >
                      <td className="px-4 py-4 align-top">
                        <input
                          type="checkbox"
                          checked={state.selected}
                          onChange={(event) =>
                            updateLine(line.deliveryOrderItemId, {
                              selected: event.target.checked,

                              quantity: event.target.checked
                                ? String(line.quantityReturnable)
                                : "",
                            })
                          }
                          className="h-4 w-4 rounded border-slate-300"
                        />
                      </td>

                      <td className="max-w-sm px-4 py-4 align-top">
                        <p className="font-medium text-slate-900">
                          {line.itemName}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Line {line.salesOrderLineNumber}
                          {line.sku ? ` • ${line.sku}` : ""}
                        </p>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <p className="font-medium text-slate-800">
                          {line.warehouseCode}
                        </p>

                        <p className="text-xs text-slate-500">
                          {line.warehouseName}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-right align-top">
                        {formatNumber(line.quantityDispatched)}
                      </td>

                      <td className="px-4 py-4 text-right align-top">
                        {formatNumber(line.quantityAlreadyReturned)}
                      </td>

                      <td className="px-4 py-4 text-right align-top font-semibold text-emerald-700">
                        {formatNumber(line.quantityReturnable)}
                      </td>

                      <td className="px-4 py-4 align-top">
                        <input
                          type="number"
                          min="0.0001"
                          step="0.0001"
                          max={line.quantityReturnable}
                          disabled={!state.selected}
                          value={state.quantity}
                          onChange={(event) =>
                            updateLine(line.deliveryOrderItemId, {
                              quantity: event.target.value,
                            })
                          }
                          className="h-9 w-24 rounded-md border px-2 text-right disabled:bg-slate-100"
                        />
                      </td>

                      <td className="px-4 py-4 align-top">
                        <select
                          disabled={!state.selected}
                          value={state.condition}
                          onChange={(event) =>
                            updateLine(line.deliveryOrderItemId, {
                              condition: event.target.value,
                            })
                          }
                          className="h-9 rounded-md border bg-white px-2 disabled:bg-slate-100"
                        >
                          <option value="resalable">Resalable</option>

                          <option value="damaged">Damaged</option>

                          <option value="defective">Defective</option>

                          <option value="opened">Opened</option>
                        </select>
                      </td>

                      <td className="px-4 py-4 text-right align-top">
                        {formatCurrency(
                          line.unitPrice,
                          selectedOrder.currencyCode,
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ===================================================
       * Actions
       * =================================================== */}

      <section className="flex flex-col gap-4 rounded-xl border bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900">
            {selectedItems.length} line
            {selectedItems.length === 1 ? "" : "s"} selected
          </p>

          <p className="text-xs text-slate-500">
            Total return quantity: {formatNumber(selectedQuantity)}
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/admin/sales/returns"
            className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium hover:bg-slate-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={
              !selectedOrder || selectedItems.length === 0 || !reason.trim()
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Create Sales Return
          </button>
        </div>
      </section>
    </form>
  );
}

"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShoppingCart,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import {
  generateReorderPurchaseOrdersAction,
  type GeneratedPurchaseOrderResult,
} from "@/app/admin/(protected)/purchasing/reorder/actions";

import type { ReorderRecommendation } from "@/lib/purchasing/reorder-intelligence.repository";

/* =========================================================
 * Props
 * ========================================================= */

interface ReorderPurchasePlannerProps {
  recommendations: ReorderRecommendation[];
}

/* =========================================================
 * Component
 * ========================================================= */

export default function ReorderPurchasePlanner({
  recommendations,
}: ReorderPurchasePlannerProps) {
  const eligibleRecommendations = useMemo(
    () => recommendations.filter((item) => item.suggestedQuantity > 0),
    [recommendations],
  );

  const selectableRecommendations = useMemo(
    () =>
      eligibleRecommendations.filter(
        (item) => Boolean(item.supplierId) && item.supplierCost !== null,
      ),
    [eligibleRecommendations],
  );

  const selectableIds = useMemo(
    () => selectableRecommendations.map((item) => item.productId),
    [selectableRecommendations],
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [generatedPurchaseOrders, setGeneratedPurchaseOrders] = useState<
    GeneratedPurchaseOrderResult[]
  >([]);

  const [skippedItems, setSkippedItems] = useState<
    {
      productId: string;
      productName: string;
      reason: string;
    }[]
  >([]);

  const [message, setMessage] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const allSelected =
    selectableIds.length > 0 &&
    selectableIds.every((productId) => selectedIds.has(productId));

  const selectedRecommendations = useMemo(
    () =>
      selectableRecommendations.filter((item) =>
        selectedIds.has(item.productId),
      ),
    [selectableRecommendations, selectedIds],
  );

  const selectedBudget = useMemo(
    () =>
      selectedRecommendations.reduce(
        (total, item) => total + item.estimatedPurchaseValue,
        0,
      ),
    [selectedRecommendations],
  );

  const selectedSupplierCount = useMemo(
    () =>
      new Set(
        selectedRecommendations.map((item) => item.supplierId).filter(Boolean),
      ).size,
    [selectedRecommendations],
  );

  function toggleProduct(productId: string) {
    setGeneratedPurchaseOrders([]);

    setSkippedItems([]);

    setMessage(null);

    setErrorMessage(null);

    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }

      return next;
    });
  }

  function toggleAll() {
    setGeneratedPurchaseOrders([]);

    setSkippedItems([]);

    setMessage(null);

    setErrorMessage(null);

    setSelectedIds(allSelected ? new Set() : new Set(selectableIds));
  }

  function handleGenerate() {
    if (selectedIds.size === 0) {
      setErrorMessage("Select at least one product.");

      return;
    }

    const productIds = [...selectedIds];

    setGeneratedPurchaseOrders([]);

    setSkippedItems([]);

    setMessage(null);

    setErrorMessage(null);

    startTransition(async () => {
      const result = await generateReorderPurchaseOrdersAction(productIds);

      if (!result.success) {
        setErrorMessage(result.message);

        setSkippedItems(result.skippedItems);

        return;
      }

      setGeneratedPurchaseOrders(result.purchaseOrders);

      setSkippedItems(result.skippedItems);

      setMessage(result.message);

      setSelectedIds(new Set());
    });
  }

  return (
    <div className="space-y-6">
      {/* ===================================================
       * Planner Header
       * =================================================== */}

      <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="font-semibold text-neutral-950">Purchase Planner</h3>

          <p className="mt-1 text-sm leading-6 text-neutral-500">
            Select reorder recommendations and generate draft Purchase Orders
            automatically by supplier.
          </p>
        </div>

        <button
          type="button"
          onClick={toggleAll}
          disabled={selectableIds.length === 0}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 transition hover:border-orange-200 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {allSelected
            ? "Clear Selection"
            : `Select All (${selectableIds.length})`}
        </button>
      </div>

      {/* ===================================================
       * Messages
       * =================================================== */}

      {errorMessage ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-700" />

          <div>
            <p className="font-semibold text-red-900">
              Purchase Orders were not generated
            </p>

            <p className="mt-1 text-sm leading-6 text-red-700">
              {errorMessage}
            </p>
          </div>
        </div>
      ) : null}

      {message ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" />

          <div>
            <p className="font-semibold text-emerald-900">
              Purchase Orders Created
            </p>

            <p className="mt-1 text-sm leading-6 text-emerald-700">{message}</p>
          </div>
        </div>
      ) : null}

      {/* ===================================================
       * Created Purchase Orders
       * =================================================== */}

      {generatedPurchaseOrders.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
          <div className="border-b border-emerald-100 bg-emerald-50 px-5 py-4">
            <h3 className="font-semibold text-emerald-950">
              Generated Purchase Orders
            </h3>

            <p className="mt-1 text-sm text-emerald-700">
              Draft Purchase Orders are ready for review.
            </p>
          </div>

          <div className="divide-y divide-neutral-100">
            {generatedPurchaseOrders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <Link
                    href={`/admin/purchase-orders/${order.id}`}
                    className="font-semibold text-neutral-950 transition hover:text-orange-600"
                  >
                    {order.poNumber}
                  </Link>

                  <p className="mt-1 text-sm text-neutral-600">
                    {order.supplierName}
                  </p>

                  <p className="mt-1 text-xs text-neutral-500">
                    {order.itemCount} item
                    {order.itemCount === 1 ? "" : "s"} ·{" "}
                    {formatQuantity(order.totalQuantity)} units
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold text-neutral-950">
                      {formatCurrencyCode(
                        order.totalAmount,
                        order.currencyCode,
                      )}
                    </p>

                    <p className="mt-1 text-xs text-neutral-500">
                      Draft Purchase Order
                    </p>
                  </div>

                  <Link
                    href={`/admin/purchase-orders/${order.id}`}
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-orange-600 px-3 text-sm font-semibold text-white transition hover:bg-orange-700"
                  >
                    Open PO
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ===================================================
       * Skipped Products
       * =================================================== */}

      {skippedItems.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
          <h3 className="font-semibold text-amber-950">
            Products Not Included
          </h3>

          <div className="mt-4 space-y-3">
            {skippedItems.map((item, index) => (
              <div
                key={`${item.productId}-${index}`}
                className="rounded-xl border border-amber-200 bg-white p-4"
              >
                <p className="font-medium text-neutral-950">
                  {item.productName}
                </p>

                <p className="mt-1 text-sm text-amber-700">{item.reason}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ===================================================
       * Recommendations
       * =================================================== */}

      {eligibleRecommendations.length === 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <CheckCircle2 className="mx-auto size-10 text-emerald-700" />

          <p className="mt-3 font-semibold text-emerald-950">
            No purchases currently recommended
          </p>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-emerald-800">
            Current stock and incoming Purchase Orders are sufficient under the
            present reorder policy.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1750px] text-left">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="w-14 px-4 py-3 font-medium">Select</th>

                  <th className="px-4 py-3 font-medium">Product</th>

                  <th className="px-4 py-3 font-medium">Priority</th>

                  <th className="px-4 py-3 text-right font-medium">
                    Available
                  </th>

                  <th className="px-4 py-3 text-right font-medium">Incoming</th>

                  <th className="px-4 py-3 text-right font-medium">
                    Avg. Daily Sales
                  </th>

                  <th className="px-4 py-3 text-right font-medium">
                    Days Remaining
                  </th>

                  <th className="px-4 py-3 text-right font-medium">
                    Lead Time
                  </th>

                  <th className="px-4 py-3 text-right font-medium">
                    Suggested Qty
                  </th>

                  <th className="px-4 py-3 font-medium">Supplier</th>

                  <th className="px-4 py-3 text-right font-medium">
                    Unit Cost
                  </th>

                  <th className="px-4 py-3 text-right font-medium">
                    Estimated Value
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {eligibleRecommendations.map((item) => {
                  const selectable =
                    Boolean(item.supplierId) && item.supplierCost !== null;

                  const selected = selectedIds.has(item.productId);

                  return (
                    <tr
                      key={item.productId}
                      className={[
                        "align-top transition",
                        selected ? "bg-orange-50/50" : "hover:bg-neutral-50",
                      ].join(" ")}
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={!selectable || isPending}
                          onChange={() => toggleProduct(item.productId)}
                          aria-label={`Select ${item.productName}`}
                          className="size-4 cursor-pointer accent-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
                        />
                      </td>

                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/products/${item.productId}`}
                          className="font-semibold text-neutral-950 transition hover:text-orange-600"
                        >
                          {item.productName}
                        </Link>

                        <p className="mt-1 text-xs text-neutral-500">
                          {item.sku ? `SKU: ${item.sku}` : "No SKU"}
                        </p>

                        <p className="mt-2 max-w-[320px] text-xs leading-5 text-neutral-500">
                          {item.reason}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <PriorityBadge priority={item.priority} />
                      </td>

                      <td className="px-4 py-4 text-right font-medium">
                        {formatQuantity(item.quantityAvailable)}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <p className="font-medium text-blue-700">
                          {formatQuantity(item.incomingQuantity)}
                        </p>

                        <p className="mt-1 text-xs text-neutral-400">
                          Projected {formatQuantity(item.projectedStock)}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-right">
                        {formatQuantity(item.averageDailySales)}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {item.daysOfStockRemaining === null
                          ? "—"
                          : formatDays(item.daysOfStockRemaining)}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {item.leadTimeDays} day
                        {item.leadTimeDays === 1 ? "" : "s"}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <span className="inline-flex rounded-lg bg-orange-50 px-3 py-1.5 text-sm font-bold text-orange-700">
                          {formatQuantity(item.suggestedQuantity)}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        {item.supplierId && item.supplierName ? (
                          <div>
                            <Link
                              href={`/admin/suppliers/${item.supplierId}`}
                              className="font-medium text-neutral-950 transition hover:text-orange-600"
                            >
                              {item.supplierName}
                            </Link>

                            {!selectable ? (
                              <p className="mt-1 text-xs font-medium text-red-600">
                                Purchase cost missing
                              </p>
                            ) : null}

                            <Link
                              href={`/admin/purchasing/supplier-comparison/${item.productId}?quantity=${encodeURIComponent(
                                String(item.suggestedQuantity),
                              )}`}
                              className="mt-2 inline-flex text-xs font-semibold text-orange-600 transition hover:text-orange-700"
                            >
                              Compare Suppliers →
                            </Link>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm font-medium text-red-700">
                              Supplier not mapped
                            </p>

                            <Link
                              href={`/admin/products/${item.productId}`}
                              className="mt-1 inline-block text-xs font-semibold text-orange-600"
                            >
                              Configure supplier →
                            </Link>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {item.supplierCost !== null
                          ? formatCurrencyCode(
                              item.supplierCost,
                              item.currencyCode,
                            )
                          : "—"}
                      </td>

                      <td className="px-4 py-4 text-right font-semibold">
                        {item.supplierCost !== null
                          ? formatCurrencyCode(
                              item.estimatedPurchaseValue,
                              item.currencyCode,
                            )
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================
       * Selection Summary
       * =================================================== */}

      {selectedIds.size > 0 ? (
        <div className="sticky bottom-4 z-30 rounded-2xl border border-orange-200 bg-white/95 p-4 shadow-xl backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
              <SelectionMetric
                label="Selected"
                value={`${selectedRecommendations.length} product${
                  selectedRecommendations.length === 1 ? "" : "s"
                }`}
              />

              <SelectionMetric
                label="Suppliers"
                value={String(selectedSupplierCount)}
              />

              <SelectionMetric
                label="Estimated Budget"
                value={formatCurrency(selectedBudget)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                disabled={isPending}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={isPending || selectedIds.size === 0}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-orange-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="size-4" />
                    Generate Purchase Orders
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* =========================================================
 * Selection Metric
 * ========================================================= */

function SelectionMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </p>

      <p className="mt-1 font-semibold text-neutral-950">{value}</p>
    </div>
  );
}

/* =========================================================
 * Priority
 * ========================================================= */

function PriorityBadge({
  priority,
}: {
  priority: ReorderRecommendation["priority"];
}) {
  const config = getPriorityConfig(priority);

  return (
    <span
      className={[
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
        config,
      ].join(" ")}
    >
      {formatPriority(priority)}
    </span>
  );
}

function getPriorityConfig(
  priority: ReorderRecommendation["priority"],
): string {
  switch (priority) {
    case "critical":
      return "border-red-200 bg-red-50 text-red-700";

    case "high":
      return "border-orange-200 bg-orange-50 text-orange-700";

    case "medium":
      return "border-amber-200 bg-amber-50 text-amber-700";

    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

function formatPriority(priority: ReorderRecommendation["priority"]): string {
  switch (priority) {
    case "critical":
      return "Critical";

    case "high":
      return "High";

    case "medium":
      return "Medium";

    default:
      return "Healthy";
  }
}

/* =========================================================
 * Formatting
 * ========================================================= */

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("en-AE", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDays(value: number): string {
  if (!Number.isFinite(value)) {
    return "—";
  }

  if (value < 1) {
    return "<1 day";
  }

  const rounded = Math.round(value);

  return `${rounded} day${rounded === 1 ? "" : "s"}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCurrencyCode(value: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: currencyCode || "AED",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currencyCode || "AED"} ${value.toFixed(2)}`;
  }
}

"use client";

import {
  useMemo,
  useState,
} from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Plus,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import type {
  StockAdjustmentOptions,
} from "@/lib/inventory/inventory-operation.repository";

interface StockAdjustmentFormProps {
  options: StockAdjustmentOptions;

  action: (
    formData: FormData,
  ) => Promise<void>;
}

type AdjustmentType =
  | "adjustment_in"
  | "adjustment_out";

interface AdjustmentLine {
  id: string;
  productId: string;
  quantity: string;
  unitCost: string;
  notes: string;
}

function createEmptyLine():
  AdjustmentLine {
  return {
    id: crypto.randomUUID(),
    productId: "",
    quantity: "",
    unitCost: "",
    notes: "",
  };
}

export default function StockAdjustmentForm({
  options,
  action,
}: StockAdjustmentFormProps) {
  const [
    adjustmentType,
    setAdjustmentType,
  ] =
    useState<AdjustmentType>(
      "adjustment_in",
    );

  const [
    warehouseId,
    setWarehouseId,
  ] = useState(
    options.warehouses.find(
      (warehouse) =>
        warehouse.is_default,
    )?.id ?? "",
  );

  const [
    lines,
    setLines,
  ] = useState<
    AdjustmentLine[]
  >([
    createEmptyLine(),
  ]);

  const serializedItems =
    useMemo(
      () =>
        JSON.stringify(
          lines.map(
            (line) => ({
              productId:
                line.productId,

              quantity:
                Number(
                  line.quantity,
                ),

              unitCost:
                adjustmentType ===
                  "adjustment_in"
                  ? Number(
                      line.unitCost,
                    )
                  : undefined,

              notes:
                line.notes.trim() ||
                undefined,
            }),
          ),
        ),
      [
        adjustmentType,
        lines,
      ],
    );

  const selectedProductIds =
    useMemo(
      () =>
        new Set(
          lines
            .map(
              (line) =>
                line.productId,
            )
            .filter(Boolean),
        ),
      [lines],
    );

  const hasInvalidOutgoingLine =
    adjustmentType ===
      "adjustment_out" &&
    lines.some((line) => {
      if (
        !line.productId ||
        !warehouseId
      ) {
        return false;
      }

      const balance =
        getBalance(
          options,
          warehouseId,
          line.productId,
        );

      const quantity =
        Number(
          line.quantity,
        );

      if (
        !Number.isFinite(
          quantity,
        ) ||
        quantity <= 0
      ) {
        return false;
      }

      return (
        quantity >
        balance.quantityAvailable
      );
    });

  const totalValueImpact =
    useMemo(() => {
      return lines.reduce(
        (total, line) => {
          const quantity =
            Number(
              line.quantity,
            );

          if (
            !Number.isFinite(
              quantity,
            ) ||
            quantity <= 0
          ) {
            return total;
          }

          if (
            adjustmentType ===
            "adjustment_in"
          ) {
            const cost =
              Number(
                line.unitCost,
              );

            if (
              !Number.isFinite(
                cost,
              )
            ) {
              return total;
            }

            return (
              total +
              quantity * cost
            );
          }

          const balance =
            getBalance(
              options,
              warehouseId,
              line.productId,
            );

          return (
            total +
            quantity *
              balance.averageUnitCost
          );
        },
        0,
      );
    }, [
      adjustmentType,
      lines,
      options,
      warehouseId,
    ]);

  function updateLine(
    id: string,
    field:
      | "productId"
      | "quantity"
      | "unitCost"
      | "notes",
    value: string,
  ) {
    setLines(
      (current) =>
        current.map(
          (line) =>
            line.id === id
              ? {
                  ...line,
                  [field]:
                    value,
                }
              : line,
        ),
    );
  }

  function addLine() {
    setLines(
      (current) => [
        ...current,
        createEmptyLine(),
      ],
    );
  }

  function removeLine(
    id: string,
  ) {
    setLines(
      (current) =>
        current.length === 1
          ? current
          : current.filter(
              (line) =>
                line.id !== id,
            ),
    );
  }

  function changeAdjustmentType(
    type: AdjustmentType,
  ) {
    setAdjustmentType(type);

    if (
      type ===
      "adjustment_out"
    ) {
      setLines(
        (current) =>
          current.map(
            (line) => ({
              ...line,
              unitCost: "",
            }),
          ),
      );
    }
  }

  return (
    <form
      action={action}
      className="space-y-6"
    >
      <input
        type="hidden"
        name="adjustmentType"
        value={
          adjustmentType
        }
      />

      <input
        type="hidden"
        name="items"
        value={
          serializedItems
        }
      />

      {/* =====================================================
       * What Happened?
       * ===================================================== */}

      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold">
          What happened?
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Choose whether physical inventory increased or decreased.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() =>
              changeAdjustmentType(
                "adjustment_in",
              )
            }
            className={[
              "flex items-start gap-4 rounded-xl border p-5 text-left transition",
              adjustmentType ===
              "adjustment_in"
                ? "border-green-400 bg-green-50 ring-2 ring-green-100"
                : "hover:border-slate-300 hover:bg-slate-50",
            ].join(" ")}
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700">
              <ArrowUpCircle className="size-6" />
            </div>

            <div>
              <p className="font-semibold">
                Stock Increased
              </p>

              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Use when stock was found, corrected upward, or added manually.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              changeAdjustmentType(
                "adjustment_out",
              )
            }
            className={[
              "flex items-start gap-4 rounded-xl border p-5 text-left transition",
              adjustmentType ===
              "adjustment_out"
                ? "border-red-400 bg-red-50 ring-2 ring-red-100"
                : "hover:border-slate-300 hover:bg-slate-50",
            ].join(" ")}
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
              <ArrowDownCircle className="size-6" />
            </div>

            <div>
              <p className="font-semibold">
                Stock Decreased
              </p>

              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Use for damaged, lost, expired, samples, or downward corrections.
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* =====================================================
       * Header
       * ===================================================== */}

      <section className="rounded-xl border bg-card p-5">
        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <label className="text-sm font-semibold">
              Warehouse
            </label>

            <select
              name="warehouseId"
              required
              value={
                warehouseId
              }
              onChange={(
                event,
              ) =>
                setWarehouseId(
                  event.target
                    .value,
                )
              }
              className="mt-2 h-11 w-full rounded-xl border bg-white px-4"
            >
              <option value="">
                Select warehouse
              </option>

              {options.warehouses.map(
                (
                  warehouse,
                ) => (
                  <option
                    key={
                      warehouse.id
                    }
                    value={
                      warehouse.id
                    }
                  >
                    {
                      warehouse.name
                    }

                    {warehouse.is_default
                      ? " (Default)"
                      : ""}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold">
              Adjustment Date
            </label>

            <input
              type="date"
              name="transactionDate"
              required
              defaultValue={
                new Date()
                  .toISOString()
                  .slice(0, 10)
              }
              className="mt-2 h-11 w-full rounded-xl border px-4"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">
              Reason
            </label>

            <select
              name="reason"
              required
              defaultValue={
                adjustmentType ===
                "adjustment_in"
                  ? "correction"
                  : "damage"
              }
              key={
                adjustmentType
              }
              className="mt-2 h-11 w-full rounded-xl border bg-white px-4"
            >
              {adjustmentType ===
              "adjustment_in" ? (
                <>
                  <option value="correction">
                    Stock Correction
                  </option>

                  <option value="found">
                    Stock Found
                  </option>

                  <option value="other">
                    Other
                  </option>
                </>
              ) : (
                <>
                  <option value="damage">
                    Damaged
                  </option>

                  <option value="lost">
                    Lost
                  </option>

                  <option value="expired">
                    Expired
                  </option>

                  <option value="sample">
                    Sample / Giveaway
                  </option>

                  <option value="correction">
                    Stock Correction
                  </option>

                  <option value="other">
                    Other
                  </option>
                </>
              )}
            </select>
          </div>
        </div>

        <div className="mt-5">
          <label className="text-sm font-semibold">
            Reference
          </label>

          <input
            name="referenceNumber"
            maxLength={100}
            placeholder="Optional reference, count sheet, memo number..."
            className="mt-2 h-11 w-full rounded-xl border px-4"
          />
        </div>
      </section>

      {/* =====================================================
       * Products
       * ===================================================== */}

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-col gap-4 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">
              Products
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Review current stock and the expected balance before posting.
            </p>
          </div>

          <button
            type="button"
            onClick={addLine}
            className="inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"
          >
            <Plus className="size-4" />
            Add Product
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] text-left">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">
                  Product
                </th>

                <th className="px-4 py-3 text-right">
                  On Hand
                </th>

                <th className="px-4 py-3 text-right">
                  Reserved
                </th>

                <th className="px-4 py-3 text-right">
                  Available
                </th>

                <th className="px-4 py-3">
                  Adjustment
                </th>

                <th className="px-4 py-3 text-right">
                  After
                </th>

                {adjustmentType ===
                "adjustment_in" ? (
                  <th className="px-4 py-3">
                    Unit Cost
                  </th>
                ) : null}

                <th className="px-4 py-3">
                  Notes
                </th>

                <th className="w-14 px-4 py-3" />
              </tr>
            </thead>

            <tbody className="divide-y">
              {lines.map(
                (line) => {
                  const product =
                    options.products.find(
                      (item) =>
                        item.id ===
                        line.productId,
                    );

                  const balance =
                    getBalance(
                      options,
                      warehouseId,
                      line.productId,
                    );

                  const quantity =
                    Number(
                      line.quantity,
                    );

                  const validQuantity =
                    Number.isFinite(
                      quantity,
                    ) &&
                    quantity > 0
                      ? quantity
                      : 0;

                  const afterStock =
                    adjustmentType ===
                    "adjustment_in"
                      ? balance.quantityOnHand +
                        validQuantity
                      : balance.quantityOnHand -
                        validQuantity;

                  const invalidOutgoing =
                    adjustmentType ===
                      "adjustment_out" &&
                    validQuantity >
                      balance.quantityAvailable;

                  return (
                    <tr
                      key={
                        line.id
                      }
                      className={
                        invalidOutgoing
                          ? "bg-red-50/50"
                          : undefined
                      }
                    >
                      <td className="px-4 py-3">
                        <select
                          value={
                            line.productId
                          }
                          required
                          onChange={(
                            event,
                          ) =>
                            updateLine(
                              line.id,
                              "productId",
                              event
                                .target
                                .value,
                            )
                          }
                          className="h-10 w-full min-w-[300px] rounded-lg border bg-white px-3"
                        >
                          <option value="">
                            Select product
                          </option>

                          {options.products.map(
                            (
                              item,
                            ) => {
                              const selectedElsewhere =
                                selectedProductIds.has(
                                  item.id,
                                ) &&
                                item.id !==
                                  line.productId;

                              return (
                                <option
                                  key={
                                    item.id
                                  }
                                  value={
                                    item.id
                                  }
                                  disabled={
                                    selectedElsewhere
                                  }
                                >
                                  {
                                    item.name
                                  }

                                  {item.sku
                                    ? ` — ${item.sku}`
                                    : ""}
                                </option>
                              );
                            },
                          )}
                        </select>

                        {product?.unit ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Unit:{" "}
                            {
                              product
                                .unit
                                .short_name
                            }
                          </p>
                        ) : null}
                      </td>

                      <td className="px-4 py-3 text-right font-medium">
                        {formatQuantity(
                          balance.quantityOnHand,
                        )}
                      </td>

                      <td className="px-4 py-3 text-right text-amber-700">
                        {formatQuantity(
                          balance.quantityReserved,
                        )}
                      </td>

                      <td className="px-4 py-3 text-right font-semibold">
                        {formatQuantity(
                          balance.quantityAvailable,
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              adjustmentType ===
                              "adjustment_in"
                                ? "font-semibold text-green-700"
                                : "font-semibold text-red-700"
                            }
                          >
                            {adjustmentType ===
                            "adjustment_in"
                              ? "+"
                              : "-"}
                          </span>

                          <input
                            type="number"
                            min={0.0001}
                            step="0.0001"
                            required
                            value={
                              line.quantity
                            }
                            onChange={(
                              event,
                            ) =>
                              updateLine(
                                line.id,
                                "quantity",
                                event
                                  .target
                                  .value,
                              )
                            }
                            className={[
                              "h-10 w-32 rounded-lg border px-3",
                              invalidOutgoing
                                ? "border-red-400 bg-red-50"
                                : "",
                            ].join(
                              " ",
                            )}
                          />
                        </div>

                        {invalidOutgoing ? (
                          <div className="mt-2 flex max-w-[220px] items-start gap-1 text-xs font-medium text-red-700">
                            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />

                            <span>
                              Cannot reduce more than{" "}
                              {formatQuantity(
                                balance.quantityAvailable,
                              )}{" "}
                              available.
                            </span>
                          </div>
                        ) : null}
                      </td>

                      <td
                        className={[
                          "px-4 py-3 text-right font-bold",
                          invalidOutgoing
                            ? "text-red-700"
                            : afterStock >
                                balance.quantityOnHand
                              ? "text-green-700"
                              : "text-slate-900",
                        ].join(
                          " ",
                        )}
                      >
                        {formatQuantity(
                          afterStock,
                        )}
                      </td>

                      {adjustmentType ===
                      "adjustment_in" ? (
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={0}
                            step="0.0001"
                            required
                            value={
                              line.unitCost
                            }
                            onChange={(
                              event,
                            ) =>
                              updateLine(
                                line.id,
                                "unitCost",
                                event
                                  .target
                                  .value,
                              )
                            }
                            placeholder="AED"
                            className="h-10 w-32 rounded-lg border px-3"
                          />

                          {balance.averageUnitCost >
                          0 ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Current avg:{" "}
                              {formatCurrency(
                                balance.averageUnitCost,
                              )}
                            </p>
                          ) : null}
                        </td>
                      ) : null}

                      <td className="px-4 py-3">
                        <input
                          value={
                            line.notes
                          }
                          maxLength={500}
                          onChange={(
                            event,
                          ) =>
                            updateLine(
                              line.id,
                              "notes",
                              event
                                .target
                                .value,
                            )
                          }
                          placeholder="Optional"
                          className="h-10 min-w-[180px] rounded-lg border px-3"
                        />
                      </td>

                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={
                            lines.length ===
                            1
                          }
                          onClick={() =>
                            removeLine(
                              line.id,
                            )
                          }
                          className="inline-flex size-9 items-center justify-center rounded-lg border transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Remove product"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 border-t bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {lines.length} product
            {lines.length === 1
              ? ""
              : "s"}{" "}
            in this adjustment
          </p>

          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Estimated Inventory Value Impact
            </p>

            <p
              className={[
                "mt-1 text-xl font-semibold",
                adjustmentType ===
                "adjustment_in"
                  ? "text-green-700"
                  : "text-red-700",
              ].join(" ")}
            >
              {adjustmentType ===
              "adjustment_in"
                ? "+"
                : "-"}
              {formatCurrency(
                totalValueImpact,
              )}
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================
       * Notes
       * ===================================================== */}

      <section className="rounded-xl border bg-card p-5">
        <label className="text-sm font-semibold">
          Internal Notes
        </label>

        <textarea
          name="internalNotes"
          rows={4}
          maxLength={2000}
          placeholder={
            adjustmentType ===
            "adjustment_in"
              ? "Explain why stock increased..."
              : "Explain why stock was reduced..."
          }
          className="mt-2 w-full rounded-xl border px-4 py-3"
        />
      </section>

      {hasInvalidOutgoingLine ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" />

          <div>
            <p className="font-semibold">
              Adjustment cannot be posted
            </p>

            <p className="mt-1">
              One or more products would reduce stock below the available quantity.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={
            hasInvalidOutgoingLine
          }
          className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-6 font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {adjustmentType ===
          "adjustment_in"
            ? "Post Stock Increase"
            : "Post Stock Decrease"}
        </button>
      </div>
    </form>
  );
}

/* =========================================================
 * Helpers
 * ========================================================= */

function getBalance(
  options: StockAdjustmentOptions,
  warehouseId: string,
  productId: string,
) {
  if (
    !warehouseId ||
    !productId
  ) {
    return {
      quantityOnHand: 0,
      quantityReserved: 0,
      quantityAvailable: 0,
      averageUnitCost: 0,
    };
  }

  return (
    options.stock.find(
      (stock) =>
        stock.warehouseId ===
          warehouseId &&
        stock.productId ===
          productId,
    ) ?? {
      quantityOnHand: 0,
      quantityReserved: 0,
      quantityAvailable: 0,
      averageUnitCost: 0,
    }
  );
}

function formatQuantity(
  value: number,
): string {
  return new Intl.NumberFormat(
    "en-AE",
    {
      maximumFractionDigits: 4,
    },
  ).format(value);
}

function formatCurrency(
  value: number,
): string {
  return new Intl.NumberFormat(
    "en-AE",
    {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(value);
}
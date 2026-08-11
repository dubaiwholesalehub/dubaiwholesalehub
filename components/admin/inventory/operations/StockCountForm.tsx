"use client";

import {
  useMemo,
  useState,
} from "react";
import {
  ClipboardCheck,
  Plus,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import type {
  StockAdjustmentOptions,
} from "@/lib/inventory/inventory-operation.repository";

interface StockCountFormProps {
  options: StockAdjustmentOptions;

  action: (
    formData: FormData,
  ) => Promise<void>;
}

interface StockCountLine {
  id: string;
  productId: string;
  countedQuantity: string;
  unitCost: string;
  notes: string;
}

function createEmptyLine():
  StockCountLine {
  return {
    id: crypto.randomUUID(),
    productId: "",
    countedQuantity: "",
    unitCost: "",
    notes: "",
  };
}

export default function StockCountForm({
  options,
  action,
}: StockCountFormProps) {
  const defaultWarehouse =
    options.warehouses.find(
      (warehouse) =>
        warehouse.is_default,
    );

  const [
    warehouseId,
    setWarehouseId,
  ] = useState(
    defaultWarehouse?.id ?? "",
  );

  const [
    lines,
    setLines,
  ] = useState<StockCountLine[]>([
    createEmptyLine(),
  ]);

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

  const serializedItems =
    useMemo(
      () =>
        JSON.stringify(
          lines.map(
            (line) => ({
              productId:
                line.productId,

              countedQuantity:
                Number(
                  line.countedQuantity,
                ),

              unitCost:
                line.unitCost === ""
                  ? undefined
                  : Number(
                      line.unitCost,
                    ),

              notes:
                line.notes.trim() ||
                undefined,
            }),
          ),
        ),
      [lines],
    );

  const hasReservedViolation =
    lines.some((line) => {
      if (
        !warehouseId ||
        !line.productId ||
        line.countedQuantity ===
          ""
      ) {
        return false;
      }

      const balance =
        getBalance(
          options,
          warehouseId,
          line.productId,
        );

      const counted =
        Number(
          line.countedQuantity,
        );

      return (
        Number.isFinite(
          counted,
        ) &&
        counted <
          balance.quantityReserved
      );
    });

  const hasMissingCost =
    lines.some((line) => {
      if (
        !warehouseId ||
        !line.productId ||
        line.countedQuantity ===
          ""
      ) {
        return false;
      }

      const balance =
        getBalance(
          options,
          warehouseId,
          line.productId,
        );

      const counted =
        Number(
          line.countedQuantity,
        );

      return (
        Number.isFinite(
          counted,
        ) &&
        counted >
          balance.quantityOnHand &&
        balance.quantityOnHand ===
          0 &&
        line.unitCost === ""
      );
    });

  const totalAbsoluteDifference =
    useMemo(
      () =>
        lines.reduce(
          (total, line) => {
            if (
              !line.productId ||
              line.countedQuantity ===
                ""
            ) {
              return total;
            }

            const balance =
              getBalance(
                options,
                warehouseId,
                line.productId,
              );

            const counted =
              Number(
                line.countedQuantity,
              );

            if (
              !Number.isFinite(
                counted,
              )
            ) {
              return total;
            }

            return (
              total +
              Math.abs(
                counted -
                  balance.quantityOnHand,
              )
            );
          },
          0,
        ),
      [
        lines,
        options,
        warehouseId,
      ],
    );

  function updateLine(
    id: string,
    field:
      | "productId"
      | "countedQuantity"
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

  return (
    <form
      action={action}
      className="space-y-6"
    >
      <input
        type="hidden"
        name="items"
        value={
          serializedItems
        }
      />

      <section className="rounded-xl border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <ClipboardCheck className="size-5" />
          </div>

          <div>
            <h2 className="font-semibold">
              Count Information
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Enter the physical quantity actually counted in the warehouse.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-3">
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
              Count Date
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
              Count Sheet / Reference
            </label>

            <input
              name="referenceNumber"
              maxLength={100}
              placeholder="Optional"
              className="mt-2 h-11 w-full rounded-xl border px-4"
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-col gap-4 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">
              Physical Count
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              HM ERP calculates the adjustment automatically from system stock versus physical stock.
            </p>
          </div>

          <button
            type="button"
            onClick={addLine}
            className="inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition hover:bg-slate-50"
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
                  System Stock
                </th>

                <th className="px-4 py-3 text-right">
                  Reserved
                </th>

                <th className="px-4 py-3">
                  Physical Count
                </th>

                <th className="px-4 py-3 text-right">
                  Difference
                </th>

                <th className="px-4 py-3 text-right">
                  After Count
                </th>

                <th className="px-4 py-3">
                  Unit Cost
                </th>

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

                  const counted =
                    Number(
                      line.countedQuantity,
                    );

                  const hasCount =
                    line.countedQuantity !==
                      "" &&
                    Number.isFinite(
                      counted,
                    );

                  const difference =
                    hasCount
                      ? counted -
                        balance.quantityOnHand
                      : 0;

                  const reservedViolation =
                    hasCount &&
                    counted <
                      balance.quantityReserved;

                  const requiresCost =
                    hasCount &&
                    difference > 0 &&
                    balance.quantityOnHand ===
                      0;

                  return (
                    <tr
                      key={
                        line.id
                      }
                      className={
                        reservedViolation
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

                      <td className="px-4 py-3 text-right font-semibold">
                        {formatQuantity(
                          balance.quantityOnHand,
                        )}
                      </td>

                      <td className="px-4 py-3 text-right text-amber-700">
                        {formatQuantity(
                          balance.quantityReserved,
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          step="0.0001"
                          required
                          value={
                            line.countedQuantity
                          }
                          onChange={(
                            event,
                          ) =>
                            updateLine(
                              line.id,
                              "countedQuantity",
                              event
                                .target
                                .value,
                            )
                          }
                          className={[
                            "h-10 w-32 rounded-lg border px-3",
                            reservedViolation
                              ? "border-red-400 bg-red-50"
                              : "",
                          ].join(
                            " ",
                          )}
                        />

                        {reservedViolation ? (
                          <div className="mt-2 flex max-w-[220px] items-start gap-1 text-xs font-medium text-red-700">
                            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />

                            <span>
                              Count cannot be below{" "}
                              {formatQuantity(
                                balance.quantityReserved,
                              )}{" "}
                              reserved.
                            </span>
                          </div>
                        ) : null}
                      </td>

                      <td
                        className={[
                          "px-4 py-3 text-right font-bold",
                          difference > 0
                            ? "text-green-700"
                            : difference < 0
                              ? "text-red-700"
                              : "text-slate-500",
                        ].join(
                          " ",
                        )}
                      >
                        {difference > 0
                          ? "+"
                          : ""}
                        {formatQuantity(
                          difference,
                        )}
                      </td>

                      <td className="px-4 py-3 text-right font-semibold">
                        {hasCount
                          ? formatQuantity(
                              counted,
                            )
                          : "—"}
                      </td>

                      <td className="px-4 py-3">
                        {requiresCost ? (
                          <>
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
                              className={[
                                "h-10 w-32 rounded-lg border px-3",
                                line.unitCost ===
                                ""
                                  ? "border-amber-400 bg-amber-50"
                                  : "",
                              ].join(
                                " ",
                              )}
                            />

                            <p className="mt-1 max-w-[180px] text-xs text-amber-700">
                              Required because this count introduces new stock with no previous valuation.
                            </p>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {balance.averageUnitCost >
                            0
                              ? formatCurrency(
                                  balance.averageUnitCost,
                                )
                              : "Auto"}
                          </span>
                        )}
                      </td>

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

        <div className="flex flex-col gap-3 border-t bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {lines.length} product
            {lines.length === 1
              ? ""
              : "s"}{" "}
            counted
          </p>

          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Total Absolute Difference
            </p>

            <p className="mt-1 text-xl font-semibold">
              {formatQuantity(
                totalAbsoluteDifference,
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <label className="text-sm font-semibold">
          Internal Notes
        </label>

        <textarea
          name="internalNotes"
          rows={4}
          maxLength={2000}
          placeholder="Example: Monthly physical warehouse count."
          className="mt-2 w-full rounded-xl border px-4 py-3"
        />
      </section>

      {hasReservedViolation ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" />

          <div>
            <p className="font-semibold">
              Stock count cannot be posted
            </p>

            <p className="mt-1">
              One or more physical counts are below quantities currently reserved for orders.
            </p>
          </div>
        </div>
      ) : null}

      {hasMissingCost ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" />

          <div>
            <p className="font-semibold">
              Unit cost required
            </p>

            <p className="mt-1">
              A counted product introduces new inventory but has no previous warehouse valuation.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={
            hasReservedViolation ||
            hasMissingCost
          }
          className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-6 font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Post Stock Count
        </button>
      </div>
    </form>
  );
}

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
      averageUnitCost: 0,
    };
  }

  const balance =
    options.stock.find(
      (stock) =>
        stock.warehouseId ===
          warehouseId &&
        stock.productId ===
          productId,
    );

  return {
    quantityOnHand:
      balance?.quantityOnHand ??
      0,

    quantityReserved:
      balance?.quantityReserved ??
      0,

    averageUnitCost:
      balance?.averageUnitCost ??
      0,
  };
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
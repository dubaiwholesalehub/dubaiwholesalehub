"use client";

import {
  useMemo,
  useState,
} from "react";
import {
  Plus,
  ReceiptText,
  Trash2,
} from "lucide-react";

import type {
  StockAdjustmentOptions,
} from "@/lib/inventory/inventory-operation.repository";

interface SupplierOption {
  id: string;
  company_name: string;
}

interface LocalPurchaseFormProps {
  options: StockAdjustmentOptions;
  suppliers: SupplierOption[];

  action: (
    formData: FormData,
  ) => Promise<void>;
}

interface PurchaseLine {
  id: string;
  productId: string;
  quantity: string;
  unitCost: string;
  notes: string;
}

function createEmptyLine():
  PurchaseLine {
  return {
    id: crypto.randomUUID(),
    productId: "",
    quantity: "",
    unitCost: "",
    notes: "",
  };
}

export default function LocalPurchaseForm({
  options,
  suppliers,
  action,
}: LocalPurchaseFormProps) {
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
  ] = useState<PurchaseLine[]>([
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

              quantity:
                Number(
                  line.quantity,
                ),

              unitCost:
                Number(
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

  const grandTotal =
    useMemo(
      () =>
        lines.reduce(
          (total, line) => {
            const quantity =
              Number(
                line.quantity,
              );

            const unitCost =
              Number(
                line.unitCost,
              );

            if (
              !Number.isFinite(
                quantity,
              ) ||
              !Number.isFinite(
                unitCost,
              )
            ) {
              return total;
            }

            return (
              total +
              quantity *
                unitCost
            );
          },
          0,
        ),
      [lines],
    );

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
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <ReceiptText className="size-5" />
          </div>

          <div>
            <h2 className="font-semibold">
              Purchase Information
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Supplier and receipt details are optional. You can still receive stock when no formal invoice was provided.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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
              Purchase Date
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
              Payment Method
            </label>

            <select
              name="paymentMethod"
              required
              defaultValue="cash"
              className="mt-2 h-11 w-full rounded-xl border bg-white px-4"
            >
              <option value="cash">
                Cash
              </option>

              <option value="card">
                Card
              </option>

              <option value="bank_transfer">
                Bank Transfer
              </option>

              <option value="credit">
                Credit
              </option>

              <option value="other">
                Other
              </option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold">
              Supplier
            </label>

            <select
              name="supplierId"
              defaultValue=""
              className="mt-2 h-11 w-full rounded-xl border bg-white px-4"
            >
              <option value="">
                No registered supplier
              </option>

              {suppliers.map(
                (supplier) => (
                  <option
                    key={
                      supplier.id
                    }
                    value={
                      supplier.id
                    }
                  >
                    {
                      supplier.company_name
                    }
                  </option>
                ),
              )}
            </select>

            <p className="mt-1 text-xs text-muted-foreground">
              Optional
            </p>
          </div>

          <div>
            <label className="text-sm font-semibold">
              Store / Shop Name
            </label>

            <input
              name="storeName"
              maxLength={150}
              placeholder="Example: Deira local shop"
              className="mt-2 h-11 w-full rounded-xl border px-4"
            />

            <p className="mt-1 text-xs text-muted-foreground">
              Useful when the seller is not registered in Suppliers.
            </p>
          </div>

          <div>
            <label className="text-sm font-semibold">
              Receipt / Reference No.
            </label>

            <input
              name="receiptNumber"
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
              Purchased Products
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Enter the quantity and actual purchase cost paid for every item.
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
          <table className="w-full min-w-[1150px] text-left">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">
                  Product
                </th>

                <th className="px-4 py-3 text-right">
                  Current Stock
                </th>

                <th className="px-4 py-3 text-right">
                  Current Avg. Cost
                </th>

                <th className="px-4 py-3">
                  Quantity
                </th>

                <th className="px-4 py-3">
                  Purchase Cost
                </th>

                <th className="px-4 py-3 text-right">
                  Line Total
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

                  const quantity =
                    Number(
                      line.quantity,
                    );

                  const unitCost =
                    Number(
                      line.unitCost,
                    );

                  const lineTotal =
                    Number.isFinite(
                      quantity,
                    ) &&
                    Number.isFinite(
                      unitCost,
                    )
                      ? quantity *
                        unitCost
                      : 0;

                  return (
                    <tr
                      key={
                        line.id
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

                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {formatCurrency(
                          balance.averageUnitCost,
                        )}
                      </td>

                      <td className="px-4 py-3">
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
                          className="h-10 w-32 rounded-lg border px-3"
                        />
                      </td>

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
                      </td>

                      <td className="px-4 py-3 text-right font-semibold">
                        {formatCurrency(
                          lineTotal,
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
            being received
          </p>

          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Purchase Total
            </p>

            <p className="mt-1 text-2xl font-semibold">
              {formatCurrency(
                grandTotal,
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
          placeholder="Example: Cash purchase from local market. No formal VAT invoice supplied."
          className="mt-2 w-full rounded-xl border px-4 py-3"
        />
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-6 font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
        >
          Receive & Post Stock
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
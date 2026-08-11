"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import type { InventoryOperationOptions } from "@/lib/inventory/inventory-operation.repository";

interface OpeningStockFormProps {
  options: InventoryOperationOptions;
  action: (formData: FormData) => Promise<void>;
}

interface OpeningStockLine {
  id: string;
  productId: string;
  quantity: string;
  unitCost: string;
  notes: string;
}

function createEmptyLine(): OpeningStockLine {
  return {
    id: crypto.randomUUID(),
    productId: "",
    quantity: "",
    unitCost: "",
    notes: "",
  };
}

export default function OpeningStockForm({
  options,
  action,
}: OpeningStockFormProps) {
  const [lines, setLines] = useState<OpeningStockLine[]>([createEmptyLine()]);

  const defaultWarehouse = options.warehouses.find(
    (warehouse) => warehouse.is_default,
  );

  const serializedItems = useMemo(
    () =>
      JSON.stringify(
        lines.map((line) => ({
          productId: line.productId,

          quantity: Number(line.quantity),

          unitCost: Number(line.unitCost),

          notes: line.notes.trim() || undefined,
        })),
      ),
    [lines],
  );

  const totalValue = useMemo(
    () =>
      lines.reduce((total, line) => {
        const quantity = Number(line.quantity);

        const unitCost = Number(line.unitCost);

        if (!Number.isFinite(quantity) || !Number.isFinite(unitCost)) {
          return total;
        }

        return total + quantity * unitCost;
      }, 0),
    [lines],
  );

  function updateLine(
    id: string,
    field: "productId" | "quantity" | "unitCost" | "notes",
    value: string,
  ) {
    setLines((current) =>
      current.map((line) =>
        line.id === id
          ? {
              ...line,
              [field]: value,
            }
          : line,
      ),
    );
  }

  function addLine() {
    setLines((current) => [...current, createEmptyLine()]);
  }

  function removeLine(id: string) {
    setLines((current) =>
      current.length === 1 ? current : current.filter((line) => line.id !== id),
    );
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="items" value={serializedItems} />

      <section className="rounded-xl border bg-card p-5">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold">Warehouse</label>

            <select
              name="warehouseId"
              required
              defaultValue={defaultWarehouse?.id ?? ""}
              className="mt-2 h-11 w-full rounded-xl border bg-white px-4"
            >
              <option value="">Select warehouse</option>

              {options.warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                  {warehouse.is_default ? " (Default)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold">Opening Stock Date</label>

            <input
              type="date"
              name="transactionDate"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="mt-2 h-11 w-full rounded-xl border px-4"
            />
          </div>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold">Reference</label>

            <input
              name="referenceNumber"
              maxLength={100}
              placeholder="Example: Opening Stock Aug 2026"
              className="mt-2 h-11 w-full rounded-xl border px-4"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Description</label>

            <input
              name="description"
              maxLength={250}
              defaultValue="Opening stock"
              className="mt-2 h-11 w-full rounded-xl border px-4"
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-semibold">Products</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Enter the physical quantity and original unit cost for each item.
            </p>
          </div>

          <button
            type="button"
            onClick={addLine}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"
          >
            <Plus className="size-4" />
            Add Product
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px]">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Product</th>

                <th className="px-4 py-3">Quantity</th>

                <th className="px-4 py-3">Unit Cost</th>

                <th className="px-4 py-3">Line Value</th>

                <th className="px-4 py-3">Notes</th>

                <th className="w-16 px-4 py-3" />
              </tr>
            </thead>

            <tbody className="divide-y">
              {lines.map((line) => {
                const product = options.products.find(
                  (item) => item.id === line.productId,
                );

                const lineValue = Number(line.quantity) * Number(line.unitCost);

                return (
                  <tr key={line.id}>
                    <td className="px-4 py-3">
                      <select
                        value={line.productId}
                        required
                        onChange={(event) =>
                          updateLine(line.id, "productId", event.target.value)
                        }
                        className="h-10 w-full min-w-[300px] rounded-lg border bg-white px-3"
                      >
                        <option value="">Select product</option>

                        {options.products.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                            {item.sku ? ` — ${item.sku}` : ""}
                          </option>
                        ))}
                      </select>

                      {product?.unit ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Unit: {product.unit.short_name}
                        </p>
                      ) : null}
                    </td>

                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0.0001}
                        step="0.0001"
                        required
                        value={line.quantity}
                        onChange={(event) =>
                          updateLine(line.id, "quantity", event.target.value)
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
                        value={line.unitCost}
                        onChange={(event) =>
                          updateLine(line.id, "unitCost", event.target.value)
                        }
                        className="h-10 w-36 rounded-lg border px-3"
                      />
                    </td>

                    <td className="px-4 py-3 font-semibold">
                      {formatCurrency(
                        Number.isFinite(lineValue) ? lineValue : 0,
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <input
                        value={line.notes}
                        onChange={(event) =>
                          updateLine(line.id, "notes", event.target.value)
                        }
                        placeholder="Optional"
                        className="h-10 w-full min-w-[180px] rounded-lg border px-3"
                      />
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={lines.length === 1}
                        onClick={() => removeLine(line.id)}
                        className="inline-flex size-9 items-center justify-center rounded-lg border disabled:opacity-40"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end border-t bg-muted/20 px-5 py-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              Opening Inventory Value
            </p>

            <p className="mt-1 text-2xl font-semibold">
              {formatCurrency(totalValue)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <label className="text-sm font-semibold">Internal Notes</label>

        <textarea
          name="internalNotes"
          rows={4}
          maxLength={2000}
          placeholder="Example: Physical inventory counted before HM ERP go-live."
          className="mt-2 w-full rounded-xl border px-4 py-3"
        />
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-6 font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
        >
          Post Opening Stock
        </button>
      </div>
    </form>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import { Download, FileUp, Plus, Trash2 } from "lucide-react";

import {
  QuickPurchaseProductPicker,
  type QuickPurchaseProductPickerHandle,
} from "@/components/admin/purchasing/quick-purchase/QuickPurchaseProductPicker";
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

interface ImportResult {
  imported: number;
  errors: string[];
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

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }

      continue;
    }

    if (character === "," && !quoted) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current.trim());

  return values;
}

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

export default function OpeningStockForm({
  options,
  action,
}: OpeningStockFormProps) {
  const [lines, setLines] = useState<OpeningStockLine[]>([createEmptyLine()]);

  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const pickerRefs = useRef<
    Record<string, QuickPurchaseProductPickerHandle | null>
  >({});

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

    setImportResult(null);
  }

  function addLine() {
    const line = createEmptyLine();

    setLines((current) => [...current, line]);

    window.requestAnimationFrame(() => {
      pickerRefs.current[line.id]?.focus();
    });
  }

  function removeLine(id: string) {
    setLines((current) =>
      current.length === 1 ? current : current.filter((line) => line.id !== id),
    );

    delete pickerRefs.current[id];
    setImportResult(null);
  }

  function downloadTemplate() {
    const csv = [
      "SKU,Quantity,Unit Cost,Notes",
      "EXAMPLE-SKU,10,12.50,Opening physical count",
    ].join("\r\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = "opening-stock-template.csv";

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  }

  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    const text = await file.text();

    const rawRows = text.split(/\r?\n/).filter((row) => row.trim().length > 0);

    if (rawRows.length < 2) {
      setImportResult({
        imported: 0,
        errors: ["The CSV file does not contain any product rows."],
      });

      return;
    }

    const headers = parseCsvLine(rawRows[0]).map(normalizeHeader);

    const skuIndex = headers.indexOf("sku");

    const quantityIndex = headers.indexOf("quantity");

    const unitCostIndex = headers.indexOf("unitcost");

    const notesIndex = headers.indexOf("notes");

    if (skuIndex < 0 || quantityIndex < 0 || unitCostIndex < 0) {
      setImportResult({
        imported: 0,
        errors: [
          "CSV columns must include SKU, Quantity and Unit Cost. Notes is optional.",
        ],
      });

      return;
    }

    const productsBySku = new Map<string, typeof options.products>();

    for (const product of options.products) {
      const sku = product.sku?.trim().toLowerCase();

      if (!sku) {
        continue;
      }

      const existing = productsBySku.get(sku) ?? [];

      existing.push(product);
      productsBySku.set(sku, existing);
    }

    const importedLines: OpeningStockLine[] = [];

    const errors: string[] = [];
    const importedProductIds = new Set<string>();

    for (let index = 1; index < rawRows.length; index += 1) {
      const rowNumber = index + 1;
      const columns = parseCsvLine(rawRows[index]);

      const sku = columns[skuIndex]?.trim();

      const quantityText = columns[quantityIndex]?.trim();

      const unitCostText = columns[unitCostIndex]?.trim();

      const notes = notesIndex >= 0 ? (columns[notesIndex]?.trim() ?? "") : "";

      if (!sku) {
        errors.push(`Row ${rowNumber}: SKU is required.`);
        continue;
      }

      const matches = productsBySku.get(sku.toLowerCase()) ?? [];

      if (matches.length === 0) {
        errors.push(`Row ${rowNumber}: SKU "${sku}" was not found.`);
        continue;
      }

      if (matches.length > 1) {
        errors.push(
          `Row ${rowNumber}: SKU "${sku}" matches more than one product.`,
        );
        continue;
      }

      const product = matches[0];

      if (importedProductIds.has(product.id)) {
        errors.push(`Row ${rowNumber}: SKU "${sku}" is duplicated in the CSV.`);
        continue;
      }

      const quantity = Number(quantityText);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        errors.push(`Row ${rowNumber}: Quantity must be greater than zero.`);
        continue;
      }

      if (!unitCostText && unitCostText !== "0") {
        errors.push(`Row ${rowNumber}: Unit Cost is required.`);
        continue;
      }

      const unitCost = Number(unitCostText);

      if (!Number.isFinite(unitCost) || unitCost < 0) {
        errors.push(`Row ${rowNumber}: Unit Cost cannot be negative.`);
        continue;
      }

      if (notes.length > 500) {
        errors.push(`Row ${rowNumber}: Notes cannot exceed 500 characters.`);
        continue;
      }

      importedProductIds.add(product.id);

      importedLines.push({
        id: crypto.randomUUID(),
        productId: product.id,
        quantity: String(quantity),
        unitCost: String(unitCost),
        notes,
      });
    }

    if (errors.length > 0) {
      setImportResult({
        imported: 0,
        errors,
      });

      return;
    }

    if (importedLines.length === 0) {
      setImportResult({
        imported: 0,
        errors: ["No valid opening-stock rows were found."],
      });

      return;
    }

    setLines(importedLines);

    setImportResult({
      imported: importedLines.length,
      errors: [],
    });
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
              defaultValue="2026-09-01"
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
              placeholder="Example: Opening Stock 01-Sep-2026"
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <div>
            <h2 className="font-semibold">Products</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Enter manually or import a CSV using existing product SKUs.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"
            >
              <Download className="size-4" />
              Download Template
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"
            >
              <FileUp className="size-4" />
              Import CSV
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={importCsv}
              className="hidden"
            />

            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"
            >
              <Plus className="size-4" />
              Add Product
            </button>
          </div>
        </div>

        {importResult ? (
          <div
            className={`border-b px-5 py-3 text-sm ${
              importResult.errors.length > 0
                ? "bg-red-50 text-red-800"
                : "bg-emerald-50 text-emerald-800"
            }`}
          >
            {importResult.errors.length > 0 ? (
              <>
                <p className="font-semibold">
                  CSV import stopped. Fix the following:
                </p>

                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {importResult.errors.slice(0, 20).map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>

                {importResult.errors.length > 20 ? (
                  <p className="mt-2 font-medium">
                    Plus {importResult.errors.length - 20} more errors.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="font-semibold">
                Imported {importResult.imported} product
                {importResult.imported === 1 ? "" : "s"}. Review the quantities,
                costs and total value before posting.
              </p>
            )}
          </div>
        ) : null}

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
                      <div className="min-w-[300px]">
                        <QuickPurchaseProductPicker
                          ref={(handle) => {
                            pickerRefs.current[line.id] = handle;
                          }}
                          products={options.products}
                          value={line.productId}
                          onChange={(productId) =>
                            updateLine(line.id, "productId", productId)
                          }
                          placeholder="Type product name or SKU..."
                        />
                      </div>

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
                        maxLength={500}
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

        <div className="flex flex-wrap items-end justify-between gap-4 border-t bg-muted/20 px-5 py-4">
          <p className="text-sm text-muted-foreground">
            {lines.length} product
            {lines.length === 1 ? "" : "s"} ready for review
          </p>

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
          placeholder="Example: Physical inventory counted before ERP go-live."
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

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Copy, Loader2, Plus, Save, Trash2 } from "lucide-react";

import {
  addSalesQuotationItemsAction,
  getQuotationProductPricingAction,
} from "@/app/admin/(protected)/sales/quotations/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  BulkSalesQuotationItemInput,
  ProductFulfilmentMethod,
  ProductQuotationPricingInsight,
  SalesQuotationItemFormOptions,
} from "@/lib/repositories/sales-quotation.repository";
import SmartProductPicker, {
  type SmartProductPickerHandle,
} from "@/components/admin/shared/SmartProductPicker";

interface QuickSalesQuotationItemsFormProps {
  quotationId: string;
  currencyCode: string;
  options: SalesQuotationItemFormOptions;
}

interface QuickItemRow {
  id: string;

  productId: string;
  unitId: string;

  sku: string;
  itemName: string;

  quantity: number;
  unitPrice: number;

  discountPercentage: number;
  taxPercentage: number;

  insight: ProductQuotationPricingInsight | null;

  insightLoading: boolean;
  insightError: string | null;

  fulfilmentMethod: ProductFulfilmentMethod;
  procurementLeadTimeDays: number;
  allowBackorder: boolean;
  procurementNotes: string;
}

function createEmptyRow(): QuickItemRow {
  return {
    id: crypto.randomUUID(),

    productId: "",
    unitId: "",

    sku: "",
    itemName: "",

    quantity: 1,
    unitPrice: 0,

    discountPercentage: 0,
    taxPercentage: 5,

    insight: null,

    insightLoading: false,
    insightError: null,

    fulfilmentMethod: "stock",
    procurementLeadTimeDays: 0,
    allowBackorder: false,
    procurementNotes: "",
  };
}

export default function QuickSalesQuotationItemsForm({
  quotationId,
  currencyCode,
  options,
}: QuickSalesQuotationItemsFormProps) {
  const router = useRouter();

  const [rows, setRows] = useState<QuickItemRow[]>([createEmptyRow()]);

  const [isSaving, setIsSaving] = useState(false);

  const [saveError, setSaveError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const totals = useMemo(() => {
    return rows.reduce(
      (result, row) => {
        const calculation = calculateRow(row);

        return {
          subtotal: result.subtotal + calculation.subtotal,

          tax: result.tax + calculation.tax,

          total: result.total + calculation.total,

          estimatedProfit: result.estimatedProfit + calculation.estimatedProfit,
        };
      },
      {
        subtotal: 0,
        tax: 0,
        total: 0,
        estimatedProfit: 0,
      },
    );
  }, [rows]);

  const productPickerRefs = useRef<
    Record<string, SmartProductPickerHandle | null>
  >({});

  const quantityInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [pendingFocusRowId, setPendingFocusRowId] = useState<string | null>(
    null,
  );

  const [activeRowId, setActiveRowId] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingFocusRowId) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      productPickerRefs.current[pendingFocusRowId]?.focus();

      setPendingFocusRowId(null);
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [pendingFocusRowId, rows]);

  useEffect(() => {
    function handleKeyboardShortcut(event: KeyboardEvent) {
      if (event.ctrlKey && event.key.toLowerCase() === "d") {
        if (!activeRowId) {
          return;
        }

        const activeRow = rows.find((row) => row.id === activeRowId);

        if (!activeRow) {
          return;
        }

        event.preventDefault();

        duplicateRow(activeRow);

        return;
      }

      if (event.ctrlKey && event.key === "Enter") {
        event.preventDefault();

        if (!isSaving) {
          void saveAllItems();
        }
      }
    }

    window.addEventListener("keydown", handleKeyboardShortcut);

    return () => {
      window.removeEventListener("keydown", handleKeyboardShortcut);
    };
  }, [activeRowId, isSaving, rows]);

  function updateRow(rowId: string, updates: Partial<QuickItemRow>) {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              ...updates,
            }
          : row,
      ),
    );
  }

  function addRow({
    focusProduct = false,
  }: {
    focusProduct?: boolean;
  } = {}) {
    const newRow = createEmptyRow();

    setRows((currentRows) => [...currentRows, newRow]);

    if (focusProduct) {
      setPendingFocusRowId(newRow.id);
    }

    return newRow;
  }

  function duplicateRow(sourceRow: QuickItemRow) {
    const duplicatedRow: QuickItemRow = {
      ...sourceRow,

      id: crypto.randomUUID(),

      insightLoading: false,
      insightError: null,
    };

    setRows((currentRows) => {
      const sourceIndex = currentRows.findIndex(
        (row) => row.id === sourceRow.id,
      );

      if (sourceIndex < 0) {
        return [...currentRows, duplicatedRow];
      }

      const nextRows = [...currentRows];

      nextRows.splice(sourceIndex + 1, 0, duplicatedRow);

      return nextRows;
    });

    setPendingFocusRowId(duplicatedRow.id);
  }

  function removeRow(rowId: string) {
    setRows((currentRows) => {
      if (currentRows.length === 1) {
        return [createEmptyRow()];
      }

      return currentRows.filter((row) => row.id !== rowId);
    });
  }

  async function handleProductChange(rowId: string, productId: string) {
    const product = options.products.find((item) => item.id === productId);

    if (!productId || !product) {
      updateRow(rowId, {
        productId: "",

        fulfilmentMethod: "stock",
        procurementLeadTimeDays: 0,
        allowBackorder: false,
        procurementNotes: "",

        insight: null,
        insightError: null,
        insightLoading: false,
      });

      return;
    }

    updateRow(rowId, {
      productId,

      sku: product.sku ?? "",

      itemName: product.name,

      unitId: product.unit_id ?? "",

      fulfilmentMethod: product.fulfilment_method,

      procurementLeadTimeDays: product.procurement_lead_time_days,

      allowBackorder: product.allow_backorder,

      procurementNotes: product.procurement_notes ?? "",

      insight: null,
      insightError: null,
      insightLoading: true,
    });

    try {
      const insight = await getQuotationProductPricingAction(
        quotationId,
        productId,
      );

      updateRow(rowId, {
        insight,
        insightLoading: false,
      });
    } catch (error) {
      updateRow(rowId, {
        insight: null,
        insightLoading: false,

        insightError:
          error instanceof Error
            ? error.message
            : "Unable to load pricing information.",
      });
    }
  }

  function validateRows(): string | null {
    const filledRows = rows.filter(
      (row) => row.itemName.trim() || row.productId,
    );

    if (filledRows.length === 0) {
      return "Add at least one item.";
    }

    for (let index = 0; index < filledRows.length; index += 1) {
      const row = filledRows[index];

      if (!row.itemName.trim()) {
        return `Row ${index + 1}: item name is required.`;
      }

      if (!Number.isFinite(row.quantity) || row.quantity <= 0) {
        return `Row ${index + 1}: quantity must be greater than zero.`;
      }

      if (!Number.isFinite(row.unitPrice) || row.unitPrice < 0) {
        return `Row ${index + 1}: unit price cannot be negative.`;
      }

      if (row.discountPercentage < 0 || row.discountPercentage > 100) {
        return `Row ${index + 1}: discount must be between 0 and 100.`;
      }

      if (row.taxPercentage < 0 || row.taxPercentage > 100) {
        return `Row ${index + 1}: tax must be between 0 and 100.`;
      }
    }

    return null;
  }

  async function saveAllItems() {
    setSaveError(null);
    setSuccessMessage(null);

    const validationError = validateRows();

    if (validationError) {
      setSaveError(validationError);
      return;
    }

    const items: BulkSalesQuotationItemInput[] = rows
      .filter((row) => row.itemName.trim() || row.productId)
      .map((row) => ({
        product_id: row.productId || null,

        unit_id: row.unitId || null,

        sku: row.sku.trim() || null,

        item_name: row.itemName.trim(),

        quantity: Number(row.quantity),

        unit_price: Number(row.unitPrice),

        discount_percentage: Number(row.discountPercentage),

        tax_percentage: Number(row.taxPercentage),
      }));

    setIsSaving(true);

    try {
      await addSalesQuotationItemsAction(quotationId, items);

      setRows([createEmptyRow()]);

      setSuccessMessage(
        `${items.length} item${
          items.length === 1 ? "" : "s"
        } added successfully.`,
      );

      router.refresh();
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Unable to add quotation items.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[1720px] border-collapse text-left">
          <thead className="border-b bg-muted/40">
            <tr>
              <TableHeader className="w-[320px]">Product</TableHeader>

              <TableHeader className="w-[220px]">Item Name</TableHeader>

              <TableHeader className="w-[190px]">Availability</TableHeader>

              <TableHeader className="w-[135px]">Cost</TableHeader>

              <TableHeader className="w-[145px]">Last Quote</TableHeader>

              <TableHeader className="w-[100px]">Qty</TableHeader>

              <TableHeader className="w-[130px]">Unit</TableHeader>

              <TableHeader className="w-[135px]">Sell Price</TableHeader>

              <TableHeader className="w-[100px]">Disc %</TableHeader>

              <TableHeader className="w-[90px]">Tax %</TableHeader>

              <TableHeader className="w-[130px]">Margin</TableHeader>

              <TableHeader className="w-[145px] text-right">Total</TableHeader>

              <TableHeader className="w-[100px] text-right">
                Actions
              </TableHeader>
            </tr>
          </thead>

          <tbody className="divide-y">
            {rows.map((row, rowIndex) => (
              <QuickItemTableRow
                key={row.id}
                row={row}
                rowNumber={rowIndex + 1}
                currencyCode={currencyCode}
                options={options}
                disabled={isSaving}
                productPickerRef={(instance) => {
                  productPickerRefs.current[row.id] = instance;
                }}
                quantityInputRef={(element) => {
                  quantityInputRefs.current[row.id] = element;
                }}
                onActivate={() => setActiveRowId(row.id)}
                onProductSelected={() => {
                  requestAnimationFrame(() => {
                    quantityInputRefs.current[row.id]?.focus();

                    quantityInputRefs.current[row.id]?.select();
                  });
                }}
                onTaxEnter={() => {
                  const nextExistingRow = rows[rowIndex + 1];

                  if (nextExistingRow) {
                    productPickerRefs.current[nextExistingRow.id]?.focus();

                    return;
                  }

                  addRow({
                    focusProduct: true,
                  });
                }}
                onUpdate={(updates) => updateRow(row.id, updates)}
                onProductChange={(productId) =>
                  handleProductChange(row.id, productId)
                }
                onDuplicate={() => duplicateRow(row)}
                onRemove={() => removeRow(row.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border bg-muted/20 p-4 xl:flex-row xl:items-center xl:justify-between">
        <Button
          type="button"
          variant="outline"
          disabled={isSaving}
          onClick={() =>
            addRow({
              focusProduct: true,
            })
          }
        >
          <Plus className="size-4" />
          Add Row
        </Button>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryValue
            label="Subtotal"
            value={formatCurrency(totals.subtotal, currencyCode)}
          />

          <SummaryValue
            label="Tax"
            value={formatCurrency(totals.tax, currencyCode)}
          />

          <SummaryValue
            label="Estimated Profit"
            value={formatCurrency(totals.estimatedProfit, currencyCode)}
          />

          <SummaryValue
            label="Items Total"
            value={formatCurrency(totals.total, currencyCode)}
            emphasized
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Enter on Tax: next row · Ctrl+D: duplicate active row · Ctrl+Enter:
          save all
        </p>
        <Button type="button" disabled={isSaving} onClick={saveAllItems}>
          {isSaving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="size-4" />
              Save All Items
            </>
          )}
        </Button>
      </div>

      {saveError ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {saveError}
        </div>
      ) : null}

      {successMessage ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {successMessage}
        </div>
      ) : null}
    </section>
  );
}

interface QuickItemTableRowProps {
  row: QuickItemRow;
  rowNumber: number;

  currencyCode: string;

  options: SalesQuotationItemFormOptions;

  disabled: boolean;

  productPickerRef: (instance: SmartProductPickerHandle | null) => void;

  quantityInputRef: (element: HTMLInputElement | null) => void;

  onActivate: () => void;

  onProductSelected: () => void;

  onTaxEnter: () => void;

  onUpdate: (updates: Partial<QuickItemRow>) => void;

  onProductChange: (productId: string) => void;

  onDuplicate: () => void;
  onRemove: () => void;
}

function QuickItemTableRow({
  row,
  rowNumber,
  currencyCode,
  options,
  disabled,
  productPickerRef,
  quantityInputRef,
  onActivate,
  onProductSelected,
  onTaxEnter,
  onUpdate,
  onProductChange,
  onDuplicate,
  onRemove,
}: QuickItemTableRowProps) {
  const calculation = calculateRow(row);

  const costPrice = getBestCost(row.insight);

  const lastQuote =
    row.insight?.lastQuotedToCustomer ?? row.insight?.lastQuotedOverall ?? null;

  const isBelowCost =
    costPrice !== null && calculation.netUnitPrice < costPrice;

  return (
    <tr
      className="align-top"
      onFocusCapture={onActivate}
      onMouseDown={onActivate}
    >
      <TableCell>
        <div className="space-y-2">
          <SmartProductPicker
            ref={productPickerRef}
            products={options.products}
            value={row.productId}
            disabled={disabled}
            rowNumber={rowNumber}
            onChange={onProductChange}
            onProductSelected={(product) => {
              if (product) {
                onProductSelected();
              }
            }}
          />

          {row.insightLoading ? (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Loading pricing…
            </p>
          ) : null}

          {row.insightError ? (
            <p className="text-xs text-destructive">{row.insightError}</p>
          ) : null}
        </div>
      </TableCell>

      <TableCell>
        <div className="space-y-2">
          <Input
            value={row.itemName}
            disabled={disabled}
            placeholder="Item name"
            aria-label={`Item name row ${rowNumber}`}
            onChange={(event) =>
              onUpdate({
                itemName: event.target.value,
              })
            }
          />

          <Input
            value={row.sku}
            disabled={disabled}
            placeholder="SKU"
            aria-label={`SKU row ${rowNumber}`}
            onChange={(event) =>
              onUpdate({
                sku: event.target.value,
              })
            }
          />
        </div>
      </TableCell>

      <TableCell>
        <FulfilmentGuidance row={row} />
      </TableCell>

      <TableCell>
        <CostInformation
          insight={row.insight}
          quotationCurrency={currencyCode}
        />
      </TableCell>

      <TableCell>
        {lastQuote ? (
          <div className="space-y-1 text-xs">
            <p className="font-semibold">
              {formatCurrency(lastQuote.unitPrice, lastQuote.currencyCode)}
            </p>

            <p className="text-muted-foreground">
              {row.insight?.lastQuotedToCustomer ? "This customer" : "Overall"}
            </p>

            <p className="text-muted-foreground">{lastQuote.quotationNumber}</p>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">No history</span>
        )}
      </TableCell>

      <TableCell>
        <Input
          ref={quantityInputRef}
          type="number"
          min="0.0001"
          step="0.0001"
          value={row.quantity}
          disabled={disabled}
          aria-label={`Quantity row ${rowNumber}`}
          onFocus={onActivate}
          onChange={(event) =>
            onUpdate({
              quantity: Number(event.target.value),
            })
          }
        />

        <QuantityAvailabilityMessage row={row} />
      </TableCell>

      <TableCell>
        <select
          value={row.unitId}
          disabled={disabled}
          aria-label={`Unit row ${rowNumber}`}
          className={selectClassName}
          onChange={(event) =>
            onUpdate({
              unitId: event.target.value,
            })
          }
        >
          <option value="">No unit</option>

          {options.units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.short_name}
            </option>
          ))}
        </select>
      </TableCell>

      <TableCell>
        <Input
          type="number"
          min="0"
          step="0.0001"
          value={row.unitPrice}
          disabled={disabled}
          aria-label={`Selling price row ${rowNumber}`}
          onChange={(event) =>
            onUpdate({
              unitPrice: Number(event.target.value),
            })
          }
        />
      </TableCell>

      <TableCell>
        <Input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={row.discountPercentage}
          disabled={disabled}
          aria-label={`Discount row ${rowNumber}`}
          onChange={(event) =>
            onUpdate({
              discountPercentage: Number(event.target.value),
            })
          }
        />
      </TableCell>

      <TableCell>
        <Input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={row.taxPercentage}
          disabled={disabled}
          aria-label={`Tax row ${rowNumber}`}
          onFocus={onActivate}
          onChange={(event) =>
            onUpdate({
              taxPercentage: Number(event.target.value),
            })
          }
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();

              onTaxEnter();
            }
          }}
        />
      </TableCell>

      <TableCell>
        {costPrice !== null ? (
          <div className="space-y-1 text-xs">
            <p
              className={
                isBelowCost
                  ? "font-semibold text-destructive"
                  : calculation.marginPercentage < 10
                    ? "font-semibold text-amber-700"
                    : "font-semibold text-emerald-700"
              }
            >
              {formatPercentage(calculation.marginPercentage)}
            </p>

            <p className="text-muted-foreground">
              {formatCurrency(calculation.profitPerUnit, currencyCode)} / unit
            </p>

            {isBelowCost ? (
              <p className="flex items-center gap-1 text-destructive">
                <AlertTriangle className="size-3" />
                Below cost
              </p>
            ) : null}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">
            Cost unavailable
          </span>
        )}
      </TableCell>

      <TableCell className="text-right">
        <p className="font-semibold">
          {formatCurrency(calculation.total, currencyCode)}
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          Tax {formatCurrency(calculation.tax, currencyCode)}
        </p>
      </TableCell>

      <TableCell>
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            aria-label={`Duplicate row ${rowNumber}`}
            onClick={onDuplicate}
          >
            <Copy className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            aria-label={`Remove row ${rowNumber}`}
            onClick={onRemove}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </TableCell>
    </tr>
  );
}
function QuantityAvailabilityMessage({ row }: { row: QuickItemRow }) {
  if (row.fulfilmentMethod !== "stock" || !row.insight?.warehouse) {
    return null;
  }

  const available = row.insight.warehouse.quantityAvailable;

  const shortage = Math.max(Number(row.quantity) - available, 0);

  if (shortage <= 0) {
    return null;
  }

  return (
    <p
      className={
        row.allowBackorder
          ? "mt-1 text-xs text-amber-700"
          : "mt-1 text-xs text-destructive"
      }
    >
      After allocation: {formatQuantity(available - Number(row.quantity))}
    </p>
  );
}
function FulfilmentGuidance({ row }: { row: QuickItemRow }) {
  const warehouse = row.insight?.warehouse ?? null;

  const available = warehouse?.quantityAvailable ?? 0;

  const shortage = Math.max(Number(row.quantity) - available, 0);

  switch (row.fulfilmentMethod) {
    case "local_purchase":
      return (
        <FulfilmentBox
          label="Local Purchase"
          description="Purchase after customer confirmation."
          detail={
            row.procurementLeadTimeDays > 0
              ? `${formatLeadTime(row.procurementLeadTimeDays)} procurement`
              : "Lead time not specified"
          }
          notes={row.procurementNotes}
        />
      );

    case "import_on_demand":
      return (
        <FulfilmentBox
          label="Import on Demand"
          description="Import after customer approval."
          detail={`${formatLeadTime(
            row.procurementLeadTimeDays,
          )} estimated lead time`}
          notes={row.procurementNotes}
        />
      );

    case "dropship":
      return (
        <FulfilmentBox
          label="Drop Ship"
          description="Supplier ships directly to customer."
          detail={`${formatLeadTime(
            row.procurementLeadTimeDays,
          )} supplier lead time`}
          notes={row.procurementNotes}
        />
      );

    case "service":
      return (
        <FulfilmentBox
          label="Service"
          description="No inventory required."
          detail="Ready to quote"
          notes={row.procurementNotes}
        />
      );

    case "stock":
    default:
      if (!warehouse) {
        return (
          <FulfilmentBox
            label="Stock Item"
            description="No warehouse stock record."
            detail={
              row.allowBackorder ? "Backorder allowed" : "Check availability"
            }
            warning={!row.allowBackorder}
            notes={row.procurementNotes}
          />
        );
      }

      return (
        <div className="space-y-1 text-xs">
          <p className="font-semibold">Stock Item</p>

          <p className="text-muted-foreground">
            {formatQuantity(available)} available
          </p>

          <p className="text-muted-foreground">
            {formatQuantity(warehouse.quantityOnHand)} on hand
          </p>

          <p className="text-muted-foreground">
            {formatQuantity(warehouse.quantityReserved)} reserved
          </p>

          {shortage > 0 ? (
            <div
              className={
                row.allowBackorder
                  ? "mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-700"
                  : "mt-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-destructive"
              }
            >
              <p className="flex items-center gap-1 font-semibold">
                <AlertTriangle className="size-3" />
                Short by {formatQuantity(shortage)}
              </p>

              <p className="mt-1">
                {row.allowBackorder
                  ? "Backorder is allowed for this product."
                  : "Insufficient available stock."}
              </p>
            </div>
          ) : (
            <p className="mt-2 font-medium text-emerald-700">
              Ready from warehouse
            </p>
          )}
        </div>
      );
  }
}

function FulfilmentBox({
  label,
  description,
  detail,
  notes,
  warning = false,
}: {
  label: string;
  description: string;
  detail: string;
  notes?: string;
  warning?: boolean;
}) {
  return (
    <div className="space-y-1 text-xs">
      <p className="font-semibold">{label}</p>

      <p className="leading-5 text-muted-foreground">{description}</p>

      <p
        className={
          warning
            ? "font-medium text-amber-700"
            : "font-medium text-emerald-700"
        }
      >
        {detail}
      </p>

      {notes ? (
        <details className="pt-1">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Procurement notes
          </summary>

          <p className="mt-1 whitespace-pre-wrap leading-5 text-muted-foreground">
            {notes}
          </p>
        </details>
      ) : null}
    </div>
  );
}

function formatLeadTime(days: number): string {
  if (days === 0) {
    return "Same day";
  }

  if (days === 1) {
    return "1 day";
  }

  return `${days} days`;
}
function CostInformation({
  insight,
  quotationCurrency,
}: {
  insight: ProductQuotationPricingInsight | null;
  quotationCurrency: string;
}) {
  if (!insight) {
    return <span className="text-xs text-muted-foreground">No cost data</span>;
  }

  const averageCost = insight.warehouse?.averageUnitCost ?? null;

  const supplierCost = insight.preferredSupplier?.costPrice ?? null;

  const purchaseCost = insight.preferredSupplier?.lastPurchasePrice ?? null;

  const supplierCurrency =
    insight.preferredSupplier?.currencyCode ?? quotationCurrency;

  return (
    <div className="space-y-1 text-xs">
      <p className="font-semibold">
        {averageCost !== null
          ? formatCurrency(averageCost, quotationCurrency)
          : "No average cost"}
      </p>

      <p className="text-muted-foreground">Avg. inventory</p>

      {purchaseCost !== null ? (
        <p className="text-muted-foreground">
          Last purchase: {formatCurrency(purchaseCost, supplierCurrency)}
        </p>
      ) : null}

      {supplierCost !== null ? (
        <p className="text-muted-foreground">
          Supplier: {formatCurrency(supplierCost, supplierCurrency)}
        </p>
      ) : null}
    </div>
  );
}

function getBestCost(
  insight: ProductQuotationPricingInsight | null,
): number | null {
  if (insight?.warehouse && insight.warehouse.averageUnitCost > 0) {
    return insight.warehouse.averageUnitCost;
  }

  if (
    insight?.preferredSupplier?.lastPurchasePrice !== null &&
    insight?.preferredSupplier?.lastPurchasePrice !== undefined
  ) {
    return insight.preferredSupplier.lastPurchasePrice;
  }

  if (
    insight?.preferredSupplier?.costPrice !== null &&
    insight?.preferredSupplier?.costPrice !== undefined
  ) {
    return insight.preferredSupplier.costPrice;
  }

  return null;
}

function calculateRow(row: QuickItemRow) {
  const quantity = Number(row.quantity) || 0;

  const unitPrice = Number(row.unitPrice) || 0;

  const discountPercentage = Number(row.discountPercentage) || 0;

  const taxPercentage = Number(row.taxPercentage) || 0;

  const gross = quantity * unitPrice;

  const discount = gross * (discountPercentage / 100);

  const subtotal = gross - discount;

  const tax = subtotal * (taxPercentage / 100);

  const total = subtotal + tax;

  const netUnitPrice = quantity > 0 ? subtotal / quantity : 0;

  const costPrice = getBestCost(row.insight);

  const profitPerUnit = costPrice !== null ? netUnitPrice - costPrice : 0;

  const estimatedProfit = profitPerUnit * quantity;

  const marginPercentage =
    costPrice !== null && netUnitPrice > 0
      ? (profitPerUnit / netUnitPrice) * 100
      : 0;

  return {
    gross,
    discount,
    subtotal,
    tax,
    total,

    netUnitPrice,
    profitPerUnit,
    estimatedProfit,
    marginPercentage,
  };
}

function TableHeader({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <th
      className={`whitespace-nowrap px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${className}`}
    >
      {children}
    </th>
  );
}

function TableCell({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <td className={`px-3 py-3 ${className}`}>{children}</td>;
}

function SummaryValue({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="min-w-36 rounded-lg border bg-background px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p
        className={
          emphasized
            ? "mt-1 text-lg font-semibold"
            : "mt-1 text-sm font-semibold"
        }
      >
        {value}
      </p>
    </div>
  );
}

function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("en-AE", {
    maximumFractionDigits: 4,
  }).format(value);
}

function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

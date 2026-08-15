"use client";

import { useMemo, useState, useTransition } from "react";

import {
  Calculator,
  Loader2,
  Plus,
  ReceiptText,
  ShoppingBag,
  Trash2,
} from "lucide-react";

import { useRouter } from "next/navigation";

import { toast } from "sonner";

import type { StockAdjustmentOptions } from "@/lib/inventory/inventory-operation.repository";

import type {
  QuickPurchasePaymentMethod,
  QuickPurchasePaymentStatus,
  QuickPurchaseTaxTreatment,
} from "@/lib/repositories/quick-purchase.repository";

import {
  completeQuickPurchase,
  loadSupplierAvailableAdvance,
} from "@/app/admin/(protected)/purchasing/quick-purchase/actions";
interface SupplierOption {
  id: string;
  company_name: string;
}

interface QuickPurchaseFormProps {
  options: StockAdjustmentOptions;

  suppliers: SupplierOption[];
}

interface PurchaseLine {
  id: string;

  productId: string;

  quantity: number;
  unitCost: number;

  notes: string;
}

function createEmptyLine(): PurchaseLine {
  return {
    id: crypto.randomUUID(),

    productId: "",

    quantity: 1,
    unitCost: 0,

    notes: "",
  };
}

function money(value: number) {
  return new Intl.NumberFormat("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function QuickPurchaseForm({
  options,
  suppliers,
}: QuickPurchaseFormProps) {
  const router = useRouter();

  const [isPosting, startPosting] = useTransition();

  const defaultWarehouse = options.warehouses.find(
    (warehouse) => warehouse.is_default,
  );

  const [warehouseId, setWarehouseId] = useState(defaultWarehouse?.id ?? "");

  const [supplierId, setSupplierId] = useState("");

  const [storeName, setStoreName] = useState("");

  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState("");

  const [supplierInvoiceDate, setSupplierInvoiceDate] = useState("");

  const [supplierTrn, setSupplierTrn] = useState("");

  const [taxTreatment, setTaxTreatment] =
    useState<QuickPurchaseTaxTreatment>("no_vat");

  const [paymentStatus, setPaymentStatus] =
    useState<QuickPurchasePaymentStatus>("paid");

  const [paymentMethod, setPaymentMethod] =
    useState<QuickPurchasePaymentMethod>("cash");

  const [paidAmount, setPaidAmount] = useState(0);

  const [paymentReference, setPaymentReference] = useState("");

  const [notes, setNotes] = useState("");

  const [lines, setLines] = useState<PurchaseLine[]>([createEmptyLine()]);

  const [availableSupplierAdvance, setAvailableSupplierAdvance] = useState(0);

  const [isLoadingAdvance, startLoadingAdvance] = useTransition();

  function addLine() {
    setLines((current) => [...current, createEmptyLine()]);
  }

  function removeLine(id: string) {
    setLines((current) =>
      current.length === 1 ? current : current.filter((line) => line.id !== id),
    );
  }

  function updateLine(id: string, patch: Partial<PurchaseLine>) {
    setLines((current) =>
      current.map((line) =>
        line.id === id
          ? {
              ...line,
              ...patch,
            }
          : line,
      ),
    );
  }

  function handleSupplierChange(nextSupplierId: string) {
    setSupplierId(nextSupplierId);

    setAvailableSupplierAdvance(0);

    if (!nextSupplierId) {
      return;
    }

    startLoadingAdvance(async () => {
      try {
        const advance = await loadSupplierAvailableAdvance(nextSupplierId);

        setAvailableSupplierAdvance(advance);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to load supplier advance.",
        );
      }
    });
  }

  const vatPercentage =
    taxTreatment === "standard_vat" || taxTreatment === "vat_pending" ? 5 : 0;

  const calculatedLines = useMemo(
    () =>
      lines.map((line) => {
        const subtotal = line.quantity * line.unitCost;

        const tax = subtotal * (vatPercentage / 100);

        return {
          ...line,
          subtotal,
          tax,

          total: subtotal + tax,
        };
      }),
    [lines, vatPercentage],
  );

  const subtotal = useMemo(
    () => calculatedLines.reduce((total, line) => total + line.subtotal, 0),
    [calculatedLines],
  );

  const taxAmount = useMemo(
    () => calculatedLines.reduce((total, line) => total + line.tax, 0),
    [calculatedLines],
  );

  const grandTotal = subtotal + taxAmount;

  const supplierAdvanceToApply = Math.min(availableSupplierAdvance, grandTotal);

  const amountAfterAdvance = Math.max(grandTotal - supplierAdvanceToApply, 0);

  const effectivePaidAmount =
    paymentStatus === "paid"
      ? amountAfterAdvance
      : paymentStatus === "credit"
        ? 0
        : Math.min(paidAmount, amountAfterAdvance);

  const projectedTotalPaid = Math.min(
    supplierAdvanceToApply + effectivePaidAmount,
    grandTotal,
  );

  const balanceDue = Math.max(grandTotal - projectedTotalPaid, 0);

  function handleSubmit() {
    if (!warehouseId) {
      toast.error("Please select a warehouse.");

      return;
    }

    const validLines = lines.filter((line) => line.productId);

    if (validLines.length === 0) {
      toast.error("Add at least one product.");

      return;
    }

    if (validLines.some((line) => line.quantity <= 0)) {
      toast.error("Every product must have a valid quantity.");

      return;
    }

    if (validLines.some((line) => line.unitCost < 0)) {
      toast.error("Purchase cost cannot be negative.");

      return;
    }

    if (taxTreatment === "standard_vat" && !supplierInvoiceNumber.trim()) {
      toast.error(
        "Supplier invoice number is required for verified VAT purchases.",
      );

      return;
    }

    if (taxTreatment === "standard_vat" && !supplierTrn.trim()) {
      toast.error("Supplier TRN is required for verified VAT purchases.");

      return;
    }

    if (
      paymentStatus === "partial" &&
      (effectivePaidAmount <= 0 || effectivePaidAmount >= amountAfterAdvance)
    ) {
      toast.error(
        "Partial payment must be greater than zero and less than the amount remaining after supplier advance.",
      );

      return;
    }

    startPosting(async () => {
      const result = await completeQuickPurchase({
        warehouseId,

        supplierId: supplierId || undefined,

        storeName: storeName || undefined,

        purchaseDate,

        supplierInvoiceNumber: supplierInvoiceNumber || undefined,

        supplierInvoiceDate: supplierInvoiceDate || undefined,

        supplierTrn: supplierTrn || undefined,

        currencyCode: "AED",

        exchangeRate: 1,

        taxTreatment,

        paymentStatus,

        paymentMethod: paymentStatus === "credit" ? undefined : paymentMethod,

        paidAmount: effectivePaidAmount,

        paymentReference: paymentReference || undefined,

        notes: notes || undefined,

        items: validLines.map((line) => ({
          productId: line.productId,

          quantity: line.quantity,

          unitCost: line.unitCost,

          taxPercentage: vatPercentage,

          notes: line.notes || undefined,
        })),
      });

      if (!result.success) {
        toast.error(result.message);

        return;
      }

      toast.success(result.message);

      router.push(
        `/admin/inventory/transactions/${result.inventoryTransactionId}`,
      );

      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
      <div className="space-y-6">
        <section className="rounded-xl border bg-card p-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <ReceiptText className="size-5" />
            </div>

            <div>
              <h2 className="font-semibold">Purchase Details</h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Supplier, warehouse, invoice and VAT information.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Warehouse" required>
              <select
                value={warehouseId}
                onChange={(event) => setWarehouseId(event.target.value)}
                className={inputClass}
              >
                <option value="">Select warehouse</option>

                {options.warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}

                    {warehouse.is_default ? " (Default)" : ""}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Purchase Date" required>
              <input
                type="date"
                value={purchaseDate}
                onChange={(event) => setPurchaseDate(event.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Supplier">
              <select
                value={supplierId}
                onChange={(event) => handleSupplierChange(event.target.value)}
                className={inputClass}
              >
                <option value="">No registered supplier</option>

                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.company_name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Store / Shop Name">
              <input
                value={storeName}
                onChange={(event) => setStoreName(event.target.value)}
                placeholder="Optional"
                className={inputClass}
              />
            </Field>

            <Field label="Supplier Invoice No.">
              <input
                value={supplierInvoiceNumber}
                onChange={(event) =>
                  setSupplierInvoiceNumber(event.target.value)
                }
                placeholder="Optional unless VAT verified"
                className={inputClass}
              />
            </Field>

            <Field label="Supplier Invoice Date">
              <input
                type="date"
                value={supplierInvoiceDate}
                onChange={(event) => setSupplierInvoiceDate(event.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Supplier TRN">
              <input
                value={supplierTrn}
                onChange={(event) => setSupplierTrn(event.target.value)}
                placeholder="15-digit TRN"
                className={inputClass}
              />
            </Field>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-6">
          <h2 className="font-semibold">Purchase VAT Treatment</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Choose the tax treatment based on the supplier document you actually
            have.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <ChoiceCard
              active={taxTreatment === "standard_vat"}
              title="VAT 5% — Valid Tax Invoice"
              subtitle="VAT treated as recoverable input tax"
              onClick={() => setTaxTreatment("standard_vat")}
            />

            <ChoiceCard
              active={taxTreatment === "no_vat"}
              title="No VAT Charged"
              subtitle="Supplier did not charge VAT"
              onClick={() => setTaxTreatment("no_vat")}
            />

            <ChoiceCard
              active={taxTreatment === "vat_pending"}
              title="VAT Evidence Pending"
              subtitle="VAT charged but document still needs verification"
              onClick={() => setTaxTreatment("vat_pending")}
            />

            <ChoiceCard
              active={taxTreatment === "reverse_charge"}
              title="Import / Reverse Charge"
              subtitle="Keep for separate VAT accounting treatment"
              onClick={() => setTaxTreatment("reverse_charge")}
            />

            <ChoiceCard
              active={taxTreatment === "review_required"}
              title="Review Required"
              subtitle="Tax treatment not yet determined"
              onClick={() => setTaxTreatment("review_required")}
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b p-5">
            <div>
              <h2 className="font-semibold">Purchased Products</h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Add multiple products with quantity and purchase cost.
              </p>
            </div>

            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold hover:bg-muted"
            >
              <Plus className="size-4" />
              Add Product
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Product</th>

                  <th className="px-4 py-3 text-right">Qty</th>

                  <th className="px-4 py-3 text-right">Cost</th>

                  <th className="px-4 py-3 text-right">VAT</th>

                  <th className="px-4 py-3 text-right">Total</th>

                  <th className="px-4 py-3">Notes</th>

                  <th className="w-14 px-4 py-3" />
                </tr>
              </thead>

              <tbody className="divide-y">
                {calculatedLines.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3">
                      <select
                        value={line.productId}
                        onChange={(event) =>
                          updateLine(line.id, {
                            productId: event.target.value,
                          })
                        }
                        className={inputClass}
                      >
                        <option value="">Select product</option>

                        {options.products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0.0001}
                        step="0.0001"
                        value={line.quantity}
                        onChange={(event) =>
                          updateLine(line.id, {
                            quantity: Number(event.target.value) || 0,
                          })
                        }
                        className="h-10 w-24 rounded-md border bg-background px-2 text-right"
                      />
                    </td>

                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.unitCost}
                        onChange={(event) =>
                          updateLine(line.id, {
                            unitCost: Number(event.target.value) || 0,
                          })
                        }
                        className="h-10 w-28 rounded-md border bg-background px-2 text-right"
                      />
                    </td>

                    <td className="px-4 py-3 text-right">{vatPercentage}%</td>

                    <td className="px-4 py-3 text-right font-semibold">
                      AED {money(line.total)}
                    </td>

                    <td className="px-4 py-3">
                      <input
                        value={line.notes}
                        onChange={(event) =>
                          updateLine(line.id, {
                            notes: event.target.value,
                          })
                        }
                        className={inputClass}
                      />
                    </td>

                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        className="rounded-md p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-6">
          <h2 className="font-semibold">Supplier Payment</h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <ChoiceCard
              active={paymentStatus === "paid"}
              title="Paid Now"
              subtitle="Full purchase paid now"
              onClick={() => setPaymentStatus("paid")}
            />

            <ChoiceCard
              active={paymentStatus === "partial"}
              title="Partial Payment"
              subtitle="Part paid, balance due"
              onClick={() => setPaymentStatus("partial")}
            />

            <ChoiceCard
              active={paymentStatus === "credit"}
              title="Credit"
              subtitle="Nothing paid now"
              onClick={() => {
                setPaymentStatus("credit");

                setPaidAmount(0);
              }}
            />
          </div>

          {paymentStatus !== "credit" ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Payment Method">
                <select
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(
                      event.target.value as QuickPurchasePaymentMethod,
                    )
                  }
                  className={inputClass}
                >
                  <option value="cash">Cash</option>

                  <option value="bank">Bank Transfer</option>

                  <option value="card">Card</option>

                  <option value="cheque">Cheque</option>

                  <option value="other">Other</option>
                </select>
              </Field>

              {paymentStatus === "partial" ? (
                <Field label="Paid Amount">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={paidAmount}
                    onChange={(event) =>
                      setPaidAmount(Number(event.target.value) || 0)
                    }
                    className={inputClass}
                  />
                </Field>
              ) : null}

              <Field label="Payment Reference">
                <input
                  value={paymentReference}
                  onChange={(event) => setPaymentReference(event.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          ) : null}

          <div className="mt-5">
            <Field label="Internal Notes">
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                className={`${inputClass} h-auto py-3`}
              />
            </Field>
          </div>
        </section>
      </div>

      <aside className="h-fit rounded-xl bg-slate-950 p-6 text-white xl:sticky xl:top-24">
        <div className="flex items-center gap-3">
          <Calculator className="size-5 text-amber-400" />

          <h2 className="font-semibold">Purchase Summary</h2>
        </div>

        <div className="mt-6 space-y-4 text-sm">
          <SummaryRow label="Subtotal" value={subtotal} />

          <SummaryRow label="VAT" value={taxAmount} />

          <div className="border-t border-slate-700 pt-4">
            <SummaryRow label="Grand Total" value={grandTotal} strong />
          </div>

          {supplierId ? (
            <>
              <SummaryRow
                label="Available Supplier Advance"
                value={availableSupplierAdvance}
              />

              <SummaryRow
                label="Advance To Apply"
                value={supplierAdvanceToApply}
              />
            </>
          ) : null}

          <SummaryRow label="Pay Now" value={effectivePaidAmount} />

          <SummaryRow label="Total Settled" value={projectedTotalPaid} />

          <SummaryRow
            label="Balance Due"
            value={balanceDue}
            strong={balanceDue > 0}
          />
          {isLoadingAdvance ? (
            <p className="text-xs text-slate-400">
              Checking supplier advance...
            </p>
          ) : null}
        </div>

        {taxTreatment === "standard_vat" ? (
          <div className="mt-5 rounded-lg bg-emerald-500/10 p-3 text-xs leading-5 text-emerald-200">
            Recoverable input VAT: AED {money(taxAmount)}
          </div>
        ) : null}

        {taxTreatment === "vat_pending" ? (
          <div className="mt-5 rounded-lg bg-amber-500/10 p-3 text-xs leading-5 text-amber-200">
            VAT pending documentation: AED {money(taxAmount)}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPosting}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 font-bold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPosting ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <ShoppingBag className="size-5" />
          )}

          {isPosting ? "Posting Purchase..." : "Post Quick Purchase"}
        </button>
      </aside>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium">
        {label}

        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </span>

      {children}
    </label>
  );
}

function ChoiceCard({
  active,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-xl border p-4 text-left transition",
        active
          ? "border-amber-500 bg-amber-50 ring-2 ring-amber-100"
          : "border-slate-200 bg-white hover:border-amber-300",
      ].join(" ")}
    >
      <p className="font-semibold">{title}</p>

      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
    </button>
  );
}

function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-300">{label}</span>

      <span className={strong ? "font-bold" : ""}>AED {money(value)}</span>
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

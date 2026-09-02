"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

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

import {
  QuickPurchaseProductPicker,
  type QuickPurchaseProductPickerHandle,
} from "./QuickPurchaseProductPicker";
interface SupplierOption {
  id: string;
  company_name: string;
}

interface FinancialAccountOption {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  currencyCode: string;
  currentBalance: number;
}

interface QuickPurchaseFormProps {
  options: StockAdjustmentOptions;

  suppliers: SupplierOption[];

  financialAccounts: FinancialAccountOption[];
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
  financialAccounts,
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

  const [financialAccountId, setFinancialAccountId] = useState("");

  const [paidAmount, setPaidAmount] = useState(0);

  const [paymentReference, setPaymentReference] = useState("");

  const [notes, setNotes] = useState("");

  const [lines, setLines] = useState<PurchaseLine[]>([createEmptyLine()]);

  const productPickerRefs = useRef<
    Record<string, QuickPurchaseProductPickerHandle | null>
  >({});

  const [pendingProductFocusId, setPendingProductFocusId] = useState<
    string | null
  >(null);

  const [availableSupplierAdvance, setAvailableSupplierAdvance] = useState(0);

  const [isLoadingAdvance, startLoadingAdvance] = useTransition();

  const compatibleFinancialAccounts = useMemo(
    () =>
      financialAccounts.filter((account) => {
        if (account.currencyCode !== "AED") {
          return false;
        }

        if (paymentMethod === "cash") {
          return account.accountType === "cash";
        }

        if (paymentMethod === "bank" || paymentMethod === "cheque") {
          return account.accountType === "bank";
        }

        if (paymentMethod === "card") {
          return ["card", "payment_gateway", "clearing"].includes(
            account.accountType,
          );
        }

        return true;
      }),
    [financialAccounts, paymentMethod],
  );

  function addLine() {
    const newLine = createEmptyLine();

    setLines((current) => [...current, newLine]);
    setPendingProductFocusId(newLine.id);
  }

  useEffect(() => {
    if (!pendingProductFocusId) {
      return;
    }

    const picker = productPickerRefs.current[pendingProductFocusId];

    if (!picker) {
      return;
    }

    picker.focus();
    setPendingProductFocusId(null);
  }, [lines, pendingProductFocusId]);

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
    if (effectivePaidAmount > 0 && !financialAccountId) {
      toast.error("Please select the financial account used for this payment.");

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

        financialAccountId:
          effectivePaidAmount > 0 ? financialAccountId : undefined,

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
    <div>
      <div className="space-y-6">
        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center gap-2 border-b bg-muted/20 px-4 py-3">
            <ReceiptText className="size-4 text-muted-foreground" />

            <div>
              <h2 className="text-sm font-semibold">Purchase Details</h2>

              <p className="text-xs text-muted-foreground">
                Supplier, warehouse and purchase document details
              </p>
            </div>
          </div>

          <div className="grid gap-x-4 gap-y-3 p-4 md:grid-cols-2 xl:grid-cols-4">
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

            <Field label="Supplier Invoice No.">
              <input
                value={supplierInvoiceNumber}
                onChange={(event) =>
                  setSupplierInvoiceNumber(event.target.value)
                }
                placeholder="Optional"
                className={inputClass}
              />
            </Field>

            <Field label="Store / Shop Name">
              <input
                value={storeName}
                onChange={(event) => setStoreName(event.target.value)}
                placeholder="Optional"
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

            <Field label="VAT Treatment">
              <select
                value={taxTreatment}
                onChange={(event) =>
                  setTaxTreatment(
                    event.target.value as QuickPurchaseTaxTreatment,
                  )
                }
                className={inputClass}
              >
                <option value="no_vat">No VAT Charged</option>

                <option value="standard_vat">VAT 5% - Valid Tax Invoice</option>

                <option value="vat_pending">VAT Evidence Pending</option>

                <option value="reverse_charge">Import / Reverse Charge</option>

                <option value="review_required">Review Required</option>
              </select>
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t bg-muted/10 px-4 py-2 text-[11px] text-muted-foreground">
            {taxTreatment === "standard_vat" ? (
              <span>
                <span className="font-semibold text-foreground">VAT 5%</span>{" "}
                Recoverable input VAT - valid supplier tax invoice and TRN
                required.
              </span>
            ) : null}

            {taxTreatment === "no_vat" ? (
              <span>
                <span className="font-semibold text-foreground">No VAT</span>{" "}
                Supplier VAT will not be added.
              </span>
            ) : null}

            {taxTreatment === "vat_pending" ? (
              <span>
                <span className="font-semibold text-foreground">
                  VAT Pending
                </span>{" "}
                VAT evidence still requires verification.
              </span>
            ) : null}

            {taxTreatment === "reverse_charge" ? (
              <span>
                <span className="font-semibold text-foreground">
                  Reverse Charge
                </span>{" "}
                Purchase kept under separate VAT treatment.
              </span>
            ) : null}

            {taxTreatment === "review_required" ? (
              <span>
                <span className="font-semibold text-foreground">
                  Review Required
                </span>{" "}
                VAT treatment must be reviewed before final accounting.
              </span>
            ) : null}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Purchased Products</h2>

              <p className="text-xs text-muted-foreground">
                Enter product, quantity and purchase cost
              </p>
            </div>

            <button
              type="button"
              onClick={addLine}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs font-semibold hover:bg-muted"
            >
              <Plus className="size-4" />
              Add Row
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Product</th>

                  <th className="px-3 py-2 text-right">Qty</th>

                  <th className="px-3 py-2 text-right">Cost</th>

                  <th className="px-3 py-2 text-right">VAT</th>

                  <th className="px-3 py-2 text-right">Total</th>

                  <th className="px-3 py-2">Notes</th>

                  <th className="w-14 px-3 py-2" />
                </tr>
              </thead>

              <tbody className="divide-y">
                {calculatedLines.map((line) => (
                  <tr key={line.id}>
                    <td className="px-3 py-2">
                      <QuickPurchaseProductPicker
                        ref={(picker) => {
                          productPickerRefs.current[line.id] = picker;
                        }}
                        products={options.products}
                        value={line.productId}
                        onChange={(productId) =>
                          updateLine(line.id, {
                            productId,
                          })
                        }
                      />
                    </td>

                    <td className="px-3 py-2">
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
                        className="h-9 w-20 rounded-md border bg-background px-2 text-right text-xs"
                      />
                    </td>

                    <td className="px-3 py-2">
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
                        className="h-9 w-24 rounded-md border bg-background px-2 text-right text-xs"
                      />
                    </td>

                    <td className="px-3 py-2 text-right">{vatPercentage}%</td>

                    <td className="px-3 py-2 text-right font-semibold">
                      AED {money(line.total)}
                    </td>

                    <td className="px-3 py-2">
                      <input
                        value={line.notes}
                        onChange={(event) =>
                          updateLine(line.id, {
                            notes: event.target.value,
                          })
                        }
                        className="h-9 w-full min-w-[160px] rounded-md border bg-background px-2.5 text-xs"
                      />
                    </td>

                    <td className="px-3 py-2">
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

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="overflow-hidden rounded-xl border bg-card">
            <div className="border-b bg-muted/20 px-4 py-3">
              <h2 className="text-sm font-semibold">Supplier Payment</h2>

              <p className="text-xs text-muted-foreground">
                Choose how this purchase is being settled
              </p>
            </div>

            <div className="p-3.5">
              <div className="inline-flex w-full rounded-lg border bg-muted/30 p-1 sm:w-auto">
                <button
                  type="button"
                  onClick={() => setPaymentStatus("paid")}
                  className={`h-8 min-w-[110px] rounded-md px-3 text-xs font-semibold transition ${
                    paymentStatus === "paid"
                      ? "bg-background text-foreground shadow-sm ring-1 ring-amber-400"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Paid Now
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentStatus("partial")}
                  className={`h-8 min-w-[110px] rounded-md px-3 text-xs font-semibold transition ${
                    paymentStatus === "partial"
                      ? "bg-background text-foreground shadow-sm ring-1 ring-amber-400"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Partial
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentStatus("credit");
                    setPaidAmount(0);
                  }}
                  className={`h-8 min-w-[110px] rounded-md px-3 text-xs font-semibold transition ${
                    paymentStatus === "credit"
                      ? "bg-background text-foreground shadow-sm ring-1 ring-amber-400"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Credit
                </button>
              </div>

              {paymentStatus !== "credit" ? (
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="Payment Method">
                    <select
                      value={paymentMethod}
                      onChange={(event) => {
                        setPaymentMethod(
                          event.target.value as QuickPurchasePaymentMethod,
                        );

                        setFinancialAccountId("");
                      }}
                      className={inputClass}
                    >
                      <option value="cash">Cash</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="card">Card</option>
                      <option value="cheque">Cheque</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>

                  {effectivePaidAmount > 0 ? (
                    <Field label="Financial Account" required>
                      <select
                        value={financialAccountId}
                        onChange={(event) =>
                          setFinancialAccountId(event.target.value)
                        }
                        className={inputClass}
                      >
                        <option value="">Select account</option>

                        {compatibleFinancialAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.accountName}
                            {" - "}
                            {account.accountCode}
                            {" - "}
                            {account.currencyCode}{" "}
                            {money(account.currentBalance)}
                          </option>
                        ))}
                      </select>

                      {compatibleFinancialAccounts.length === 0 ? (
                        <p className="mt-1 text-xs text-red-600">
                          No compatible financial account is available for this
                          payment method.
                        </p>
                      ) : null}
                    </Field>
                  ) : null}

                  {paymentStatus === "partial" ? (
                    <Field label="Pay Now">
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
                      onChange={(event) =>
                        setPaymentReference(event.target.value)
                      }
                      placeholder="Optional"
                      className={inputClass}
                    />
                  </Field>
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  No payment will be recorded now. The full balance remains
                  payable to the supplier.
                </p>
              )}

              <div className="mt-2.5">
                <Field label="Internal Notes">
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={1}
                    placeholder="Optional internal note"
                    className={`${inputClass} h-auto min-h-[42px] resize-y py-2`}
                  />
                </Field>
              </div>
            </div>
          </section>

          <aside className="overflow-hidden rounded-xl bg-slate-950 text-white">
            <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
              <Calculator className="size-4 text-amber-400" />

              <h2 className="text-sm font-semibold">Purchase Summary</h2>
            </div>

            <div className="space-y-2.5 px-4 py-4 text-sm">
              <SummaryRow label="Subtotal" value={subtotal} />

              <SummaryRow label="VAT" value={taxAmount} />

              <div className="border-t border-slate-700 pt-2.5">
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

              {taxTreatment === "standard_vat" ? (
                <div className="rounded-md bg-emerald-500/10 px-2.5 py-2 text-xs text-emerald-200">
                  Recoverable input VAT: AED {money(taxAmount)}
                </div>
              ) : null}

              {taxTreatment === "vat_pending" ? (
                <div className="rounded-md bg-amber-500/10 px-2.5 py-2 text-xs text-amber-200">
                  VAT pending documentation: AED {money(taxAmount)}
                </div>
              ) : null}
            </div>

            <div className="border-t border-slate-800 p-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPosting}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-amber-500 text-sm font-bold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPosting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ShoppingBag className="size-4" />
                )}

                {isPosting ? "Posting Purchase..." : "Post Quick Purchase"}
              </button>
            </div>
          </aside>
        </div>
      </div>
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

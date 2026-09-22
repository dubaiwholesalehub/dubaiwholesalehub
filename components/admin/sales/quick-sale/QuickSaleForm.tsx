"use client";

import { useMemo, useRef, useState, useTransition } from "react";

import {
  Banknote,
  Calculator,
  Globe2,
  PackagePlus,
  Plus,
  ReceiptText,
  Trash2,
  Truck,
  WalletCards,
  Zap,
} from "lucide-react";

import type { QuickSaleOptions } from "./quick-sale-types";

import {
  QuickSaleProductPicker,
  type QuickSaleProductPickerHandle,
} from "./QuickSaleProductPicker";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  completeQuickSale,
  loadCustomerAvailableAdvance,
} from "@/app/admin/(protected)/sales/quick-sale/actions";

type TaxTreatment = "local_5" | "export_verified" | "export_pending" | "review";

type PaymentStatus = "paid" | "partial" | "credit";

type PaymentMethod = "cash" | "bank" | "card" | "cheque" | "other";

type DeliveryMode = "now" | "later";

type ItemFulfilment = "stock" | "local_purchase";

type QuickSaleItem = {
  id: string;

  productId: string;

  quantity: number;

  fulfilment: ItemFulfilment;

  supplierId: string;

  purchaseCost: number;

  sellingPrice: number;
};

interface QuickSaleFormProps {
  options: QuickSaleOptions;
}

function createEmptyItem(): QuickSaleItem {
  return {
    id: crypto.randomUUID(),

    productId: "",

    quantity: 1,

    fulfilment: "stock",

    supplierId: "",

    purchaseCost: 0,

    sellingPrice: 0,
  };
}

export default function QuickSaleForm({ options }: QuickSaleFormProps) {
  const defaultWarehouse = options.warehouses[0]?.id ?? "";

  const [customerId, setCustomerId] = useState("");

  const [salespersonId, setSalespersonId] = useState("");

  const [customerAdvance, setCustomerAdvance] = useState(0);

  const [isLoadingAdvance, startLoadingAdvance] = useTransition();

  const [warehouseId, setWarehouseId] = useState(defaultWarehouse);

  const [taxTreatment, setTaxTreatment] = useState<TaxTreatment>("local_5");

  const [destinationCountryId, setDestinationCountryId] = useState("");

  const [cargoCompany, setCargoCompany] = useState("");

  const [cargoReference, setCargoReference] = useState("");

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("paid");

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");

  const [financialAccountId, setFinancialAccountId] = useState("");

  const [amountReceived, setAmountReceived] = useState(0);

  const [invoiceDiscountAmount, setInvoiceDiscountAmount] = useState(0);

  const [deliveryCharge, setDeliveryCharge] = useState(0);

  const [roundOffAmount, setRoundOffAmount] = useState(0);

  const [paymentReference, setPaymentReference] = useState("");

  const [bankName, setBankName] = useState("");

  const [chequeNumber, setChequeNumber] = useState("");

  const [chequeDate, setChequeDate] = useState("");

  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("now");

  const [items, setItems] = useState<QuickSaleItem[]>(() =>
    Array.from({ length: 10 }, () => createEmptyItem()),
  );

  const [detailsItemId, setDetailsItemId] = useState<string | null>(null);

  const newProductPickerRef = useRef<QuickSaleProductPickerHandle | null>(null);

  const [marginApprovalReason, setMarginApprovalReason] = useState("");

  const [saleDate, setSaleDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const subtotal = useMemo(
    () =>
      items.reduce(
        (total, item) => total + item.quantity * item.sellingPrice,
        0,
      ),
    [items],
  );
  const marginAnalysis = useMemo(() => {
    /*
     * Margin protection must use revenue AFTER invoice-level
     * discount so the browser preview matches the authoritative
     * sales_order_margin_analysis database view.
     */
    const merchandiseRevenue =
      items.reduce(
        (total, item) =>
          total +
          (
            item.quantity *
            item.sellingPrice
          ),
        0,
      );

    const discountToAllocate =
      Math.min(
        Math.max(
          invoiceDiscountAmount,
          0,
        ),
        merchandiseRevenue,
      );

    const lines = items
      .filter((item) => Boolean(item.productId) && item.quantity > 0)
      .map((item) => {
        const stock = options.stock.find(
          (row) =>
            row.productId === item.productId && row.warehouseId === warehouseId,
        );

        const unitCost =
          item.fulfilment === "local_purchase"
            ? item.purchaseCost
            : (stock?.averageUnitCost ?? 0);

        const grossRevenue =
          item.quantity *
          item.sellingPrice;

        const allocatedInvoiceDiscount =
          merchandiseRevenue > 0
            ? (
                discountToAllocate *
                grossRevenue
              ) /
              merchandiseRevenue
            : 0;

        const revenue =
          Math.max(
            grossRevenue -
              allocatedInvoiceDiscount,
            0,
          );

        const cost = item.quantity * unitCost;

        const profit = revenue - cost;

        const margin = revenue > 0 ? (profit / revenue) * 100 : null;

        let status:
          | "healthy"
          | "warning"
          | "at_cost"
          | "approval_required"
          | "cost_missing";

        if (unitCost <= 0) {
          status = "cost_missing";
        } else if (
          margin !== null &&
          margin < options.marginPolicy.minimumMarginPercentage
        ) {
          status = "approval_required";
        } else if (margin === 0) {
          status = "at_cost";
        } else if (
          margin !== null &&
          margin < options.marginPolicy.warningMarginPercentage
        ) {
          status = "warning";
        } else {
          status = "healthy";
        }

        return {
          itemId: item.id,

          unitCost,

          revenue,

          cost,

          profit,

          margin,

          status,
        };
      });

    const estimatedRevenue = lines.reduce(
      (total, line) => total + line.revenue,
      0,
    );

    const estimatedCost = lines.reduce((total, line) => total + line.cost, 0);

    const estimatedGrossProfit = estimatedRevenue - estimatedCost;

    const estimatedMargin =
      estimatedRevenue > 0
        ? (estimatedGrossProfit / estimatedRevenue) * 100
        : 0;

    const requiresApproval = lines.some(
      (line) =>
        line.status === "approval_required" || line.status === "cost_missing",
    );

    const hasWarning = lines.some((line) => line.status === "warning");

    const hasAtCost = lines.some((line) => line.status === "at_cost");

    const validMargins = lines
      .map((line) => line.margin)
      .filter((value): value is number => value !== null);

    const lowestMargin =
      validMargins.length > 0 ? Math.min(...validMargins) : null;

    return {
      lines,

      estimatedRevenue,

      estimatedCost,

      estimatedGrossProfit,

      estimatedMargin,

      requiresApproval,

      hasWarning,

      hasAtCost,

      lowestMargin,
    };
  }, [
    items,
    warehouseId,
    options.stock,
    options.marginPolicy,
    invoiceDiscountAmount,
  ]);

  const compatibleFinancialAccounts = useMemo(
    () =>
      options.financialAccounts.filter((account) => {
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
    [options.financialAccounts, paymentMethod],
  );

  const vatRate = taxTreatment === "local_5" ? 5 : 0;

  /*
   * Invoice-level discount reduces the merchandise taxable
   * base. Keep the browser calculation aligned with the
   * authoritative Sales Order recalculation on the server.
   */
  const effectiveInvoiceDiscount =
    Math.min(
      Math.max(invoiceDiscountAmount, 0),
      subtotal,
    );

  const merchandiseAfterInvoiceDiscount =
    Math.max(
      subtotal - effectiveInvoiceDiscount,
      0,
    );

  const vatAmount =
    merchandiseAfterInvoiceDiscount *
    (vatRate / 100);

  const grandTotal =
    Math.max(
      merchandiseAfterInvoiceDiscount +
        vatAmount +
        Math.max(deliveryCharge, 0) +
        roundOffAmount,
      0,
    );

  /*
   * Customer advance that can actually be consumed by
   * this sale.
   *
   * If the customer has AED 500 advance but this sale is
   * only AED 100, only AED 100 is applicable.
   */
  const advanceToApply = Math.min(customerAdvance, grandTotal);

  /*
   * Amount still payable after existing customer advance.
   */
  const remainingAfterAdvance = Math.max(grandTotal - advanceToApply, 0);

  /*
   * New money received NOW.
   *
   * Existing customer advance must never be counted as a
   * new receipt.
   */
  const effectiveAmountReceived =
    paymentStatus === "paid"
      ? remainingAfterAdvance
      : paymentStatus === "credit"
        ? 0
        : amountReceived;

  /*
   * Total amount settled against the sale:
   *
   * old customer advance + new payment.
   */
  const totalSettled = Math.min(
    advanceToApply + effectiveAmountReceived,
    grandTotal,
  );

  const outstanding = Math.max(grandTotal - totalSettled, 0);

  function updateItem(id: string, changes: Partial<QuickSaleItem>) {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              ...changes,
            }
          : item,
      ),
    );
  }

  function addRows(count = 10) {
    setItems((current) => [
      ...current,
      ...Array.from({ length: count }, () => createEmptyItem()),
    ]);
  }

  function removeItem(id: string) {
    setItems((current) => {
      const next = current.filter((item) => item.id !== id);
      return next.length > 0 ? next : [createEmptyItem()];
    });

    setDetailsItemId((current) => (current === id ? null : current));
  }

  function getProduct(productId: string) {
    return options.products.find((product) => product.id === productId) ?? null;
  }

  function getStock(productId: string) {
    return (
      options.stock.find(
        (row) => row.productId === productId && row.warehouseId === warehouseId,
      ) ?? null
    );
  }
  function getPurchaseInfo(productId: string) {
    return (
      options.purchaseInfo.find((info) => info.productId === productId) ?? null
    );
  }

  const isExport =
    taxTreatment === "export_verified" || taxTreatment === "export_pending";

  const router = useRouter();

  const [isPosting, startPosting] = useTransition();

  function handleCompleteSale() {
    if (!customerId) {
      toast.error("Please select a customer.");

      return;
    }
    if (!salespersonId) {
      toast.error("Please select a salesperson.");

      return;
    }
    if (!warehouseId) {
      toast.error("Please select a warehouse.");

      return;
    }

    const validItems = items.filter((item) => item.productId);

    if (validItems.length === 0) {
      toast.error("Add at least one product.");

      return;
    }

    if (validItems.some((item) => item.quantity <= 0)) {
      toast.error("Every item must have a valid quantity.");

      return;
    }

    if (validItems.some((item) => item.sellingPrice < 0)) {
      toast.error("Please check the selling prices.");

      return;
    }

    if (
      (taxTreatment === "export_verified" ||
        taxTreatment === "export_pending") &&
      !destinationCountryId
    ) {
      toast.error("Select the export destination country.");

      return;
    }

    if (
      !Number.isFinite(invoiceDiscountAmount) ||
      invoiceDiscountAmount < 0 ||
      invoiceDiscountAmount > subtotal
    ) {
      toast.error(
        "Invoice discount must be between AED 0.00 and the merchandise subtotal.",
      );

      return;
    }

    if (
      !Number.isFinite(deliveryCharge) ||
      deliveryCharge < 0
    ) {
      toast.error(
        "Delivery charges must be zero or greater.",
      );

      return;
    }

    if (
      !Number.isFinite(roundOffAmount) ||
      roundOffAmount < -10 ||
      roundOffAmount > 10
    ) {
      toast.error(
        "Round off must be between AED -10.00 and AED 10.00.",
      );

      return;
    }

    if (
      paymentStatus === "paid" &&
      Math.abs(effectiveAmountReceived - remainingAfterAdvance) > 0.01
    ) {
      toast.error(
        "Paid Now must equal the remaining balance after customer advance.",
      );

      return;
    }

    if (
      paymentStatus === "partial" &&
      (amountReceived <= 0 || amountReceived >= remainingAfterAdvance)
    ) {
      toast.error(
        "Partial payment must be greater than zero and less than the remaining balance after customer advance.",
      );

      return;
    }

    if (paymentStatus === "partial" && remainingAfterAdvance <= 0) {
      toast.error("This sale is already fully covered by customer advance.");

      return;
    }

    if (paymentStatus === "credit" && amountReceived !== 0) {
      toast.error("Credit sale cannot have an amount received.");

      return;
    }

    if (
      paymentMethod === "cheque" &&
      paymentStatus !== "credit" &&
      !chequeNumber.trim()
    ) {
      toast.error("Please enter the cheque number.");

      return;
    }
    if (effectiveAmountReceived > 0 && !financialAccountId) {
      toast.error(
        "Please select the financial account receiving this payment.",
      );

      return;
    }
    if (marginAnalysis.requiresApproval && !marginApprovalReason) {
      toast.error("Select an admin approval reason for this margin exception.");

      return;
    }
    startPosting(async () => {
      const result = await completeQuickSale({
        customerId,
        salespersonId,
        warehouseId,
        saleDate,

        taxTreatment,

        destinationCountryId: destinationCountryId || undefined,

        cargoCompany: cargoCompany || undefined,

        cargoReference: cargoReference || undefined,

        paymentStatus,

        paymentMethod,

        financialAccountId:
          effectiveAmountReceived > 0 ? financialAccountId : undefined,

        amountReceived: effectiveAmountReceived,

        invoiceDiscountAmount:
          effectiveInvoiceDiscount,

        deliveryCharge,

        roundOffAmount,

        paymentReference: paymentReference || undefined,

        bankName: bankName || undefined,

        chequeNumber: chequeNumber || undefined,

        chequeDate: chequeDate || undefined,

        deliveryMode,

        marginApprovalReason: marginAnalysis.requiresApproval
          ? marginApprovalReason || undefined
          : undefined,

        items: validItems.map((item) => ({
          productId: item.productId,

          quantity: item.quantity,

          fulfilment: item.fulfilment,

          supplierId: item.supplierId || undefined,

          purchaseCost: item.purchaseCost,

          sellingPrice: item.sellingPrice,
        })),
      });

      if (!result.success) {
        toast.error(result.message);

        return;
      }

      toast.success(result.message);

      router.push(`/admin/sales/orders/${result.salesOrderId}`);

      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* ---------------------------------------------------------
          QUICK SALE V2 - COMPACT TRANSACTION HEADER
          --------------------------------------------------------- */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-12">
          <div className="xl:col-span-3">
            <Field label="Customer">
              <select
                value={customerId}
                onChange={(event) => {
                  const nextCustomerId = event.target.value;

                  setCustomerId(nextCustomerId);
                  setCustomerAdvance(0);
                  setAmountReceived(0);

                  if (!nextCustomerId) {
                    return;
                  }

                  startLoadingAdvance(async () => {
                    try {
                      const available =
                        await loadCustomerAvailableAdvance(nextCustomerId);

                      setCustomerAdvance(Number(available ?? 0));
                    } catch (error) {
                      console.error(error);

                      setCustomerAdvance(0);
                      toast.error("Unable to load customer advance.");
                    }
                  });
                }}
                className={inputClass}
              >
                <option value="">Select customer</option>

                {options.customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.displayName}
                    {customer.customerNumber
                      ? ` - ${customer.customerNumber}`
                      : ""}
                  </option>
                ))}
              </select>
            </Field>

            {isLoadingAdvance ? (
              <p className="mt-1 text-[11px] text-slate-400">
                Checking customer advance...
              </p>
            ) : customerAdvance > 0 ? (
              <p className="mt-1 text-[11px] font-semibold text-emerald-700">
                Available advance: AED {customerAdvance.toFixed(2)}
              </p>
            ) : null}
          </div>

          <div className="xl:col-span-3">
            <Field label="Salesperson" required>
              <select
                value={salespersonId}
                onChange={(event) => setSalespersonId(event.target.value)}
                className={inputClass}
              >
                <option value="">Select salesperson</option>

                {options.salespeople.map((salesperson) => (
                  <option key={salesperson.id} value={salesperson.id}>
                    {salesperson.fullName?.trim() || salesperson.email}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="xl:col-span-2">
            <Field label="Warehouse" required>
              <select
                value={warehouseId}
                onChange={(event) => setWarehouseId(event.target.value)}
                className={inputClass}
              >
                <option value="">Select warehouse</option>

                {options.warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.code} - {warehouse.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="xl:col-span-2">
            <Field label="Sale Date">
              <input
                type="date"
                value={saleDate}
                onChange={(event) => setSaleDate(event.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="xl:col-span-2">
            <Field label="VAT Treatment">
              <select
                value={taxTreatment}
                onChange={(event) =>
                  setTaxTreatment(event.target.value as TaxTreatment)
                }
                className={inputClass}
              >
                <option value="local_5">UAE Local - 5% VAT</option>
                <option value="export_verified">
                  Export - Evidence Verified - 0%
                </option>
                <option value="export_pending">
                  Export - Evidence Pending
                </option>
                <option value="review">Other - Review Required</option>
              </select>
            </Field>
          </div>
        </div>

        {isExport ? (
          <div className="border-t border-blue-100 bg-blue-50/70 px-4 py-3">
            <div className="grid gap-3 lg:grid-cols-3">
              <Field label="Destination Country">
                <select
                  value={destinationCountryId}
                  onChange={(event) =>
                    setDestinationCountryId(event.target.value)
                  }
                  className={inputClass}
                >
                  <option value="">Select country</option>

                  {options.countries.map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Cargo / Freight Company">
                <input
                  value={cargoCompany}
                  onChange={(event) => setCargoCompany(event.target.value)}
                  placeholder="Example: ABC Cargo"
                  className={inputClass}
                />
              </Field>

              <Field label="Cargo Reference">
                <input
                  value={cargoReference}
                  onChange={(event) => setCargoReference(event.target.value)}
                  placeholder="Receipt / AWB / reference"
                  className={inputClass}
                />
              </Field>
            </div>

            {taxTreatment === "export_pending" ? (
              <p className="mt-2 text-xs font-medium text-amber-800">
                Export evidence is pending and will remain flagged for
                follow-up.
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* ---------------------------------------------------------
          QUICK SALE V3 - DENSE 10-ROW ENTRY GRID
          --------------------------------------------------------- */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div className="flex items-center gap-2">
            <PackagePlus className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-bold text-slate-950">Sale Items</h2>
          </div>
          <span className="text-[11px] font-medium text-slate-400">{items.length} rows ready</span>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[36px_minmax(340px,1fr)_80px_120px_120px_42px] items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <div className="text-center">#</div><div>Product</div><div>Qty</div>
              <div className="text-right">Sell Price</div><div className="text-right">Amount</div><div />
            </div>

            {items.map((item, index) => {
              const product = getProduct(item.productId);
              const stock = getStock(item.productId);
              const lineTotal = item.quantity * item.sellingPrice;
              const lineMargin = marginAnalysis.lines.find((line) => line.itemId === item.id);

              return (
                <div key={item.id} className="grid grid-cols-[36px_minmax(340px,1fr)_80px_120px_120px_42px] items-start gap-2 border-b border-slate-100 px-3 py-2 last:border-b-0 hover:bg-slate-50/70">
                  <div className="flex h-9 items-center justify-center text-xs font-bold text-slate-400">{index + 1}</div>
                  <div>
                    <QuickSaleProductPicker
                      ref={index === items.length - 1 ? newProductPickerRef : undefined}
                      products={options.products}
                      value={item.productId}
                      onChange={(productId) => {
                        const selectedProduct = getProduct(productId);
                        const selectedPurchaseInfo = getPurchaseInfo(productId);
                        const nextFulfilment = selectedProduct?.defaultFulfilmentMethod === "local_purchase" ? "local_purchase" : "stock";
                        updateItem(item.id, {
                          productId,
                          fulfilment: nextFulfilment,
                          supplierId: nextFulfilment === "local_purchase" ? (selectedPurchaseInfo?.supplierId ?? "") : "",
                          purchaseCost: nextFulfilment === "local_purchase" ? (selectedPurchaseInfo?.suggestedPurchasePrice ?? 0) : 0,
                        });
                        if (productId && index === items.length - 1) addRows(10);
                      }}
                    />
                    {product ? (
                      <div className="mt-0.5 flex min-h-3 flex-wrap items-center gap-x-2 px-1 text-[10px] leading-3 text-slate-500">
                        {product.sku ? <span>SKU: {product.sku}</span> : null}
                        <span>{product.unitShortName ?? product.unitName ?? "PCS"}</span>
                        {item.fulfilment === "stock" ? (
                          <span className={(stock?.quantityAvailable ?? 0) < item.quantity ? "font-bold text-red-600" : "font-semibold text-emerald-700"}>Stock: {stock?.quantityAvailable ?? 0}</span>
                        ) : (
                          <button type="button" onClick={() => setDetailsItemId(item.id)} className="font-bold text-blue-700 hover:text-blue-900">Local Buy</button>
                        )}
                        {lineMargin?.status === "approval_required" || lineMargin?.status === "cost_missing" ? <span className="font-bold text-red-600">Margin review</span> : lineMargin?.status === "warning" ? <span className="font-semibold text-amber-700">Low margin</span> : lineMargin?.status === "at_cost" ? <span className="font-semibold text-blue-700">At cost</span> : null}
                      </div>
                    ) : null}
                  </div>
                  <input type="number" min={1} step="1" value={item.quantity} onChange={(event) => updateItem(item.id, { quantity: Math.max(Number(event.target.value) || 1, 1) })} className={`${compactInputClass} text-center font-semibold`} aria-label={`Quantity for item ${index + 1}`} />
                  <input type="number" min={0} step="0.01" value={item.sellingPrice} onChange={(event) => updateItem(item.id, { sellingPrice: Number(event.target.value) || 0 })} className={`${compactInputClass} text-right font-bold focus:border-amber-500 focus:ring-2 focus:ring-amber-100`} aria-label={`Selling price for item ${index + 1}`} />
                  <div className="flex h-9 items-center justify-end rounded-lg bg-slate-50 px-2 text-sm font-bold tabular-nums text-slate-950">{lineTotal.toFixed(2)}</div>
                  <div className="flex h-9 items-center justify-center">
                    <button type="button" onClick={() => setDetailsItemId(item.id)} disabled={!item.productId} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-default disabled:opacity-20" aria-label={`Item details for row ${index + 1}`} title="Item details">...</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-2">
          <button type="button" onClick={() => addRows(10)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-amber-400 hover:text-amber-700"><Plus className="h-3.5 w-3.5" />Add 10 More Rows</button>
          <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-xs text-slate-600">
            <span>Qty: <strong className="text-slate-900">{items.filter((item) => item.productId).reduce((total, item) => total + item.quantity, 0)}</strong></span>
            {marginAnalysis.requiresApproval ? <span className="font-bold text-red-600">Margin approval required</span> : marginAnalysis.hasAtCost ? <span className="font-semibold text-blue-700">At-cost item</span> : marginAnalysis.hasWarning ? <span className="font-semibold text-amber-700">Low margin</span> : null}
          </div>
        </div>
      </section>

      {detailsItemId ? (() => {
        const detailItem = items.find((item) => item.id === detailsItemId);
        if (!detailItem) return null;
        const detailProduct = getProduct(detailItem.productId);
        const detailStock = getStock(detailItem.productId);
        const detailPurchaseInfo = getPurchaseInfo(detailItem.productId);
        const detailMargin = marginAnalysis.lines.find((line) => line.itemId === detailItem.id);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailsItemId(null); }}>
            <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
                <div><h3 className="text-base font-bold text-slate-950">Item Details</h3><p className="mt-0.5 text-xs text-slate-500">{detailProduct?.name ?? "Selected product"}</p></div>
                <button type="button" onClick={() => setDetailsItemId(null)} className="rounded-lg px-2 py-1 text-sm font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-900">Close</button>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <Field label="Fulfilment">
                  <select value={detailItem.fulfilment} onChange={(event) => { const nextFulfilment = event.target.value as ItemFulfilment; updateItem(detailItem.id, { fulfilment: nextFulfilment, supplierId: nextFulfilment === "local_purchase" ? detailItem.supplierId || detailPurchaseInfo?.supplierId || "" : "", purchaseCost: nextFulfilment === "local_purchase" ? detailItem.purchaseCost || detailPurchaseInfo?.suggestedPurchasePrice || 0 : detailItem.purchaseCost }); }} className={compactInputClass}>
                    <option value="stock">Stock</option><option value="local_purchase">Local Buy</option>
                  </select>
                </Field>
                <Field label="Supplier">
                  {detailItem.fulfilment === "local_purchase" ? (
                    <select value={detailItem.supplierId} onChange={(event) => updateItem(detailItem.id, { supplierId: event.target.value })} className={compactInputClass}>
                      <option value="">Supplier optional</option>{options.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.companyName}</option>)}
                    </select>
                  ) : <div className="flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-400">Not required for stock</div>}
                </Field>
                <Field label="Cost">
                  <input type="number" min={0} step="0.01" value={detailItem.fulfilment === "stock" ? (detailStock?.averageUnitCost ?? 0) : detailItem.purchaseCost} readOnly={detailItem.fulfilment === "stock"} onChange={(event) => updateItem(detailItem.id, { purchaseCost: Number(event.target.value) || 0 })} className={`${compactInputClass} text-right ${detailItem.fulfilment === "stock" ? "bg-slate-100 text-slate-500" : ""}`} />
                </Field>
                <Field label="Estimated Margin">
                  <div className={`flex h-9 items-center justify-end rounded-lg border px-3 text-xs font-bold ${!detailMargin || detailMargin.margin === null ? "border-slate-200 bg-slate-50 text-slate-400" : detailMargin.status === "healthy" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : detailMargin.status === "warning" ? "border-amber-200 bg-amber-50 text-amber-800" : detailMargin.status === "at_cost" ? "border-blue-200 bg-blue-50 text-blue-800" : "border-red-200 bg-red-50 text-red-700"}`}>{detailMargin?.margin == null ? "-" : `${detailMargin.margin.toFixed(1)}%`}</div>
                </Field>
                {detailItem.fulfilment === "local_purchase" && detailPurchaseInfo?.supplierName ? <p className="text-xs text-slate-500 sm:col-span-2">Preferred supplier: {detailPurchaseInfo.supplierName}</p> : null}
              </div>
            </div>
          </div>
        );
      })() : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          {/* ---------------------------------------------------------
              QUICK SALE V2 - COMPACT PAYMENT
              --------------------------------------------------------- */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <WalletCards className="h-4 w-4 text-amber-600" />
                <h2 className="text-sm font-bold text-slate-950">Payment</h2>
              </div>

              <div className="inline-flex w-fit rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentStatus("paid");
                    setAmountReceived(remainingAfterAdvance);
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    paymentStatus === "paid"
                      ? "bg-slate-950 text-white shadow-sm"
                      : "text-slate-600 hover:bg-white hover:text-slate-950"
                  }`}
                >
                  Paid
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentStatus("partial");

                    if (amountReceived >= remainingAfterAdvance) {
                      setAmountReceived(0);
                    }
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    paymentStatus === "partial"
                      ? "bg-slate-950 text-white shadow-sm"
                      : "text-slate-600 hover:bg-white hover:text-slate-950"
                  }`}
                >
                  Partial
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentStatus("credit");
                    setAmountReceived(0);
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    paymentStatus === "credit"
                      ? "bg-slate-950 text-white shadow-sm"
                      : "text-slate-600 hover:bg-white hover:text-slate-950"
                  }`}
                >
                  Credit
                </button>
              </div>
            </div>

            {paymentStatus !== "credit" ? (
              <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-12">
                <div className="xl:col-span-3">
                  <Field label="Payment Method">
                    <select
                      value={paymentMethod}
                      onChange={(event) => {
                        setPaymentMethod(event.target.value as PaymentMethod);

                        setFinancialAccountId("");
                      }}
                      className={compactInputClass}
                    >
                      <option value="cash">Cash</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="card">Card</option>
                      <option value="cheque">Cheque</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>
                </div>

                {effectiveAmountReceived > 0 ? (
                  <div className="xl:col-span-3">
                    <Field label="Financial Account">
                      <select
                        value={financialAccountId}
                        onChange={(event) =>
                          setFinancialAccountId(event.target.value)
                        }
                        className={compactInputClass}
                      >
                        <option value="">Select account</option>

                        {compatibleFinancialAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.accountName}
                            {" - "}
                            {account.accountCode}
                            {" - "}
                            {account.currencyCode}{" "}
                            {account.currentBalance.toFixed(2)}
                          </option>
                        ))}
                      </select>

                      {compatibleFinancialAccounts.length === 0 ? (
                        <p className="mt-1 text-[11px] font-medium text-red-600">
                          No compatible financial account available.
                        </p>
                      ) : null}
                    </Field>
                  </div>
                ) : null}

                <div className="xl:col-span-2">
                  <Field label="Pay Now">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={
                        paymentStatus === "paid"
                          ? remainingAfterAdvance
                          : amountReceived
                      }
                      onChange={(event) =>
                        setAmountReceived(Number(event.target.value) || 0)
                      }
                      disabled={paymentStatus === "paid"}
                      className={compactInputClass}
                    />
                  </Field>
                </div>

                <div
                  className={
                    paymentMethod === "bank" || paymentMethod === "cheque"
                      ? "xl:col-span-2"
                      : "xl:col-span-4"
                  }
                >
                  <Field label="Payment Reference">
                    <input
                      value={paymentReference}
                      onChange={(event) =>
                        setPaymentReference(event.target.value)
                      }
                      placeholder="Reference"
                      className={compactInputClass}
                    />
                  </Field>
                </div>

                {paymentMethod === "bank" ? (
                  <div className="xl:col-span-2">
                    <Field label="Bank Name">
                      <input
                        value={bankName}
                        onChange={(event) => setBankName(event.target.value)}
                        placeholder="Bank name"
                        className={compactInputClass}
                      />
                    </Field>
                  </div>
                ) : null}

                {paymentMethod === "cheque" ? (
                  <>
                    <div className="xl:col-span-2">
                      <Field label="Cheque Number">
                        <input
                          value={chequeNumber}
                          onChange={(event) =>
                            setChequeNumber(event.target.value)
                          }
                          placeholder="Cheque number"
                          className={compactInputClass}
                        />
                      </Field>
                    </div>

                    <div className="xl:col-span-2">
                      <Field label="Cheque Date">
                        <input
                          type="date"
                          value={chequeDate}
                          onChange={(event) =>
                            setChequeDate(event.target.value)
                          }
                          className={compactInputClass}
                        />
                      </Field>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </section>

          {/* ---------------------------------------------------------
              QUICK SALE V2 - COMPACT DELIVERY
              --------------------------------------------------------- */}
          <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-amber-600" />
                <h2 className="text-sm font-bold text-slate-950">Delivery</h2>
              </div>

              <div className="inline-flex w-fit rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setDeliveryMode("now")}
                  className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${
                    deliveryMode === "now"
                      ? "bg-amber-500 text-slate-950 shadow-sm"
                      : "text-slate-600 hover:bg-white hover:text-slate-950"
                  }`}
                >
                  Deliver Now
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryMode("later")}
                  className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${
                    deliveryMode === "later"
                      ? "bg-amber-500 text-slate-950 shadow-sm"
                      : "text-slate-600 hover:bg-white hover:text-slate-950"
                  }`}
                >
                  Deliver Later
                </button>
              </div>
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm xl:sticky xl:top-20">
          <div className="flex items-center gap-3">
            <Calculator className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-bold">Totals</h2>
          </div>

          <div className="mt-4 space-y-3 text-sm">
            <SummaryRow label="Subtotal" value={subtotal} />

            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-4">
                <label
                  htmlFor="quick-sale-invoice-discount"
                  className="text-xs font-medium text-slate-600"
                >
                  Invoice Discount
                </label>

                <div className="relative w-32">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-500">
                    AED
                  </span>

                  <input
                    id="quick-sale-invoice-discount"
                    type="number"
                    min={0}
                    max={subtotal}
                    step="0.01"
                    value={invoiceDiscountAmount}
                    onChange={(event) =>
                      setInvoiceDiscountAmount(
                        Math.max(
                          Number(event.target.value) || 0,
                          0,
                        ),
                      )
                    }
                    className="h-8 w-full rounded-md border border-slate-300 bg-white pl-10 pr-2 text-right text-xs font-semibold tabular-nums text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-slate-500">
                  Taxable Merchandise
                </span>

                <span className="text-xs font-semibold tabular-nums text-slate-800">
                  AED {merchandiseAfterInvoiceDiscount.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <label
                  htmlFor="quick-sale-delivery-charge"
                  className="text-xs font-medium text-slate-600"
                >
                  Delivery Charges
                </label>

                <div className="relative w-32">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-500">
                    AED
                  </span>

                  <input
                    id="quick-sale-delivery-charge"
                    type="number"
                    min={0}
                    step="0.01"
                    value={deliveryCharge}
                    onChange={(event) =>
                      setDeliveryCharge(
                        Math.max(
                          Number(event.target.value) || 0,
                          0,
                        ),
                      )
                    }
                    className="h-8 w-full rounded-md border border-slate-300 bg-white pl-10 pr-2 text-right text-xs font-semibold tabular-nums text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <label
                  htmlFor="quick-sale-round-off"
                  className="text-xs font-medium text-slate-600"
                >
                  Round Off
                </label>

                <div className="relative w-32">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-500">
                    AED
                  </span>

                  <input
                    id="quick-sale-round-off"
                    type="number"
                    min={-10}
                    max={10}
                    step="0.01"
                    value={roundOffAmount}
                    onChange={(event) =>
                      setRoundOffAmount(
                        Number(event.target.value) || 0,
                      )
                    }
                    className="h-8 w-full rounded-md border border-slate-300 bg-white pl-10 pr-2 text-right text-xs font-semibold tabular-nums text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  />
                </div>
              </div>
            </div>

            {effectiveInvoiceDiscount > 0 ? (
              <SummaryRow
                label="Invoice Discount"
                value={-effectiveInvoiceDiscount}
              />
            ) : null}

            <SummaryRow
              label={`VAT (${vatRate}%)`}
              value={vatAmount}
            />

            {deliveryCharge > 0 ? (
              <SummaryRow
                label="Delivery Charges"
                value={deliveryCharge}
              />
            ) : null}

            {roundOffAmount !== 0 ? (
              <SummaryRow
                label="Round Off"
                value={roundOffAmount}
              />
            ) : null}

            <div className="border-t border-slate-200 pt-3">
              <SummaryRow
                label="Grand Total"
                value={grandTotal}
                strong
              />
            </div>
            <details className="border-t border-slate-200 pt-3">
              <summary className="cursor-pointer select-none text-xs font-semibold text-slate-500 hover:text-slate-900">
                Advanced Details
              </summary>

              <div className="mt-3 space-y-2">
                <SummaryRow
                  label="Estimated Cost"
                  value={marginAnalysis.estimatedCost}
                />

                <SummaryRow
                  label="Estimated Gross Profit"
                  value={marginAnalysis.estimatedGrossProfit}
                />

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Estimated Margin</span>

                  <span
                    className={
                      marginAnalysis.estimatedMargin < 0
                        ? "font-bold text-red-600"
                        : "font-bold text-slate-900"
                    }
                  >
                    {marginAnalysis.estimatedMargin.toFixed(2)}%
                  </span>
                </div>

                {marginAnalysis.lowestMargin !== null ? (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Lowest Line Margin</span>
                    <span className="font-semibold text-slate-700">
                      {marginAnalysis.lowestMargin.toFixed(2)}%
                    </span>
                  </div>
                ) : null}
              </div>
            </details>

            {isLoadingAdvance ? (
              <div className="flex items-center justify-between text-slate-400">
                <span>Customer Advance</span>

                <span>Loading...</span>
              </div>
            ) : null}

            {!isLoadingAdvance && customerAdvance > 0 ? (
              <>
                <SummaryRow
                  label="Available Customer Advance"
                  value={customerAdvance}
                />

                <SummaryRow label="Advance Applied" value={advanceToApply} />
              </>
            ) : null}

            <SummaryRow label="Pay Now" value={effectiveAmountReceived} />

            <SummaryRow label="Total Settled" value={totalSettled} />

            <SummaryRow label="Outstanding" value={outstanding} strong />
          </div>



          {marginAnalysis.requiresApproval ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="font-bold text-red-800">Admin Approval Required</p>

              <p className="mt-1 text-xs leading-5 text-red-700">
                One or more items are below the configured minimum margin or
                require cost review.
                {marginAnalysis.lowestMargin !== null
                  ? ` Lowest margin: ${marginAnalysis.lowestMargin.toFixed(
                      2,
                    )}%.`
                  : ""}
              </p>

              <select
                value={marginApprovalReason}
                onChange={(event) =>
                  setMarginApprovalReason(event.target.value)
                }
                className="mt-3 h-9 w-full rounded-lg border border-red-300 bg-white px-3 text-sm text-slate-900"
              >
                <option value="">Select approval reason</option>

                <option value="Customer retention">Customer retention</option>

                <option value="Strategic order">Strategic order</option>

                <option value="Clearance / old stock">
                  Clearance / old stock
                </option>

                <option value="Large volume deal">Large volume deal</option>

                <option value="Market competition">Market competition</option>

                <option value="Management decision">Management decision</option>
              </select>
            </div>
          ) : marginAnalysis.hasAtCost ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
              At-cost sale detected. No gross profit will be earned on at least
              one line.
            </div>
          ) : marginAnalysis.hasWarning ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Low-margin sale detected. Confirmation is allowed.
            </div>
          ) : null}

          <button
            type="button"
            disabled={isPosting || isLoadingAdvance}
            onClick={handleCompleteSale}
            className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 text-sm font-bold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Zap className="h-5 w-5" />
            {isLoadingAdvance
              ? "Loading Customer Advance..."
              : isPosting
                ? "Completing Sale..."
                : "Complete Sale"}{" "}
          </button>
        </aside>
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
        <Icon className="h-5 w-5 text-slate-700" />
      </div>

      <div>
        <h2 className="font-bold text-slate-950">{title}</h2>

        <p className="mt-1 text-sm text-slate-500">{description}</p>
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
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-slate-600">
        {label}

        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </span>

      {children}
    </label>
  );
}

function TaxCard({
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
      <p className="font-bold text-slate-900">{title}</p>

      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
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
    <div
      className={[
        "flex items-center justify-between gap-4",
        strong ? "text-base font-bold" : "",
      ].join(" ")}
    >
      <span className={strong ? "text-slate-900" : "text-slate-500"}>
        {label}
      </span>

      <span className={strong ? "text-slate-950" : "text-slate-800"}>
        AED {value.toFixed(2)}
      </span>
    </div>
  );
}
function MarginInfo({
  label,
  value,
  negative = false,
}: {
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>

      <p
        className={`mt-2 font-bold ${
          negative ? "text-red-700" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
function PurchaseReference({
  purchaseInfo,
}: {
  purchaseInfo: QuickSaleOptions["purchaseInfo"][number] | null;
}) {
  if (!purchaseInfo) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3">
        <p className="text-sm font-semibold text-slate-800">
          Supplier Purchase Reference
        </p>

        <p className="mt-2 text-xs text-slate-500">
          No supplier purchase price recorded for this product.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-blue-950">
          Supplier Purchase Reference
        </p>

        {purchaseInfo.isPreferred ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
            Preferred
          </span>
        ) : null}
      </div>

      <p className="mt-2 text-sm font-medium text-blue-900">
        {purchaseInfo.supplierName ?? "Supplier"}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-blue-700">Last Purchase</p>

          <p className="mt-1 font-bold text-blue-950">
            {purchaseInfo.lastPurchasePrice !== null
              ? `${purchaseInfo.currencyCode} ${purchaseInfo.lastPurchasePrice.toFixed(2)}`
              : "-"}
          </p>
        </div>

        <div>
          <p className="text-blue-700">Current Cost</p>

          <p className="mt-1 font-bold text-blue-950">
            {purchaseInfo.costPrice !== null
              ? `${purchaseInfo.currencyCode} ${purchaseInfo.costPrice.toFixed(2)}`
              : "-"}
          </p>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100";

const compactInputClass =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100";




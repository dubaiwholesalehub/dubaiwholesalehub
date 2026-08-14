"use client";

import { useMemo, useState, useTransition } from "react";

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

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { completeQuickSale } from "@/app/admin/(protected)/sales/quick-sale/actions";

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

  const [warehouseId, setWarehouseId] = useState(defaultWarehouse);

  const [taxTreatment, setTaxTreatment] = useState<TaxTreatment>("local_5");

  const [destinationCountryId, setDestinationCountryId] = useState("");

  const [cargoCompany, setCargoCompany] = useState("");

  const [cargoReference, setCargoReference] = useState("");

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("paid");

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");

  const [amountReceived, setAmountReceived] = useState(0);

  const [paymentReference, setPaymentReference] = useState("");

  const [bankName, setBankName] = useState("");

  const [chequeNumber, setChequeNumber] = useState("");

  const [chequeDate, setChequeDate] = useState("");

  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("now");

  const [items, setItems] = useState<QuickSaleItem[]>([createEmptyItem()]);

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

  const vatRate = taxTreatment === "local_5" ? 5 : 0;

  const vatAmount = subtotal * (vatRate / 100);

  const grandTotal = subtotal + vatAmount;

  const effectiveAmountReceived =
    paymentStatus === "paid"
      ? grandTotal
      : paymentStatus === "credit"
        ? 0
        : amountReceived;

  const outstanding = Math.max(grandTotal - effectiveAmountReceived, 0);

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

  function addItem() {
    setItems((current) => [...current, createEmptyItem()]);
  }

  function removeItem(id: string) {
    setItems((current) => {
      if (current.length === 1) {
        return [createEmptyItem()];
      }

      return current.filter((item) => item.id !== id);
    });
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
      paymentStatus === "paid" &&
      Math.abs(amountReceived - grandTotal) > 0.01
    ) {
      toast.error("Paid Now must equal the invoice grand total.");

      return;
    }

    if (
      paymentStatus === "partial" &&
      (amountReceived <= 0 || amountReceived >= grandTotal)
    ) {
      toast.error(
        "Partial payment must be greater than zero and less than the invoice total.",
      );

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
    startPosting(async () => {
      const result = await completeQuickSale({
        customerId,
        warehouseId,
        saleDate,

        taxTreatment,

        destinationCountryId: destinationCountryId || undefined,

        cargoCompany: cargoCompany || undefined,

        cargoReference: cargoReference || undefined,

        paymentStatus,

        paymentMethod,

        amountReceived: effectiveAmountReceived,

        paymentReference: paymentReference || undefined,

        bankName: bankName || undefined,

        chequeNumber: chequeNumber || undefined,

        chequeDate: chequeDate || undefined,

        deliveryMode,

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
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <SectionHeader
          icon={ReceiptText}
          title="Sale Information"
          description="Choose customer, warehouse and sale date."
        />

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <Field label="Customer">
            <select
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              className={inputClass}
            >
              <option value="">Select customer</option>

              {options.customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.displayName}
                  {customer.customerNumber
                    ? ` — ${customer.customerNumber}`
                    : ""}
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
                  {warehouse.code} — {warehouse.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Sale Date">
            <input
              type="date"
              value={saleDate}
              onChange={(event) => setSaleDate(event.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <SectionHeader
          icon={Globe2}
          title="Tax / Export Treatment"
          description="Choose the legal VAT treatment for this sale."
        />

        <div className="mt-6 grid gap-3 lg:grid-cols-4">
          <TaxCard
            active={taxTreatment === "local_5"}
            title="UAE Local"
            subtitle="5% VAT"
            onClick={() => setTaxTreatment("local_5")}
          />

          <TaxCard
            active={taxTreatment === "export_verified"}
            title="Export"
            subtitle="Evidence Available · 0%"
            onClick={() => setTaxTreatment("export_verified")}
          />

          <TaxCard
            active={taxTreatment === "export_pending"}
            title="Export"
            subtitle="Evidence Pending"
            onClick={() => setTaxTreatment("export_pending")}
          />

          <TaxCard
            active={taxTreatment === "review"}
            title="Other"
            subtitle="Review Required"
            onClick={() => setTaxTreatment("review")}
          />
        </div>

        {isExport ? (
          <div className="mt-6 grid gap-4 rounded-2xl border border-blue-200 bg-blue-50 p-5 lg:grid-cols-3">
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

            {taxTreatment === "export_pending" ? (
              <div className="lg:col-span-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                Export evidence is currently pending. The final posting engine
                will flag this transaction for follow-up instead of silently
                treating it as a verified export.
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">
          <SectionHeader
            icon={PackagePlus}
            title="Sale Items"
            description="Mix warehouse stock and local purchases in one sale."
          />

          <button
            type="button"
            onClick={addItem}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-amber-600"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        </div>

        <div className="space-y-4 p-6">
          {items.map((item, index) => {
            const product = getProduct(item.productId);

            const stock = getStock(item.productId);
            const purchaseInfo = getPurchaseInfo(item.productId);
            const lineTotal = item.quantity * item.sellingPrice;

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="mb-4 flex items-center justify-between">
                  <p className="font-bold text-slate-900">Item {index + 1}</p>

                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-4 xl:grid-cols-12">
                  <div className="xl:col-span-4">
                    <Field label="Product">
                      <select
                        value={item.productId}
                        onChange={(event) => {
                          const selectedProduct = getProduct(
                            event.target.value,
                          );
                          const selectedPurchaseInfo = getPurchaseInfo(
                            event.target.value,
                          );
                          const nextFulfilment =
                            selectedProduct?.defaultFulfilmentMethod ===
                            "local_purchase"
                              ? "local_purchase"
                              : "stock";

                          updateItem(item.id, {
                            productId: event.target.value,

                            fulfilment: nextFulfilment,

                            supplierId:
                              nextFulfilment === "local_purchase"
                                ? (selectedPurchaseInfo?.supplierId ?? "")
                                : "",

                            purchaseCost:
                              nextFulfilment === "local_purchase"
                                ? (selectedPurchaseInfo?.suggestedPurchasePrice ??
                                  0)
                                : 0,
                          });
                        }}
                        className={inputClass}
                      >
                        <option value="">Select product</option>

                        {options.products.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                            {option.sku ? ` — ${option.sku}` : ""}
                          </option>
                        ))}
                      </select>
                    </Field>

                    {product ? (
                      <p className="mt-2 text-xs text-slate-500">
                        Unit:{" "}
                        {product.unitShortName ?? product.unitName ?? "PCS"}
                      </p>
                    ) : null}
                  </div>

                  <div className="xl:col-span-1">
                    <Field label="Qty">
                      <input
                        type="number"
                        min={1}
                        step="1"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(item.id, {
                            quantity: Math.max(
                              Number(event.target.value) || 1,
                              1,
                            ),
                          })
                        }
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <div className="xl:col-span-2">
                    <Field label="Fulfilment">
                      <select
                        value={item.fulfilment}
                        onChange={(event) => {
                          const nextFulfilment = event.target
                            .value as ItemFulfilment;

                          updateItem(item.id, {
                            fulfilment: nextFulfilment,

                            supplierId:
                              nextFulfilment === "local_purchase"
                                ? item.supplierId ||
                                  purchaseInfo?.supplierId ||
                                  ""
                                : item.supplierId,

                            purchaseCost:
                              nextFulfilment === "local_purchase"
                                ? item.purchaseCost ||
                                  purchaseInfo?.suggestedPurchasePrice ||
                                  0
                                : item.purchaseCost,
                          });
                        }}
                        className={inputClass}
                      >
                        <option value="stock">From Stock</option>

                        <option value="local_purchase">Local Purchase</option>
                      </select>
                    </Field>
                  </div>

                  <div className="xl:col-span-2">
                    <Field label="Purchase Cost">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={
                          item.fulfilment === "stock"
                            ? (stock?.averageUnitCost ?? 0)
                            : item.purchaseCost
                        }
                        readOnly={item.fulfilment === "stock"}
                        onChange={(event) =>
                          updateItem(item.id, {
                            purchaseCost: Number(event.target.value) || 0,
                          })
                        }
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <div className="xl:col-span-2">
                    <Field label="Selling Price">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.sellingPrice}
                        onChange={(event) =>
                          updateItem(item.id, {
                            sellingPrice: Number(event.target.value) || 0,
                          })
                        }
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <div className="xl:col-span-1">
                    <Field label="Total">
                      <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900">
                        {lineTotal.toFixed(2)}
                      </div>
                    </Field>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  {item.fulfilment === "stock" ? (
                    <div className="grid gap-4 lg:col-span-3 lg:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                        <p className="font-semibold text-slate-900">
                          Warehouse Stock
                        </p>

                        <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600">
                          <span>
                            On Hand:{" "}
                            <strong>{stock?.quantityOnHand ?? 0}</strong>
                          </span>

                          <span>
                            Reserved:{" "}
                            <strong>{stock?.quantityReserved ?? 0}</strong>
                          </span>

                          <span>
                            Available:{" "}
                            <strong
                              className={
                                (stock?.quantityAvailable ?? 0) < item.quantity
                                  ? "text-red-600"
                                  : "text-emerald-700"
                              }
                            >
                              {stock?.quantityAvailable ?? 0}
                            </strong>
                          </span>
                        </div>

                        <p className="mt-3 text-xs text-slate-500">
                          Average Stock Cost:{" "}
                          <strong className="text-slate-800">
                            AED {(stock?.averageUnitCost ?? 0).toFixed(2)}
                          </strong>
                        </p>
                      </div>

                      <PurchaseReference purchaseInfo={purchaseInfo} />
                    </div>
                  ) : (
                    <>
                      <div className="lg:col-span-2">
                        <Field label="Purchase Supplier">
                          <select
                            value={item.supplierId}
                            onChange={(event) =>
                              updateItem(item.id, {
                                supplierId: event.target.value,
                              })
                            }
                            className={inputClass}
                          >
                            <option value="">Supplier / Shop optional</option>

                            {options.suppliers.map((supplier) => (
                              <option key={supplier.id} value={supplier.id}>
                                {supplier.companyName}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>

                      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                        This item will be received through the existing Local
                        Purchase inventory engine before sale fulfilment.
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <SectionHeader
              icon={WalletCards}
              title="Payment"
              description="Record how much the customer paid now."
            />

            <div className="mt-6 space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <TaxCard
                  active={paymentStatus === "paid"}
                  title="Paid Now"
                  subtitle="Customer pays the full invoice now"
                  onClick={() => {
                    setPaymentStatus("paid");
                    setAmountReceived(grandTotal);
                  }}
                />

                <TaxCard
                  active={paymentStatus === "partial"}
                  title="Partial Payment"
                  subtitle="Customer pays part of the invoice"
                  onClick={() => {
                    setPaymentStatus("partial");

                    if (amountReceived >= grandTotal) {
                      setAmountReceived(0);
                    }
                  }}
                />

                <TaxCard
                  active={paymentStatus === "credit"}
                  title="Credit"
                  subtitle="Nothing received now"
                  onClick={() => {
                    setPaymentStatus("credit");
                    setAmountReceived(0);
                  }}
                />
              </div>

              {paymentStatus !== "credit" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Payment Method">
                    <select
                      value={paymentMethod}
                      onChange={(event) =>
                        setPaymentMethod(event.target.value as PaymentMethod)
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

                  <Field label="Amount Received">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={amountReceived}
                      onChange={(event) =>
                        setAmountReceived(Number(event.target.value) || 0)
                      }
                      disabled={paymentStatus === "paid"}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Payment Reference">
                    <input
                      value={paymentReference}
                      onChange={(event) =>
                        setPaymentReference(event.target.value)
                      }
                      placeholder="Transfer / POS / receipt reference"
                      className={inputClass}
                    />
                  </Field>

                  {paymentMethod === "bank" ? (
                    <Field label="Bank Name">
                      <input
                        value={bankName}
                        onChange={(event) => setBankName(event.target.value)}
                        placeholder="Bank name"
                        className={inputClass}
                      />
                    </Field>
                  ) : null}

                  {paymentMethod === "cheque" ? (
                    <>
                      <Field label="Cheque Number">
                        <input
                          value={chequeNumber}
                          onChange={(event) =>
                            setChequeNumber(event.target.value)
                          }
                          placeholder="Cheque number"
                          className={inputClass}
                        />
                      </Field>

                      <Field label="Cheque Date">
                        <input
                          type="date"
                          value={chequeDate}
                          onChange={(event) =>
                            setChequeDate(event.target.value)
                          }
                          className={inputClass}
                        />
                      </Field>
                    </>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Credit sale — no customer receipt will be created now. The
                  full invoice amount will remain outstanding.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <SectionHeader
              icon={Truck}
              title="Delivery"
              description="Complete delivery immediately or keep it pending."
            />

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <TaxCard
                active={deliveryMode === "now"}
                title="Deliver Now"
                subtitle="Complete fulfilment immediately"
                onClick={() => setDeliveryMode("now")}
              />

              <TaxCard
                active={deliveryMode === "later"}
                title="Deliver Later"
                subtitle="Create pending delivery"
                onClick={() => setDeliveryMode("later")}
              />
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-2xl bg-slate-950 p-6 text-white shadow-lg xl:sticky xl:top-24">
          <div className="flex items-center gap-3">
            <Calculator className="h-5 w-5 text-amber-400" />

            <h2 className="text-lg font-bold">Sale Summary</h2>
          </div>

          <div className="mt-6 space-y-4 text-sm">
            <SummaryRow label="Subtotal" value={subtotal} />

            <SummaryRow label={`VAT (${vatRate}%)`} value={vatAmount} />

            <div className="border-t border-slate-700 pt-4">
              <SummaryRow label="Grand Total" value={grandTotal} strong />
            </div>

            <SummaryRow label="Received" value={effectiveAmountReceived} />

            <SummaryRow label="Outstanding" value={outstanding} strong />
          </div>

          <div className="mt-6 rounded-xl bg-slate-900 p-4 text-xs leading-5 text-slate-300">
            Completing this sale will create the Sales Order, process inventory
            and delivery, and record any customer payment as a posted receipt.
          </div>

          <button
            type="button"
            disabled={isPosting}
            onClick={handleCompleteSale}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 font-bold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Zap className="h-5 w-5" />

            {isPosting ? "Completing Sale..." : "Complete Sale"}
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
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-slate-700">
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
      <span className="text-slate-300">{label}</span>

      <span>AED {value.toFixed(2)}</span>
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
              : "—"}
          </p>
        </div>

        <div>
          <p className="text-blue-700">Current Cost</p>

          <p className="mt-1 font-bold text-blue-950">
            {purchaseInfo.costPrice !== null
              ? `${purchaseInfo.currencyCode} ${purchaseInfo.costPrice.toFixed(2)}`
              : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100";

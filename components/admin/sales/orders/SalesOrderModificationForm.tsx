"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Eye,
  Loader2,
  PackageOpen,
  Plus,
  ReceiptText,
  RotateCcw,
  Save,
  Trash2,
  Undo2,
} from "lucide-react";

import SmartProductPicker from "@/components/admin/shared/SmartProductPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  applySalesOrderModificationAction,
  previewSalesOrderModificationAction,
  type SalesOrderModificationRequest,
  type SalesOrderModificationSnapshot,
  type SalesOrderModificationType,
} from "@/app/admin/(protected)/sales/orders/[id]/modify/actions";

import type { SalesOrderWarehouse } from "@/lib/repositories/sales-order.repository";
import type {
  SalesQuotationItemProductOption,
  SalesQuotationItemUnitOption,
} from "@/lib/repositories/sales-quotation.repository";

interface ModificationItem {
  id: string | null;
  lineNumber: number;
  productId: string | null;
  unitId: string | null;
  warehouseId: string | null;
  sku: string | null;
  itemName: string;
  description: string | null;
  quantity: number;
  quantityFulfilled: number;
  unitPrice: number;
  discountPercentage: number;
  taxPercentage: number;
  fulfilmentMethod: string;
  lineNotes: string | null;
}

interface SalesOrderModificationFormProps {
  order: {
    id: string;
    orderNumber: string;
    currencyCode: string;
    status: string;
    fulfilmentStatus: string;
    paymentStatus: string;
    customerName: string;
    defaultWarehouseId: string | null;
    subtotal: number;
    itemDiscountAmount: number;
    invoiceDiscountAmount: number;
    taxAmount: number;
    shippingAmount: number;
    roundOffAmount: number;
    grandTotal: number;
    paidAmount: number;
    balanceDue: number;
    customerNotes: string | null;
    internalNotes: string | null;
    items: ModificationItem[];
  };
  products: SalesQuotationItemProductOption[];
  units: SalesQuotationItemUnitOption[];
  warehouses: SalesOrderWarehouse[];
  stock: SalesOrderStockOption[];
  marginPolicy: SalesOrderMarginPolicy;
}

interface SalesOrderStockOption {
  warehouseId: string;
  productId: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  averageUnitCost: number;
}

interface SalesOrderMarginPolicy {
  warningMarginPercentage: number;
  minimumMarginPercentage: number;
}

type EditableItem = ModificationItem & {
  clientKey: string;
  isRemoved: boolean;
  isNew: boolean;
  quantityInput: string;
  unitPriceInput: string;
  discountInput: string;
  taxInput: string;
};

type JsonObject = Record<string, unknown>;

function toNumber(value: string): number {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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

function formatLabel(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function asObject(value: unknown): JsonObject | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as JsonObject;
  }

  return null;
}

function numberFrom(object: JsonObject | null, keys: string[]): number | null {
  if (!object) {
    return null;
  }

  for (const key of keys) {
    const value = object[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (
      typeof value === "string" &&
      value.trim() !== "" &&
      Number.isFinite(Number(value))
    ) {
      return Number(value);
    }
  }

  return null;
}

function arrayFrom(object: JsonObject | null, keys: string[]): unknown[] {
  if (!object) {
    return [];
  }

  for (const key of keys) {
    const value = object[key];

    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

export default function SalesOrderModificationForm({
  order,
  products,
  units,
  warehouses,
  stock,
  marginPolicy,
}: SalesOrderModificationFormProps) {
  const [modificationType, setModificationType] =
    useState<SalesOrderModificationType>("entry_correction");

  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const [invoiceDiscountInput, setInvoiceDiscountInput] = useState(
    String(order.invoiceDiscountAmount),
  );

  const [shippingInput, setShippingInput] = useState(
    String(order.shippingAmount),
  );

  const [roundOffInput, setRoundOffInput] = useState(
    String(order.roundOffAmount),
  );

  const [customerNotes, setCustomerNotes] = useState(order.customerNotes ?? "");

  const [internalNotes, setInternalNotes] = useState(order.internalNotes ?? "");

  const [items, setItems] = useState<EditableItem[]>(
    order.items.map((item) => ({
      ...item,
      clientKey: item.id ?? crypto.randomUUID(),
      isRemoved: false,
      isNew: false,
      quantityInput: String(item.quantity),
      unitPriceInput: String(item.unitPrice),
      discountInput: String(item.discountPercentage),
      taxInput: String(item.taxPercentage),
    })),
  );

  const [selectedProductId, setSelectedProductId] = useState("");
  const [newWarehouseId, setNewWarehouseId] = useState(
    order.defaultWarehouseId ?? "",
  );
  const [newQuantity, setNewQuantity] = useState("1");
  const [newUnitPrice, setNewUnitPrice] = useState("0");
  const [newDiscount, setNewDiscount] = useState("0");
  const [newTax, setNewTax] = useState("5");

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  const selectedUnit = useMemo(
    () => units.find((unit) => unit.id === selectedProduct?.unit_id) ?? null,
    [units, selectedProduct],
  );

  const effectiveNewWarehouseId =
    newWarehouseId || order.defaultWarehouseId || "";

  const selectedStock = useMemo(
    () =>
      stock.find(
        (row) =>
          row.productId === selectedProductId &&
          row.warehouseId === effectiveNewWarehouseId,
      ) ?? null,
    [stock, selectedProductId, effectiveNewWarehouseId],
  );

  const newLinePreview = useMemo(() => {
    const quantity = Math.max(toNumber(newQuantity), 0);
    const unitPrice = Math.max(toNumber(newUnitPrice), 0);
    const discountPercentage = Math.min(
      Math.max(toNumber(newDiscount), 0),
      100,
    );
    const taxPercentage = Math.max(toNumber(newTax), 0);
    const gross = quantity * unitPrice;
    const discountAmount = gross * (discountPercentage / 100);
    const revenue = gross - discountAmount;
    const taxAmount = revenue * (taxPercentage / 100);
    const unitCost = selectedStock?.averageUnitCost ?? 0;
    const totalCost = quantity * unitCost;
    const profit = revenue - totalCost;
    const marginPercentage = revenue > 0 ? (profit / revenue) * 100 : 0;
    const availableQuantity = selectedStock?.quantityAvailable ?? 0;
    const stockShortage =
      selectedProduct?.fulfilment_method === "stock" &&
      quantity > availableQuantity;

    let marginStatus: "healthy" | "warning" | "approval_required" = "healthy";
    if (marginPercentage < marginPolicy.minimumMarginPercentage) {
      marginStatus = "approval_required";
    } else if (marginPercentage < marginPolicy.warningMarginPercentage) {
      marginStatus = "warning";
    }

    return {
      total: revenue + taxAmount,
      unitCost,
      profit,
      marginPercentage,
      availableQuantity,
      stockShortage,
      marginStatus,
    };
  }, [
    newQuantity,
    newUnitPrice,
    newDiscount,
    newTax,
    selectedStock,
    selectedProduct,
    marginPolicy,
  ]);

  const [preview, setPreview] = useState<unknown>(null);

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const calculated = useMemo(() => {
    const lines = items.filter((item) => !item.isRemoved).map((item) => {
      const quantity = Math.max(toNumber(item.quantityInput), 0);

      const unitPrice = Math.max(toNumber(item.unitPriceInput), 0);

      const discountPercentage = Math.min(
        Math.max(toNumber(item.discountInput), 0),
        100,
      );

      const taxPercentage = Math.max(toNumber(item.taxInput), 0);

      const gross = quantity * unitPrice;

      const discount = gross * (discountPercentage / 100);

      const net = gross - discount;

      return {
        gross,
        discount,
        net,
        taxPercentage,
      };
    });

    const grossSubtotal = lines.reduce((sum, line) => sum + line.gross, 0);

    const itemDiscount = lines.reduce((sum, line) => sum + line.discount, 0);

    const netItemAmount = lines.reduce((sum, line) => sum + line.net, 0);

    const invoiceDiscount = Math.max(toNumber(invoiceDiscountInput), 0);

    const effectiveInvoiceDiscount = Math.min(invoiceDiscount, netItemAmount);

    let taxAmount = 0;

    lines.forEach((line) => {
      const allocation =
        netItemAmount > 0
          ? effectiveInvoiceDiscount * (line.net / netItemAmount)
          : 0;

      const taxableBase = Math.max(line.net - allocation, 0);

      taxAmount += roundCurrency(taxableBase * (line.taxPercentage / 100));
    });

    taxAmount = roundCurrency(taxAmount);

    const shippingAmount = Math.max(toNumber(shippingInput), 0);

    const roundOffAmount = toNumber(roundOffInput);

    const grandTotal = Math.max(
      roundCurrency(
        netItemAmount -
          effectiveInvoiceDiscount +
          taxAmount +
          shippingAmount +
          roundOffAmount,
      ),
      0,
    );

    const balanceDue = Math.max(
      roundCurrency(grandTotal - order.paidAmount),
      0,
    );

    const customerCredit = Math.max(
      roundCurrency(order.paidAmount - grandTotal),
      0,
    );

    return {
      grossSubtotal: roundCurrency(grossSubtotal),
      itemDiscount: roundCurrency(itemDiscount),
      netItemAmount: roundCurrency(netItemAmount),
      invoiceDiscount: roundCurrency(effectiveInvoiceDiscount),
      taxAmount,
      shippingAmount: roundCurrency(shippingAmount),
      roundOffAmount: roundCurrency(roundOffAmount),
      grandTotal,
      balanceDue,
      customerCredit,
      difference: roundCurrency(grandTotal - order.grandTotal),
    };
  }, [
    invoiceDiscountInput,
    items,
    order.grandTotal,
    order.paidAmount,
    roundOffInput,
    shippingInput,
  ]);

  function updateItem(
    itemId: string,
    field: "quantityInput" | "unitPriceInput" | "discountInput" | "taxInput",
    value: string,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.clientKey === itemId
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );

    setPreview(null);
    setSuccess(null);
  }

  function resetNewItemEntry() {
    setSelectedProductId("");
    setNewWarehouseId(order.defaultWarehouseId ?? "");
    setNewQuantity("1");
    setNewUnitPrice("0");
    setNewDiscount("0");
    setNewTax("5");
  }

  function handleAddProduct() {
    if (modificationType !== "entry_correction") {
      setError("Adding a product to a posted sale requires Entry Correction.");
      return;
    }

    if (!selectedProduct) {
      setError("Please select a product to add.");
      return;
    }

    const quantity = toNumber(newQuantity);
    const unitPrice = toNumber(newUnitPrice);
    const discount = toNumber(newDiscount);
    const tax = toNumber(newTax);

    if (quantity <= 0) {
      setError("New product quantity must be greater than zero.");
      return;
    }

    if (unitPrice < 0) {
      setError("New product selling price cannot be negative.");
      return;
    }

    if (discount < 0 || discount > 100) {
      setError("New product discount must be between 0% and 100%.");
      return;
    }

    if (tax < 0 || tax > 100) {
      setError("New product VAT must be between 0% and 100%.");
      return;
    }

    if (selectedProduct.fulfilment_method === "stock" && !effectiveNewWarehouseId) {
      setError("Please select a warehouse for this stock product.");
      return;
    }

    if (newLinePreview.stockShortage) {
      setError(
        `Insufficient stock. Available: ${formatQuantity(
          newLinePreview.availableQuantity,
        )}.`,
      );
      return;
    }

    const clientKey = crypto.randomUUID();

    setItems((current) => [
      ...current,
      {
        id: null,
        clientKey,
        isRemoved: false,
        isNew: true,
        lineNumber: current.length + 1,
        productId: selectedProduct.id,
        unitId: selectedProduct.unit_id,
        warehouseId: effectiveNewWarehouseId || null,
        sku: selectedProduct.sku,
        itemName: selectedProduct.name,
        description: selectedProduct.short_description,
        quantity,
        quantityFulfilled: 0,
        unitPrice,
        discountPercentage: discount,
        taxPercentage: tax,
        fulfilmentMethod: selectedProduct.fulfilment_method,
        lineNotes: null,
        quantityInput: String(quantity),
        unitPriceInput: String(unitPrice),
        discountInput: String(discount),
        taxInput: String(tax),
      },
    ]);

    resetNewItemEntry();
    setPreview(null);
    setSuccess(null);
    setError(null);
  }

  function handleRemoveItem(clientKey: string) {
    if (modificationType !== "entry_correction") {
      setError("Adding or removing products requires Entry Correction.");
      return;
    }

    setItems((current) =>
      current
        .map((item) =>
          item.clientKey === clientKey
            ? item.isNew
              ? null
              : { ...item, isRemoved: true }
            : item,
        )
        .filter((item): item is EditableItem => item !== null),
    );

    setPreview(null);
    setSuccess(null);
    setError(null);
  }

  function handleRestoreItem(clientKey: string) {
    setItems((current) =>
      current.map((item) =>
        item.clientKey === clientKey ? { ...item, isRemoved: false } : item,
      ),
    );
    setPreview(null);
    setSuccess(null);
    setError(null);
  }

  function buildSnapshot(): SalesOrderModificationSnapshot {
    return {
      header: {
        invoice_discount_amount: Math.max(toNumber(invoiceDiscountInput), 0),

        shipping_amount: Math.max(toNumber(shippingInput), 0),

        round_off_amount: toNumber(roundOffInput),

        customer_notes: customerNotes.trim() || null,

        internal_notes: internalNotes.trim() || null,
      },

      items: items.filter((item) => !item.isRemoved).map((item) => ({
        id: item.id,
        product_id: item.productId,
        unit_id: item.unitId,
        warehouse_id: item.warehouseId,
        sku: item.sku,
        item_name: item.itemName,
        description: item.description,

        quantity: toNumber(item.quantityInput),

        unit_price: toNumber(item.unitPriceInput),

        discount_percentage: toNumber(item.discountInput),

        tax_percentage: toNumber(item.taxInput),

        fulfilment_method: item.fulfilmentMethod,

        line_notes: item.lineNotes,
      })),
    };
  }

  function validate(): string | null {
    if (reason.trim().length < 3) {
      return "Please enter a clear modification reason.";
    }

    const invoiceDiscount = toNumber(invoiceDiscountInput);

    if (invoiceDiscount < 0) {
      return "Invoice discount cannot be negative.";
    }

    if (invoiceDiscount > calculated.netItemAmount) {
      return "Invoice discount cannot exceed the merchandise amount after item discounts.";
    }

    if (toNumber(shippingInput) < 0) {
      return "Delivery charges cannot be negative.";
    }

    const roundOff = toNumber(roundOffInput);

    if (roundOff < -10 || roundOff > 10) {
      return "Round Off must be between -10 and +10.";
    }

    const hasLineStructureChange = items.some(
      (item) => item.isNew || item.isRemoved,
    );

    if (hasLineStructureChange && modificationType !== "entry_correction") {
      return "Adding or removing products from a posted sale requires Entry Correction.";
    }

    const activeItems = items.filter((item) => !item.isRemoved);

    if (activeItems.length === 0) {
      return "The revised sales order must contain at least one product.";
    }

    for (const item of activeItems) {
      const quantity = toNumber(item.quantityInput);

      const unitPrice = toNumber(item.unitPriceInput);

      const discount = toNumber(item.discountInput);

      const tax = toNumber(item.taxInput);

      if (quantity <= 0) {
        return `${item.itemName}: quantity must be greater than zero.`;
      }

      if (unitPrice < 0) {
        return `${item.itemName}: selling price cannot be negative.`;
      }

      if (discount < 0 || discount > 100) {
        return `${item.itemName}: discount must be between 0% and 100%.`;
      }

      if (tax < 0) {
        return `${item.itemName}: VAT cannot be negative.`;
      }
    }

    if (calculated.customerCredit > 0) {
      return "This modification would create a customer credit / refund balance. The current controlled modification engine intentionally blocks this case until the customer-credit workflow is connected.";
    }

    return null;
  }

  function buildRequest(): SalesOrderModificationRequest {
    return {
      salesOrderId: order.id,
      modificationType,
      reason: reason.trim(),
      notes: notes.trim() || null,
      afterSnapshot: buildSnapshot(),
    };
  }

  function handlePreview() {
    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const result =
          await previewSalesOrderModificationAction(buildRequest());

        setPreview(result);
      } catch (caught) {
        setPreview(null);

        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to preview the modification.",
        );
      }
    });
  }

  function handleApply() {
    if (!preview) {
      setError("Preview the modification before applying it.");
      return;
    }

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    const confirmed = window.confirm(
      `Apply this modification to ${order.orderNumber}?\n\n` +
        `Original total: ${formatCurrency(
          order.grandTotal,
          order.currencyCode,
        )}\n` +
        `Revised total: ${formatCurrency(
          calculated.grandTotal,
          order.currencyCode,
        )}\n` +
        `Difference: ${formatCurrency(
          calculated.difference,
          order.currencyCode,
        )}\n\n` +
        "This creates permanent revision, inventory and accounting audit records where applicable.",
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setSuccess(null);

    const idempotencyKey = `sales-order-modification-${order.id}-${Date.now()}-${crypto.randomUUID()}`;

    startTransition(async () => {
      try {
        await applySalesOrderModificationAction({
          ...buildRequest(),
          idempotencyKey,
        });

        setSuccess(
          "Sales Order modification applied successfully. The order, inventory and accounting records have been updated through the controlled revision workflow.",
        );

        setPreview(null);

        window.location.href = `/admin/sales/orders/${order.id}`;
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to apply the modification.",
        );
      }
    });
  }

  const previewObject = asObject(preview);

  const previewDifference =
    asObject(previewObject?.difference_snapshot) ??
    asObject(previewObject?.differenceSnapshot);

  const previewInventory = asObject(previewDifference?.inventory);

  const inventoryChanges = arrayFrom(previewInventory, ["changes"]);

  const previewRevisionValues =
    asObject(previewObject?.revision_values) ??
    asObject(previewObject?.revisionValues);

  const previewTotalDifference =
    numberFrom(previewRevisionValues, [
      "total_difference",
      "totalDifference",
    ]) ??
    numberFrom(previewDifference, ["total_difference", "totalDifference"]) ??
    calculated.difference;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold">{order.customerName}</p>

            <p className="mt-1 text-sm text-muted-foreground">
              {formatLabel(order.status)}
              {" / "}
              {formatLabel(order.fulfilmentStatus)}
              {" / "}
              {formatLabel(order.paymentStatus)}
            </p>
          </div>

          <div className="rounded-xl border bg-muted/20 px-4 py-3 text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Current Invoice Total
            </p>

            <p className="mt-1 text-lg font-semibold">
              {formatCurrency(order.grandTotal, order.currencyCode)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <div>
          <h2 className="font-semibold">Modification Details</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Explain why this posted sale is being corrected. The reason becomes
            part of the permanent revision audit trail.
          </p>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium">Modification Type</span>

            <Select
              value={modificationType}
              onValueChange={(value) => {
                setModificationType(value as SalesOrderModificationType);
                setPreview(null);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="entry_correction">
                  Entry Correction
                </SelectItem>

                <SelectItem value="commercial_adjustment">
                  Commercial Adjustment
                </SelectItem>

                <SelectItem value="exchange_adjustment">
                  Exchange Adjustment
                </SelectItem>
              </SelectContent>
            </Select>

            <p className="text-xs leading-5 text-muted-foreground">
              Use Entry Correction when the original invoice or fulfilled
              quantity was entered incorrectly. Actual goods returned later
              should use Sales Return.
            </p>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Modification Reason *</span>

            <Input
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setPreview(null);
              }}
              placeholder="Example: Correct quantity entered as 96 instead of 95"
            />
          </label>
        </div>

        <label className="mt-5 block space-y-2">
          <span className="text-sm font-medium">Additional Audit Notes</span>

          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional internal explanation or reference..."
          />
        </label>
      </section>

      <section className="rounded-2xl border bg-card">
        <div className="border-b p-5">
          <h2 className="font-semibold">Invoice Items</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Correct existing lines, add missing products, or remove products
            entered on the original posted sale. Add/Remove is available only
            for Entry Correction; actual customer returns must use Sales Return.
          </p>
        </div>

        {modificationType === "entry_correction" ? (
          <div className="border-b bg-muted/10 p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold">Add Missing Product</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                The product is added only to the proposed revision. Nothing is
                posted until Preview is accepted and Apply Modification is used.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <label className="mb-2 block text-sm font-medium">Product</label>
                <SmartProductPicker
                  products={products}
                  value={selectedProductId}
                  onChange={(value) => {
                    setSelectedProductId(value);
                    setPreview(null);
                  }}
                />
              </div>

              <div className="lg:col-span-3">
                <label className="mb-2 block text-sm font-medium">Warehouse</label>
                <select
                  value={newWarehouseId}
                  onChange={(event) => {
                    setNewWarehouseId(event.target.value);
                    setPreview(null);
                  }}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">Order default</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.code} - {warehouse.name}
                    </option>
                  ))}
                </select>
              </div>

              <label className="lg:col-span-2">
                <span className="mb-2 block text-sm font-medium">Quantity</span>
                <Input
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={newQuantity}
                  onChange={(event) => setNewQuantity(event.target.value)}
                />
              </label>

              <div className="lg:col-span-2">
                <span className="mb-2 block text-sm font-medium">Unit</span>
                <div className="flex h-10 items-center rounded-md border bg-muted/30 px-3 text-sm">
                  {selectedUnit?.short_name ?? selectedUnit?.name ?? "—"}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <label>
                <span className="mb-2 block text-sm font-medium">Selling Price</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newUnitPrice}
                  onChange={(event) => setNewUnitPrice(event.target.value)}
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium">Discount %</span>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={newDiscount}
                  onChange={(event) => setNewDiscount(event.target.value)}
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium">VAT %</span>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={newTax}
                  onChange={(event) => setNewTax(event.target.value)}
                />
              </label>

              <div>
                <span className="mb-2 block text-sm font-medium">Line Total</span>
                <div className="flex h-10 items-center rounded-md border bg-muted/30 px-3 text-sm font-semibold">
                  {formatCurrency(newLinePreview.total, order.currencyCode)}
                </div>
              </div>
            </div>

            {selectedProduct ? (
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <MiniMetric
                  label="Available Stock"
                  value={formatQuantity(newLinePreview.availableQuantity)}
                />
                <MiniMetric
                  label="Avg. Unit Cost"
                  value={formatCurrency(
                    newLinePreview.unitCost,
                    order.currencyCode,
                  )}
                />
                <MiniMetric
                  label="Estimated Profit"
                  value={formatCurrency(
                    newLinePreview.profit,
                    order.currencyCode,
                  )}
                />
                <MiniMetric
                  label="Margin"
                  value={`${newLinePreview.marginPercentage.toFixed(2)}%`}
                />
              </div>
            ) : null}

            {selectedProduct && newLinePreview.stockShortage ? (
              <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Requested quantity exceeds available stock of{" "}
                <strong>{formatQuantity(newLinePreview.availableQuantity)}</strong>.
              </div>
            ) : null}

            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                disabled={!selectedProduct || isPending}
                onClick={handleAddProduct}
              >
                <Plus className="size-4" />
                Add Product to Revision
              </Button>
            </div>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-sm">
            <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3 text-right">Fulfilled</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Selling Price</th>
                <th className="px-4 py-3">Discount %</th>
                <th className="px-4 py-3">VAT %</th>
                <th className="px-4 py-3 text-right">Revised Line</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {items.map((item, index) => {
                const quantity = Math.max(toNumber(item.quantityInput), 0);

                const price = Math.max(toNumber(item.unitPriceInput), 0);

                const discount = Math.min(
                  Math.max(toNumber(item.discountInput), 0),
                  100,
                );

                const revisedLine = quantity * price * (1 - discount / 100);

                const quantityChanged = quantity !== item.quantity;

                return (
                  <tr
                    key={item.clientKey}
                    className={
                      item.isRemoved
                        ? "bg-red-50/60 opacity-70 dark:bg-red-950/10"
                        : item.isNew
                          ? "bg-emerald-50/60 dark:bg-emerald-950/10"
                          : quantityChanged
                            ? "bg-amber-50/50 dark:bg-amber-950/10"
                            : undefined
                    }
                  >
                    <td className="px-4 py-4">
                      <p className="font-semibold">
                        {index + 1}. {item.itemName}{item.isNew ? " (NEW)" : item.isRemoved ? " (REMOVED)" : ""}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.sku ?? "No SKU"}
                      </p>

                      {quantityChanged ? (
                        <p className="mt-2 text-xs font-medium text-amber-700">
                          Quantity changed: {formatQuantity(item.quantity)}{" "}
                          <ArrowRight className="mx-1 inline size-3" />{" "}
                          {formatQuantity(quantity)}
                        </p>
                      ) : null}
                    </td>

                    <td className="px-4 py-4 text-right">
                      {formatQuantity(item.quantityFulfilled)}
                    </td>

                    <td className="px-4 py-4">
                      <Input
                        type="number"
                        min="0.0001"
                        step="0.0001"
                        className="w-28"
                        disabled={item.isRemoved}
                        value={item.quantityInput}
                        onChange={(event) =>
                          updateItem(
                            item.clientKey,
                            "quantityInput",
                            event.target.value,
                          )
                        }
                      />
                    </td>

                    <td className="px-4 py-4">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-32"
                        disabled={item.isRemoved}
                        value={item.unitPriceInput}
                        onChange={(event) =>
                          updateItem(
                            item.clientKey,
                            "unitPriceInput",
                            event.target.value,
                          )
                        }
                      />
                    </td>

                    <td className="px-4 py-4">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        className="w-28"
                        disabled={item.isRemoved}
                        value={item.discountInput}
                        onChange={(event) =>
                          updateItem(
                            item.clientKey,
                            "discountInput",
                            event.target.value,
                          )
                        }
                      />
                    </td>

                    <td className="px-4 py-4">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-24"
                        disabled={item.isRemoved}
                        value={item.taxInput}
                        onChange={(event) =>
                          updateItem(item.clientKey, "taxInput", event.target.value)
                        }
                      />
                    </td>

                    <td className="px-4 py-4 text-right font-semibold">
                      {formatCurrency(revisedLine, order.currencyCode)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {item.isRemoved ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestoreItem(item.clientKey)}
                        >
                          <Undo2 className="size-4" />
                          Undo
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={modificationType !== "entry_correction"}
                          onClick={() => handleRemoveItem(item.clientKey)}
                        >
                          <Trash2 className="size-4" />
                          Remove
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="font-semibold">Invoice Adjustments</h2>

            <div className="mt-5 grid gap-5 sm:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm font-medium">Invoice Discount</span>

                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={invoiceDiscountInput}
                  onChange={(event) => {
                    setInvoiceDiscountInput(event.target.value);
                    setPreview(null);
                  }}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium">Delivery Charges</span>

                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shippingInput}
                  onChange={(event) => {
                    setShippingInput(event.target.value);
                    setPreview(null);
                  }}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium">Round Off</span>

                <Input
                  type="number"
                  min="-10"
                  max="10"
                  step="0.01"
                  value={roundOffInput}
                  onChange={(event) => {
                    setRoundOffInput(event.target.value);
                    setPreview(null);
                  }}
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-5">
            <h2 className="font-semibold">Notes</h2>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium">Customer Notes</span>

                <Textarea
                  value={customerNotes}
                  onChange={(event) => {
                    setCustomerNotes(event.target.value);
                    setPreview(null);
                  }}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium">Internal Notes</span>

                <Textarea
                  value={internalNotes}
                  onChange={(event) => {
                    setInternalNotes(event.target.value);
                    setPreview(null);
                  }}
                />
              </label>
            </div>
          </section>
        </div>

        <section className="h-fit rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Revised Totals</h2>

          <div className="mt-4 divide-y rounded-xl border">
            <SummaryRow
              label="Product Subtotal"
              value={formatCurrency(
                calculated.grossSubtotal,
                order.currencyCode,
              )}
            />

            <SummaryRow
              label="Item Discount"
              value={`- ${formatCurrency(
                calculated.itemDiscount,
                order.currencyCode,
              )}`}
            />

            <SummaryRow
              label="Invoice Discount"
              value={`- ${formatCurrency(
                calculated.invoiceDiscount,
                order.currencyCode,
              )}`}
            />

            <SummaryRow
              label="VAT"
              value={formatCurrency(calculated.taxAmount, order.currencyCode)}
            />

            <SummaryRow
              label="Delivery Charges"
              value={formatCurrency(
                calculated.shippingAmount,
                order.currencyCode,
              )}
            />

            <SummaryRow
              label="Round Off"
              value={formatCurrency(
                calculated.roundOffAmount,
                order.currencyCode,
              )}
            />

            <SummaryRow
              label="Grand Total"
              value={formatCurrency(calculated.grandTotal, order.currencyCode)}
              emphasized
            />

            <SummaryRow
              label="Already Paid"
              value={formatCurrency(order.paidAmount, order.currencyCode)}
            />

            <SummaryRow
              label="Revised Balance Due"
              value={formatCurrency(calculated.balanceDue, order.currencyCode)}
              emphasized
            />
          </div>

          <div
            className={`mt-4 rounded-xl border p-4 ${
              calculated.difference === 0
                ? "bg-muted/20"
                : calculated.difference > 0
                  ? "border-amber-200 bg-amber-50 dark:bg-amber-950/10"
                  : "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/10"
            }`}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Invoice Difference
            </p>

            <p className="mt-2 text-xl font-semibold">
              {calculated.difference > 0 ? "+" : ""}
              {formatCurrency(calculated.difference, order.currencyCode)}
            </p>
          </div>

          {calculated.customerCredit > 0 ? (
            <div className="mt-4 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/20">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />

              <div>
                <p className="font-semibold">
                  Customer credit would be created
                </p>

                <p className="mt-1">
                  {formatCurrency(
                    calculated.customerCredit,
                    order.currencyCode,
                  )}{" "}
                  would become overpaid. This case is intentionally blocked in
                  the current modification phase.
                </p>
              </div>
            </div>
          ) : null}
        </section>
      </section>

      {error ? (
        <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/20">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      {success ? (
        <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/20">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p>{success}</p>
        </div>
      ) : null}

      {preview ? (
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Eye className="size-5" />
            </div>

            <div>
              <h2 className="font-semibold">Modification Preview Ready</h2>

              <p className="mt-1 text-sm text-muted-foreground">
                The database preview engine accepted this proposed revision.
                Review the financial and inventory impact before applying it.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <PreviewCard
              title="Original Total"
              value={formatCurrency(order.grandTotal, order.currencyCode)}
              icon={ReceiptText}
            />

            <PreviewCard
              title="Revised Total"
              value={formatCurrency(calculated.grandTotal, order.currencyCode)}
              icon={Save}
            />

            <PreviewCard
              title="Difference"
              value={formatCurrency(previewTotalDifference, order.currencyCode)}
              icon={ArrowRight}
            />
          </div>

          {inventoryChanges.length > 0 ? (
            <div className="mt-5 rounded-xl border bg-background p-4">
              <div className="flex items-center gap-2">
                <PackageOpen className="size-4" />
                <p className="font-semibold">Inventory Correction Required</p>
              </div>

              <p className="mt-2 text-sm text-muted-foreground">
                The preview engine detected {inventoryChanges.length} inventory
                correction
                {inventoryChanges.length === 1 ? "" : "s"}. These will be posted
                automatically by the controlled apply workflow.
              </p>
              <div className="mt-4 space-y-2">
                {inventoryChanges.map((change, index) => {
                  const effect = asObject(change);

                  const action =
                    typeof effect?.action === "string"
                      ? effect.action
                      : "inventory_correction";

                  const itemName =
                    typeof effect?.item_name === "string"
                      ? effect.item_name
                      : "Unknown item";

                  const quantity = numberFrom(effect, ["quantity"]) ?? 0;

                  const originalQuantity = numberFrom(effect, [
                    "original_quantity",
                  ]);

                  const proposedQuantity = numberFrom(effect, [
                    "proposed_quantity",
                  ]);

                  return (
                    <div
                      key={index}
                      className="rounded-lg border bg-muted/20 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">
                            {formatLabel(action)}
                          </p>

                          <p className="mt-1 text-sm">{itemName}</p>
                        </div>

                        <div className="text-right">
                          <p className="font-semibold">
                            Qty {formatQuantity(quantity)}
                          </p>

                          {originalQuantity !== null &&
                          proposedQuantity !== null ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatQuantity(originalQuantity)} →{" "}
                              {formatQuantity(proposedQuantity)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border bg-background p-4">
              <p className="text-sm font-medium">
                No inventory correction is required by this preview.
              </p>
            </div>
          )}
          <div className="mt-5 rounded-xl border bg-background p-4">
            <p className="font-semibold">Accounting Control</p>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Original posted journals and customer receipts remain preserved.
              The apply engine creates differential accounting and inventory
              corrections where required.
            </p>
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-3 rounded-2xl border bg-background p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Preview is required before the modification can be applied.
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/admin/sales/orders/${order.id}`} />}
          >
            <RotateCcw className="size-4" />
            Cancel
          </Button>

          <Button
            variant="outline"
            disabled={isPending}
            onClick={handlePreview}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Eye className="size-4" />
            )}
            Preview Changes
          </Button>

          <Button
            disabled={isPending || !preview || calculated.customerCredit > 0}
            onClick={handleApply}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Apply Modification
          </Button>
        </div>
      </section>
    </div>
  );
}


function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span
        className={
          emphasized ? "font-semibold" : "text-sm text-muted-foreground"
        }
      >
        {label}
      </span>

      <span
        className={emphasized ? "text-lg font-semibold" : "text-sm font-medium"}
      >
        {value}
      </span>
    </div>
  );
}

function PreviewCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
}) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />

        <p className="text-xs font-medium uppercase tracking-wide">{title}</p>
      </div>

      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}

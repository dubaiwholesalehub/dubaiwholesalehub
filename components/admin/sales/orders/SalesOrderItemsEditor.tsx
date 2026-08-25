"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import SmartProductPicker from "@/components/admin/shared/SmartProductPicker";

import {
  addSalesOrderItemAction,
  deleteSalesOrderItemAction,
  updateSalesOrderItemAction,
} from "@/app/admin/(protected)/sales/orders/actions";

import type {
  SalesOrderItem,
  SalesOrderWarehouse,
} from "@/lib/repositories/sales-order.repository";

import type {
  ProductFulfilmentMethod,
  SalesQuotationItemProductOption,
  SalesQuotationItemUnitOption,
} from "@/lib/repositories/sales-quotation.repository";

interface SalesOrderItemsEditorProps {
  salesOrderId: string;

  items: SalesOrderItem[];

  products: SalesQuotationItemProductOption[];

  units: SalesQuotationItemUnitOption[];

  warehouses: SalesOrderWarehouse[];

  defaultWarehouseId: string | null;

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

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function SalesOrderItemsEditor({
  salesOrderId,
  items,
  products,
  units,
  warehouses,
  defaultWarehouseId,
  stock,
  marginPolicy,
}: SalesOrderItemsEditorProps) {
  const [isPending, startTransition] = useTransition();

  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const [selectedProductId, setSelectedProductId] = useState("");

  const [warehouseId, setWarehouseId] = useState(defaultWarehouseId ?? "");

  const [quantity, setQuantity] = useState("1");

  const [unitPrice, setUnitPrice] = useState("0");

  const [discountPercentage, setDiscountPercentage] = useState("0");

  const [taxPercentage, setTaxPercentage] = useState("5");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  const selectedUnit = useMemo(
    () => units.find((unit) => unit.id === selectedProduct?.unit_id) ?? null,
    [units, selectedProduct],
  );

  const effectiveWarehouseId = warehouseId || defaultWarehouseId || "";

  const selectedStock = useMemo(
    () =>
      stock.find(
        (row) =>
          row.productId === selectedProductId &&
          row.warehouseId === effectiveWarehouseId,
      ) ?? null,
    [stock, selectedProductId, effectiveWarehouseId],
  );

  const preview = useMemo(() => {
    const qty = Number(quantity) || 0;

    const price = Number(unitPrice) || 0;

    const discount = Number(discountPercentage) || 0;

    const tax = Number(taxPercentage) || 0;

    const subtotal = qty * price;

    const discountAmount = subtotal * (discount / 100);

    const revenue = subtotal - discountAmount;

    const taxAmount = revenue * (tax / 100);

    const unitCost = selectedStock?.averageUnitCost ?? 0;

    const totalCost = qty * unitCost;

    const profit = revenue - totalCost;

    const marginPercentage = revenue > 0 ? (profit / revenue) * 100 : 0;

    const availableQuantity = selectedStock?.quantityAvailable ?? 0;

    const stockShortage =
      selectedProduct?.fulfilment_method === "stock" && qty > availableQuantity;

    let marginStatus: "healthy" | "warning" | "approval_required" = "healthy";

    if (marginPercentage < marginPolicy.minimumMarginPercentage) {
      marginStatus = "approval_required";
    } else if (marginPercentage < marginPolicy.warningMarginPercentage) {
      marginStatus = "warning";
    }

    return {
      subtotal,
      discountAmount,
      revenue,
      taxAmount,

      total: revenue + taxAmount,

      unitCost,
      totalCost,
      profit,
      marginPercentage,

      availableQuantity,
      stockShortage,
      marginStatus,
    };
  }, [
    quantity,
    unitPrice,
    discountPercentage,
    taxPercentage,
    selectedStock,
    selectedProduct,
    marginPolicy,
  ]);

  function resetEntry() {
    setSelectedProductId("");
    setQuantity("1");
    setUnitPrice("0");
    setDiscountPercentage("0");
    setTaxPercentage("5");
    setErrorMessage(null);
  }

  function handleAddItem() {
    if (!selectedProduct) {
      setErrorMessage("Please select a product.");

      return;
    }

    const parsedQuantity = Number(quantity);

    const parsedUnitPrice = Number(unitPrice);

    const parsedDiscount = Number(discountPercentage);

    const parsedTax = Number(taxPercentage);

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setErrorMessage("Quantity must be greater than zero.");

      return;
    }

    if (!Number.isFinite(parsedUnitPrice) || parsedUnitPrice < 0) {
      setErrorMessage("Unit price cannot be negative.");

      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      try {
        await addSalesOrderItemAction(salesOrderId, {
          quotation_item_id: null,

          product_id: selectedProduct.id,

          unit_id: selectedProduct.unit_id,

          warehouse_id: warehouseId || null,

          sku: selectedProduct.sku,

          item_name: selectedProduct.name,

          description: selectedProduct.short_description,

          quantity: parsedQuantity,

          unit_price: parsedUnitPrice,

          discount_percentage: parsedDiscount,

          tax_percentage: parsedTax,

          fulfilment_method: selectedProduct.fulfilment_method,

          procurement_lead_time_days:
            selectedProduct.procurement_lead_time_days,

          allow_backorder: selectedProduct.allow_backorder,

          procurement_notes: selectedProduct.procurement_notes,
        });

        resetEntry();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to add item.",
        );
      }
    });
  }

  function handleEditItem(item: SalesOrderItem) {
    setEditingItemId(item.id);

    setSelectedProductId(item.product_id ?? "");

    setWarehouseId(item.warehouse_id ?? defaultWarehouseId ?? "");

    setQuantity(String(item.quantity));

    setUnitPrice(String(item.unit_price));

    setDiscountPercentage(String(item.discount_percentage ?? 0));

    setTaxPercentage(String(item.tax_percentage ?? 0));

    setErrorMessage(null);
  }
  function handleCancelEdit() {
    setEditingItemId(null);

    resetEntry();
  }

  function handleUpdateItem() {
    if (!editingItemId) {
      return;
    }

    if (!selectedProduct) {
      setErrorMessage("Please select a product.");

      return;
    }

    const parsedQuantity = Number(quantity);

    const parsedUnitPrice = Number(unitPrice);

    const parsedDiscount = Number(discountPercentage);

    const parsedTax = Number(taxPercentage);

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setErrorMessage("Quantity must be greater than zero.");

      return;
    }

    if (!Number.isFinite(parsedUnitPrice) || parsedUnitPrice < 0) {
      setErrorMessage("Unit price cannot be negative.");

      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      try {
        await updateSalesOrderItemAction(salesOrderId, editingItemId, {
          quotation_item_id: null,

          product_id: selectedProduct.id,

          unit_id: selectedProduct.unit_id,

          warehouse_id: warehouseId || null,

          sku: selectedProduct.sku,

          item_name: selectedProduct.name,

          description: selectedProduct.short_description,

          quantity: parsedQuantity,

          unit_price: parsedUnitPrice,

          discount_percentage: parsedDiscount,

          tax_percentage: parsedTax,

          fulfilment_method: selectedProduct.fulfilment_method,

          procurement_lead_time_days:
            selectedProduct.procurement_lead_time_days,

          allow_backorder: selectedProduct.allow_backorder,

          procurement_notes: selectedProduct.procurement_notes,
        });

        setEditingItemId(null);

        resetEntry();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to update item.",
        );
      }
    });
  }
  function handleDeleteItem(itemId: string) {
    const confirmed = window.confirm("Remove this item from the sales order?");

    if (!confirmed) {
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      try {
        await deleteSalesOrderItemAction(salesOrderId, itemId);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to remove item.",
        );
      }
    });
  }

  return (
    <section className="rounded-xl border bg-white">
      <div className="border-b px-6 py-5">
        <h2 className="text-lg font-semibold">Sales Order Items</h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Add products to this draft sales order.
        </p>
      </div>

      <div className="space-y-5 p-6">
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <label className="mb-2 block text-sm font-medium">Product</label>

            <SmartProductPicker
              products={products}
              value={selectedProductId}
              onChange={setSelectedProductId}
            />
          </div>

          <div className="lg:col-span-3">
            <label className="mb-2 block text-sm font-medium">Warehouse</label>

            <select
              value={warehouseId}
              onChange={(event) => setWarehouseId(event.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Order default</option>

              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code}
                  {" - "}
                  {warehouse.name}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium">Quantity</label>

            <input
              type="number"
              min="0.001"
              step="0.001"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium">Unit</label>

            <div className="flex h-10 items-center rounded-md border bg-muted/30 px-3 text-sm">
              {selectedUnit?.short_name ?? selectedUnit?.name ?? "—"}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Unit Price</label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={unitPrice}
              onChange={(event) => setUnitPrice(event.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Discount %</label>

            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={discountPercentage}
              onChange={(event) => setDiscountPercentage(event.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">VAT %</label>

            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={taxPercentage}
              onChange={(event) => setTaxPercentage(event.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Line Total</label>

            <div className="flex h-10 items-center rounded-md border bg-muted/30 px-3 text-sm font-semibold">
              {formatMoney(preview.total)}
            </div>
          </div>
        </div>

        {selectedProduct ? (
          <div className="rounded-md bg-muted/40 px-4 py-3 text-sm">
            <span className="font-medium">{selectedProduct.name}</span>

            {selectedProduct.sku ? (
              <span className="ml-2 text-muted-foreground">
                SKU: {selectedProduct.sku}
              </span>
            ) : null}

            <span className="ml-3 text-muted-foreground">
              Fulfilment:{" "}
              {selectedProduct.fulfilment_method.replaceAll("_", " ")}
            </span>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        {selectedProduct ? (
          <div className="grid gap-3 md:grid-cols-5">
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="text-xs font-medium text-muted-foreground">
                Available Stock
              </div>

              <div className="mt-1 text-lg font-semibold">
                {formatMoney(preview.availableQuantity)}
              </div>
            </div>

            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="text-xs font-medium text-muted-foreground">
                Avg. Unit Cost
              </div>

              <div className="mt-1 text-lg font-semibold">
                {formatMoney(preview.unitCost)}
              </div>
            </div>

            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="text-xs font-medium text-muted-foreground">
                Estimated Profit
              </div>

              <div className="mt-1 text-lg font-semibold">
                {formatMoney(preview.profit)}
              </div>
            </div>

            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="text-xs font-medium text-muted-foreground">
                Margin
              </div>

              <div className="mt-1 text-lg font-semibold">
                {preview.marginPercentage.toFixed(2)}%
              </div>
            </div>

            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="text-xs font-medium text-muted-foreground">
                Margin Status
              </div>

              <div
                className={`mt-1 text-sm font-semibold ${
                  preview.marginStatus === "healthy"
                    ? "text-emerald-700"
                    : preview.marginStatus === "warning"
                      ? "text-amber-700"
                      : "text-red-700"
                }`}
              >
                {preview.marginStatus === "healthy"
                  ? "Healthy"
                  : preview.marginStatus === "warning"
                    ? "Low Margin"
                    : "Approval Required"}
              </div>
            </div>
          </div>
        ) : null}

        {selectedProduct && preview.stockShortage ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Requested quantity <strong>{quantity}</strong> exceeds the available
            stock of <strong>{formatMoney(preview.availableQuantity)}</strong>{" "}
            in the selected warehouse.
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          {editingItemId ? (
            <button
              type="button"
              disabled={isPending}
              onClick={handleCancelEdit}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border bg-background px-4 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Cancel Edit
            </button>
          ) : null}

          <button
            type="button"
            disabled={isPending || !selectedProduct}
            onClick={editingItemId ? handleUpdateItem : handleAddItem}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : editingItemId ? (
              <Pencil className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}

            {editingItemId ? "Update Item" : "Add Item"}
          </button>
        </div>
      </div>

      <div className="border-t">
        {items.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            No items have been added to this sales order.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Product</th>

                  <th className="px-4 py-3 text-right font-medium">Qty</th>

                  <th className="px-4 py-3 text-right font-medium">Price</th>

                  <th className="px-4 py-3 text-right font-medium">Discount</th>

                  <th className="px-4 py-3 text-right font-medium">VAT</th>

                  <th className="px-4 py-3 text-right font-medium">Total</th>

                  <th className="w-16 px-4 py-3" />
                </tr>
              </thead>

              <tbody className="divide-y">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{item.item_name}</div>

                      {item.sku ? (
                        <div className="text-xs text-muted-foreground">
                          {item.sku}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-4 py-3 text-right">{item.quantity}</td>

                    <td className="px-4 py-3 text-right">
                      {formatMoney(item.unit_price)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {item.discount_percentage}%
                    </td>

                    <td className="px-4 py-3 text-right">
                      {item.tax_percentage}%
                    </td>

                    <td className="px-4 py-3 text-right font-medium">
                      {formatMoney(item.line_total)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleEditItem(item)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                          title="Edit item"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleDeleteItem(item.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

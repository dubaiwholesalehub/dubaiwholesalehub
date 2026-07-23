"use client";

import { useState } from "react";

import {
  initialItemDraft,
  type ItemDraftErrors,
  type ItemDraftForm,
  type RfqDraftItem,
  type RfqProductOption,
  type RfqUnitOption,
} from "@/components/admin/rfqs/items/types";

import {
  calculateItemLineTotal,
  calculateItemsTargetValue,
  calculateTotalQuantity,
  countCustomItems,
  createItemDraftFromProduct,
  createRfqDraftItem,
  filterRfqProducts,
  formatCurrency,
} from "@/components/admin/rfqs/items/utils";

interface RfqItemsStepProps {
  products: RfqProductOption[];
  units: RfqUnitOption[];
  currencyCode: string;
  items: RfqDraftItem[];
  onItemsChange: (items: RfqDraftItem[]) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function RfqItemsStep({
  products,
  units,
  currencyCode,
  items,
  onItemsChange,
  onBack,
  onContinue,
}: RfqItemsStepProps) {
  const [itemDraft, setItemDraft] =
    useState<ItemDraftForm>(initialItemDraft);

  const [itemErrors, setItemErrors] =
    useState<ItemDraftErrors>({});

  const [searchQuery, setSearchQuery] = useState("");

  const [editingItemId, setEditingItemId] =
    useState<string | null>(null);

  const [message, setMessage] = useState<string | null>(
    null,
  );

  const filteredProducts = filterRfqProducts(
    products,
    searchQuery,
  );

  const totalTargetValue =
    calculateItemsTargetValue(items);

  const totalQuantity = calculateTotalQuantity(items);

  const customItemCount = countCustomItems(items);

  const isEditing = editingItemId !== null;

  function updateItemDraft<K extends keyof ItemDraftForm>(
    field: K,
    value: ItemDraftForm[K],
  ) {
    setItemDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));

    if (
      field === "itemName" ||
      field === "requestedQuantity" ||
      field === "unitId"
    ) {
      setItemErrors((currentErrors) => ({
        ...currentErrors,
        [field]: undefined,
      }));
    }
  }
  function resetItemForm() {
    setItemDraft(initialItemDraft);
    setItemErrors({});
    setSearchQuery("");
    setEditingItemId(null);
  }
  function selectProduct(productId: string) {
    if (!productId) {
      setItemDraft((currentDraft) => ({
        ...initialItemDraft,
        requestedQuantity:
          currentDraft.requestedQuantity || "1",
      }));

      setItemErrors({});
      return;
    }

    const selectedProduct = products.find(
      (product) => product.id === productId,
    );

    if (!selectedProduct) {
      return;
    }

    setItemDraft(
      createItemDraftFromProduct(selectedProduct),
    );

    setItemErrors({});
  }

  function validateItemDraft() {
    const nextErrors: ItemDraftErrors = {};

    if (!itemDraft.itemName.trim()) {
      nextErrors.itemName = "Item name is required.";
    }

    const quantity = Number(
      itemDraft.requestedQuantity,
    );

    if (
      !itemDraft.requestedQuantity ||
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      nextErrors.requestedQuantity =
        "Enter a quantity greater than zero.";
    }

    if (!itemDraft.unitId) {
      nextErrors.unitId = "Select a unit.";
    }

    setItemErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  function editItem(item: RfqDraftItem) {
    setItemDraft({
      productId: item.productId ?? "",
      itemName: item.itemName,
      productSku: item.productSku ?? "",
      itemDescription: item.itemDescription,
      requestedQuantity: String(
        item.requestedQuantity,
      ),
      unitId: item.unitId,
      targetUnitPrice:
        item.targetUnitPrice === null
          ? ""
          : String(item.targetUnitPrice),
      targetDeliveryDate: item.targetDeliveryDate,
      specifications: item.specifications,
      packagingRequirements:
        item.packagingRequirements,
      notes: item.notes,
    });

    setEditingItemId(item.id);
    setItemErrors({});
    setSearchQuery("");
    setMessage(null);

    document
      .getElementById("rfq-item-form")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  function duplicateItem(item: RfqDraftItem) {
    const duplicatedItem: RfqDraftItem = {
      ...item,
      id: crypto.randomUUID(),
      itemName: `${item.itemName} Copy`,
    };

    onItemsChange([...items, duplicatedItem]);
    setMessage("Item duplicated successfully.");
  }

  function cancelEdit() {
    resetItemForm();
    setMessage("Editing cancelled.");
  }

  function submitItem() {
    if (!validateItemDraft()) {
      return;
    }

    const selectedUnit = units.find(
      (unit) => unit.id === itemDraft.unitId,
    );

    if (!selectedUnit) {
      setItemErrors({
        unitId: "The selected unit is invalid.",
      });

      return;
    }

    if (editingItemId) {
      const updatedItem = createRfqDraftItem(
        itemDraft,
        selectedUnit,
        editingItemId,
      );

      onItemsChange(
        items.map((item) =>
          item.id === editingItemId
            ? updatedItem
            : item,
        ),
      );

      resetItemForm();
      setMessage("Item updated successfully.");
      return;
    }

    const newItem = createRfqDraftItem(
      itemDraft,
      selectedUnit,
      crypto.randomUUID(),
    );

    onItemsChange([...items, newItem]);

    resetItemForm();
    setMessage("Item added successfully.");
  }

  function removeItem(itemId: string) {
    onItemsChange(
      items.filter((item) => item.id !== itemId),
    );

    if (editingItemId === itemId) {
      resetItemForm();
    }

    setMessage("Item removed.");
  }

  function continueToSuppliers() {
    if (items.length === 0) {
      return;
    }

    onContinue();
  }

  return (
    <>
      <div className="border-b px-6 py-5">
        <h2 className="text-lg font-semibold">
          Add RFQ items
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Select a catalog product or enter a custom item.
        </p>
      </div>

      <div className="space-y-8 p-6">
        {message ? (
          <div className="flex items-center justify-between rounded-md border bg-muted/30 px-4 py-3 text-sm">
            <span>{message}</span>

            <button
              type="button"
              onClick={() => setMessage(null)}
              className="font-medium text-muted-foreground hover:text-foreground"
            >
              Dismiss
            </button>
          </div>
        ) : null}
        <section
          id="rfq-item-form"
          className="scroll-mt-6 space-y-5 rounded-lg border bg-background p-5"
        >
          <div>
            <h3 className="font-medium">
              {isEditing ? "Edit RFQ item" : "Item information"}
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              {isEditing
                ? "Update the selected item and save your changes."
                : "Selecting a product automatically fills its catalog information."}
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <FieldGroup
              label="Search products"
              htmlFor="productSearch"
              className="lg:col-span-2"
            >
              <input
                id="productSearch"
                type="search"
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(event.target.value)
                }
                placeholder="Search by product, SKU, brand or category"
                className={getInputClasses(false)}
              />
            </FieldGroup>

            <FieldGroup
              label="Catalog product"
              htmlFor="productId"
              className="lg:col-span-2"
            >
              <select
                id="productId"
                value={itemDraft.productId}
                onChange={(event) =>
                  selectProduct(event.target.value)
                }
                className={getInputClasses(false)}
              >
                <option value="">
                  Custom item / select a product
                </option>

                {filteredProducts.map((product) => (
                  <option
                    key={product.id}
                    value={product.id}
                  >
                    {product.name}
                    {product.sku
                      ? ` — ${product.sku}`
                      : ""}
                  </option>
                ))}
              </select>
            </FieldGroup>

            <FieldGroup
              label="Item name"
              htmlFor="itemName"
              required
              error={itemErrors.itemName}
              className="lg:col-span-2"
            >
              <input
                id="itemName"
                type="text"
                value={itemDraft.itemName}
                onChange={(event) =>
                  updateItemDraft(
                    "itemName",
                    event.target.value,
                  )
                }
                placeholder="Enter the requested item name"
                className={getInputClasses(
                  Boolean(itemErrors.itemName),
                )}
              />
            </FieldGroup>

            <FieldGroup
              label="SKU"
              htmlFor="productSku"
            >
              <input
                id="productSku"
                type="text"
                value={itemDraft.productSku}
                onChange={(event) =>
                  updateItemDraft(
                    "productSku",
                    event.target.value,
                  )
                }
                placeholder="Optional SKU"
                className={getInputClasses(false)}
              />
            </FieldGroup>

            <FieldGroup
              label="Unit"
              htmlFor="unitId"
              required
              error={itemErrors.unitId}
            >
              <select
                id="unitId"
                value={itemDraft.unitId}
                onChange={(event) =>
                  updateItemDraft(
                    "unitId",
                    event.target.value,
                  )
                }
                className={getInputClasses(
                  Boolean(itemErrors.unitId),
                )}
              >
                <option value="">Select unit</option>

                {units.map((unit) => (
                  <option
                    key={unit.id}
                    value={unit.id}
                  >
                    {unit.name}
                    {unit.short_name
                      ? ` (${unit.short_name})`
                      : ""}
                  </option>
                ))}
              </select>
            </FieldGroup>

            <FieldGroup
              label="Requested quantity"
              htmlFor="requestedQuantity"
              required
              error={itemErrors.requestedQuantity}
            >
              <input
                id="requestedQuantity"
                type="number"
                min="0.01"
                step="0.01"
                value={itemDraft.requestedQuantity}
                onChange={(event) =>
                  updateItemDraft(
                    "requestedQuantity",
                    event.target.value,
                  )
                }
                className={getInputClasses(
                  Boolean(
                    itemErrors.requestedQuantity,
                  ),
                )}
              />
            </FieldGroup>

            <FieldGroup
              label={`Target unit price (${currencyCode})`}
              htmlFor="targetUnitPrice"
            >
              <input
                id="targetUnitPrice"
                type="number"
                min="0"
                step="0.01"
                value={itemDraft.targetUnitPrice}
                onChange={(event) =>
                  updateItemDraft(
                    "targetUnitPrice",
                    event.target.value,
                  )
                }
                placeholder="Optional"
                className={getInputClasses(false)}
              />
            </FieldGroup>

            <FieldGroup
              label="Target delivery date"
              htmlFor="targetDeliveryDate"
            >
              <input
                id="targetDeliveryDate"
                type="date"
                value={itemDraft.targetDeliveryDate}
                onChange={(event) =>
                  updateItemDraft(
                    "targetDeliveryDate",
                    event.target.value,
                  )
                }
                className={getInputClasses(false)}
              />
            </FieldGroup>

            <FieldGroup
              label="Description"
              htmlFor="itemDescription"
              className="lg:col-span-2"
            >
              <textarea
                id="itemDescription"
                rows={3}
                value={itemDraft.itemDescription}
                onChange={(event) =>
                  updateItemDraft(
                    "itemDescription",
                    event.target.value,
                  )
                }
                placeholder="Brief item description"
                className={getInputClasses(false)}
              />
            </FieldGroup>

            <FieldGroup
              label="Specifications"
              htmlFor="itemSpecifications"
              className="lg:col-span-2"
            >
              <textarea
                id="itemSpecifications"
                rows={3}
                value={itemDraft.specifications}
                onChange={(event) =>
                  updateItemDraft(
                    "specifications",
                    event.target.value,
                  )
                }
                placeholder="Size, model, material, colour, quality or technical requirements"
                className={getInputClasses(false)}
              />
            </FieldGroup>

            <FieldGroup
              label="Packaging requirements"
              htmlFor="itemPackaging"
              className="lg:col-span-2"
            >
              <textarea
                id="itemPackaging"
                rows={2}
                value={
                  itemDraft.packagingRequirements
                }
                onChange={(event) =>
                  updateItemDraft(
                    "packagingRequirements",
                    event.target.value,
                  )
                }
                placeholder="Individual packing, master carton, labels or export packaging"
                className={getInputClasses(false)}
              />
            </FieldGroup>

            <FieldGroup
              label="Item notes"
              htmlFor="itemNotes"
              className="lg:col-span-2"
            >
              <textarea
                id="itemNotes"
                rows={2}
                value={itemDraft.notes}
                onChange={(event) =>
                  updateItemDraft(
                    "notes",
                    event.target.value,
                  )
                }
                placeholder="Additional instructions for this item"
                className={getInputClasses(false)}
              />
            </FieldGroup>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
            {isEditing ? (
              <button
                type="button"
                onClick={cancelEdit}
                className="inline-flex h-10 items-center justify-center rounded-md border bg-background px-5 text-sm font-medium transition-colors hover:bg-muted"
              >
                Cancel edit
              </button>
            ) : null}

            <button
              type="button"
              onClick={submitItem}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {isEditing ? "Save changes" : "Add item"}
            </button>
          </div>
        </section>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatisticCard
            label="Items"
            value={items.length.toLocaleString("en-AE")}
            description="RFQ line items"
          />

          <StatisticCard
            label="Total quantity"
            value={totalQuantity.toLocaleString("en-AE", {
              maximumFractionDigits: 2,
            })}
            description="Combined requested quantity"
          />

          <StatisticCard
            label="Estimated value"
            value={formatCurrency(
              totalTargetValue,
              currencyCode,
            )}
            description="Based on target prices"
          />

          <StatisticCard
            label="Custom items"
            value={customItemCount.toLocaleString("en-AE")}
            description="Items outside the catalog"
          />
        </section>
        <section className="overflow-hidden rounded-lg border bg-background">
          <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-medium">
                Added items
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                {items.length}{" "}
                {items.length === 1 ? "item" : "items"}{" "}
                added to this RFQ.
              </p>
            </div>

            <div className="text-sm font-medium">
              Target total:{" "}
              {formatCurrency(
                totalTargetValue,
                currencyCode,
              )}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <h4 className="font-medium">
                No items added
              </h4>

              <p className="mt-1 text-sm text-muted-foreground">
                Complete the form above and select Add item.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="border-b bg-muted/40">
                  <tr className="text-left">
                    <th className="px-5 py-3 font-medium text-muted-foreground">
                      Item
                    </th>

                    <th className="px-5 py-3 font-medium text-muted-foreground">
                      SKU
                    </th>

                    <th className="px-5 py-3 text-right font-medium text-muted-foreground">
                      Quantity
                    </th>

                    <th className="px-5 py-3 font-medium text-muted-foreground">
                      Unit
                    </th>

                    <th className="px-5 py-3 text-right font-medium text-muted-foreground">
                      Target price
                    </th>

                    <th className="px-5 py-3 text-right font-medium text-muted-foreground">
                      Total
                    </th>

                    <th className="px-5 py-3 font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {items.map((item) => {
                    const lineTotal =
                      calculateItemLineTotal(item);

                    return (
                      <tr
                        key={item.id}
                        className={
                          editingItemId === item.id
                            ? "bg-muted/40"
                            : undefined
                        }
                      >
                        <td className="px-5 py-4">
                          <p className="font-medium">
                            {item.itemName}
                          </p>

                          {item.itemDescription ? (
                            <p className="mt-1 max-w-72 line-clamp-2 text-xs text-muted-foreground">
                              {item.itemDescription}
                            </p>
                          ) : null}
                        </td>

                        <td className="px-5 py-4 font-mono text-xs">
                          {item.productSku ?? "—"}
                        </td>

                        <td className="px-5 py-4 text-right font-medium">
                          {item.requestedQuantity.toLocaleString(
                            "en-AE",
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {item.unitName}
                        </td>

                        <td className="px-5 py-4 text-right">
                          {item.targetUnitPrice === null
                            ? "—"
                            : formatCurrency(
                              item.targetUnitPrice,
                              currencyCode,
                            )}
                        </td>

                        <td className="px-5 py-4 text-right font-medium">
                          {lineTotal === null
                            ? "—"
                            : formatCurrency(
                              lineTotal,
                              currencyCode,
                            )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => editItem(item)}
                              className="inline-flex h-8 items-center justify-center rounded-md border bg-background px-3 text-xs font-medium transition-colors hover:bg-muted"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => duplicateItem(item)}
                              className="inline-flex h-8 items-center justify-center rounded-md border bg-background px-3 text-xs font-medium transition-colors hover:bg-muted"
                            >
                              Duplicate
                            </button>

                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="inline-flex h-8 items-center justify-center rounded-md border border-destructive/30 px-3 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {items.length === 0 ? (
          <p className="text-sm text-amber-700">
            Add at least one item before continuing.
          </p>
        ) : null}
      </div>

      <div className="flex flex-col-reverse gap-3 border-t bg-muted/20 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
        >
          Back to details
        </button>

        <button
          type="button"
          onClick={continueToSuppliers}
          disabled={items.length === 0}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue to suppliers
        </button>
      </div>
    </>
  );
}

interface StatisticCardProps {
  label: string;
  value: string;
  description: string;
}

function StatisticCard({
  label,
  value,
  description,
}: StatisticCardProps) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="text-sm font-medium text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold tracking-tight">
        {value}
      </p>

      <p className="mt-1 text-xs text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

interface FieldGroupProps {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
  error?: string;
  className?: string;
}

function FieldGroup({
  label,
  htmlFor,
  children,
  required = false,
  error,
  className,
}: FieldGroupProps) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-sm font-medium"
      >
        {label}

        {required ? (
          <span className="ml-1 text-destructive">
            *
          </span>
        ) : null}
      </label>

      {children}

      {error ? (
        <p className="mt-1.5 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function getInputClasses(hasError: boolean) {
  return [
    "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors",
    "placeholder:text-muted-foreground",
    "focus:border-ring focus:ring-2 focus:ring-ring/20",
    hasError
      ? "border-destructive focus:border-destructive focus:ring-destructive/20"
      : "border-input",
  ].join(" ");
}
import type {
  ItemDraftForm,
  RfqDraftItem,
  RfqProductOption,
  RfqUnitOption,
} from "./types";

export function formatCurrency(
  value: number,
  currencyCode: string,
) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: currencyCode || "AED",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function calculateItemLineTotal(
  item: RfqDraftItem,
) {
  if (item.targetUnitPrice === null) {
    return null;
  }

  return item.requestedQuantity * item.targetUnitPrice;
}

export function calculateItemsTargetValue(
  items: RfqDraftItem[],
) {
  return items.reduce((total, item) => {
    const lineTotal = calculateItemLineTotal(item);

    return lineTotal === null
      ? total
      : total + lineTotal;
  }, 0);
}

export function calculateTotalQuantity(
  items: RfqDraftItem[],
) {
  return items.reduce(
    (total, item) => total + item.requestedQuantity,
    0,
  );
}

export function countCustomItems(
  items: RfqDraftItem[],
) {
  return items.filter((item) => item.productId === null)
    .length;
}

export function filterRfqProducts(
  products: RfqProductOption[],
  searchQuery: string,
) {
  const query = searchQuery.trim().toLowerCase();

  if (!query) {
    return products;
  }

  return products.filter((product) => {
    return (
      product.name.toLowerCase().includes(query) ||
      product.sku?.toLowerCase().includes(query) ||
      product.brand?.name.toLowerCase().includes(query) ||
      product.category?.name
        .toLowerCase()
        .includes(query)
    );
  });
}

export function createItemDraftFromProduct(
  product: RfqProductOption,
): ItemDraftForm {
  return {
    productId: product.id,
    itemName: product.name,
    productSku: product.sku ?? "",
    itemDescription: product.short_description ?? "",
    requestedQuantity: String(
      product.moq && product.moq > 0
        ? product.moq
        : 1,
    ),
    unitId: product.unit_id ?? product.unit?.id ?? "",
    targetUnitPrice: "",
    targetDeliveryDate: "",
    specifications: "",
    packagingRequirements: product.packaging ?? "",
    notes: "",
  };
}

export function createRfqDraftItem(
  itemDraft: ItemDraftForm,
  unit: RfqUnitOption,
  id: string,
): RfqDraftItem {
  const parsedTargetPrice =
    itemDraft.targetUnitPrice.trim() === ""
      ? null
      : Number(itemDraft.targetUnitPrice);

  return {
    id,
    productId: itemDraft.productId || null,
    itemName: itemDraft.itemName.trim(),
    productSku: itemDraft.productSku.trim() || null,
    itemDescription: itemDraft.itemDescription.trim(),
    requestedQuantity: Number(
      itemDraft.requestedQuantity,
    ),
    unitId: unit.id,
    unitName: unit.short_name || unit.name,
    targetUnitPrice:
      parsedTargetPrice !== null &&
      Number.isFinite(parsedTargetPrice)
        ? parsedTargetPrice
        : null,
    targetDeliveryDate: itemDraft.targetDeliveryDate,
    specifications: itemDraft.specifications.trim(),
    packagingRequirements:
      itemDraft.packagingRequirements.trim(),
    notes: itemDraft.notes.trim(),
  };
}
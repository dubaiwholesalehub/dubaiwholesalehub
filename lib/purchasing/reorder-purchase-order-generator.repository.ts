import {
  createGeneratedPurchaseOrder,
  type PurchaseOrderRow,
} from "@/lib/purchasing/purchase-order-generator.repository";

export interface ReorderPurchaseItemInput {
  productId: string;

  productName: string;

  supplierId: string | null;

  supplierName: string | null;

  quantity: number;

  unitPrice: number | null;

  currencyCode: string;

  leadTimeDays: number | null;

  reason?: string | null;
}

export interface GeneratedReorderPurchaseOrder {
  supplierId: string;

  supplierName: string;

  purchaseOrder: PurchaseOrderRow;

  itemCount: number;

  totalQuantity: number;
}

export interface GenerateReorderPurchaseOrdersResult {
  purchaseOrders:
    GeneratedReorderPurchaseOrder[];

  skippedItems: {
    productId: string;

    productName: string;

    reason: string;
  }[];
}

/* =========================================================
 * Validation
 * ========================================================= */

function validateQuantity(
  quantity: number,
  productName: string,
): void {
  if (
    !Number.isFinite(
      quantity,
    ) ||
    quantity <= 0
  ) {
    throw new Error(
      `Invalid reorder quantity for ${productName}.`,
    );
  }
}

function validateUnitPrice(
  unitPrice: number,
  productName: string,
): void {
  if (
    !Number.isFinite(
      unitPrice,
    ) ||
    unitPrice < 0
  ) {
    throw new Error(
      `Invalid supplier cost for ${productName}.`,
    );
  }
}

/* =========================================================
 * Batch Reorder PO Generator
 * ========================================================= */

export async function generateReorderPurchaseOrders(
  items:
    ReorderPurchaseItemInput[],
): Promise<GenerateReorderPurchaseOrdersResult> {
  if (
    items.length === 0
  ) {
    throw new Error(
      "Select at least one reorder recommendation.",
    );
  }

  const skippedItems:
    GenerateReorderPurchaseOrdersResult["skippedItems"] =
    [];

  /*
   * Group valid recommendations by:
   *
   * supplier + currency
   *
   * We should not place different currencies
   * on the same Purchase Order.
   */
  const groups =
    new Map<
      string,
      {
        supplierId: string;

        supplierName: string;

        currencyCode: string;

        items:
          ReorderPurchaseItemInput[];
      }
    >();

  for (
    const item of
    items
  ) {
    const productId =
      item.productId.trim();

    const productName =
      item.productName.trim() ||
      "Unnamed product";

    if (!productId) {
      skippedItems.push({
        productId:
          item.productId,

        productName,

        reason:
          "Product ID is missing.",
      });

      continue;
    }

    if (!item.supplierId) {
      skippedItems.push({
        productId,

        productName,

        reason:
          "No supplier is mapped to this product.",
      });

      continue;
    }

    if (
      item.unitPrice ===
      null
    ) {
      skippedItems.push({
        productId,

        productName,

        reason:
          "Supplier purchase cost is unavailable.",
      });

      continue;
    }

    validateQuantity(
      item.quantity,
      productName,
    );

    validateUnitPrice(
      item.unitPrice,
      productName,
    );

    const supplierId =
      item.supplierId.trim();

    if (!supplierId) {
      skippedItems.push({
        productId,

        productName,

        reason:
          "Supplier ID is missing.",
      });

      continue;
    }

    const supplierName =
      item.supplierName?.trim() ||
      "Unknown supplier";

    const currencyCode =
      (
        item.currencyCode ||
        "AED"
      )
        .trim()
        .toUpperCase();

    if (
      currencyCode.length !==
      3
    ) {
      skippedItems.push({
        productId,

        productName,

        reason:
          "Supplier currency code is invalid.",
      });

      continue;
    }

    const groupKey =
      `${supplierId}:${currencyCode}`;

    const group =
      groups.get(
        groupKey,
      ) ?? {
        supplierId,

        supplierName,

        currencyCode,

        items: [],
      };

    group.items.push(
      item,
    );

    groups.set(
      groupKey,
      group,
    );
  }

  if (
    groups.size === 0
  ) {
    throw new Error(
      "None of the selected recommendations can generate a Purchase Order. Check supplier mappings and purchase costs.",
    );
  }

  const purchaseOrders:
    GeneratedReorderPurchaseOrder[] =
    [];

  /*
   * Create one Purchase Order per
   * supplier/currency group.
   *
   * We intentionally do this sequentially
   * rather than Promise.all so failures are
   * easier to trace and PO numbering remains
   * predictable in logs.
   */
  for (
    const group of
    groups.values()
  ) {
    const maxLeadTimeDays =
      group.items.reduce(
        (
          maximum,
          item,
        ) =>
          Math.max(
            maximum,
            item.leadTimeDays ??
              0,
          ),
        0,
      );

    const purchaseOrder =
      await createGeneratedPurchaseOrder({
        supplierId:
          group.supplierId,

        source:
          "reorder",

        currencyCode:
          group.currencyCode,

        leadTimeDays:
          maxLeadTimeDays >
          0
            ? maxLeadTimeDays
            : null,

        internalNotes:
          "Generated from HM ERP Reorder Intelligence.",

        items:
          group.items.map(
            (item) => ({
              productId:
                item.productId,

              quantity:
                item.quantity,

              unitPrice:
                item.unitPrice ??
                0,

              leadTimeDays:
                item.leadTimeDays,

              notes:
                item.reason
                  ? `Reorder recommendation: ${item.reason}`
                  : "Generated from Reorder Intelligence.",
            }),
          ),
      });

    purchaseOrders.push({
      supplierId:
        group.supplierId,

      supplierName:
        group.supplierName,

      purchaseOrder,

      itemCount:
        group.items.length,

      totalQuantity:
        group.items.reduce(
          (
            total,
            item,
          ) =>
            total +
            item.quantity,
          0,
        ),
    });
  }

  return {
    purchaseOrders,

    skippedItems,
  };
}
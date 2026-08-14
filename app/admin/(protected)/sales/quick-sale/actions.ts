"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";

import {
  addSalesOrderItems,
  confirmSalesOrder,
  createSalesOrder,
} from "@/lib/repositories/sales-order.repository";

import {
  createDeliveryFromSalesOrder,
  startDeliveryPicking,
  confirmDeliveryPicked,
  startDeliveryPacking,
  confirmDeliveryPacked,
  dispatchDeliveryOrder,
  markDeliveryDelivered,
} from "@/lib/repositories/delivery-order.repository";

import {
  postLocalPurchaseInventory,
} from "@/lib/inventory/inventory-operation.repository";

import type {
  CompleteQuickSaleInput,
  CompleteQuickSaleResult,
} from "@/components/admin/sales/quick-sale/quick-sale-types";

function cleanText(
  value:
    | string
    | undefined,
) {
  const cleaned =
    value?.trim();

  return cleaned || null;
}

export async function completeQuickSale(
  input: CompleteQuickSaleInput,
): Promise<CompleteQuickSaleResult> {
  await requireAdmin();

  try {
    if (!input.customerId) {
      throw new Error(
        "Please select a customer.",
      );
    }

    if (!input.warehouseId) {
      throw new Error(
        "Please select a warehouse.",
      );
    }

    if (!input.saleDate) {
      throw new Error(
        "Sale date is required.",
      );
    }

    if (
      !input.items ||
      input.items.length === 0
    ) {
      throw new Error(
        "Add at least one sale item.",
      );
    }

    if (
      input.items.length > 100
    ) {
      throw new Error(
        "A maximum of 100 items can be posted in one Quick Sale.",
      );
    }

    if (
      input.taxTreatment ===
        "export_verified" ||
      input.taxTreatment ===
        "export_pending"
    ) {
      if (
        !input.destinationCountryId
      ) {
        throw new Error(
          "Destination country is required for export sales.",
        );
      }
    }

    for (
      const item of
      input.items
    ) {
      if (!item.productId) {
        throw new Error(
          "Every sale line must have a product.",
        );
      }

      if (
        !Number.isFinite(
          item.quantity,
        ) ||
        item.quantity <= 0
      ) {
        throw new Error(
          "Every item must have a valid quantity.",
        );
      }

      if (
        !Number.isFinite(
          item.sellingPrice,
        ) ||
        item.sellingPrice < 0
      ) {
        throw new Error(
          "Every item must have a valid selling price.",
        );
      }

      if (
        item.fulfilment ===
        "local_purchase"
      ) {
        if (
          !Number.isFinite(
            item.purchaseCost,
          ) ||
          (item.purchaseCost ??
            0) < 0
        ) {
          throw new Error(
            "Local purchase items require a valid purchase cost.",
          );
        }
      }
    }

    /*
     * ---------------------------------------------------------
     * Step 1
     * Group local-purchase items by supplier.
     *
     * The existing local purchase RPC accepts one supplier
     * per posting, so different suppliers require separate
     * inventory transactions.
     * ---------------------------------------------------------
     */

    const localPurchaseGroups =
      new Map<
        string,
        {
          supplierId:
            | string
            | undefined;

          items: Array<{
            productId: string;
            quantity: number;
            unitCost: number;
          }>;
        }
      >();

    for (
      const item of
      input.items
    ) {
      if (
        item.fulfilment !==
        "local_purchase"
      ) {
        continue;
      }

      const key =
        item.supplierId ||
        "__NO_SUPPLIER__";

      const existing =
        localPurchaseGroups.get(
          key,
        );

      const purchaseItem = {
        productId:
          item.productId,

        quantity:
          item.quantity,

        unitCost:
          item.purchaseCost ??
          0,
      };

      if (existing) {
        existing.items.push(
          purchaseItem,
        );

        continue;
      }

      localPurchaseGroups.set(
        key,
        {
          supplierId:
            item.supplierId ||
            undefined,

          items: [
            purchaseItem,
          ],
        },
      );
    }

    /*
     * ---------------------------------------------------------
     * Step 2
     * Receive local purchases into warehouse.
     * ---------------------------------------------------------
     */

    for (
      const group of
      localPurchaseGroups.values()
    ) {
      await postLocalPurchaseInventory(
        {
          warehouseId:
            input.warehouseId,

          transactionDate:
            input.saleDate,

          supplierId:
            group.supplierId,

          paymentMethod:
            input.paymentMethod,

          internalNotes:
            "Posted automatically from Quick Sale.",

          items:
            group.items,
        },
      );
    }

    /*
     * ---------------------------------------------------------
     * Step 3
     * Create Sales Order header.
     * ---------------------------------------------------------
     */

    const taxLabel =
      input.taxTreatment ===
      "local_5"
        ? "UAE Local Sale - 5% VAT"
        : input.taxTreatment ===
            "export_verified"
          ? "Export - Evidence Verified - 0% VAT"
          : input.taxTreatment ===
              "export_pending"
            ? "Export - Evidence Pending"
            : "Tax Treatment - Review Required";

    const exportNotes = [
      taxLabel,

      input.destinationCountryId
        ? `Destination Country ID: ${input.destinationCountryId}`
        : null,

      cleanText(
        input.cargoCompany,
      )
        ? `Cargo Company: ${input.cargoCompany?.trim()}`
        : null,

      cleanText(
        input.cargoReference,
      )
        ? `Cargo Reference: ${input.cargoReference?.trim()}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    const salesOrder =
      await createSalesOrder({
        customer_id:
          input.customerId,

        warehouse_id:
          input.warehouseId,

        order_date:
          input.saleDate,

        currency_code:
          "AED",

        exchange_rate: 1,

        source:
          "internal",

        payment_terms:
          input.paymentMethod ===
          "credit"
            ? "Credit Sale"
            : input.paymentMethod ===
                "partial"
              ? "Partial Payment"
              : input.paymentMethod ===
                  "bank"
                ? "Bank Payment"
                : "Cash Payment",

        internal_notes:
          [
            "Created from Quick Sale.",
            exportNotes,
          ]
            .filter(Boolean)
            .join("\n"),
      });

    /*
     * ---------------------------------------------------------
     * Step 4
     * Load products required by sales-order lines.
     * ---------------------------------------------------------
     */

    const { supabase } =
      await requireAdmin();

    const productIds =
      Array.from(
        new Set(
          input.items.map(
            (item) =>
              item.productId,
          ),
        ),
      );

    const {
      data: products,
      error: productsError,
    } = await supabase
      .from("products")
      .select(`
        id,
        name,
        sku,
        unit_id
      `)
      .in(
        "id",
        productIds,
      );

    if (productsError) {
      throw new Error(
        `Unable to load Quick Sale products: ${productsError.message}`,
      );
    }

    const productMap =
      new Map(
        (
          products ?? []
        ).map(
          (product) => [
            product.id,
            product,
          ],
        ),
      );

    if (
      productMap.size !==
      productIds.length
    ) {
      throw new Error(
        "One or more selected products could not be found.",
      );
    }

    /*
     * ---------------------------------------------------------
     * Step 5
     * Add all Sales Order items.
     *
     * Important:
     * Local Purchase items have already been received into
     * inventory, so they are now treated as STOCK lines for
     * reservation and delivery.
     * ---------------------------------------------------------
     */

    const taxPercentage =
      input.taxTreatment ===
      "local_5"
        ? 5
        : 0;

    await addSalesOrderItems(
      salesOrder.id,
      input.items.map(
        (item) => {
          const product =
            productMap.get(
              item.productId,
            );

          if (!product) {
            throw new Error(
              "Unable to resolve Quick Sale product.",
            );
          }

          return {
            product_id:
              product.id,

            unit_id:
              product.unit_id ??
              null,

            warehouse_id:
              input.warehouseId,

            sku:
              product.sku ??
              null,

            item_name:
              product.name,

            quantity:
              item.quantity,

            unit_price:
              item.sellingPrice,

            discount_percentage:
              0,

            tax_percentage:
              taxPercentage,

            fulfilment_method:
              "stock" as const,

            procurement_lead_time_days:
              0,

            allow_backorder:
              false,

            line_notes:
              item.fulfilment ===
              "local_purchase"
                ? `Quick Sale local purchase. Purchase cost: AED ${(item.purchaseCost ?? 0).toFixed(2)}`
                : "Quick Sale stock item.",
          };
        },
      ),
    );

    /*
     * ---------------------------------------------------------
     * Step 6
     * Confirm order / reserve stock.
     * ---------------------------------------------------------
     */

    const confirmed =
      await confirmSalesOrder(
        salesOrder.id,
        {
          allowNegativeStock:
            false,
        },
      );

    /*
     * ---------------------------------------------------------
     * Step 7
     * Create delivery.
     * ---------------------------------------------------------
     */

    const delivery =
      await createDeliveryFromSalesOrder(
        salesOrder.id,
      );

    /*
     * ---------------------------------------------------------
     * Step 8
     * Optional immediate delivery.
     * ---------------------------------------------------------
     */

    if (
      input.deliveryMode ===
      "now"
    ) {
      await startDeliveryPicking(
        delivery.id,
      );

      await confirmDeliveryPicked(
        delivery.id,
      );

      await startDeliveryPacking(
        delivery.id,
      );

      await confirmDeliveryPacked(
        delivery.id,
      );

      await dispatchDeliveryOrder(
        delivery.id,
      );

      await markDeliveryDelivered(
        delivery.id,
      );
    }

    revalidatePath(
      "/admin/sales/quick-sale",
    );

    revalidatePath(
      "/admin/sales/orders",
    );

    revalidatePath(
      `/admin/sales/orders/${salesOrder.id}`,
    );

    revalidatePath(
      "/admin/sales/deliveries",
    );

    revalidatePath(
      "/admin/inventory",
    );

    revalidatePath(
      "/admin/inventory/stock",
    );

    return {
      success: true,

      salesOrderId:
        salesOrder.id,

      orderNumber:
        confirmed.order
          .order_number,

      deliveryOrderId:
        delivery.id,

      message:
        input.deliveryMode ===
        "now"
          ? "Quick Sale completed and delivered successfully."
          : "Quick Sale created successfully. Delivery remains pending.",
    };
  } catch (error) {
    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Unable to complete Quick Sale.",
    };
  }
}
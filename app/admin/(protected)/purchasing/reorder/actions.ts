"use server";

import { revalidatePath } from "next/cache";

import {
  getReorderSupplierAdvice,
} from "@/lib/purchasing/reorder-supplier-advisor.repository";

import {
  generateReorderPurchaseOrders,
} from "@/lib/purchasing/reorder-purchase-order-generator.repository";

/* =========================================================
 * Result Types
 * ========================================================= */

export interface GeneratedPurchaseOrderResult {
  id: string;

  poNumber: string;

  supplierId: string;

  supplierName: string;

  itemCount: number;

  totalQuantity: number;

  totalAmount: number;

  currencyCode: string;
}

export interface ReorderPurchaseOrderActionResult {
  success: boolean;

  message: string;

  purchaseOrders:
  GeneratedPurchaseOrderResult[];

  skippedItems: {
    productId: string;

    productName: string;

    reason: string;
  }[];
}

/* =========================================================
 * Helpers
 * ========================================================= */

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message ===
    "string"
  ) {
    return error.message;
  }

  return fallback;
}

/* =========================================================
 * Generate Purchase Orders From Reorder Intelligence
 * ========================================================= */

export async function generateReorderPurchaseOrdersAction(
  selectedProductIds: string[],
): Promise<ReorderPurchaseOrderActionResult> {
  try {
    /*
     * Never trust quantities, prices or suppliers
     * sent by the browser.
     *
     * Browser sends product IDs only.
     * Server recalculates the recommendation.
     */

    const cleanedProductIds =
      [
        ...new Set(
          selectedProductIds
            .map(
              (value) =>
                value.trim(),
            )
            .filter(Boolean),
        ),
      ];

    if (
      cleanedProductIds.length ===
      0
    ) {
      return {
        success: false,

        message:
          "Select at least one product.",

        purchaseOrders: [],

        skippedItems: [],
      };
    }

    /*
     * Recalculate current reorder intelligence
     * immediately before generating POs.
     */

    /*
 * Recalculate current reorder + supplier intelligence
 * immediately before generating POs.
 *
 * Never trust the supplier, quantity or price that was
 * previously displayed in the browser.
 */

    const advisor =
      await getReorderSupplierAdvice();

    const selectedIdSet =
      new Set(
        cleanedProductIds,
      );

    const currentRecommendations =
      advisor.recommendations.filter(
        (recommendation) =>
          selectedIdSet.has(
            recommendation.productId,
          ),
      );

    const skippedItems:
      ReorderPurchaseOrderActionResult["skippedItems"] =
      [];

    /*
     * Products may have changed since the page
     * was originally rendered.
     */

    for (
      const productId of
      cleanedProductIds
    ) {
      const recommendation =
        currentRecommendations.find(
          (item) =>
            item.productId ===
            productId,
        );

      if (!recommendation) {
        skippedItems.push({
          productId,

          productName:
            "Unknown product",

          reason:
            "Product is no longer available in the reorder engine.",
        });

        continue;
      }

      if (
        recommendation
          .originalSuggestedQuantity <=
        0
      ) {
        skippedItems.push({
          productId:
            recommendation.productId,

          productName:
            recommendation.productName,

          reason:
            "The product no longer requires replenishment.",
        });

        continue;
      }

      if (
        !recommendation
          .hasSupplierRecommendation
      ) {
        skippedItems.push({
          productId:
            recommendation.productId,

          productName:
            recommendation.productName,

          reason:
            "No eligible supplier with a valid purchase cost is currently available.",
        });
      }
    }

    const eligibleRecommendations =
      currentRecommendations.filter(
        (recommendation) =>
          recommendation
            .originalSuggestedQuantity >
          0 &&
          recommendation
            .hasSupplierRecommendation &&
          recommendation
            .recommendedSupplierId !==
          null &&
          recommendation
            .recommendedUnitCost !==
          null,
      );

    if (
      eligibleRecommendations.length ===
      0
    ) {
      return {
        success: false,

        message:
          "None of the selected products currently require replenishment.",

        purchaseOrders: [],

        skippedItems,
      };
    }

    /*
     * Convert fresh recommendations into
     * batch generator inputs.
     */

    const generationResult =
      await generateReorderPurchaseOrders(
        eligibleRecommendations.map(
          (recommendation) => ({
            productId:
              recommendation.productId,

            productName:
              recommendation.productName,

            /*
             * Supplier Comparison v2 recommendation.
             */
            supplierId:
              recommendation
                .recommendedSupplierId,

            supplierName:
              recommendation
                .recommendedSupplierName,

            /*
             * Final supplier-aware quantity.
             *
             * This may be higher than the original reorder
             * quantity because of supplier MOQ.
             */
            quantity:
              recommendation
                .recommendedPurchaseQuantity,

            /*
             * Recalculate current effective supplier price
             * server-side immediately before PO creation.
             */
            unitPrice:
              recommendation
                .recommendedUnitCost,

            currencyCode:
              recommendation
                .currencyCode,

            leadTimeDays:
              recommendation
                .recommendedLeadTimeDays,

            /*
             * Preserve the intelligence explanation on the
             * generated purchasing decision.
             */
            reason:
              recommendation.reason,
          }),
        ),
      );
    /*
     * Include generator-level skips such as
     * missing supplier or missing cost.
     */

    skippedItems.push(
      ...generationResult.skippedItems,
    );

    const purchaseOrders:
      GeneratedPurchaseOrderResult[] =
      generationResult.purchaseOrders.map(
        (generated) => ({
          id:
            generated.purchaseOrder.id,

          poNumber:
            generated.purchaseOrder
              .po_number,

          supplierId:
            generated.supplierId,

          supplierName:
            generated.supplierName,

          itemCount:
            generated.itemCount,

          totalQuantity:
            generated.totalQuantity,

          totalAmount:
            Number(
              generated.purchaseOrder
                .total_amount ??
              0,
            ),

          currencyCode:
            generated.purchaseOrder
              .currency_code,
        }),
      );

    /*
     * Refresh every purchasing screen that is
     * affected by the newly created draft POs.
     */

    revalidatePath(
      "/admin/purchasing/reorder",
    );

    revalidatePath(
      "/admin/purchasing",
    );

    revalidatePath(
      "/admin/purchase-orders",
    );

    const poCount =
      purchaseOrders.length;

    return {
      success: true,

      message:
        `${poCount} Purchase Order${poCount === 1
          ? ""
          : "s"
        } created successfully.`,

      purchaseOrders,

      skippedItems,
    };
  } catch (error) {
    return {
      success: false,

      message:
        getErrorMessage(
          error,
          "Unable to generate Purchase Orders.",
        ),

      purchaseOrders: [],

      skippedItems: [],
    };
  }
}
"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";

import {
  addSalesOrderItems,
  approveSalesMarginException,
  confirmSalesOrder,
  createSalesOrder,
  getSalesOrderMarginAnalysis,
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

import {
  getCustomerAvailableAdvance,
  postCustomerReceipt,
} from "@/lib/repositories/customer-receipt.repository";

function cleanText(
  value:
    | string
    | undefined,
) {
  const cleaned =
    value?.trim();

  return cleaned || null;
}

export async function loadCustomerAvailableAdvance(
  customerId: string,
): Promise<number> {
  await requireAdmin();

  if (!customerId) {
    return 0;
  }

  return getCustomerAvailableAdvance(
    customerId,
    "AED",
  );
}

export async function completeQuickSale(
  input: CompleteQuickSaleInput,
): Promise<CompleteQuickSaleResult> {
  const {
    supabase,
  } =
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
        !Number.isFinite(
          input.amountReceived,
        ) ||
        input.amountReceived < 0
      ) {
        throw new Error(
          "Amount received cannot be negative.",
        );
      }

      if (
        input.paymentStatus ===
        "credit" &&
        input.amountReceived !== 0
      ) {
        throw new Error(
          "Credit sales cannot contain an amount received.",
        );
      }

      if (
        input.paymentStatus !==
        "credit" &&
        input.amountReceived <= 0
      ) {
        throw new Error(
          "Paid and partial sales require an amount received.",
        );
      }

      if (
        input.paymentMethod ===
        "cheque" &&
        input.paymentStatus !==
        "credit" &&
        !input.chequeNumber?.trim()
      ) {
        throw new Error(
          "Cheque number is required for cheque payments.",
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
 * Quick Sale Margin Preflight
 *
 * This runs BEFORE:
 *
 * - Sales Order creation
 * - local purchase inventory posting
 * - inventory reservation
 * - delivery
 * - customer receipt
 *
 * Cost source:
 *
 * Local Purchase
 *   -> entered purchaseCost
 *
 * Warehouse Stock
 *   -> current warehouse average_unit_cost
 *
 * This is an early safety check only.
 *
 * The authoritative Sales Order margin analysis still runs
 * after Sales Order items are created.
 * ---------------------------------------------------------
 */


    /*
     * Load active margin policy.
     */

    const {
      data: marginPolicy,
      error: marginPolicyError,
    } =
      await supabase
        .from(
          "sales_margin_policy",
        )
        .select(`
      minimum_margin_percentage,
      warning_margin_percentage
    `)
        .eq(
          "is_active",
          true,
        )
        .limit(
          1,
        )
        .maybeSingle();


    if (marginPolicyError) {
      throw new Error(
        `Unable to load margin policy: ${marginPolicyError.message}`,
      );
    }


    const minimumMarginPercentage =
      Number(
        marginPolicy
          ?.minimum_margin_percentage ??
        0,
      );


    /*
     * Only stock items need warehouse cost lookup.
     *
     * Local-purchase items already contain the exact
     * transaction-specific purchase cost.
     */

    const stockProductIds =
      Array.from(
        new Set(
          input.items
            .filter(
              (item) =>
                item.fulfilment ===
                "stock",
            )
            .map(
              (item) =>
                item.productId,
            ),
        ),
      );


    const stockCostByProductId =
      new Map<
        string,
        number
      >();


    if (
      stockProductIds.length >
      0
    ) {
      const {
        data: stockRows,
        error: stockError,
      } =
        await supabase
          .from(
            "warehouse_stock",
          )
          .select(`
        product_id,
        average_unit_cost
      `)
          .eq(
            "warehouse_id",
            input.warehouseId,
          )
          .in(
            "product_id",
            stockProductIds,
          );


      if (stockError) {
        throw new Error(
          `Unable to load inventory cost for margin validation: ${stockError.message}`,
        );
      }


      for (
        const row of
        stockRows ?? []
      ) {
        stockCostByProductId.set(
          row.product_id,
          Number(
            row.average_unit_cost ??
            0,
          ),
        );
      }
    }


    /*
     * Determine whether any line requires management approval.
     */

    let preflightApprovalRequired =
      false;

    let lowestPreflightMargin:
      number | null =
      null;


    for (
      const item of
      input.items
    ) {
      const unitCost =
        item.fulfilment ===
          "local_purchase"
          ? item.purchaseCost ??
          0
          : stockCostByProductId.get(
            item.productId,
          ) ??
          0;


      /*
       * Missing / zero cost requires review.
       *
       * We do not silently treat unknown cost as profit.
       */
      if (
        unitCost <=
        0
      ) {
        preflightApprovalRequired =
          true;

        continue;
      }


      const lineRevenue =
        item.quantity *
        item.sellingPrice;


      const lineCost =
        item.quantity *
        unitCost;


      const lineProfit =
        lineRevenue -
        lineCost;


      const lineMargin =
        lineRevenue >
          0
          ? (
            lineProfit /
            lineRevenue
          ) *
          100
          : null;


      if (
        lineMargin ===
        null
      ) {
        preflightApprovalRequired =
          true;

        continue;
      }


      lowestPreflightMargin =
        lowestPreflightMargin ===
          null
          ? lineMargin
          : Math.min(
            lowestPreflightMargin,
            lineMargin,
          );


      if (
        lineMargin <
        minimumMarginPercentage
      ) {
        preflightApprovalRequired =
          true;
      }
    }


    /*
     * Reject BEFORE creating any business document when
     * approval is required but no reason was supplied.
     */

    if (
      preflightApprovalRequired
    ) {
      const approvalReason =
        cleanText(
          input.marginApprovalReason,
        );


      if (!approvalReason) {
        throw new Error(
          lowestPreflightMargin !==
            null
            ? `Admin approval is required because this Quick Sale contains a margin below the minimum allowed margin. Lowest margin: ${lowestPreflightMargin.toFixed(
              2,
            )}%. Please select an approval reason.`
            : "Admin approval is required because one or more Quick Sale items do not have a valid cost. Please select an approval reason.",
        );
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
          input.paymentStatus === "credit"
            ? "Credit Sale"
            : input.paymentStatus === "partial"
              ? "Partial Payment"
              : "Paid in Full",

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

            margin_cost_override:
              item.fulfilment ===
                "local_purchase"
                ? item.purchaseCost ??
                0
                : null,

            margin_cost_override_reason:
              item.fulfilment ===
                "local_purchase"
                ? "Quick Sale local purchase"
                : null,

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
 * Margin Protection
 *
 * Analyse the completed Sales Order lines BEFORE:
 *
 * - local purchase inventory posting
 * - inventory reservation
 * - delivery
 * - receipt
 *
 * Quick Sale local-purchase lines already contain their
 * explicit margin_cost_override at this point.
 * ---------------------------------------------------------
 */

    const marginAnalysis =
      await getSalesOrderMarginAnalysis(
        salesOrder.id,
      );


    const approvalRequired =
      marginAnalysis.some(
        (line) =>
          line.marginStatus ===
          "blocked" ||
          line.marginStatus ===
          "cost_missing",
      );


    if (approvalRequired) {
      const approvalReason =
        cleanText(
          input.marginApprovalReason,
        );


      if (!approvalReason) {
        throw new Error(
          "This sale requires admin margin approval. Please select an approval reason.",
        );
      }


      await approveSalesMarginException(
        salesOrder.id,
        approvalReason,
      );
    }

    /*
 * ---------------------------------------------------------
 * Receive approved local purchases into warehouse.
 *
 * Margin protection has already passed before inventory
 * is changed.
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
            "quick_sale",

          internalNotes:
            `Posted automatically from Quick Sale ${salesOrder.order_number}.`,

          items:
            group.items,
        },
      );
    }

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

    /*
    * ---------------------------------------------------------
    * Step 9
    * Customer Receipt
    *
    * Customer advance has already been applied inside
    * confirmSalesOrder().
    *
    * Therefore:
    *
    * confirmed.order.balance_due
    * =
    * amount still outstanding AFTER existing customer advance.
    *
    * Only genuinely new money received now creates a new
    * Customer Receipt.
    * ---------------------------------------------------------
    */

    let receiptId:
      | string
      | null = null;


    /*
     * Amount remaining after customer advance.
     */

    const remainingAfterAdvance =
      Number(
        confirmed.order
          .balance_due,
      );


    if (
      !Number.isFinite(
        remainingAfterAdvance,
      ) ||
      remainingAfterAdvance < 0
    ) {
      throw new Error(
        "Unable to determine the Sales Order balance after customer advance.",
      );
    }


    /*
     * ---------------------------------------------------------
     * Validate payment selected on Quick Sale
     * ---------------------------------------------------------
     */

    if (
      input.paymentStatus ===
      "paid"
    ) {
      /*
       * Paid means the NEW payment must settle whatever remains
       * after customer advance.
       *
       * If advance paid the entire order, the required new
       * payment is zero.
       */

      if (
        Math.abs(
          input.amountReceived -
          remainingAfterAdvance,
        ) > 0.01
      ) {
        throw new Error(
          `Paid Now amount must equal the remaining balance after customer advance: AED ${remainingAfterAdvance.toFixed(2)}.`,
        );
      }
    }


    if (
      input.paymentStatus ===
      "partial"
    ) {
      if (
        !Number.isFinite(
          input.amountReceived,
        ) ||
        input.amountReceived <= 0
      ) {
        throw new Error(
          "Partial payment must be greater than zero.",
        );
      }


      if (
        input.amountReceived >=
        remainingAfterAdvance
      ) {
        throw new Error(
          "Partial payment must be less than the remaining balance after customer advance.",
        );
      }
    }


    if (
      input.paymentStatus ===
      "credit" &&
      input.amountReceived >
      0
    ) {
      throw new Error(
        "Credit Sale cannot include a new payment.",
      );
    }


    /*
     * ---------------------------------------------------------
     * Create receipt ONLY for new money received now.
     *
     * Existing advance is already represented by its original
     * Customer Receipt and allocation.
     * ---------------------------------------------------------
     */
    if (
      input.amountReceived > 0 &&
      !input.financialAccountId
    ) {
      throw new Error(
        "A financial account is required when receiving customer payment.",
      );
    }
    if (
      input.paymentStatus !==
      "credit" &&
      input.amountReceived >
      0
    ) {
      receiptId =
        await postCustomerReceipt({
          customerId:
            input.customerId,

          receiptDate:
            input.saleDate,

          paymentMethod:
            input.paymentMethod,

          financialAccountId:
            input.financialAccountId!,

          currencyCode:
            confirmed.order
              .currency_code,

          exchangeRate:
            confirmed.order
              .exchange_rate,

          amount:
            input.amountReceived,

          referenceNumber:
            input.paymentReference,

          bankName:
            input.bankName,

          chequeNumber:
            input.chequeNumber,

          chequeDate:
            input.chequeDate,

          notes:
            `Quick Sale payment for ${confirmed.order.order_number}`,

          allocations: [
            {
              salesOrderId:
                salesOrder.id,

              amount:
                input.amountReceived,
            },
          ],
        });
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

      receiptId,

      message:
        input.paymentStatus ===
          "credit"
          ? "Quick Sale completed successfully. Full amount remains outstanding."
          : input.paymentStatus ===
            "partial"
            ? "Quick Sale completed successfully with partial payment recorded."
            : "Quick Sale completed successfully and customer payment recorded.",
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
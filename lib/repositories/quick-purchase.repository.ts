import { createClient } from "@/lib/supabase/server";

import {
  postLocalPurchaseInventory,
} from "@/lib/inventory/inventory-operation.repository";
import {
  getSupplierAvailableAdvance,
  postSupplierPayment,
} from "@/lib/repositories/supplier-payment.repository";

export type QuickPurchaseTaxTreatment =
  | "standard_vat"
  | "no_vat"
  | "vat_pending"
  | "reverse_charge"
  | "review_required";

export type QuickPurchasePaymentStatus =
  | "paid"
  | "partial"
  | "credit";

export type QuickPurchasePaymentMethod =
  | "cash"
  | "bank"
  | "card"
  | "cheque"
  | "other";

export type QuickPurchaseItemInput = {
  productId: string;

  quantity: number;
  unitCost: number;

  taxPercentage: number;

  notes?: string;
};

export type CreateQuickPurchaseInput = {
  warehouseId: string;

  supplierId?: string;
  storeName?: string;

  purchaseDate: string;

  supplierInvoiceNumber?: string;
  supplierInvoiceDate?: string;
  supplierTrn?: string;

  currencyCode?: string;
  exchangeRate?: number;

  taxTreatment:
  QuickPurchaseTaxTreatment;

  paymentStatus:
  QuickPurchasePaymentStatus;

  paymentMethod?:
  QuickPurchasePaymentMethod;

  paidAmount: number;

  paymentReference?: string;

  notes?: string;

  items:
  QuickPurchaseItemInput[];
};

export type CreateQuickPurchaseResult = {
  id: string;
  purchaseNumber: string;
  inventoryTransactionId: string;

  subtotal: number;
  taxAmount: number;
  recoverableTaxAmount: number;
  pendingTaxAmount: number;
  grandTotal: number;

  paidAmount: number;
  balanceDue: number;
  paymentStatus: string;
  supplierAdvanceApplied: number;
  paidNow: number;
  supplierPaymentId: string | null;

};

function cleanText(
  value?: string,
) {
  const cleaned =
    value?.trim();

  return cleaned || null;
}

function roundMoney(
  value: number,
) {
  return Math.round(
    (value + Number.EPSILON) *
    100,
  ) / 100;
}

export async function createQuickPurchase(
  input: CreateQuickPurchaseInput,
): Promise<CreateQuickPurchaseResult> {
  const supabase =
    await createClient();

  if (!input.warehouseId) {
    throw new Error(
      "Warehouse is required.",
    );
  }

  if (!input.purchaseDate) {
    throw new Error(
      "Purchase date is required.",
    );
  }

  if (
    input.items.length === 0
  ) {
    throw new Error(
      "Add at least one purchase item.",
    );
  }

  if (
    input.items.length > 100
  ) {
    throw new Error(
      "A maximum of 100 products can be posted in one Quick Purchase.",
    );
  }

  for (
    const item of
    input.items
  ) {
    if (!item.productId) {
      throw new Error(
        "Every purchase line requires a product.",
      );
    }

    if (
      !Number.isFinite(
        item.quantity,
      ) ||
      item.quantity <= 0
    ) {
      throw new Error(
        "Purchase quantity must be greater than zero.",
      );
    }

    if (
      !Number.isFinite(
        item.unitCost,
      ) ||
      item.unitCost < 0
    ) {
      throw new Error(
        "Purchase cost cannot be negative.",
      );
    }

    if (
      !Number.isFinite(
        item.taxPercentage,
      ) ||
      item.taxPercentage < 0 ||
      item.taxPercentage > 100
    ) {
      throw new Error(
        "VAT percentage must be between 0 and 100.",
      );
    }
  }

  const duplicateProducts =
    input.items
      .map(
        (item) =>
          item.productId,
      )
      .filter(
        (
          productId,
          index,
          values,
        ) =>
          values.indexOf(
            productId,
          ) !== index,
      );

  if (
    duplicateProducts.length >
    0
  ) {
    throw new Error(
      "The same product cannot appear more than once in one Quick Purchase.",
    );
  }

  const calculatedItems =
    input.items.map(
      (item) => {
        const lineSubtotal =
          roundMoney(
            item.quantity *
            item.unitCost,
          );

        const taxAmount =
          roundMoney(
            lineSubtotal *
            (
              item.taxPercentage /
              100
            ),
          );

        return {
          ...item,

          lineSubtotal,
          taxAmount,

          lineTotal:
            roundMoney(
              lineSubtotal +
              taxAmount,
            ),
        };
      },
    );

  const subtotal =
    roundMoney(
      calculatedItems.reduce(
        (
          total,
          item,
        ) =>
          total +
          item.lineSubtotal,
        0,
      ),
    );

  const taxAmount =
    roundMoney(
      calculatedItems.reduce(
        (
          total,
          item,
        ) =>
          total +
          item.taxAmount,
        0,
      ),
    );

  const grandTotal =
    roundMoney(
      subtotal +
      taxAmount,
    );

  /*
* ---------------------------------------------------------
* Existing Supplier Advance
* ---------------------------------------------------------
*/

  const availableSupplierAdvance =
    input.supplierId
      ? await getSupplierAvailableAdvance(
        input.supplierId,
        input.currencyCode ??
        "AED",
      )
      : 0;

  const expectedAdvanceApplied =
    roundMoney(
      Math.min(
        availableSupplierAdvance,
        grandTotal,
      ),
    );

  const amountAfterAdvance =
    roundMoney(
      Math.max(
        grandTotal -
        expectedAdvanceApplied,
        0,
      ),
    );

  let recoverableTaxAmount =
    0;

  let pendingTaxAmount =
    0;

  if (
    input.taxTreatment ===
    "standard_vat"
  ) {
    recoverableTaxAmount =
      taxAmount;
  }

  if (
    input.taxTreatment ===
    "vat_pending"
  ) {
    pendingTaxAmount =
      taxAmount;
  }

  if (
    input.taxTreatment ===
    "no_vat"
  ) {
    if (
      taxAmount !== 0
    ) {
      throw new Error(
        "No VAT purchases cannot contain VAT amounts.",
      );
    }
  }

  /*
 * ---------------------------------------------------------
 * New Cash/Bank Payment
 *
 * Supplier advance is separate from the amount paid now.
 * ---------------------------------------------------------
 */

  let actualPaidNow = 0;

  if (
    input.paymentStatus ===
    "credit"
  ) {
    actualPaidNow = 0;
  }

  if (
    input.paymentStatus ===
    "paid"
  ) {
    /*
     * Paid Now means:
     *
     * supplier advance
     * +
     * current payment
     * =
     * purchase total
     */
    actualPaidNow =
      amountAfterAdvance;
  }

  if (
    input.paymentStatus ===
    "partial"
  ) {
    if (
      !Number.isFinite(
        input.paidAmount,
      ) ||
      input.paidAmount <= 0
    ) {
      throw new Error(
        "Partial payment must be greater than zero.",
      );
    }

    if (
      input.paidAmount >=
      amountAfterAdvance
    ) {
      throw new Error(
        "Partial payment must be less than the remaining amount after supplier advance.",
      );
    }

    actualPaidNow =
      roundMoney(
        input.paidAmount,
      );
  }


  /*
   * Initial balance before supplier advance is physically
   * allocated. applySupplierAdvanceToQuickPurchase() will
   * synchronize the final balance afterward.
   */

  const initialBalanceDue =
    roundMoney(
      grandTotal -
      actualPaidNow,
    );

  /*
   * Inventory cost should represent the product purchase
   * cost before recoverable VAT.
   *
   * We therefore send unitCost, not VAT-inclusive line cost,
   * to the existing inventory engine.
   */

  const inventoryTransactionId =
    await postLocalPurchaseInventory(
      {
        warehouseId:
          input.warehouseId,

        transactionDate:
          input.purchaseDate,

        supplierId:
          input.supplierId,

        storeName:
          input.storeName,

        receiptNumber:
          input.supplierInvoiceNumber,

        paymentMethod:
          input.paymentStatus ===
            "credit"
            ? "credit"
            : input.paymentMethod ??
            "other",

        internalNotes:
          [
            "Posted from Quick Purchase.",

            input.taxTreatment
              ? `VAT Treatment: ${input.taxTreatment}`
              : null,

            input.notes?.trim() ||
            null,
          ]
            .filter(Boolean)
            .join("\n"),

        items:
          calculatedItems.map(
            (item) => ({
              productId:
                item.productId,

              quantity:
                item.quantity,

              unitCost:
                item.unitCost,

              notes:
                item.notes,
            }),
          ),
      },
    );

  const purchaseNumber =
    `QP-${new Date(
      input.purchaseDate,
    ).getFullYear()}-${String(
      Date.now(),
    ).slice(-8)}`;

  const {
    data: purchase,
    error: purchaseError,
  } = await supabase
    .from("quick_purchases")
    .insert({
      purchase_number:
        purchaseNumber,

      purchase_date:
        input.purchaseDate,

      supplier_id:
        input.supplierId ??
        null,

      store_name:
        cleanText(
          input.storeName,
        ),

      warehouse_id:
        input.warehouseId,

      inventory_transaction_id:
        inventoryTransactionId,

      supplier_invoice_number:
        cleanText(
          input.supplierInvoiceNumber,
        ),

      supplier_invoice_date:
        input.supplierInvoiceDate ||
        null,

      supplier_trn:
        cleanText(
          input.supplierTrn,
        ),

      currency_code:
        input.currencyCode ??
        "AED",

      exchange_rate:
        input.exchangeRate ??
        1,

      tax_treatment:
        input.taxTreatment,

      tax_invoice_verified:
        input.taxTreatment ===
        "standard_vat",

      tax_invoice_verified_at:
        input.taxTreatment ===
          "standard_vat"
          ? new Date().toISOString()
          : null,

      subtotal,

      discount_amount: 0,

      tax_amount:
        taxAmount,

      recoverable_tax_amount:
        recoverableTaxAmount,

      pending_tax_amount:
        pendingTaxAmount,

      grand_total:
        grandTotal,

      /*
 * Registered suppliers:
 *
 * Payments are posted through supplier_payments after the
 * Quick Purchase exists.
 *
 * Unregistered/local-shop purchases cannot use the supplier
 * ledger, so their direct payment remains an opening payment
 * amount for now.
 */

      paid_amount:
        input.supplierId
          ? 0
          : actualPaidNow,

      balance_due:
        input.supplierId
          ? grandTotal
          : initialBalanceDue,

      payment_status:
        input.supplierId
          ? "unpaid"
          : actualPaidNow <= 0
            ? "unpaid"
            : actualPaidNow <
              grandTotal
              ? "partially_paid"
              : "paid",

      payment_method:
        input.paymentStatus ===
          "credit"
          ? null
          : input.paymentMethod ??
          null,

      payment_reference:
        cleanText(
          input.paymentReference,
        ),

      notes:
        cleanText(
          input.notes,
        ),

      status:
        "posted",
    })
    .select(`
      id,
      purchase_number
    `)
    .single();

  if (purchaseError) {
    throw new Error(
      `Inventory was received but Quick Purchase could not be created: ${purchaseError.message}`,
    );
  }

  const {
    error: itemsError,
  } = await supabase
    .from(
      "quick_purchase_items",
    )
    .insert(
      calculatedItems.map(
        (
          item,
          index,
        ) => ({
          quick_purchase_id:
            purchase.id,

          line_number:
            index + 1,

          product_id:
            item.productId,

          quantity:
            item.quantity,

          unit_cost:
            item.unitCost,

          line_subtotal:
            item.lineSubtotal,

          tax_percentage:
            item.taxPercentage,

          tax_amount:
            item.taxAmount,

          line_total:
            item.lineTotal,

          notes:
            cleanText(
              item.notes,
            ),
        }),
      ),
    );

  if (itemsError) {
    throw new Error(
      `Quick Purchase header was created but purchase items could not be saved: ${itemsError.message}`,
    );
  }

  /*
  * ---------------------------------------------------------
  * Automatically apply any existing supplier advance.
  *
  * This creates real supplier_payment_allocations rather than
  * simply reducing the purchase balance.
  * ---------------------------------------------------------
  */

  let supplierAdvanceApplied =
    0;

  if (
    input.supplierId
  ) {
    supplierAdvanceApplied =
      await applySupplierAdvanceToQuickPurchase(
        purchase.id,
      );
  }

  /*
 * ---------------------------------------------------------
 * Create Supplier Payment for money actually paid now.
 *
 * Existing supplier advance has already been applied above.
 *
 * Any NEW cash / bank / card / cheque / other payment must
 * become a real supplier_payments record with an allocation
 * against this Quick Purchase.
 * ---------------------------------------------------------
 */

  let supplierPaymentId:
    | string
    | null = null;

  if (
    input.supplierId &&
    actualPaidNow > 0
  ) {
    supplierPaymentId =
      await postSupplierPayment({
        supplierId:
          input.supplierId,

        paymentDate:
          input.purchaseDate,

        paymentMethod:
          input.paymentMethod ??
          "other",

        currencyCode:
          input.currencyCode ??
          "AED",

        exchangeRate:
          input.exchangeRate ??
          1,

        amount:
          actualPaidNow,

        referenceNumber:
          input.paymentReference,

        notes:
          `Payment posted automatically from Quick Purchase ${purchase.purchase_number}`,

        allocations: [
          {
            quickPurchaseId:
              purchase.id,

            amount:
              actualPaidNow,
          },
        ],
      });
  }

  const {
    data: finalPurchase,
    error: finalPurchaseError,
  } =
    await supabase
      .from(
        "quick_purchases",
      )
      .select(`
      paid_amount,
      balance_due,
      payment_status
    `)
      .eq(
        "id",
        purchase.id,
      )
      .single();

  if (
    finalPurchaseError
  ) {
    throw new Error(
      `Quick Purchase posted but final payment balance could not be loaded: ${finalPurchaseError.message}`,
    );
  }

  return {
    id:
      purchase.id,

    purchaseNumber:
      purchase.purchase_number,

    inventoryTransactionId,

    subtotal,
    taxAmount,
    recoverableTaxAmount,
    pendingTaxAmount,
    grandTotal,

    supplierAdvanceApplied,

    paidNow:
      actualPaidNow,

    supplierPaymentId,

    paidAmount:
      Number(
        finalPurchase.paid_amount,
      ),

    balanceDue:
      Number(
        finalPurchase.balance_due,
      ),

    paymentStatus:
      finalPurchase.payment_status,
  };
}

/* =========================================================
 * Auto Apply Supplier Advance
 * ========================================================= */

export async function applySupplierAdvanceToQuickPurchase(
  quickPurchaseId: string,
): Promise<number> {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "apply_supplier_advance_to_quick_purchase",
      {
        p_quick_purchase_id:
          quickPurchaseId,
      },
    );

  if (error) {
    throw new Error(
      `Unable to apply supplier advance: ${error.message}`,
    );
  }

  const amount =
    Number(
      data ?? 0,
    );

  return Number.isFinite(
    amount,
  )
    ? amount
    : 0;
}
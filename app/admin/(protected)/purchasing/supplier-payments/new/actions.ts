"use server";
import {
  revalidatePath,
} from "next/cache";

import {
  requireAdmin,
} from "@/lib/auth/require-admin";

import {
  getSupplierOutstandingPurchases,
  postSupplierPayment,
  type SupplierPaymentMethod,
} from "@/lib/repositories/supplier-payment.repository";


export async function loadSupplierOutstandingPurchases(
  supplierId: string,
) {
  await requireAdmin();

  if (!supplierId) {
    return [];
  }

  return getSupplierOutstandingPurchases(
    supplierId,
  );
}


export type CreateSupplierPaymentInput = {
  supplierId: string;

  paymentDate: string;

  paymentMethod:
  SupplierPaymentMethod;

  financialAccountId: string;

  amount: number;

  referenceNumber?: string;

  bankName?: string;

  chequeNumber?: string;
  chequeDate?: string;

  notes?: string;

  allocations: Array<
    | {
      quickPurchaseId: string;
      goodsReceiptId?: never;
      amount: number;
    }
    | {
      quickPurchaseId?: never;
      goodsReceiptId: string;
      amount: number;
    }
  >;
};


export type CreateSupplierPaymentResult =
  | {
    success: true;

    paymentId: string;

    message: string;
  }
  | {
    success: false;

    message: string;
  };


export async function createSupplierPayment(
  input:
    CreateSupplierPaymentInput,
): Promise<
  CreateSupplierPaymentResult
> {
  await requireAdmin();

  try {
    if (
      !input.supplierId
    ) {
      throw new Error(
        "Please select a supplier.",
      );
    }

    if (
      !input.paymentDate
    ) {
      throw new Error(
        "Payment date is required.",
      );
    }

    if (
      !Number.isFinite(
        input.amount,
      ) ||
      input.amount <= 0
    ) {
      throw new Error(
        "Payment amount must be greater than zero.",
      );
    }

    const allowedMethods:
      SupplierPaymentMethod[] =
      [
        "cash",
        "bank",
        "card",
        "cheque",
        "other",
      ];

    if (
      !allowedMethods.includes(
        input.paymentMethod,
      )
    ) {
      throw new Error(
        "Invalid payment method.",
      );
    }

    if (
      input.paymentMethod ===
      "cheque" &&
      !input.chequeNumber?.trim()
    ) {
      throw new Error(
        "Cheque number is required.",
      );
    }

    if (
      !input.financialAccountId?.trim()
    ) {
      throw new Error(
        "Please select a financial account.",
      );
    }

    const allocationTotal =
      input.allocations.reduce(
        (
          total,
          allocation,
        ) =>
          total +
          allocation.amount,
        0,
      );

    if (
      allocationTotal >
      input.amount + 0.01
    ) {
      throw new Error(
        "Allocated amount cannot exceed the payment amount.",
      );
    }

    for (
      const allocation of
      input.allocations
    ) {
      const hasQuickPurchase =
        "quickPurchaseId" in allocation &&
        Boolean(
          allocation.quickPurchaseId,
        );

      const hasGoodsReceipt =
        "goodsReceiptId" in allocation &&
        Boolean(
          allocation.goodsReceiptId,
        );

      if (
        hasQuickPurchase ===
        hasGoodsReceipt
      ) {
        throw new Error(
          "Each allocation must belong to exactly one Quick Purchase or Goods Receipt.",
        );
      }

      if (
        !Number.isFinite(
          allocation.amount,
        ) ||
        allocation.amount <= 0
      ) {
        throw new Error(
          "Allocation amount must be greater than zero.",
        );
      }
    }

    const paymentId =
      await postSupplierPayment({
        supplierId:
          input.supplierId,

        paymentDate:
          input.paymentDate,

        paymentMethod:
          input.paymentMethod,

        financialAccountId:
          input.financialAccountId,

        currencyCode:
          "AED",

        exchangeRate:
          1,

        amount:
          input.amount,

        referenceNumber:
          input.referenceNumber,

        bankName:
          input.bankName,

        chequeNumber:
          input.chequeNumber,

        chequeDate:
          input.chequeDate,

        notes:
          input.notes,

        allocations:
          input.allocations,
      });

    revalidatePath(
      "/admin/purchasing/supplier-payments",
    );

    revalidatePath(
      "/admin/purchasing/quick-purchase",
    );

    revalidatePath(
      "/admin/purchasing",
    );

    return {
      success: true,

      paymentId,

      message:
        "Supplier payment posted successfully.",
    };
  } catch (error) {
    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Unable to post supplier payment.",
    };
  }
}
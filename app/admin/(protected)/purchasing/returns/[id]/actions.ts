"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  requireAdmin,
} from "@/lib/auth/require-admin";

import {
  applySupplierReturnCredit,
  approveSupplierReturn,
  dispatchSupplierReturn,
  postSupplierReturn,
  refundSupplierReturnCredit,
  applySupplierReturnCreditToGoodsReceipt,
  type ApplySupplierReturnCreditToGoodsReceiptInput,
} from "@/lib/repositories/supplier-return.repository";

export async function approveSupplierReturnAction(
  supplierReturnId: string,
): Promise<void> {
  await requireAdmin();

  await approveSupplierReturn(
    supplierReturnId,
  );

  revalidatePath(
    `/admin/purchasing/returns/${supplierReturnId}`,
  );

  revalidatePath(
    "/admin/purchasing/returns",
  );
}


export async function dispatchSupplierReturnAction(
  supplierReturnId: string,
): Promise<void> {
  await requireAdmin();

  await dispatchSupplierReturn(
    supplierReturnId,
  );

  revalidatePath(
    `/admin/purchasing/returns/${supplierReturnId}`,
  );

  revalidatePath(
    "/admin/purchasing/returns",
  );
}


export async function postSupplierReturnAction(
  supplierReturnId: string,
): Promise<void> {
  await requireAdmin();

  await postSupplierReturn(
    supplierReturnId,
  );

  revalidatePath(
    `/admin/purchasing/returns/${supplierReturnId}`,
  );

  revalidatePath(
    "/admin/purchasing/returns",
  );
}

export async function applySupplierReturnCreditAction(
  supplierReturnId: string,
  quickPurchaseId: string,
  amount: number,
  applicationDate: string,
  postingDate: string,
  notes?: string | null,
): Promise<void> {
  await requireAdmin();

  if (!supplierReturnId) {
    throw new Error(
      "Supplier Return ID is required.",
    );
  }

  if (!quickPurchaseId) {
    throw new Error(
      "Quick Purchase ID is required.",
    );
  }

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new Error(
      "Credit amount must be greater than zero.",
    );
  }

  await applySupplierReturnCredit({
    supplierReturnId,
    quickPurchaseId,
    amount,
    applicationDate,
    postingDate,
    notes:
      notes?.trim() || null,
  });

  revalidatePath(
    `/admin/purchasing/returns/${supplierReturnId}`,
  );

  revalidatePath(
    "/admin/purchasing/returns",
  );

  revalidatePath(
    "/admin/purchasing/quick-purchases",
  );
}

export async function applySupplierReturnCreditToGoodsReceiptAction(
  input: ApplySupplierReturnCreditToGoodsReceiptInput,
): Promise<string> {
  await requireAdmin();

  if (!input.supplierReturnId) {
    throw new Error(
      "Supplier Return ID is required.",
    );
  }

  if (!input.goodsReceiptId) {
    throw new Error(
      "Goods Receipt ID is required.",
    );
  }

  if (
    !Number.isFinite(input.amount) ||
    input.amount <= 0
  ) {
    throw new Error(
      "Credit amount must be greater than zero.",
    );
  }

  if (
    !input.applicationDate ||
    !input.postingDate
  ) {
    throw new Error(
      "Application and posting dates are required.",
    );
  }

  const applicationId =
    await applySupplierReturnCreditToGoodsReceipt({
      supplierReturnId:
        input.supplierReturnId.trim(),

      goodsReceiptId:
        input.goodsReceiptId.trim(),

      amount:
        input.amount,

      applicationDate:
        input.applicationDate,

      postingDate:
        input.postingDate,

      notes:
        input.notes?.trim() || null,
    });

  revalidatePath(
    `/admin/purchasing/returns/${input.supplierReturnId}`,
  );

  revalidatePath(
    "/admin/purchasing/returns",
  );

  revalidatePath(
    "/admin/purchasing/supplier-statement",
  );

  revalidatePath(
    "/admin/goods-receipts",
  );

  return applicationId;
}

export async function refundSupplierReturnCreditAction(
  supplierReturnId: string,
  financialAccountId: string,
  amount: number,
  refundDate: string,
  postingDate: string,
  referenceNumber?: string | null,
  notes?: string | null,
): Promise<void> {
  await requireAdmin();

  if (!supplierReturnId) {
    throw new Error(
      "Supplier Return ID is required.",
    );
  }

  if (!financialAccountId) {
    throw new Error(
      "Financial account is required.",
    );
  }

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new Error(
      "Refund amount must be greater than zero.",
    );
  }

  if (
    !refundDate ||
    !postingDate
  ) {
    throw new Error(
      "Refund and posting dates are required.",
    );
  }

  await refundSupplierReturnCredit({
    supplierReturnId,
    financialAccountId,
    amount,
    refundDate,
    postingDate,
    referenceNumber:
      referenceNumber?.trim() ||
      null,
    notes:
      notes?.trim() ||
      null,
  });

  revalidatePath(
    `/admin/purchasing/returns/${supplierReturnId}`,
  );

  revalidatePath(
    "/admin/purchasing/returns",
  );

  revalidatePath(
    "/admin/accounting/financial-accounts",
  );
}
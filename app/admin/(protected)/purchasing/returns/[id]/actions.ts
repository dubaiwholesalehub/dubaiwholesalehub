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
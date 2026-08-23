"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  requireAdmin,
} from "@/lib/auth/require-admin";

import {
  approveSupplierReturn,
  dispatchSupplierReturn,
  postSupplierReturn,
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
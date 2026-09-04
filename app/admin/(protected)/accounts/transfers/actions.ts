"use server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  cancelFinancialTransfer,
  postFinancialTransfer,
} from "@/lib/repositories/financial-transfer.repository";


function stringValue(
  formData: FormData,
  key: string,
): string {
  const value =
    formData.get(key);

  return typeof value ===
    "string"
    ? value.trim()
    : "";
}


function numberValue(
  formData: FormData,
  key: string,
): number {
  return Number(
    stringValue(
      formData,
      key,
    ),
  );
}


export async function createFinancialTransferAction(
  formData: FormData,
) {
  await requireAdmin();

  const transferId =
    await postFinancialTransfer({
      transferDate:
        stringValue(
          formData,
          "transferDate",
        ),

      fromAccountId:
        stringValue(
          formData,
          "fromAccountId",
        ),

      toAccountId:
        stringValue(
          formData,
          "toAccountId",
        ),

      fromAmount:
        numberValue(
          formData,
          "fromAmount",
        ),

      toAmount:
        numberValue(
          formData,
          "toAmount",
        ),

      exchangeRate:
        numberValue(
          formData,
          "exchangeRate",
        ) || 1,

      referenceNumber:
        stringValue(
          formData,
          "referenceNumber",
        ),

      notes:
        stringValue(
          formData,
          "notes",
        ),
    });


  revalidatePath(
    "/admin/accounts",
  );

  revalidatePath(
    "/admin/accounts/cash-bank",
  );

  revalidatePath(
    "/admin/accounts/transfers",
  );


  redirect(
    `/admin/accounts/transfers/${transferId}`,
  );
}


export async function cancelFinancialTransferAction(
  formData: FormData,
) {
  await requireAdmin();

  const transferId =
    stringValue(
      formData,
      "transferId",
    );

  const reason =
    stringValue(
      formData,
      "reason",
    );


  await cancelFinancialTransfer(
    transferId,
    reason,
  );


  revalidatePath(
    "/admin/accounts",
  );

  revalidatePath(
    "/admin/accounts/cash-bank",
  );

  revalidatePath(
    "/admin/accounts/transfers",
  );

  revalidatePath(
    `/admin/accounts/transfers/${transferId}`,
  );


  redirect(
    `/admin/accounts/transfers/${transferId}?success=cancelled`,
  );
}
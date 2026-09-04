"use server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  postFinancialAccountOpeningBalance,
} from "@/lib/repositories/financial-account.repository";


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


export async function postOpeningBalanceAction(
  formData: FormData,
) {
  await requireAdmin();

  const accountId =
    stringValue(
      formData,
      "accountId",
    );

  const transactionDate =
    stringValue(
      formData,
      "transactionDate",
    );

  const amount =
    Number(
      stringValue(
        formData,
        "amount",
      ),
    );

  const description =
    stringValue(
      formData,
      "description",
    );


  if (!accountId) {
    throw new Error(
      "Financial account is required.",
    );
  }


  if (
    !Number.isFinite(amount) ||
    amount === 0
  ) {
    throw new Error(
      "Opening balance must be a non-zero amount.",
    );
  }


  await postFinancialAccountOpeningBalance(
    accountId,
    transactionDate,
    amount,
    description,
  );


  revalidatePath(
    "/admin/accounts",
  );

  revalidatePath(
    "/admin/accounts/cash-bank",
  );

  revalidatePath(
    `/admin/accounts/cash-bank/${accountId}`,
  );


  redirect(
    `/admin/accounts/cash-bank/${accountId}?success=opening-balance`,
  );
}
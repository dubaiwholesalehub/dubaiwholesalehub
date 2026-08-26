"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  cancelExpense,
  createExpense,
  postExpense,
  updateExpense,
  type ExpensePaymentMethod,
  type ExpenseTaxTreatment,
} from "@/lib/repositories/expense.repository";

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
  const value =
    Number(
      stringValue(
        formData,
        key,
      ),
    );

  return Number.isFinite(
    value,
  )
    ? value
    : 0;
}


export async function createExpenseAction(
  formData: FormData,
) {
  const taxTreatment =
    stringValue(
      formData,
      "taxTreatment",
    ) as ExpenseTaxTreatment;

  const paymentMethod =
    stringValue(
      formData,
      "paymentMethod",
    ) as ExpensePaymentMethod;

  const expenseId =
    await createExpense({
      expenseDate:
        stringValue(
          formData,
          "expenseDate",
        ),

      categoryId:
        stringValue(
          formData,
          "categoryId",
        ),

      payeeName:
        stringValue(
          formData,
          "payeeName",
        ),

      supplierId:
        stringValue(
          formData,
          "supplierId",
        ),

      financialAccountId:
        stringValue(
          formData,
          "financialAccountId",
        ),

      paymentMethod:
        paymentMethod ||
        undefined,

      paymentReference:
        stringValue(
          formData,
          "paymentReference",
        ),

      currencyCode:
        "AED",

      exchangeRate:
        1,

      taxTreatment,

      supplierTrn:
        stringValue(
          formData,
          "supplierTrn",
        ),

      supplierInvoiceNumber:
        stringValue(
          formData,
          "supplierInvoiceNumber",
        ),

      supplierInvoiceDate:
        stringValue(
          formData,
          "supplierInvoiceDate",
        ),

      taxInvoiceVerified:
        formData.get(
          "taxInvoiceVerified",
        ) === "on",

      netAmount:
        numberValue(
          formData,
          "netAmount",
        ),

      taxAmount:
        numberValue(
          formData,
          "taxAmount",
        ),

      customerId:
        stringValue(
          formData,
          "customerId",
        ),

      salesOrderId:
        stringValue(
          formData,
          "salesOrderId",
        ),

      warehouseId:
        stringValue(
          formData,
          "warehouseId",
        ),

      salesChannel:
        stringValue(
          formData,
          "salesChannel",
        ),

      marketCountryId:
        stringValue(
          formData,
          "marketCountryId",
        ),

      profitabilityNotes:
        stringValue(
          formData,
          "profitabilityNotes",
        ),

      notes:
        stringValue(
          formData,
          "notes",
        ),
    });

  revalidatePath(
    "/admin/accounts/expenses",
  );

  redirect(
    `/admin/accounts/expenses/${expenseId}`,
  );
}

export async function updateExpenseAction(
  formData: FormData,
) {
  const expenseId =
    stringValue(
      formData,
      "expenseId",
    );

  const taxTreatment =
    stringValue(
      formData,
      "taxTreatment",
    ) as ExpenseTaxTreatment;

  const paymentMethod =
    stringValue(
      formData,
      "paymentMethod",
    ) as ExpensePaymentMethod;

  await updateExpense({
    expenseId,

    expenseDate:
      stringValue(
        formData,
        "expenseDate",
      ),

    categoryId:
      stringValue(
        formData,
        "categoryId",
      ),

    payeeName:
      stringValue(
        formData,
        "payeeName",
      ),

    supplierId:
      stringValue(
        formData,
        "supplierId",
      ),

    financialAccountId:
      stringValue(
        formData,
        "financialAccountId",
      ),

    paymentMethod:
      paymentMethod ||
      undefined,

    paymentReference:
      stringValue(
        formData,
        "paymentReference",
      ),

    currencyCode:
      "AED",

    exchangeRate:
      1,

    taxTreatment,

    supplierTrn:
      stringValue(
        formData,
        "supplierTrn",
      ),

    supplierInvoiceNumber:
      stringValue(
        formData,
        "supplierInvoiceNumber",
      ),

    supplierInvoiceDate:
      stringValue(
        formData,
        "supplierInvoiceDate",
      ),

    taxInvoiceVerified:
      formData.get(
        "taxInvoiceVerified",
      ) === "on",

    netAmount:
      numberValue(
        formData,
        "netAmount",
      ),

    taxAmount:
      numberValue(
        formData,
        "taxAmount",
      ),

    customerId:
      stringValue(
        formData,
        "customerId",
      ),

    salesOrderId:
      stringValue(
        formData,
        "salesOrderId",
      ),

    warehouseId:
      stringValue(
        formData,
        "warehouseId",
      ),

    salesChannel:
      stringValue(
        formData,
        "salesChannel",
      ),

    marketCountryId:
      stringValue(
        formData,
        "marketCountryId",
      ),

    profitabilityNotes:
      stringValue(
        formData,
        "profitabilityNotes",
      ),

    notes:
      stringValue(
        formData,
        "notes",
      ),
  });

  revalidatePath(
    "/admin/accounts/expenses",
  );

  revalidatePath(
    `/admin/accounts/expenses/${expenseId}`,
  );

  redirect(
    `/admin/accounts/expenses/${expenseId}?success=updated`,
  );
}


export async function postExpenseAction(
  formData: FormData,
) {
  const expenseId =
    stringValue(
      formData,
      "expenseId",
    );

  await postExpense(
    expenseId,
  );

  revalidatePath(
    "/admin/accounts/expenses",
  );

  revalidatePath(
    `/admin/accounts/expenses/${expenseId}`,
  );

  redirect(
    `/admin/accounts/expenses/${expenseId}?success=posted`,
  );
}


export async function cancelExpenseAction(
  formData: FormData,
) {
  const expenseId =
    stringValue(
      formData,
      "expenseId",
    );

  const reason =
    stringValue(
      formData,
      "reason",
    );

  await cancelExpense(
    expenseId,
    reason,
  );

  revalidatePath(
    "/admin/accounts/expenses",
  );

  revalidatePath(
    `/admin/accounts/expenses/${expenseId}`,
  );

  redirect(
    `/admin/accounts/expenses/${expenseId}?success=cancelled`,
  );
}
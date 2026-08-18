import {
  createClient,
} from "@/lib/supabase/server";


/* =========================================================
 * Types
 * ========================================================= */

export type ExpenseStatus =
  | "draft"
  | "posted"
  | "cancelled";


export type ExpenseType =
  | "direct"
  | "operating"
  | "financial"
  | "other";


export type ExpenseTaxTreatment =
  | "standard_vat"
  | "no_vat"
  | "vat_pending"
  | "non_recoverable";


export type ExpensePaymentMethod =
  | "cash"
  | "bank"
  | "card"
  | "cheque"
  | "other";


export interface ExpenseCategoryOption {
  id: string;

  code: string;

  name: string;

  expenseType:
    ExpenseType;
}


export interface FinancialAccountOption {
  id: string;

  accountCode: string;

  accountName: string;

  accountType: string;

  currencyCode: string;

  currentBalance: number;

  isDefault: boolean;
}


export interface ExpenseListRow {
  id: string;

  expenseNumber: string;

  expenseDate: string;

  categoryId: string;

  categoryName: string;

  expenseType:
    ExpenseType;

  payeeName:
    | string
    | null;

  supplierId:
    | string
    | null;

  supplierName:
    | string
    | null;

  financialAccountId:
    | string
    | null;

  financialAccountName:
    | string
    | null;

  paymentMethod:
    | ExpensePaymentMethod
    | null;

  currencyCode: string;

  netAmount: number;

  taxAmount: number;

  grossAmount: number;

  recoverableTaxAmount: number;

  pendingTaxAmount: number;

  taxTreatment:
    ExpenseTaxTreatment;

  status:
    ExpenseStatus;

  createdAt: string;
}


export interface ExpenseDetails
  extends ExpenseListRow {
  paymentReference:
    | string
    | null;

  supplierTrn:
    | string
    | null;

  supplierInvoiceNumber:
    | string
    | null;

  supplierInvoiceDate:
    | string
    | null;

  taxInvoiceVerified: boolean;

  taxInvoiceVerifiedAt:
    | string
    | null;

  customerId:
    | string
    | null;

  salesOrderId:
    | string
    | null;

  warehouseId:
    | string
    | null;

  salesChannel:
    | string
    | null;

  marketCountryId:
    | string
    | null;

  profitabilityNotes:
    | string
    | null;

  accountTransactionId:
    | string
    | null;

  postedAt:
    | string
    | null;

  cancelledAt:
    | string
    | null;

  cancellationReason:
    | string
    | null;

  notes:
    | string
    | null;
}


export interface ExpenseSummary {
  totalExpenses: number;

  totalNetAmount: number;

  totalTaxAmount: number;

  totalRecoverableTax: number;

  totalPendingTax: number;

  totalGrossAmount: number;

  draftCount: number;

  postedCount: number;

  cancelledCount: number;
}


export interface GetExpensePageInput {
  search?: string;

  status?:
    | ExpenseStatus
    | "all";

  expenseType?:
    | ExpenseType
    | "all";

  taxTreatment?:
    | ExpenseTaxTreatment
    | "all";

  categoryId?: string;

  dateFrom?: string;

  dateTo?: string;

  page?: number;

  pageSize?: number;
}


export interface ExpensePage {
  data:
    ExpenseListRow[];

  count: number;

  page: number;

  pageSize: number;

  totalPages: number;
}


export interface CreateExpenseInput {
  expenseDate: string;

  categoryId: string;

  payeeName?: string;

  supplierId?: string;

  financialAccountId?: string;

  paymentMethod?:
    ExpensePaymentMethod;

  paymentReference?: string;

  currencyCode?: string;

  exchangeRate?: number;

  taxTreatment:
    ExpenseTaxTreatment;

  supplierTrn?: string;

  supplierInvoiceNumber?: string;

  supplierInvoiceDate?: string;

  taxInvoiceVerified?: boolean;

  netAmount: number;

  taxAmount: number;

  customerId?: string;

  salesOrderId?: string;

  warehouseId?: string;

  salesChannel?: string;

  marketCountryId?: string;

  profitabilityNotes?: string;

  notes?: string;
}


/* =========================================================
 * Helpers
 * ========================================================= */

function numberValue(
  value: unknown,
): number {
  const parsed =
    Number(
      value ?? 0,
    );

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : 0;
}


function cleanText(
  value?: string,
): string | null {
  const cleaned =
    value?.trim();

  return cleaned
    ? cleaned
    : null;
}


/* =========================================================
 * Expense Category Options
 * ========================================================= */

export async function getExpenseCategoryOptions():
  Promise<
    ExpenseCategoryOption[]
  > {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "expense_categories",
      )
      .select(`
        id,
        code,
        name,
        expense_type
      `)
      .eq(
        "is_active",
        true,
      )
      .order(
        "name",
        {
          ascending: true,
        },
      );

  if (error) {
    throw new Error(
      `Unable to load expense categories: ${error.message}`,
    );
  }

  return (
    data ?? []
  ).map(
    (
      row,
    ) => ({
      id:
        row.id,

      code:
        row.code,

      name:
        row.name,

      expenseType:
        row.expense_type as
          ExpenseType,
    }),
  );
}


/* =========================================================
 * Financial Account Options
 * ========================================================= */

export async function getFinancialAccountOptions():
  Promise<
    FinancialAccountOption[]
  > {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "financial_accounts",
      )
      .select(`
        id,
        account_code,
        account_name,
        account_type,
        currency_code,
        current_balance,
        is_default
      `)
      .eq(
        "is_active",
        true,
      )
      .order(
        "is_default",
        {
          ascending: false,
        },
      )
      .order(
        "account_name",
        {
          ascending: true,
        },
      );

  if (error) {
    throw new Error(
      `Unable to load financial accounts: ${error.message}`,
    );
  }

  return (
    data ?? []
  ).map(
    (
      row,
    ) => ({
      id:
        row.id,

      accountCode:
        row.account_code,

      accountName:
        row.account_name,

      accountType:
        row.account_type,

      currencyCode:
        row.currency_code,

      currentBalance:
        numberValue(
          row.current_balance,
        ),

      isDefault:
        row.is_default,
    }),
  );
}


/* =========================================================
 * Expense Page
 * ========================================================= */

export async function getExpensePage(
  input:
    GetExpensePageInput = {},
): Promise<ExpensePage> {
  const supabase =
    await createClient();

  const page =
    Math.max(
      input.page ?? 1,
      1,
    );

  const pageSize =
    Math.min(
      Math.max(
        input.pageSize ?? 25,
        1,
      ),
      100,
    );

  const from =
    (
      page -
      1
    ) *
    pageSize;

  const to =
    from +
    pageSize -
    1;


  let query =
    supabase
      .from(
        "expenses",
      )
      .select(
        `
        id,
        expense_number,
        expense_date,
        category_id,
        expense_type,
        payee_name,
        supplier_id,
        financial_account_id,
        payment_method,
        currency_code,
        net_amount,
        tax_amount,
        recoverable_tax_amount,
        pending_tax_amount,
        gross_amount,
        tax_treatment,
        status,
        created_at,

        category:expense_categories (
          name
        ),

        supplier:suppliers (
          company_name
        ),

        financial_account:financial_accounts (
          account_name
        )
        `,
        {
          count:
            "exact",
        },
      );


  const search =
    input.search?.trim();

  if (search) {
    query =
      query.or(
        [
          `expense_number.ilike.%${search}%`,
          `payee_name.ilike.%${search}%`,
          `payment_reference.ilike.%${search}%`,
          `supplier_invoice_number.ilike.%${search}%`,
        ].join(","),
      );
  }


  if (
    input.status &&
    input.status !==
      "all"
  ) {
    query =
      query.eq(
        "status",
        input.status,
      );
  }


  if (
    input.expenseType &&
    input.expenseType !==
      "all"
  ) {
    query =
      query.eq(
        "expense_type",
        input.expenseType,
      );
  }


  if (
    input.taxTreatment &&
    input.taxTreatment !==
      "all"
  ) {
    query =
      query.eq(
        "tax_treatment",
        input.taxTreatment,
      );
  }


  if (
    input.categoryId
  ) {
    query =
      query.eq(
        "category_id",
        input.categoryId,
      );
  }


  if (
    input.dateFrom
  ) {
    query =
      query.gte(
        "expense_date",
        input.dateFrom,
      );
  }


  if (
    input.dateTo
  ) {
    query =
      query.lte(
        "expense_date",
        input.dateTo,
      );
  }


  const {
    data,
    error,
    count,
  } =
    await query
      .order(
        "expense_date",
        {
          ascending: false,
        },
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      )
      .range(
        from,
        to,
      );


  if (error) {
    throw new Error(
      `Unable to load expenses: ${error.message}`,
    );
  }


  const rows:
    ExpenseListRow[] =
      (
        data ?? []
      ).map(
        (
          row,
        ) => {
          const category =
            Array.isArray(
              row.category,
            )
              ? row.category[0]
              : row.category;

          const supplier =
            Array.isArray(
              row.supplier,
            )
              ? row.supplier[0]
              : row.supplier;

          const account =
            Array.isArray(
              row.financial_account,
            )
              ? row.financial_account[0]
              : row.financial_account;


          return {
            id:
              row.id,

            expenseNumber:
              row.expense_number,

            expenseDate:
              row.expense_date,

            categoryId:
              row.category_id,

            categoryName:
              category?.name ??
              "Unknown Category",

            expenseType:
              row.expense_type as
                ExpenseType,

            payeeName:
              row.payee_name,

            supplierId:
              row.supplier_id,

            supplierName:
              supplier
                ?.company_name ??
              null,

            financialAccountId:
              row.financial_account_id,

            financialAccountName:
              account
                ?.account_name ??
              null,

            paymentMethod:
              row.payment_method as
                ExpensePaymentMethod
                | null,

            currencyCode:
              row.currency_code,

            netAmount:
              numberValue(
                row.net_amount,
              ),

            taxAmount:
              numberValue(
                row.tax_amount,
              ),

            recoverableTaxAmount:
              numberValue(
                row.recoverable_tax_amount,
              ),

            pendingTaxAmount:
              numberValue(
                row.pending_tax_amount,
              ),

            grossAmount:
              numberValue(
                row.gross_amount,
              ),

            taxTreatment:
              row.tax_treatment as
                ExpenseTaxTreatment,

            status:
              row.status as
                ExpenseStatus,

            createdAt:
              row.created_at,
          };
        },
      );


  const total =
    count ?? 0;


  return {
    data:
      rows,

    count:
      total,

    page,

    pageSize,

    totalPages:
      Math.max(
        Math.ceil(
          total /
          pageSize,
        ),
        1,
      ),
  };
}


/* =========================================================
 * Expense Summary
 * ========================================================= */

export async function getExpenseSummary():
  Promise<
    ExpenseSummary
  > {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "expenses",
      )
      .select(`
        net_amount,
        tax_amount,
        recoverable_tax_amount,
        pending_tax_amount,
        gross_amount,
        status
      `);


  if (error) {
    throw new Error(
      `Unable to load expense summary: ${error.message}`,
    );
  }


  const summary:
    ExpenseSummary = {
      totalExpenses: 0,

      totalNetAmount: 0,

      totalTaxAmount: 0,

      totalRecoverableTax: 0,

      totalPendingTax: 0,

      totalGrossAmount: 0,

      draftCount: 0,

      postedCount: 0,

      cancelledCount: 0,
    };


  for (
    const row of
    data ?? []
  ) {
    summary.totalExpenses +=
      1;

    if (
      row.status ===
      "draft"
    ) {
      summary.draftCount +=
        1;

      continue;
    }

    if (
      row.status ===
      "cancelled"
    ) {
      summary.cancelledCount +=
        1;

      continue;
    }

    summary.postedCount +=
      1;

    summary.totalNetAmount +=
      numberValue(
        row.net_amount,
      );

    summary.totalTaxAmount +=
      numberValue(
        row.tax_amount,
      );

    summary.totalRecoverableTax +=
      numberValue(
        row.recoverable_tax_amount,
      );

    summary.totalPendingTax +=
      numberValue(
        row.pending_tax_amount,
      );

    summary.totalGrossAmount +=
      numberValue(
        row.gross_amount,
      );
  }


  return summary;
}


/* =========================================================
 * Expense Details
 * ========================================================= */

export async function getExpenseById(
  expenseId: string,
): Promise<
  ExpenseDetails |
  null
> {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "expenses",
      )
      .select(`
        *,
        category:expense_categories (
          name
        ),
        supplier:suppliers (
          company_name
        ),
        financial_account:financial_accounts (
          account_name
        )
      `)
      .eq(
        "id",
        expenseId,
      )
      .maybeSingle();


  if (error) {
    throw new Error(
      `Unable to load expense: ${error.message}`,
    );
  }


  if (!data) {
    return null;
  }


  const category =
    Array.isArray(
      data.category,
    )
      ? data.category[0]
      : data.category;

  const supplier =
    Array.isArray(
      data.supplier,
    )
      ? data.supplier[0]
      : data.supplier;

  const account =
    Array.isArray(
      data.financial_account,
    )
      ? data.financial_account[0]
      : data.financial_account;


  return {
    id:
      data.id,

    expenseNumber:
      data.expense_number,

    expenseDate:
      data.expense_date,

    categoryId:
      data.category_id,

    categoryName:
      category?.name ??
      "Unknown Category",

    expenseType:
      data.expense_type as
        ExpenseType,

    payeeName:
      data.payee_name,

    supplierId:
      data.supplier_id,

    supplierName:
      supplier
        ?.company_name ??
      null,

    financialAccountId:
      data.financial_account_id,

    financialAccountName:
      account
        ?.account_name ??
      null,

    paymentMethod:
      data.payment_method as
        ExpensePaymentMethod
        | null,

    paymentReference:
      data.payment_reference,

    currencyCode:
      data.currency_code,

    netAmount:
      numberValue(
        data.net_amount,
      ),

    taxAmount:
      numberValue(
        data.tax_amount,
      ),

    recoverableTaxAmount:
      numberValue(
        data.recoverable_tax_amount,
      ),

    pendingTaxAmount:
      numberValue(
        data.pending_tax_amount,
      ),

    grossAmount:
      numberValue(
        data.gross_amount,
      ),

    taxTreatment:
      data.tax_treatment as
        ExpenseTaxTreatment,

    supplierTrn:
      data.supplier_trn,

    supplierInvoiceNumber:
      data.supplier_invoice_number,

    supplierInvoiceDate:
      data.supplier_invoice_date,

    taxInvoiceVerified:
      data.tax_invoice_verified,

    taxInvoiceVerifiedAt:
      data.tax_invoice_verified_at,

    customerId:
      data.customer_id,

    salesOrderId:
      data.sales_order_id,

    warehouseId:
      data.warehouse_id,

    salesChannel:
      data.sales_channel,

    marketCountryId:
      data.market_country_id,

    profitabilityNotes:
      data.profitability_notes,

    status:
      data.status as
        ExpenseStatus,

    accountTransactionId:
      data.account_transaction_id,

    postedAt:
      data.posted_at,

    cancelledAt:
      data.cancelled_at,

    cancellationReason:
      data.cancellation_reason,

    notes:
      data.notes,

    createdAt:
      data.created_at,
  };
}


/* =========================================================
 * Create Draft Expense
 * ========================================================= */

export async function createExpense(
  input:
    CreateExpenseInput,
): Promise<string> {
  const supabase =
    await createClient();


  if (
    !input.categoryId
  ) {
    throw new Error(
      "Expense category is required.",
    );
  }


  if (
    !Number.isFinite(
      input.netAmount,
    ) ||
    input.netAmount <= 0
  ) {
    throw new Error(
      "Expense net amount must be greater than zero.",
    );
  }


  if (
    !Number.isFinite(
      input.taxAmount,
    ) ||
    input.taxAmount < 0
  ) {
    throw new Error(
      "Expense VAT amount cannot be negative.",
    );
  }


  const {
    data: category,
    error: categoryError,
  } =
    await supabase
      .from(
        "expense_categories",
      )
      .select(`
        expense_type
      `)
      .eq(
        "id",
        input.categoryId,
      )
      .single();


  if (
    categoryError ||
    !category
  ) {
    throw new Error(
      `Unable to resolve expense category: ${
        categoryError?.message ??
        "Category not found."
      }`,
    );
  }


  const {
    data: expenseNumber,
    error: numberError,
  } =
    await supabase.rpc(
      "next_expense_number",
    );


  if (
    numberError ||
    typeof expenseNumber !==
      "string" ||
    !expenseNumber
  ) {
    throw new Error(
      `Unable to generate expense number: ${
        numberError?.message ??
        "No number returned."
      }`,
    );
  }


  const grossAmount =
    Math.round(
      (
        input.netAmount +
        input.taxAmount
      ) *
        100,
    ) / 100;


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "expenses",
      )
      .insert({
        expense_number:
          expenseNumber,

        expense_date:
          input.expenseDate,

        category_id:
          input.categoryId,

        expense_type:
          category.expense_type,

        payee_name:
          cleanText(
            input.payeeName,
          ),

        supplier_id:
          input.supplierId ||
          null,

        financial_account_id:
          input.financialAccountId ||
          null,

        payment_method:
          input.paymentMethod ??
          null,

        payment_reference:
          cleanText(
            input.paymentReference,
          ),

        currency_code:
          input.currencyCode ??
          "AED",

        exchange_rate:
          input.exchangeRate ??
          1,

        tax_treatment:
          input.taxTreatment,

        supplier_trn:
          cleanText(
            input.supplierTrn,
          ),

        supplier_invoice_number:
          cleanText(
            input.supplierInvoiceNumber,
          ),

        supplier_invoice_date:
          input.supplierInvoiceDate ||
          null,

        tax_invoice_verified:
          input.taxInvoiceVerified ??
          false,

        tax_invoice_verified_at:
          input.taxInvoiceVerified
            ? new Date()
                .toISOString()
            : null,

        net_amount:
          input.netAmount,

        tax_amount:
          input.taxAmount,

        recoverable_tax_amount:
          0,

        pending_tax_amount:
          0,

        gross_amount:
          grossAmount,

        customer_id:
          input.customerId ||
          null,

        sales_order_id:
          input.salesOrderId ||
          null,

        warehouse_id:
          input.warehouseId ||
          null,

        sales_channel:
          cleanText(
            input.salesChannel,
          ),

        market_country_id:
          input.marketCountryId ||
          null,

        profitability_notes:
          cleanText(
            input.profitabilityNotes,
          ),

        notes:
          cleanText(
            input.notes,
          ),

        status:
          "draft",
      })
      .select(
        "id",
      )
      .single();


  if (
    error ||
    !data
  ) {
    throw new Error(
      `Unable to create expense: ${
        error?.message ??
        "No expense returned."
      }`,
    );
  }


  return data.id;
}


/* =========================================================
 * Post Expense
 * ========================================================= */

export async function postExpense(
  expenseId: string,
): Promise<string> {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "post_expense",
      {
        p_expense_id:
          expenseId,
      },
    );


  if (error) {
    throw new Error(
      `Unable to post expense: ${error.message}`,
    );
  }


  if (
    typeof data !==
      "string" ||
    !data
  ) {
    throw new Error(
      "Expense was posted but no account transaction ID was returned.",
    );
  }


  return data;
}


/* =========================================================
 * Cancel Expense
 * ========================================================= */

export async function cancelExpense(
  expenseId: string,
  reason: string,
): Promise<void> {
  const supabase =
    await createClient();

  const {
    error,
  } =
    await supabase.rpc(
      "cancel_expense",
      {
        p_expense_id:
          expenseId,

        p_reason:
          reason.trim(),
      },
    );


  if (error) {
    throw new Error(
      `Unable to cancel expense: ${error.message}`,
    );
  }
}
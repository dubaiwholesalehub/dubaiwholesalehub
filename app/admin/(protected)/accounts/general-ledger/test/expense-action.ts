"use server";

import {
  requireAdmin,
} from "@/lib/auth/require-admin";

import {
  createClient,
} from "@/lib/supabase/server";


export type ExpenseGlTestResult = {
  expense: {
    id: string;
    expense_number: string;
    expense_date: string;
    category_id: string;
    supplier_id: string | null;
    customer_id: string | null;
    warehouse_id: string | null;
    financial_account_id: string;
    account_transaction_id: string;
    currency_code: string;
    exchange_rate: number;
    tax_treatment: string;
    net_amount: number;
    tax_amount: number;
    recoverable_tax_amount: number;
    pending_tax_amount: number;
    gross_amount: number;
    status: string;
  };

  caseType:
    | "no_vat"
    | "recoverable_vat"
    | "vat_pending"
    | "non_recoverable";

  journal: {
    id: string;
    journal_number: string;
    source_type: string;
    source_id: string | null;
    source_number: string | null;
    status: string;
  };

  balance: {
    journal_entry_id: string;
    line_count: number;
    total_base_debit: number;
    total_base_credit: number;
    base_difference: number;
    is_balanced: boolean;
  };

  lines: Array<{
    id: string;
    line_number: number;
    gl_account_id: string;
    description: string | null;
    debit: number;
    credit: number;
    base_debit: number;
    base_credit: number;
    supplier_id: string | null;
    customer_id: string | null;
    warehouse_id: string | null;
    financial_account_id: string | null;
    expense_category_id: string | null;

    gl_account: {
      account_code: string;
      account_name: string;
    } | null;
  }>;

  checks: {
    postedExpense: boolean;
    sourceLinkage: boolean;
    balanced: boolean;
    correctLineCount: boolean;
    expenseDebit: boolean;
    vatRecoverableDebit: boolean;
    vatPendingDebit: boolean;
    financialAccountCredit: boolean;
    expenseCategoryLinkage: boolean;
    dimensionsValid: boolean;
    idempotent: boolean;
    allPassed: boolean;
  };
};


function numberValue(
  value: unknown,
): number {
  const parsed =
    Number(
      value ??
      0,
    );

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}


function moneyEqual(
  left: unknown,
  right: unknown,
): boolean {
  return (
    Math.abs(
      numberValue(left) -
      numberValue(right),
    ) <=
    0.01
  );
}


export async function testExpenseGlPostingAction(
  expenseId: string,
): Promise<ExpenseGlTestResult> {
  await requireAdmin();

  const id =
    expenseId.trim();

  if (!id) {
    throw new Error(
      "Expense ID is required.",
    );
  }

  const supabase =
    await createClient();


  const {
    data: expense,
    error: expenseError,
  } =
    await supabase
      .from("expenses")
      .select(`
        id,
        expense_number,
        expense_date,
        category_id,
        supplier_id,
        customer_id,
        warehouse_id,
        financial_account_id,
        account_transaction_id,
        currency_code,
        exchange_rate,
        tax_treatment,
        net_amount,
        tax_amount,
        recoverable_tax_amount,
        pending_tax_amount,
        gross_amount,
        status
      `)
      .eq("id", id)
      .single();


  if (
    expenseError ||
    !expense
  ) {
    throw new Error(
      `Unable to load Expense: ${
        expenseError?.message ??
        "Expense was not found."
      }`,
    );
  }


  if (
    expense.status !==
    "posted"
  ) {
    throw new Error(
      `Expense ${expense.expense_number} is not posted.`,
    );
  }


  if (
    !expense.financial_account_id ||
    !expense.account_transaction_id
  ) {
    throw new Error(
      `Expense ${expense.expense_number} is missing financial-account posting data.`,
    );
  }


  let caseType:
    ExpenseGlTestResult["caseType"];

  switch (
    expense.tax_treatment
  ) {
    case "standard_vat":
      caseType =
        "recoverable_vat";
      break;

    case "vat_pending":
      caseType =
        "vat_pending";
      break;

    case "non_recoverable":
      caseType =
        "non_recoverable";
      break;

    default:
      caseType =
        "no_vat";
  }


  const [
    categoryResult,
    financialAccountResult,
    mappingsResult,
  ] =
    await Promise.all([
      supabase
        .from("expense_categories")
        .select(`
          id,
          gl_account_id
        `)
        .eq(
          "id",
          expense.category_id,
        )
        .single(),

      supabase
        .from("financial_accounts")
        .select(`
          id,
          gl_account_id
        `)
        .eq(
          "id",
          expense.financial_account_id,
        )
        .single(),

      supabase
        .from("gl_account_mappings")
        .select(`
          mapping_key,
          gl_account_id,
          is_active
        `)
        .in(
          "mapping_key",
          [
            "vat_recoverable",
            "vat_pending",
          ],
        )
        .eq(
          "is_active",
          true,
        ),
    ]);


  const dependencyError =
    categoryResult.error ??
    financialAccountResult.error ??
    mappingsResult.error;


  if (dependencyError) {
    throw new Error(
      `Unable to load Expense GL dependencies: ${dependencyError.message}`,
    );
  }


  const category =
    categoryResult.data;

  const financialAccount =
    financialAccountResult.data;


  if (
    !category?.gl_account_id ||
    !financialAccount?.gl_account_id
  ) {
    throw new Error(
      "Expense category or financial account GL mapping is missing.",
    );
  }


  const mappings =
    new Map(
      (
        mappingsResult.data ??
        []
      ).map(
        (
          row,
        ) => [
          row.mapping_key,
          row.gl_account_id,
        ],
      ),
    );


  const vatRecoverableGl =
    mappings.get(
      "vat_recoverable",
    ) ??
    null;

  const vatPendingGl =
    mappings.get(
      "vat_pending",
    ) ??
    null;


  const first =
    await supabase.rpc(
      "post_expense_gl",
      {
        p_expense_id:
          expense.id,
      },
    );


  if (first.error) {
    throw new Error(
      `Expense GL posting failed: ${first.error.message}`,
    );
  }


  const firstJournalId =
    typeof first.data ===
      "string"
      ? first.data
      : null;


  if (!firstJournalId) {
    throw new Error(
      "Expense GL posting did not return a journal ID.",
    );
  }


  const second =
    await supabase.rpc(
      "post_expense_gl",
      {
        p_expense_id:
          expense.id,
      },
    );


  if (second.error) {
    throw new Error(
      `Expense GL idempotency test failed: ${second.error.message}`,
    );
  }


  const secondJournalId =
    typeof second.data ===
      "string"
      ? second.data
      : null;


  const idempotent =
    firstJournalId ===
    secondJournalId;


  const [
    journalResult,
    balanceResult,
    linesResult,
  ] =
    await Promise.all([
      supabase
        .from("gl_journal_entries")
        .select(`
          id,
          journal_number,
          source_type,
          source_id,
          source_number,
          status
        `)
        .eq("id", firstJournalId)
        .single(),

      supabase
        .from("gl_journal_balance")
        .select(`
          journal_entry_id,
          line_count,
          total_base_debit,
          total_base_credit,
          base_difference,
          is_balanced
        `)
        .eq(
          "journal_entry_id",
          firstJournalId,
        )
        .single(),

      supabase
        .from("gl_journal_lines")
        .select(`
          id,
          line_number,
          gl_account_id,
          description,
          debit,
          credit,
          base_debit,
          base_credit,
          supplier_id,
          customer_id,
          warehouse_id,
          financial_account_id,
          expense_category_id,

          gl_account:gl_accounts (
            account_code,
            account_name
          )
        `)
        .eq(
          "journal_entry_id",
          firstJournalId,
        )
        .order(
          "line_number",
          {
            ascending:
              true,
          },
        ),
    ]);


  const loadError =
    journalResult.error ??
    balanceResult.error ??
    linesResult.error;


  if (loadError) {
    throw new Error(
      `Unable to verify Expense GL journal: ${loadError.message}`,
    );
  }


  const journal =
    journalResult.data;

  const balance =
    balanceResult.data;

  const rawLines =
    linesResult.data ??
    [];


  if (
    !journal ||
    !balance
  ) {
    throw new Error(
      "Expense GL verification data is incomplete.",
    );
  }


  const lines =
    rawLines.map(
      (
        line,
      ) => {
        const relation =
          Array.isArray(
            line.gl_account,
          )
            ? line.gl_account[0]
            : line.gl_account;

        return {
          id:
            line.id,

          line_number:
            line.line_number,

          gl_account_id:
            line.gl_account_id,

          description:
            line.description,

          debit:
            numberValue(line.debit),

          credit:
            numberValue(line.credit),

          base_debit:
            numberValue(line.base_debit),

          base_credit:
            numberValue(line.base_credit),

          supplier_id:
            line.supplier_id,

          customer_id:
            line.customer_id,

          warehouse_id:
            line.warehouse_id,

          financial_account_id:
            line.financial_account_id,

          expense_category_id:
            line.expense_category_id,

          gl_account:
            relation
              ? {
                account_code:
                  relation.account_code,

                account_name:
                  relation.account_name,
              }
              : null,
        };
      },
    );


  const netAmount =
    numberValue(
      expense.net_amount,
    );

  const taxAmount =
    numberValue(
      expense.tax_amount,
    );

  const recoverableTax =
    numberValue(
      expense.recoverable_tax_amount,
    );

  const pendingTax =
    numberValue(
      expense.pending_tax_amount,
    );

  const grossAmount =
    numberValue(
      expense.gross_amount,
    );


  const expectedExpenseDebit =
    caseType ===
      "non_recoverable"
      ? grossAmount
      : netAmount;


  const expenseDebit =
    lines.some(
      (
        line,
      ) =>
        line.gl_account_id ===
          category.gl_account_id &&
        moneyEqual(
          line.debit,
          expectedExpenseDebit,
        ) &&
        moneyEqual(
          line.credit,
          0,
        ),
    );


  const vatRecoverableDebit =
    caseType ===
      "recoverable_vat"
      ? Boolean(
        vatRecoverableGl,
      ) &&
        lines.some(
          (
            line,
          ) =>
            line.gl_account_id ===
              vatRecoverableGl &&
            moneyEqual(
              line.debit,
              recoverableTax,
            ) &&
            moneyEqual(
              line.credit,
              0,
            ),
        )
      : !lines.some(
        (
          line,
        ) =>
          line.gl_account_id ===
          vatRecoverableGl,
      );


  const vatPendingDebit =
    caseType ===
      "vat_pending"
      ? Boolean(
        vatPendingGl,
      ) &&
        lines.some(
          (
            line,
          ) =>
            line.gl_account_id ===
              vatPendingGl &&
            moneyEqual(
              line.debit,
              pendingTax,
            ) &&
            moneyEqual(
              line.credit,
              0,
            ),
        )
      : !lines.some(
        (
          line,
        ) =>
          line.gl_account_id ===
          vatPendingGl,
      );


  const financialAccountCredit =
    lines.some(
      (
        line,
      ) =>
        line.gl_account_id ===
          financialAccount.gl_account_id &&
        moneyEqual(
          line.credit,
          grossAmount,
        ) &&
        moneyEqual(
          line.debit,
          0,
        ),
    );


  const expectedLineCount =
    2 +
    (
      caseType ===
        "recoverable_vat" ||
      caseType ===
        "vat_pending"
        ? 1
        : 0
    );


  const correctLineCount =
    lines.length ===
    expectedLineCount;


  const expenseCategoryLinkage =
    lines
      .filter(
        (
          line,
        ) =>
          line.gl_account_id ===
          category.gl_account_id,
      )
      .every(
        (
          line,
        ) =>
          line.expense_category_id ===
          expense.category_id,
      );


  const dimensionsValid =
    lines.every(
      (
        line,
      ) =>
        (
          !expense.supplier_id ||
          line.supplier_id ===
            expense.supplier_id
        ) &&
        (
          !expense.customer_id ||
          line.customer_id ===
            expense.customer_id
        ) &&
        (
          !expense.warehouse_id ||
          line.warehouse_id ===
            expense.warehouse_id
        ),
    );


  const sourceLinkage =
    journal.source_type ===
      "expense" &&
    journal.source_id ===
      expense.id &&
    journal.source_number ===
      expense.expense_number;


  const balanced =
    balance.is_balanced ===
      true &&
    moneyEqual(
      balance.total_base_debit,
      balance.total_base_credit,
    ) &&
    moneyEqual(
      balance.base_difference,
      0,
    );


  const postedExpense =
    expense.status ===
    "posted";


  const allPassed =
    postedExpense &&
    sourceLinkage &&
    balanced &&
    correctLineCount &&
    expenseDebit &&
    vatRecoverableDebit &&
    vatPendingDebit &&
    financialAccountCredit &&
    expenseCategoryLinkage &&
    dimensionsValid &&
    idempotent;


  return {
    expense: {
      id:
        expense.id,

      expense_number:
        expense.expense_number,

      expense_date:
        expense.expense_date,

      category_id:
        expense.category_id,

      supplier_id:
        expense.supplier_id,

      customer_id:
        expense.customer_id,

      warehouse_id:
        expense.warehouse_id,

      financial_account_id:
        expense.financial_account_id,

      account_transaction_id:
        expense.account_transaction_id,

      currency_code:
        expense.currency_code,

      exchange_rate:
        numberValue(
          expense.exchange_rate,
        ),

      tax_treatment:
        expense.tax_treatment,

      net_amount:
        netAmount,

      tax_amount:
        taxAmount,

      recoverable_tax_amount:
        recoverableTax,

      pending_tax_amount:
        pendingTax,

      gross_amount:
        grossAmount,

      status:
        expense.status,
    },

    caseType,

    journal: {
      id:
        journal.id,

      journal_number:
        journal.journal_number,

      source_type:
        journal.source_type,

      source_id:
        journal.source_id,

      source_number:
        journal.source_number,

      status:
        journal.status,
    },

    balance: {
      journal_entry_id:
        balance.journal_entry_id ??
        firstJournalId,

      line_count:
        numberValue(
          balance.line_count,
        ),

      total_base_debit:
        numberValue(
          balance.total_base_debit,
        ),

      total_base_credit:
        numberValue(
          balance.total_base_credit,
        ),

      base_difference:
        numberValue(
          balance.base_difference,
        ),

      is_balanced:
        balance.is_balanced ??
        false,
    },

    lines,

    checks: {
      postedExpense,
      sourceLinkage,
      balanced,
      correctLineCount,
      expenseDebit,
      vatRecoverableDebit,
      vatPendingDebit,
      financialAccountCredit,
      expenseCategoryLinkage,
      dimensionsValid,
      idempotent,

      allPassed,
    },
  };
}
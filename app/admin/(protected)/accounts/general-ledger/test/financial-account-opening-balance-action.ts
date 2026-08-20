"use server";

import {
  requireAdmin,
} from "@/lib/auth/require-admin";

import {
  createClient,
} from "@/lib/supabase/server";


export type FinancialAccountOpeningBalanceGlTestResult = {
  account: {
    id: string;
    account_code: string;
    account_name: string;
    currency_code: string;
    opening_balance: number;
    gl_account_id: string;
  };

  transaction: {
    id: string;
    transaction_number: string;
    transaction_date: string;
    direction: string;
    amount: number;
    currency_code: string;
    exchange_rate: number;
    base_amount: number;
    status: string;
  };

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
    financial_account_id: string | null;
    source_line_type: string | null;
    source_line_id: string | null;
    source_line_number: number | null;

    gl_account: {
      account_code: string;
      account_name: string;
    } | null;
  }>;

  checks: {
    openingBalancePresent: boolean;
    postedTransaction: boolean;
    sourceLinkage: boolean;
    balanced: boolean;
    correctLineCount: boolean;
    financialAccountSideCorrect: boolean;
    openingEquitySideCorrect: boolean;
    financialAccountLinkage: boolean;
    accountTransactionLinkage: boolean;
    expectedAccountsOnly: boolean;
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

  return Number.isFinite(
    parsed,
  )
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
    ) <= 0.01
  );
}


export async function testFinancialAccountOpeningBalanceGlPostingAction(
  financialAccountId: string,
): Promise<FinancialAccountOpeningBalanceGlTestResult> {
  await requireAdmin();

  const accountId =
    financialAccountId.trim();

  if (!accountId) {
    throw new Error(
      "Financial Account ID is required.",
    );
  }


  const supabase =
    await createClient();


  const {
    data: account,
    error: accountError,
  } =
    await supabase
      .from(
        "financial_accounts",
      )
      .select(`
        id,
        account_code,
        account_name,
        currency_code,
        opening_balance,
        gl_account_id
      `)
      .eq(
        "id",
        accountId,
      )
      .single();


  if (
    accountError ||
    !account
  ) {
    throw new Error(
      `Unable to load Financial Account: ${
        accountError?.message ??
        "Account was not found."
      }`,
    );
  }


  if (!account.gl_account_id) {
    throw new Error(
      "Financial Account does not have a GL mapping.",
    );
  }


  const {
    data: transaction,
    error: transactionError,
  } =
    await supabase
      .from(
        "account_transactions",
      )
      .select(`
        id,
        transaction_number,
        transaction_date,
        direction,
        amount,
        currency_code,
        exchange_rate,
        base_amount,
        status
      `)
      .eq(
        "account_id",
        account.id,
      )
      .eq(
        "transaction_type",
        "opening_balance",
      )
      .eq(
        "status",
        "posted",
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        },
      )
      .limit(
        1,
      )
      .single();


  if (
    transactionError ||
    !transaction
  ) {
    throw new Error(
      `Unable to load posted Opening Balance transaction: ${
        transactionError?.message ??
        "Transaction was not found."
      }`,
    );
  }


  const {
    data: mapping,
    error: mappingError,
  } =
    await supabase
      .from(
        "gl_account_mappings",
      )
      .select(`
        gl_account_id
      `)
      .eq(
        "mapping_key",
        "opening_balance_equity",
      )
      .eq(
        "is_active",
        true,
      )
      .single();


  if (
    mappingError ||
    !mapping?.gl_account_id
  ) {
    throw new Error(
      "Opening Balance Equity GL mapping is missing.",
    );
  }


  const first =
    await supabase.rpc(
      "post_financial_account_opening_balance_gl",
      {
        p_financial_account_id:
          account.id,
      },
    );


  if (first.error) {
    throw new Error(
      `Financial Account Opening Balance GL posting failed: ${first.error.message}`,
    );
  }


  const firstJournalId =
    typeof first.data ===
      "string"
      ? first.data
      : null;


  if (!firstJournalId) {
    throw new Error(
      "Opening Balance GL posting did not return a journal ID.",
    );
  }


  const second =
    await supabase.rpc(
      "post_financial_account_opening_balance_gl",
      {
        p_financial_account_id:
          account.id,
      },
    );


  if (second.error) {
    throw new Error(
      `Opening Balance GL idempotency test failed: ${second.error.message}`,
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
        .from(
          "gl_journal_entries",
        )
        .select(`
          id,
          journal_number,
          source_type,
          source_id,
          source_number,
          status
        `)
        .eq(
          "id",
          firstJournalId,
        )
        .single(),

      supabase
        .from(
          "gl_journal_balance",
        )
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
        .from(
          "gl_journal_lines",
        )
        .select(`
          id,
          line_number,
          gl_account_id,
          description,
          debit,
          credit,
          base_debit,
          base_credit,
          financial_account_id,
          source_line_type,
          source_line_id,
          source_line_number,

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
      `Unable to verify Financial Account Opening Balance GL journal: ${loadError.message}`,
    );
  }


  const journal =
    journalResult.data;

  const balance =
    balanceResult.data;


  if (
    !journal ||
    !balance
  ) {
    throw new Error(
      "Opening Balance GL verification data is incomplete.",
    );
  }


  const lines =
    (
      linesResult.data ??
      []
    ).map(
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
            numberValue(
              line.debit,
            ),

          credit:
            numberValue(
              line.credit,
            ),

          base_debit:
            numberValue(
              line.base_debit,
            ),

          base_credit:
            numberValue(
              line.base_credit,
            ),

          financial_account_id:
            line.financial_account_id,

          source_line_type:
            line.source_line_type,

          source_line_id:
            line.source_line_id,

          source_line_number:
            line.source_line_number,

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


  const openingBalance =
    numberValue(
      account.opening_balance,
    );


  const accountingAmount =
    Math.abs(
      openingBalance,
    );


  const openingBalancePresent =
    !moneyEqual(
      openingBalance,
      0,
    );


  const postedTransaction =
    transaction.status ===
      "posted";


  const sourceLinkage =
    journal.source_type ===
      "financial_account_opening_balance" &&
    journal.source_id ===
      account.id &&
    journal.source_number ===
      transaction.transaction_number;


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


  const correctLineCount =
    lines.length ===
    2;


  const financialAccountSideCorrect =
    openingBalance >
      0
      ? lines.some(
          (
            line,
          ) =>
            line.gl_account_id ===
              account.gl_account_id &&
            moneyEqual(
              line.debit,
              accountingAmount,
            ) &&
            moneyEqual(
              line.credit,
              0,
            ),
        )
      : lines.some(
          (
            line,
          ) =>
            line.gl_account_id ===
              account.gl_account_id &&
            moneyEqual(
              line.credit,
              accountingAmount,
            ) &&
            moneyEqual(
              line.debit,
              0,
            ),
        );


  const openingEquitySideCorrect =
    openingBalance >
      0
      ? lines.some(
          (
            line,
          ) =>
            line.gl_account_id ===
              mapping.gl_account_id &&
            moneyEqual(
              line.credit,
              accountingAmount,
            ) &&
            moneyEqual(
              line.debit,
              0,
            ),
        )
      : lines.some(
          (
            line,
          ) =>
            line.gl_account_id ===
              mapping.gl_account_id &&
            moneyEqual(
              line.debit,
              accountingAmount,
            ) &&
            moneyEqual(
              line.credit,
              0,
            ),
        );


  const financialAccountLinkage =
    lines.every(
      (
        line,
      ) =>
        line.financial_account_id ===
        account.id,
    );


  const accountTransactionLinkage =
    lines.every(
      (
        line,
      ) =>
        line.source_line_type ===
          "account_transaction" &&
        line.source_line_id ===
          transaction.id,
    );


  const expectedAccountsOnly =
    lines.every(
      (
        line,
      ) =>
        line.gl_account_id ===
          account.gl_account_id ||
        line.gl_account_id ===
          mapping.gl_account_id,
    );


  const allPassed =
    openingBalancePresent &&
    postedTransaction &&
    sourceLinkage &&
    balanced &&
    correctLineCount &&
    financialAccountSideCorrect &&
    openingEquitySideCorrect &&
    financialAccountLinkage &&
    accountTransactionLinkage &&
    expectedAccountsOnly &&
    idempotent;


  return {
    account: {
      id:
        account.id,

      account_code:
        account.account_code,

      account_name:
        account.account_name,

      currency_code:
        account.currency_code,

      opening_balance:
        openingBalance,

      gl_account_id:
        account.gl_account_id,
    },

    transaction: {
      id:
        transaction.id,

      transaction_number:
        transaction.transaction_number,

      transaction_date:
        transaction.transaction_date,

      direction:
        transaction.direction,

      amount:
        numberValue(
          transaction.amount,
        ),

      currency_code:
        transaction.currency_code,

      exchange_rate:
        numberValue(
          transaction.exchange_rate,
        ),

      base_amount:
        numberValue(
          transaction.base_amount,
        ),

      status:
        transaction.status,
    },

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
      openingBalancePresent,
      postedTransaction,
      sourceLinkage,
      balanced,
      correctLineCount,
      financialAccountSideCorrect,
      openingEquitySideCorrect,
      financialAccountLinkage,
      accountTransactionLinkage,
      expectedAccountsOnly,
      idempotent,

      allPassed,
    },
  };
}
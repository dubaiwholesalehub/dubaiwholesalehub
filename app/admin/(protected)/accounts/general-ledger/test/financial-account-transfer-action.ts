"use server";

import {
  requireAdmin,
} from "@/lib/auth/require-admin";

import {
  createClient,
} from "@/lib/supabase/server";


export type FinancialAccountTransferGlTestResult = {
  transfer: {
    id: string;
    transfer_number: string;
    transfer_date: string;
    status: string;

    from_account_id: string;
    to_account_id: string;

    from_amount: number;
    to_amount: number;

    from_currency_code: string;
    to_currency_code: string;

    exchange_rate: number;

    transfer_group_id: string;

    out_transaction_id: string;
    in_transaction_id: string;
  };

  transactions: {
    out: {
      id: string;
      account_id: string;
      amount: number;
      currency_code: string;
      exchange_rate: number;
      base_amount: number;
      transaction_type: string;
      direction: string;
      transfer_group_id: string | null;
      status: string;
    };

    in: {
      id: string;
      account_id: string;
      amount: number;
      currency_code: string;
      exchange_rate: number;
      base_amount: number;
      transaction_type: string;
      direction: string;
      transfer_group_id: string | null;
      status: string;
    };
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
    postedTransfer: boolean;
    operationalTransactionsPosted: boolean;
    transferGroupLinkage: boolean;
    baseAmountsEqual: boolean;

    sourceLinkage: boolean;
    balanced: boolean;
    correctLineCount: boolean;

    destinationDebit: boolean;
    sourceCredit: boolean;

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


export async function testFinancialAccountTransferGlPostingAction(
  transferId: string,
): Promise<FinancialAccountTransferGlTestResult> {
  await requireAdmin();

  const id =
    transferId.trim();

  if (!id) {
    throw new Error(
      "Financial Account Transfer ID is required.",
    );
  }


  const supabase =
    await createClient();


  /* =======================================================
   * Transfer
   * ======================================================= */

  const {
    data: transfer,
    error: transferError,
  } =
    await supabase
      .from(
        "financial_account_transfers",
      )
      .select(`
        id,
        transfer_number,
        transfer_date,
        status,

        from_account_id,
        to_account_id,

        from_amount,
        to_amount,

        from_currency_code,
        to_currency_code,

        exchange_rate,

        transfer_group_id,

        out_transaction_id,
        in_transaction_id
      `)
      .eq(
        "id",
        id,
      )
      .single();


  if (
    transferError ||
    !transfer
  ) {
    throw new Error(
      `Unable to load Financial Account Transfer: ${
        transferError?.message ??
        "Transfer was not found."
      }`,
    );
  }


  if (
    !transfer.out_transaction_id ||
    !transfer.in_transaction_id
  ) {
    throw new Error(
      `Transfer ${transfer.transfer_number} does not have both operational account transactions.`,
    );
  }


  /* =======================================================
   * Operational Account Transactions
   * ======================================================= */

  const {
    data: transactionRows,
    error: transactionError,
  } =
    await supabase
      .from(
        "account_transactions",
      )
      .select(`
        id,
        account_id,
        amount,
        currency_code,
        exchange_rate,
        base_amount,
        transaction_type,
        direction,
        transfer_group_id,
        status
      `)
      .in(
        "id",
        [
          transfer.out_transaction_id,
          transfer.in_transaction_id,
        ],
      );


  if (transactionError) {
    throw new Error(
      `Unable to load transfer account transactions: ${transactionError.message}`,
    );
  }


  const transactionRowsSafe =
    transactionRows ??
    [];


  const outTransaction =
    transactionRowsSafe.find(
      (
        row,
      ) =>
        row.id ===
        transfer.out_transaction_id,
    );


  const inTransaction =
    transactionRowsSafe.find(
      (
        row,
      ) =>
        row.id ===
        transfer.in_transaction_id,
    );


  if (
    !outTransaction ||
    !inTransaction
  ) {
    throw new Error(
      "Transfer account transaction data is incomplete.",
    );
  }


  /* =======================================================
   * Formal GL mappings
   * ======================================================= */

  const {
    data: accountRows,
    error: accountError,
  } =
    await supabase
      .from(
        "financial_accounts",
      )
      .select(`
        id,
        gl_account_id
      `)
      .in(
        "id",
        [
          transfer.from_account_id,
          transfer.to_account_id,
        ],
      );


  if (accountError) {
    throw new Error(
      `Unable to load financial-account GL mappings: ${accountError.message}`,
    );
  }


  const fromFinancialAccount =
    (
      accountRows ??
      []
    ).find(
      (
        account,
      ) =>
        account.id ===
        transfer.from_account_id,
    );


  const toFinancialAccount =
    (
      accountRows ??
      []
    ).find(
      (
        account,
      ) =>
        account.id ===
        transfer.to_account_id,
    );


  if (
    !fromFinancialAccount?.gl_account_id ||
    !toFinancialAccount?.gl_account_id
  ) {
    throw new Error(
      "Source or destination financial account does not have a GL mapping.",
    );
  }


  /* =======================================================
   * First GL posting
   * ======================================================= */

  const first =
    await supabase.rpc(
      "post_financial_account_transfer_gl",
      {
        p_transfer_id:
          transfer.id,
      },
    );


  if (first.error) {
    throw new Error(
      `Financial Account Transfer GL posting failed: ${first.error.message}`,
    );
  }


  const firstJournalId =
    typeof first.data ===
      "string"
      ? first.data
      : null;


  if (!firstJournalId) {
    throw new Error(
      "Financial Account Transfer GL posting did not return a journal ID.",
    );
  }


  /* =======================================================
   * Idempotency
   * ======================================================= */

  const second =
    await supabase.rpc(
      "post_financial_account_transfer_gl",
      {
        p_transfer_id:
          transfer.id,
      },
    );


  if (second.error) {
    throw new Error(
      `Financial Account Transfer GL idempotency test failed: ${second.error.message}`,
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


  /* =======================================================
   * Load GL result
   * ======================================================= */

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
      `Unable to verify Financial Account Transfer GL journal: ${loadError.message}`,
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
      "Financial Account Transfer GL verification data is incomplete.",
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


  /* =======================================================
   * Expected values
   * ======================================================= */

  const sourceBaseAmount =
    numberValue(
      outTransaction.base_amount,
    );


  const destinationBaseAmount =
    numberValue(
      inTransaction.base_amount,
    );


  const postedTransfer =
    transfer.status ===
    "posted";


  const operationalTransactionsPosted =
    outTransaction.status ===
      "posted" &&
    inTransaction.status ===
      "posted" &&
    outTransaction.direction ===
      "out" &&
    outTransaction.transaction_type ===
      "transfer_out" &&
    inTransaction.direction ===
      "in" &&
    inTransaction.transaction_type ===
      "transfer_in";


  const transferGroupLinkage =
    Boolean(
      transfer.transfer_group_id,
    ) &&
    outTransaction.transfer_group_id ===
      transfer.transfer_group_id &&
    inTransaction.transfer_group_id ===
      transfer.transfer_group_id;


  const baseAmountsEqual =
    moneyEqual(
      sourceBaseAmount,
      destinationBaseAmount,
    );


  const sourceLinkage =
    journal.source_type ===
      "financial_account_transfer" &&
    journal.source_id ===
      transfer.id &&
    journal.source_number ===
      transfer.transfer_number;


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


  const destinationDebit =
    lines.some(
      (
        line,
      ) =>
        line.gl_account_id ===
          toFinancialAccount.gl_account_id &&
        line.financial_account_id ===
          transfer.to_account_id &&
        moneyEqual(
          line.debit,
          destinationBaseAmount,
        ) &&
        moneyEqual(
          line.credit,
          0,
        ),
    );


  const sourceCredit =
    lines.some(
      (
        line,
      ) =>
        line.gl_account_id ===
          fromFinancialAccount.gl_account_id &&
        line.financial_account_id ===
          transfer.from_account_id &&
        moneyEqual(
          line.credit,
          sourceBaseAmount,
        ) &&
        moneyEqual(
          line.debit,
          0,
        ),
    );


  const financialAccountLinkage =
    lines.length ===
      2 &&
    lines.every(
      (
        line,
      ) =>
        line.financial_account_id ===
          transfer.from_account_id ||
        line.financial_account_id ===
          transfer.to_account_id,
    );


  const sourceLineIds =
    new Set([
      outTransaction.id,
      inTransaction.id,
    ]);


  const accountTransactionLinkage =
    lines.every(
      (
        line,
      ) =>
        line.source_line_type ===
          "account_transaction" &&
        Boolean(
          line.source_line_id,
        ) &&
        sourceLineIds.has(
          line.source_line_id!,
        ),
    );


  const expectedGlAccounts =
    new Set([
      fromFinancialAccount.gl_account_id,
      toFinancialAccount.gl_account_id,
    ]);


  const expectedAccountsOnly =
    lines.every(
      (
        line,
      ) =>
        expectedGlAccounts.has(
          line.gl_account_id,
        ),
    );


  const allPassed =
    postedTransfer &&
    operationalTransactionsPosted &&
    transferGroupLinkage &&
    baseAmountsEqual &&
    sourceLinkage &&
    balanced &&
    correctLineCount &&
    destinationDebit &&
    sourceCredit &&
    financialAccountLinkage &&
    accountTransactionLinkage &&
    expectedAccountsOnly &&
    idempotent;


  return {
    transfer: {
      id:
        transfer.id,

      transfer_number:
        transfer.transfer_number,

      transfer_date:
        transfer.transfer_date,

      status:
        transfer.status,

      from_account_id:
        transfer.from_account_id,

      to_account_id:
        transfer.to_account_id,

      from_amount:
        numberValue(
          transfer.from_amount,
        ),

      to_amount:
        numberValue(
          transfer.to_amount,
        ),

      from_currency_code:
        transfer.from_currency_code,

      to_currency_code:
        transfer.to_currency_code,

      exchange_rate:
        numberValue(
          transfer.exchange_rate,
        ),

      transfer_group_id:
        transfer.transfer_group_id,

      out_transaction_id:
        transfer.out_transaction_id,

      in_transaction_id:
        transfer.in_transaction_id,
    },

    transactions: {
      out: {
        id:
          outTransaction.id,

        account_id:
          outTransaction.account_id,

        amount:
          numberValue(
            outTransaction.amount,
          ),

        currency_code:
          outTransaction.currency_code,

        exchange_rate:
          numberValue(
            outTransaction.exchange_rate,
          ),

        base_amount:
          sourceBaseAmount,

        transaction_type:
          outTransaction.transaction_type,

        direction:
          outTransaction.direction,

        transfer_group_id:
          outTransaction.transfer_group_id,

        status:
          outTransaction.status,
      },

      in: {
        id:
          inTransaction.id,

        account_id:
          inTransaction.account_id,

        amount:
          numberValue(
            inTransaction.amount,
          ),

        currency_code:
          inTransaction.currency_code,

        exchange_rate:
          numberValue(
            inTransaction.exchange_rate,
          ),

        base_amount:
          destinationBaseAmount,

        transaction_type:
          inTransaction.transaction_type,

        direction:
          inTransaction.direction,

        transfer_group_id:
          inTransaction.transfer_group_id,

        status:
          inTransaction.status,
      },
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
      postedTransfer,
      operationalTransactionsPosted,
      transferGroupLinkage,
      baseAmountsEqual,

      sourceLinkage,
      balanced,
      correctLineCount,

      destinationDebit,
      sourceCredit,

      financialAccountLinkage,
      accountTransactionLinkage,

      expectedAccountsOnly,
      idempotent,

      allPassed,
    },
  };
}
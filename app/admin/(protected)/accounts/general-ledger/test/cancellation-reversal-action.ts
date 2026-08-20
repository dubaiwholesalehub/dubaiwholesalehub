"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export async function testExpenseCancellationReversalAction(
  expenseId: string,
) {
  await requireAdmin();

  const id = expenseId.trim();

  if (!id) {
    throw new Error("Expense ID is required.");
  }

  const supabase = await createClient();

  /*
   * Original expense + journal before cancellation
   */
  const {
    data: expenseBefore,
    error: expenseBeforeError,
  } = await supabase
    .from("expenses")
    .select(`
      id,
      expense_number,
      status,
      account_transaction_id
    `)
    .eq("id", id)
    .single();

  if (expenseBeforeError || !expenseBefore) {
    throw new Error(
      expenseBeforeError?.message ??
        "Expense was not found.",
    );
  }

  const {
    data: originalJournal,
    error: journalError,
  } = await supabase
    .from("gl_journal_entries")
    .select(`
      id,
      journal_number,
      status,
      reversal_entry_id
    `)
    .eq("source_type", "expense")
    .eq("source_id", id)
    .single();

  if (journalError || !originalJournal) {
    throw new Error(
      journalError?.message ??
        "Expense GL journal was not found.",
    );
  }

  /*
   * Run Migration 099 cancellation bridge
   */
  const first = await supabase.rpc(
    "cancel_expense_with_gl",
    {
      p_expense_id: id,
      p_reason: "GL reversal bridge validation",
    },
  );

  if (first.error) {
    throw new Error(
      `Cancellation bridge failed: ${first.error.message}`,
    );
  }

  const reversalId =
    typeof first.data === "string"
      ? first.data
      : null;

  if (!reversalId) {
    throw new Error(
      "Cancellation bridge did not return a reversal journal ID.",
    );
  }

  /*
   * Second call = idempotency test
   */
  const second = await supabase.rpc(
    "cancel_expense_with_gl",
    {
      p_expense_id: id,
      p_reason: "Second GL reversal bridge validation",
    },
  );

  if (second.error) {
    throw new Error(
      `Second cancellation request failed: ${second.error.message}`,
    );
  }

  const idempotent =
    second.data === reversalId;

  /*
   * Reload operational state
   */
  const {
    data: expenseAfter,
    error: expenseAfterError,
  } = await supabase
    .from("expenses")
    .select(`
      id,
      expense_number,
      status,
      account_transaction_id
    `)
    .eq("id", id)
    .single();

  if (expenseAfterError || !expenseAfter) {
    throw new Error(
      expenseAfterError?.message ??
        "Unable to reload expense.",
    );
  }

  const {
    data: accountTransaction,
    error: accountTransactionError,
  } = await supabase
    .from("account_transactions")
    .select(`
      id,
      status
    `)
    .eq(
      "id",
      expenseAfter.account_transaction_id!,
    )
    .single();

  if (
    accountTransactionError ||
    !accountTransaction
  ) {
    throw new Error(
      accountTransactionError?.message ??
        "Unable to load linked account transaction.",
    );
  }

  /*
   * Reload original + reversal journals
   */
  const {
    data: journals,
    error: journalsError,
  } = await supabase
    .from("gl_journal_entries")
    .select(`
      id,
      journal_number,
      status,
      source_type,
      source_id,
      original_entry_id,
      reversal_entry_id,
      reversal_reason
    `)
    .in("id", [
      originalJournal.id,
      reversalId,
    ]);

  if (journalsError) {
    throw new Error(journalsError.message);
  }

  const original =
    (journals ?? []).find(
      (row) =>
        row.id === originalJournal.id,
    );

  const reversal =
    (journals ?? []).find(
      (row) => row.id === reversalId,
    );

  if (!original || !reversal) {
    throw new Error(
      "Original or reversal journal could not be loaded.",
    );
  }

  /*
   * Load journal lines
   */
  const {
    data: originalLines,
    error: originalLinesError,
  } = await supabase
    .from("gl_journal_lines")
    .select(`
      line_number,
      debit,
      credit,
      base_debit,
      base_credit
    `)
    .eq(
      "journal_entry_id",
      original.id,
    )
    .order("line_number");

  if (originalLinesError) {
    throw new Error(
      originalLinesError.message,
    );
  }

  const {
    data: reversalLines,
    error: reversalLinesError,
  } = await supabase
    .from("gl_journal_lines")
    .select(`
      line_number,
      debit,
      credit,
      base_debit,
      base_credit
    `)
    .eq(
      "journal_entry_id",
      reversal.id,
    )
    .order("line_number");

  if (reversalLinesError) {
    throw new Error(
      reversalLinesError.message,
    );
  }

  const originalRows =
    originalLines ?? [];

  const reversalRows =
    reversalLines ?? [];

  const exactReversal =
    originalRows.length ===
      reversalRows.length &&
    originalRows.every(
      (line, index) => {
        const reversed =
          reversalRows[index];

        return (
          Number(line.debit) ===
            Number(reversed.credit) &&
          Number(line.credit) ===
            Number(reversed.debit) &&
          Number(line.base_debit) ===
            Number(reversed.base_credit) &&
          Number(line.base_credit) ===
            Number(reversed.base_debit)
        );
      },
    );

  const checks = {
    expenseCancelled:
      expenseAfter.status ===
      "cancelled",

    accountTransactionCancelled:
      accountTransaction.status ===
      "cancelled",

    originalJournalReversed:
      original.status ===
        "reversed" &&
      original.reversal_entry_id ===
        reversalId,

    reversalJournalPosted:
      reversal.status ===
        "posted",

    reversalSourceCorrect:
      reversal.source_type ===
        "journal_reversal" &&
      reversal.original_entry_id ===
        original.id,

    exactReversal,

    idempotent,
  };

  return {
    expense:
      expenseAfter,

    accountTransaction,

    originalJournal:
      original,

    reversalJournal:
      reversal,

    originalLines:
      originalRows,

    reversalLines:
      reversalRows,

    checks: {
      ...checks,

      allPassed:
        Object.values(
          checks,
        ).every(Boolean),
    },
  };
}
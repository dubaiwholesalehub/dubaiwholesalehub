"use server";

import {
  requireAdmin,
} from "@/lib/auth/require-admin";

import {
  createClient,
} from "@/lib/supabase/server";


export async function testSalesOrderGlPostingAction(
  salesOrderId: string,
) {
  await requireAdmin();

  const supabase =
    await createClient();


  const {
    data:
      journalId,
    error:
      postError,
  } =
    await supabase.rpc(
      "post_sales_order_revenue_gl",
      {
        p_sales_order_id:
          salesOrderId,
      },
    );


  if (
    postError ||
    !journalId
  ) {
    throw new Error(
      postError?.message ??
        "Sales Order GL posting did not return a journal ID.",
    );
  }


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
        .select(
          `
          id,
          journal_number,
          source_type,
          source_id,
          source_number,
          journal_date,
          posting_date,
          currency_code,
          exchange_rate,
          status
        `,
        )
        .eq(
          "id",
          journalId,
        )
        .single(),

      supabase
        .from(
          "gl_journal_balance",
        )
        .select(
          `
          journal_entry_id,
          line_count,
          total_debit,
          total_credit,
          total_base_debit,
          total_base_credit,
          base_difference,
          is_balanced
        `,
        )
        .eq(
          "journal_entry_id",
          journalId,
        )
        .single(),

      supabase
        .from(
          "gl_journal_lines",
        )
        .select(
          `
          line_number,
          description,
          debit,
          credit,
          base_debit,
          base_credit,
          customer_id,
          gl_account:gl_accounts (
            account_code,
            account_name
          )
        `,
        )
        .eq(
          "journal_entry_id",
          journalId,
        )
        .order(
          "line_number",
        ),
    ]);


  if (
    journalResult.error
  ) {
    throw new Error(
      journalResult.error.message,
    );
  }


  if (
    balanceResult.error
  ) {
    throw new Error(
      balanceResult.error.message,
    );
  }


  if (
    linesResult.error
  ) {
    throw new Error(
      linesResult.error.message,
    );
  }


  return {
    journal:
      journalResult.data,

    balance:
      balanceResult.data,

    lines:
      linesResult.data ??
      [],
  };
}
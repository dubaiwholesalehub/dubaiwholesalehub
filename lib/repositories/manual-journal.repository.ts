import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/database.types";

export type ManualJournalAccount = {
  id: string;
  accountCode: string;
  accountName: string;
  accountClass: string;
  normalBalance: string;
};

export type ManualJournalLineInput = {
  glAccountId: string;
  debit: number;
  credit: number;
  description?: string | null;

  customerId?: string | null;
  supplierId?: string | null;
  productId?: string | null;
  warehouseId?: string | null;
  financialAccountId?: string | null;
  expenseCategoryId?: string | null;
};

export type CreateManualJournalInput = {
  journalDate: string;
  postingDate: string;
  description: string;
  reference?: string | null;
  currencyCode?: string;
  exchangeRate?: number;
  lines: ManualJournalLineInput[];
};

export async function getManualJournalAccounts(): Promise<
  ManualJournalAccount[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("gl_accounts")
    .select(
      `
        id,
        account_code,
        account_name,
        account_class,
        normal_balance
      `,
    )
    .eq("is_active", true)
    .eq("is_posting_account", true)
    .eq("allow_manual_posting", true)
    .order("account_code", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Unable to load manual journal accounts: ${error.message}`,
    );
  }

  return (data ?? []).map((account) => ({
    id: account.id,
    accountCode: account.account_code,
    accountName: account.account_name,
    accountClass: account.account_class,
    normalBalance: account.normal_balance,
  }));
}

export async function createManualJournal(
  input: CreateManualJournalInput,
): Promise<string> {
  const supabase = await createClient();

  const lines: Json = input.lines.map((line) => ({
    glAccountId: line.glAccountId,

    debit: line.debit,
    credit: line.credit,

    baseDebit: line.debit * (input.exchangeRate ?? 1),
    baseCredit: line.credit * (input.exchangeRate ?? 1),

    description: line.description ?? null,

    customerId: line.customerId ?? null,
    supplierId: line.supplierId ?? null,
    productId: line.productId ?? null,
    warehouseId: line.warehouseId ?? null,
    financialAccountId: line.financialAccountId ?? null,
    expenseCategoryId: line.expenseCategoryId ?? null,
  }));

  const { data, error } = await supabase.rpc(
    "create_manual_gl_journal",
    {
      p_journal_date: input.journalDate,
      p_posting_date: input.postingDate,
      p_description: input.description,
      p_lines: lines,
      p_currency_code: input.currencyCode ?? "AED",
      p_exchange_rate: input.exchangeRate ?? 1,
      p_reference: input.reference ?? undefined,
    },
  );

  if (error) {
    throw new Error(
      `Unable to create manual journal: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "Manual journal was posted but no Journal ID was returned.",
    );
  }

  return data;
}
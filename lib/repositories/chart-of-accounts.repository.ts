import { createClient } from "@/lib/supabase/server";

export type ChartOfAccountsAccountClass =
  | "asset"
  | "liability"
  | "equity"
  | "revenue"
  | "cogs"
  | "expense"
  | "other_income"
  | "other_expense";

export type ChartOfAccountsStatementType =
  | "balance_sheet"
  | "profit_loss";

export type ChartOfAccountsNormalBalance =
  | "debit"
  | "credit";

export interface ChartOfAccountsAccount {
  id: string;
  accountCode: string;
  accountName: string;
  parentId: string | null;
  accountClass: ChartOfAccountsAccountClass;
  statementType: ChartOfAccountsStatementType;
  normalBalance: ChartOfAccountsNormalBalance;
  description: string | null;
  isPostingAccount: boolean;
  isControlAccount: boolean;
  allowManualPosting: boolean;
  isSystemAccount: boolean;
  isActive: boolean;
  displayOrder: number;
}

export async function getChartOfAccounts(): Promise<
  ChartOfAccountsAccount[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("gl_accounts")
    .select(
      `
        id,
        account_code,
        account_name,
        parent_id,
        account_class,
        statement_type,
        normal_balance,
        description,
        is_posting_account,
        is_control_account,
        allow_manual_posting,
        is_system_account,
        is_active,
        display_order
      `,
    )
    .order("display_order", {
      ascending: true,
    })
    .order("account_code", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Unable to load Chart of Accounts: ${error.message}`,
    );
  }

  return (data ?? []).map((account) => ({
    id: account.id,
    accountCode: account.account_code,
    accountName: account.account_name,
    parentId: account.parent_id,
    accountClass:
      account.account_class as ChartOfAccountsAccountClass,
    statementType:
      account.statement_type as ChartOfAccountsStatementType,
    normalBalance:
      account.normal_balance as ChartOfAccountsNormalBalance,
    description: account.description,
    isPostingAccount: account.is_posting_account,
    isControlAccount: account.is_control_account,
    allowManualPosting: account.allow_manual_posting,
    isSystemAccount: account.is_system_account,
    isActive: account.is_active,
    displayOrder: account.display_order,
  }));
}
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

export interface ChartOfAccountsParentOption {
  id: string;
  accountCode: string;
  accountName: string;
  accountClass: ChartOfAccountsAccountClass;
  statementType: ChartOfAccountsStatementType;
  normalBalance: ChartOfAccountsNormalBalance;
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

export async function getChartOfAccountsParentOptions(): Promise<
  ChartOfAccountsParentOption[]
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
        statement_type,
        normal_balance,
        display_order,
        parent_id,
        is_posting_account,
        is_active
      `,
    )
    .eq("is_active", true)
    .order("display_order", {
      ascending: true,
    })
    .order("account_code", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Unable to load Chart of Accounts parent options: ${error.message}`,
    );
  }

  const accounts =
    data ?? [];

  const activeHeadingParentIds =
    new Set(
      accounts
        .filter(
          (account) =>
            account.is_active &&
            !account.is_posting_account &&
            account.parent_id,
        )
        .map(
          (account) =>
            account.parent_id as string,
        ),
    );

  return accounts
    .filter(
      (account) =>
        account.is_active &&
        !account.is_posting_account &&
        !activeHeadingParentIds.has(
          account.id,
        ),
    )
    .map((account) => ({
      id: account.id,
      accountCode:
        account.account_code,
      accountName:
        account.account_name,
      accountClass:
        account.account_class as ChartOfAccountsAccountClass,
      statementType:
        account.statement_type as ChartOfAccountsStatementType,
      normalBalance:
        account.normal_balance as ChartOfAccountsNormalBalance,
    }));
}

export async function getChartOfAccountsAccount(
  accountId: string,
): Promise<ChartOfAccountsAccount | null> {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase
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
    .eq(
      "id",
      accountId,
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load GL account: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  return {
    id:
      data.id,

    accountCode:
      data.account_code,

    accountName:
      data.account_name,

    parentId:
      data.parent_id,

    accountClass:
      data.account_class as ChartOfAccountsAccountClass,

    statementType:
      data.statement_type as ChartOfAccountsStatementType,

    normalBalance:
      data.normal_balance as ChartOfAccountsNormalBalance,

    description:
      data.description,

    isPostingAccount:
      data.is_posting_account,

    isControlAccount:
      data.is_control_account,

    allowManualPosting:
      data.allow_manual_posting,

    isSystemAccount:
      data.is_system_account,

    isActive:
      data.is_active,

    displayOrder:
      data.display_order,
  };
}
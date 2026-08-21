import { createClient } from "@/lib/supabase/server";

export interface TrialBalanceAccount {
  glAccountId: string;
  accountCode: string;
  accountName: string;
  accountClass: string;
  statementType: string;
  normalBalance: string;
  isControlAccount: boolean;

  openingDebit: number;
  openingCredit: number;

  periodDebit: number;
  periodCredit: number;

  closingDebit: number;
  closingCredit: number;
}

export interface FormalTrialBalance {
  statementType: string;
  currencyCode: string;

  dateFrom: string;
  dateTo: string;

  accounts: TrialBalanceAccount[];

  openingDebit: number;
  openingCredit: number;
  openingDifference: number;
  openingBalanced: boolean;

  periodDebit: number;
  periodCredit: number;
  periodDifference: number;
  periodBalanced: boolean;

  closingDebit: number;
  closingCredit: number;
  closingDifference: number;
  closingBalanced: boolean;

  isBalanced: boolean;
}

function objectValue(
  value: unknown,
): Record<string, unknown> {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
}

function stringValue(
  value: unknown,
): string {
  return typeof value === "string"
    ? value
    : "";
}

function numberValue(
  value: unknown,
): number {
  const parsed =
    Number(value ?? 0);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function booleanValue(
  value: unknown,
): boolean {
  return value === true;
}

function normalizeAccounts(
  value: unknown,
): TrialBalanceAccount[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const row =
      objectValue(item);

    return {
      glAccountId:
        stringValue(row.glAccountId),

      accountCode:
        stringValue(row.accountCode),

      accountName:
        stringValue(row.accountName),

      accountClass:
        stringValue(row.accountClass),

      statementType:
        stringValue(row.statementType),

      normalBalance:
        stringValue(row.normalBalance),

      isControlAccount:
        booleanValue(
          row.isControlAccount,
        ),

      openingDebit:
        numberValue(row.openingDebit),

      openingCredit:
        numberValue(row.openingCredit),

      periodDebit:
        numberValue(row.periodDebit),

      periodCredit:
        numberValue(row.periodCredit),

      closingDebit:
        numberValue(row.closingDebit),

      closingCredit:
        numberValue(row.closingCredit),
    };
  });
}

export async function getFormalTrialBalance(
  dateFrom: string,
  dateTo: string,
): Promise<FormalTrialBalance> {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "get_formal_trial_balance",
    {
      p_date_from: dateFrom,
      p_date_to: dateTo,
    },
  );

  if (error) {
    throw new Error(
      `Unable to load formal Trial Balance: ${error.message}`,
    );
  }

  const row =
    objectValue(data);

  return {
    statementType:
      stringValue(row.statementType),

    currencyCode:
      stringValue(row.currencyCode),

    dateFrom:
      stringValue(row.dateFrom),

    dateTo:
      stringValue(row.dateTo),

    accounts:
      normalizeAccounts(
        row.accounts,
      ),

    openingDebit:
      numberValue(
        row.openingDebit,
      ),

    openingCredit:
      numberValue(
        row.openingCredit,
      ),

    openingDifference:
      numberValue(
        row.openingDifference,
      ),

    openingBalanced:
      booleanValue(
        row.openingBalanced,
      ),

    periodDebit:
      numberValue(
        row.periodDebit,
      ),

    periodCredit:
      numberValue(
        row.periodCredit,
      ),

    periodDifference:
      numberValue(
        row.periodDifference,
      ),

    periodBalanced:
      booleanValue(
        row.periodBalanced,
      ),

    closingDebit:
      numberValue(
        row.closingDebit,
      ),

    closingCredit:
      numberValue(
        row.closingCredit,
      ),

    closingDifference:
      numberValue(
        row.closingDifference,
      ),

    closingBalanced:
      booleanValue(
        row.closingBalanced,
      ),

    isBalanced:
      booleanValue(
        row.isBalanced,
      ),
  };
}
import { createClient } from "@/lib/supabase/server";

export interface FormalBalanceSheetAccount {
  glAccountId: string;
  accountCode: string;
  accountName: string;
  parentCode?: string;
  parentName?: string;
  isControlAccount?: boolean;
  debit?: number;
  credit?: number;
  amount: number;
}

export interface FormalBalanceSheetSection {
  accounts: FormalBalanceSheetAccount[];
  total: number;
}

export interface FormalBalanceSheetEquitySection
  extends FormalBalanceSheetSection {
  postedEquity: number;
  currentYearEarnings: number;
}

export interface FormalBalanceSheet {
  statementType: string;
  currencyCode: string;
  asOfDate: string;
  fiscalYearStart: string;

  assets: FormalBalanceSheetSection;
  liabilities: FormalBalanceSheetSection;
  equity: FormalBalanceSheetEquitySection;

  totalAssets: number;
  totalLiabilities: number;
  postedEquity: number;
  currentYearEarnings: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;

  balanceDifference: number;
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
  const parsed = Number(value ?? 0);

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
): FormalBalanceSheetAccount[] {
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

      parentCode:
        row.parentCode === undefined ||
        row.parentCode === null
          ? undefined
          : stringValue(row.parentCode),

      parentName:
        row.parentName === undefined ||
        row.parentName === null
          ? undefined
          : stringValue(row.parentName),

      isControlAccount:
        row.isControlAccount === undefined
          ? undefined
          : booleanValue(
              row.isControlAccount,
            ),

      debit:
        row.debit === undefined
          ? undefined
          : numberValue(row.debit),

      credit:
        row.credit === undefined
          ? undefined
          : numberValue(row.credit),

      amount:
        numberValue(row.amount),
    };
  });
}

function normalizeSection(
  value: unknown,
): FormalBalanceSheetSection {
  const row =
    objectValue(value);

  return {
    accounts:
      normalizeAccounts(
        row.accounts,
      ),

    total:
      numberValue(
        row.total,
      ),
  };
}

function normalizeEquitySection(
  value: unknown,
): FormalBalanceSheetEquitySection {
  const row =
    objectValue(value);

  return {
    accounts:
      normalizeAccounts(
        row.accounts,
      ),

    postedEquity:
      numberValue(
        row.postedEquity,
      ),

    currentYearEarnings:
      numberValue(
        row.currentYearEarnings,
      ),

    total:
      numberValue(
        row.total,
      ),
  };
}

export async function getFormalBalanceSheet(
  asOfDate: string,
): Promise<FormalBalanceSheet> {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "get_formal_balance_sheet",
    {
      p_as_of_date:
        asOfDate,
    },
  );

  if (error) {
    throw new Error(
      `Unable to load formal Balance Sheet: ${error.message}`,
    );
  }

  const row =
    objectValue(data);

  return {
    statementType:
      stringValue(
        row.statementType,
      ),

    currencyCode:
      stringValue(
        row.currencyCode,
      ),

    asOfDate:
      stringValue(
        row.asOfDate,
      ),

    fiscalYearStart:
      stringValue(
        row.fiscalYearStart,
      ),

    assets:
      normalizeSection(
        row.assets,
      ),

    liabilities:
      normalizeSection(
        row.liabilities,
      ),

    equity:
      normalizeEquitySection(
        row.equity,
      ),

    totalAssets:
      numberValue(
        row.totalAssets,
      ),

    totalLiabilities:
      numberValue(
        row.totalLiabilities,
      ),

    postedEquity:
      numberValue(
        row.postedEquity,
      ),

    currentYearEarnings:
      numberValue(
        row.currentYearEarnings,
      ),

    totalEquity:
      numberValue(
        row.totalEquity,
      ),

    totalLiabilitiesAndEquity:
      numberValue(
        row.totalLiabilitiesAndEquity,
      ),

    balanceDifference:
      numberValue(
        row.balanceDifference,
      ),

    isBalanced:
      booleanValue(
        row.isBalanced,
      ),
  };
}
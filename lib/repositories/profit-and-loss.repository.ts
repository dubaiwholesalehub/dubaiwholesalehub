import { createClient } from "@/lib/supabase/server";

export interface FormalProfitAndLossAccount {
  glAccountId: string;
  accountCode: string;
  accountName: string;
  normalBalance?: string;
  debit?: number;
  credit?: number;
  amount: number;
}

export interface FormalProfitAndLossSection {
  accounts: FormalProfitAndLossAccount[];
  total: number;
}

export interface FormalProfitAndLossStatement {
  statementType: string;
  currencyCode: string;
  dateFrom: string;
  dateTo: string;

  revenue: FormalProfitAndLossSection;
  costOfSales: FormalProfitAndLossSection;

  grossProfit: number;
  grossMarginPercentage: number;

  directExpenses: FormalProfitAndLossSection;
  contributionProfit: number;

  operatingExpenses: FormalProfitAndLossSection;
  operatingProfit: number;

  otherIncome: FormalProfitAndLossSection;
  financialExpenses: FormalProfitAndLossSection;
  otherExpenses: FormalProfitAndLossSection;

  totalExpenses: number;
  netProfit: number;
  netMarginPercentage: number;
}

function numberValue(value: unknown): number {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function stringValue(value: unknown): string {
  return typeof value === "string"
    ? value
    : "";
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

function normalizeAccounts(
  value: unknown,
): FormalProfitAndLossAccount[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const row = objectValue(item);

    return {
      glAccountId:
        stringValue(row.glAccountId),

      accountCode:
        stringValue(row.accountCode),

      accountName:
        stringValue(row.accountName),

      normalBalance:
        row.normalBalance === undefined
          ? undefined
          : stringValue(row.normalBalance),

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
): FormalProfitAndLossSection {
  const row = objectValue(value);

  return {
    accounts:
      normalizeAccounts(row.accounts),

    total:
      numberValue(row.total),
  };
}

export async function getFormalProfitAndLossStatement(
  dateFrom: string,
  dateTo: string,
): Promise<FormalProfitAndLossStatement> {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "get_formal_profit_and_loss_statement",
    {
      p_date_from: dateFrom,
      p_date_to: dateTo,
    },
  );

  if (error) {
    throw new Error(
      `Unable to load formal Profit & Loss statement: ${error.message}`,
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

    revenue:
      normalizeSection(row.revenue),

    costOfSales:
      normalizeSection(row.costOfSales),

    grossProfit:
      numberValue(row.grossProfit),

    grossMarginPercentage:
      numberValue(
        row.grossMarginPercentage,
      ),

    directExpenses:
      normalizeSection(
        row.directExpenses,
      ),

    contributionProfit:
      numberValue(
        row.contributionProfit,
      ),

    operatingExpenses:
      normalizeSection(
        row.operatingExpenses,
      ),

    operatingProfit:
      numberValue(
        row.operatingProfit,
      ),

    otherIncome:
      normalizeSection(
        row.otherIncome,
      ),

    financialExpenses:
      normalizeSection(
        row.financialExpenses,
      ),

    otherExpenses:
      normalizeSection(
        row.otherExpenses,
      ),

    totalExpenses:
      numberValue(
        row.totalExpenses,
      ),

    netProfit:
      numberValue(
        row.netProfit,
      ),

    netMarginPercentage:
      numberValue(
        row.netMarginPercentage,
      ),
  };
}
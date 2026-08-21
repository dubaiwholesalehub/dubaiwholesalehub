import { createClient } from "@/lib/supabase/server";

export interface GeneralLedgerAccount {
  glAccountId: string;
  accountCode: string;
  accountName: string;
  accountClass: string;
  statementType: string;
  normalBalance: string;
  isControlAccount: boolean;
  isActive: boolean;
}

export interface GeneralLedgerTransaction {
  journalLineId: string;
  journalEntryId: string;

  journalNumber: string;
  journalDate: string;
  postingDate: string;

  sourceType: string;
  sourceId?: string;
  sourceNumber?: string;

  journalDescription: string;
  journalStatus: string;

  originalEntryId?: string;
  reversalEntryId?: string;
  reversalReason?: string;

  lineNumber: number;
  lineDescription?: string;

  debit: number;
  credit: number;

  runningDebit: number;
  runningCredit: number;

  balanceSide: string;

  customerId?: string;
  supplierId?: string;
  productId?: string;
  warehouseId?: string;
  financialAccountId?: string;
  expenseCategoryId?: string;

  sourceLineType?: string;
  sourceLineId?: string;
  sourceLineNumber?: number;
}

export interface FormalGeneralLedger {
  statementType: string;
  currencyCode: string;

  dateFrom: string;
  dateTo: string;

  account: GeneralLedgerAccount;

  openingDebit: number;
  openingCredit: number;

  periodDebit: number;
  periodCredit: number;

  closingDebit: number;
  closingCredit: number;

  transactionCount: number;

  transactions: GeneralLedgerTransaction[];
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

function optionalStringValue(
  value: unknown,
): string | undefined {
  return typeof value === "string"
    ? value
    : undefined;
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

function optionalNumberValue(
  value: unknown,
): number | undefined {
  if (
    value === null ||
    value === undefined
  ) {
    return undefined;
  }

  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : undefined;
}

function booleanValue(
  value: unknown,
): boolean {
  return value === true;
}

function normalizeAccount(
  value: unknown,
): GeneralLedgerAccount {
  const row =
    objectValue(value);

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

    isActive:
      booleanValue(
        row.isActive,
      ),
  };
}

function normalizeTransactions(
  value: unknown,
): GeneralLedgerTransaction[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const row =
      objectValue(item);

    return {
      journalLineId:
        stringValue(row.journalLineId),

      journalEntryId:
        stringValue(row.journalEntryId),

      journalNumber:
        stringValue(row.journalNumber),

      journalDate:
        stringValue(row.journalDate),

      postingDate:
        stringValue(row.postingDate),

      sourceType:
        stringValue(row.sourceType),

      sourceId:
        optionalStringValue(row.sourceId),

      sourceNumber:
        optionalStringValue(
          row.sourceNumber,
        ),

      journalDescription:
        stringValue(
          row.journalDescription,
        ),

      journalStatus:
        stringValue(
          row.journalStatus,
        ),

      originalEntryId:
        optionalStringValue(
          row.originalEntryId,
        ),

      reversalEntryId:
        optionalStringValue(
          row.reversalEntryId,
        ),

      reversalReason:
        optionalStringValue(
          row.reversalReason,
        ),

      lineNumber:
        numberValue(
          row.lineNumber,
        ),

      lineDescription:
        optionalStringValue(
          row.lineDescription,
        ),

      debit:
        numberValue(row.debit),

      credit:
        numberValue(row.credit),

      runningDebit:
        numberValue(
          row.runningDebit,
        ),

      runningCredit:
        numberValue(
          row.runningCredit,
        ),

      balanceSide:
        stringValue(
          row.balanceSide,
        ),

      customerId:
        optionalStringValue(
          row.customerId,
        ),

      supplierId:
        optionalStringValue(
          row.supplierId,
        ),

      productId:
        optionalStringValue(
          row.productId,
        ),

      warehouseId:
        optionalStringValue(
          row.warehouseId,
        ),

      financialAccountId:
        optionalStringValue(
          row.financialAccountId,
        ),

      expenseCategoryId:
        optionalStringValue(
          row.expenseCategoryId,
        ),

      sourceLineType:
        optionalStringValue(
          row.sourceLineType,
        ),

      sourceLineId:
        optionalStringValue(
          row.sourceLineId,
        ),

      sourceLineNumber:
        optionalNumberValue(
          row.sourceLineNumber,
        ),
    };
  });
}

export async function getFormalGeneralLedger(
  glAccountId: string,
  dateFrom: string,
  dateTo: string,
): Promise<FormalGeneralLedger> {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "get_formal_general_ledger",
    {
      p_gl_account_id:
        glAccountId,

      p_date_from:
        dateFrom,

      p_date_to:
        dateTo,
    },
  );

  if (error) {
    throw new Error(
      `Unable to load formal General Ledger: ${error.message}`,
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

    dateFrom:
      stringValue(
        row.dateFrom,
      ),

    dateTo:
      stringValue(
        row.dateTo,
      ),

    account:
      normalizeAccount(
        row.account,
      ),

    openingDebit:
      numberValue(
        row.openingDebit,
      ),

    openingCredit:
      numberValue(
        row.openingCredit,
      ),

    periodDebit:
      numberValue(
        row.periodDebit,
      ),

    periodCredit:
      numberValue(
        row.periodCredit,
      ),

    closingDebit:
      numberValue(
        row.closingDebit,
      ),

    closingCredit:
      numberValue(
        row.closingCredit,
      ),

    transactionCount:
      numberValue(
        row.transactionCount,
      ),

    transactions:
      normalizeTransactions(
        row.transactions,
      ),
  };
}
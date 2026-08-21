import { createClient } from "@/lib/supabase/server";

export interface JournalEntryDetailLine {
  journalLineId: string;
  lineNumber: number;
  description?: string;

  glAccountId: string;
  accountCode: string;
  accountName: string;
  accountClass: string;
  statementType: string;
  normalBalance: string;
  isControlAccount: boolean;

  debit: number;
  credit: number;

  baseDebit: number;
  baseCredit: number;

  customerId?: string;
  customerName?: string;

  supplierId?: string;
  supplierName?: string;

  productId?: string;
  productName?: string;

  warehouseId?: string;
  warehouseName?: string;

  financialAccountId?: string;
  financialAccountName?: string;

  expenseCategoryId?: string;
  expenseCategoryName?: string;

  sourceLineType?: string;
  sourceLineId?: string;
  sourceLineNumber?: number;
}

export interface FormalJournalEntryDetail {
  journalEntryId: string;
  journalNumber: string;

  journalDate: string;
  postingDate: string;
  accountingPeriodId: string;

  sourceType: string;
  sourceId?: string;
  sourceNumber?: string;

  description: string;

  currencyCode: string;
  exchangeRate: number;

  status: string;

  originalEntryId?: string;
  reversalEntryId?: string;
  reversalReason?: string;

  postedAt?: string;
  postedBy?: string;

  reversedAt?: string;
  reversedBy?: string;

  createdBy?: string;
  createdAt?: string;

  totalDebit: number;
  totalCredit: number;

  baseDebit: number;
  baseCredit: number;

  isBalanced: boolean;

  lineCount: number;

  lines: JournalEntryDetailLine[];
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

function normalizeLines(
  value: unknown,
): JournalEntryDetailLine[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const row =
      objectValue(item);

    return {
      journalLineId:
        stringValue(
          row.journalLineId,
        ),

      lineNumber:
        numberValue(
          row.lineNumber,
        ),

      description:
        optionalStringValue(
          row.description,
        ),

      glAccountId:
        stringValue(
          row.glAccountId,
        ),

      accountCode:
        stringValue(
          row.accountCode,
        ),

      accountName:
        stringValue(
          row.accountName,
        ),

      accountClass:
        stringValue(
          row.accountClass,
        ),

      statementType:
        stringValue(
          row.statementType,
        ),

      normalBalance:
        stringValue(
          row.normalBalance,
        ),

      isControlAccount:
        booleanValue(
          row.isControlAccount,
        ),

      debit:
        numberValue(
          row.debit,
        ),

      credit:
        numberValue(
          row.credit,
        ),

      baseDebit:
        numberValue(
          row.baseDebit,
        ),

      baseCredit:
        numberValue(
          row.baseCredit,
        ),

      customerId:
        optionalStringValue(
          row.customerId,
        ),

      customerName:
        optionalStringValue(
          row.customerName,
        ),

      supplierId:
        optionalStringValue(
          row.supplierId,
        ),

      supplierName:
        optionalStringValue(
          row.supplierName,
        ),

      productId:
        optionalStringValue(
          row.productId,
        ),

      productName:
        optionalStringValue(
          row.productName,
        ),

      warehouseId:
        optionalStringValue(
          row.warehouseId,
        ),

      warehouseName:
        optionalStringValue(
          row.warehouseName,
        ),

      financialAccountId:
        optionalStringValue(
          row.financialAccountId,
        ),

      financialAccountName:
        optionalStringValue(
          row.financialAccountName,
        ),

      expenseCategoryId:
        optionalStringValue(
          row.expenseCategoryId,
        ),

      expenseCategoryName:
        optionalStringValue(
          row.expenseCategoryName,
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

export async function getFormalJournalEntryDetail(
  journalEntryId: string,
): Promise<FormalJournalEntryDetail> {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "get_formal_journal_entry_detail",
    {
      p_journal_entry_id:
        journalEntryId,
    },
  );

  if (error) {
    throw new Error(
      `Unable to load formal Journal Entry detail: ${error.message}`,
    );
  }

  const row =
    objectValue(data);

  return {
    journalEntryId:
      stringValue(
        row.journalEntryId,
      ),

    journalNumber:
      stringValue(
        row.journalNumber,
      ),

    journalDate:
      stringValue(
        row.journalDate,
      ),

    postingDate:
      stringValue(
        row.postingDate,
      ),

    accountingPeriodId:
      stringValue(
        row.accountingPeriodId,
      ),

    sourceType:
      stringValue(
        row.sourceType,
      ),

    sourceId:
      optionalStringValue(
        row.sourceId,
      ),

    sourceNumber:
      optionalStringValue(
        row.sourceNumber,
      ),

    description:
      stringValue(
        row.description,
      ),

    currencyCode:
      stringValue(
        row.currencyCode,
      ),

    exchangeRate:
      numberValue(
        row.exchangeRate,
      ),

    status:
      stringValue(
        row.status,
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

    postedAt:
      optionalStringValue(
        row.postedAt,
      ),

    postedBy:
      optionalStringValue(
        row.postedBy,
      ),

    reversedAt:
      optionalStringValue(
        row.reversedAt,
      ),

    reversedBy:
      optionalStringValue(
        row.reversedBy,
      ),

    createdBy:
      optionalStringValue(
        row.createdBy,
      ),

    createdAt:
      optionalStringValue(
        row.createdAt,
      ),

    totalDebit:
      numberValue(
        row.totalDebit,
      ),

    totalCredit:
      numberValue(
        row.totalCredit,
      ),

    baseDebit:
      numberValue(
        row.baseDebit,
      ),

    baseCredit:
      numberValue(
        row.baseCredit,
      ),

    isBalanced:
      booleanValue(
        row.isBalanced,
      ),

    lineCount:
      numberValue(
        row.lineCount,
      ),

    lines:
      normalizeLines(
        row.lines,
      ),
  };
}
import {
  createClient,
} from "@/lib/supabase/server";


/* =========================================================
 * Helpers
 * ========================================================= */

function objectValue(
  value: unknown,
): Record<string, unknown> {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<
      string,
      unknown
    >;
  }

  return {};
}


function arrayValue(
  value: unknown,
): unknown[] {
  return Array.isArray(value)
    ? value
    : [];
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


function nullableNumber(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}


function stringValue(
  value: unknown,
): string {
  return typeof value === "string"
    ? value
    : "";
}


function nullableString(
  value: unknown,
): string | null {
  return typeof value === "string"
    ? value
    : null;
}


function booleanValue(
  value: unknown,
): boolean {
  return value === true;
}


/* =========================================================
 * Types
 * ========================================================= */

export interface AgingSummary {
  current: number;
  days1To30: number;
  days31To60: number;
  days61To90: number;
  days90Plus: number;
}


export interface ReceivablesPayablesSummary {
  baseCurrency: string;

  totalReceivables: number;
  overdueReceivables: number;

  totalPayables: number;
  overduePayables: number;

  customerAdvances: number;
  supplierAdvances: number;

  supplierReturnCredits: number;
  totalSupplierCredits: number;

  unassignedPayables: number;

  openReceivableCount: number;
  openPayableCount: number;

  collectionsLast30Days: number;
  supplierPaymentsLast30Days: number;

  netTradePosition: number;
}


export interface DebtorRow {
  customerId: string;
  customerNumber: string | null;
  customerName: string;
  companyName: string | null;

  currencyCode: string;

  creditLimit: number;

  openOrderCount: number;

  totalReceivable: number;
  overdueAmount: number;

  currentAmount: number;
  days1To30: number;
  days31To60: number;
  days61To90: number;
  days90Plus: number;

  customerAdvance: number;
  netReceivableExposure: number;

  maximumDaysOverdue: number;

  oldestDueDate: string | null;

  creditUtilizationPercentage:
  number | null;

  availableCredit:
  number | null;

  overCreditLimit: boolean;
}


export interface CreditorRow {
  supplierId: string;
  supplierName: string;

  contactName: string | null;
  phone: string | null;
  email: string | null;

  paymentTermsDays: number;

  openPurchaseCount: number;

  totalPayable: number;
  overdueAmount: number;

  currentAmount: number;
  days1To30: number;
  days31To60: number;
  days61To90: number;
  days90Plus: number;

  supplierAdvance: number;
  supplierReturnCredit: number;
  totalSupplierCredit: number;
  netPayableExposure: number;

  maximumDaysOverdue: number;

  oldestDueDate: string | null;
}


export interface OverdueReceivableRow {
  salesOrderId: string;
  orderNumber: string;

  customerId: string;
  customerNumber: string | null;
  customerName: string;

  orderDate: string;
  dueDate: string;

  daysOverdue: number;
  agingBucket: string;

  currencyCode: string;

  outstandingAmount: number;
  baseOutstandingAmount: number;

  paymentStatus: string;
  source: string;
}


export interface OverduePayableRow {
  sourceType:
  "quick_purchase" | "goods_receipt";

  sourceId: string;

  quickPurchaseId: string | null;
  goodsReceiptId: string | null;

  documentNumber: string;
  documentDate: string;

  supplierId: string | null;
  supplierName: string;

  supplierInvoiceNumber:
  string | null;

  dueDate: string;

  daysOverdue: number;
  agingBucket: string;

  currencyCode: string;

  outstandingAmount: number;
  baseOutstandingAmount: number;

  paymentStatus: string;
}


export interface RecentReceiptRow {
  receiptId: string;
  receiptNumber: string;
  receiptDate: string;

  customerId: string;
  customerName: string;
  companyName: string | null;

  paymentMethod: string;
  currencyCode: string;

  amount: number;
  baseAmount: number;

  allocatedAmount: number;
  unallocatedAmount: number;

  referenceNumber: string | null;
}


export interface RecentSupplierPaymentRow {
  paymentId: string;
  paymentNumber: string;
  paymentDate: string;

  supplierId: string;
  supplierName: string;

  paymentMethod: string;
  currencyCode: string;

  amount: number;
  baseAmount: number;

  allocatedAmount: number;
  unallocatedAmount: number;

  referenceNumber: string | null;
}


export interface ReceivablesPayablesRisks {
  customers90Plus: number;
  suppliers90Plus: number;

  oldestPayableDays: number;
  oldestReceivableDays: number;

  payable90PlusAmount: number;
  receivable90PlusAmount: number;

  unassignedPayableCount: number;

  customersOverCreditLimit: number;

  customersWithOverdueBalance: number;
  suppliersWithOverdueBalance: number;
}


export interface ReceivablesPayablesDashboard {
  referenceDate: string;
  generatedAt: string;

  summary:
  ReceivablesPayablesSummary;

  receivableAging:
  AgingSummary;

  payableAging:
  AgingSummary;

  topDebtors:
  DebtorRow[];

  topCreditors:
  CreditorRow[];

  overdueReceivables:
  OverdueReceivableRow[];

  overduePayables:
  OverduePayableRow[];

  recentReceipts:
  RecentReceiptRow[];

  recentSupplierPayments:
  RecentSupplierPaymentRow[];

  risks:
  ReceivablesPayablesRisks;
}


/* =========================================================
 * Normalizers
 * ========================================================= */

function normalizeAging(
  value: unknown,
): AgingSummary {
  const row =
    objectValue(value);

  return {
    current:
      numberValue(
        row.current,
      ),

    days1To30:
      numberValue(
        row.days1To30,
      ),

    days31To60:
      numberValue(
        row.days31To60,
      ),

    days61To90:
      numberValue(
        row.days61To90,
      ),

    days90Plus:
      numberValue(
        row.days90Plus,
      ),
  };
}


/* =========================================================
 * Main Repository
 * ========================================================= */

export async function getReceivablesPayablesDashboard():
  Promise<ReceivablesPayablesDashboard> {
  const supabase =
    await createClient();


  const {
    data,
    error,
  } =
    await supabase.rpc(
      "get_receivables_payables_intelligence",
    );


  if (error) {
    throw new Error(
      `Unable to load receivables and payables intelligence: ${error.message}`,
    );
  }


  const payload =
    objectValue(data);

  const summaryRow =
    objectValue(
      payload.summary,
    );

  const risksRow =
    objectValue(
      payload.risks,
    );


  const topDebtors =
    arrayValue(
      payload.topDebtors,
    ).map(
      (
        value,
      ): DebtorRow => {
        const row =
          objectValue(value);

        return {
          customerId:
            stringValue(
              row.customerId,
            ),

          customerNumber:
            nullableString(
              row.customerNumber,
            ),

          customerName:
            stringValue(
              row.customerName,
            ),

          companyName:
            nullableString(
              row.companyName,
            ),

          currencyCode:
            stringValue(
              row.currencyCode,
            ),

          creditLimit:
            numberValue(
              row.creditLimit,
            ),

          openOrderCount:
            numberValue(
              row.openOrderCount,
            ),

          totalReceivable:
            numberValue(
              row.totalReceivable,
            ),

          overdueAmount:
            numberValue(
              row.overdueAmount,
            ),

          currentAmount:
            numberValue(
              row.currentAmount,
            ),

          days1To30:
            numberValue(
              row.days1To30,
            ),

          days31To60:
            numberValue(
              row.days31To60,
            ),

          days61To90:
            numberValue(
              row.days61To90,
            ),

          days90Plus:
            numberValue(
              row.days90Plus,
            ),

          customerAdvance:
            numberValue(
              row.customerAdvance,
            ),

          netReceivableExposure:
            numberValue(
              row.netReceivableExposure,
            ),

          maximumDaysOverdue:
            numberValue(
              row.maximumDaysOverdue,
            ),

          oldestDueDate:
            nullableString(
              row.oldestDueDate,
            ),

          creditUtilizationPercentage:
            nullableNumber(
              row.creditUtilizationPercentage,
            ),

          availableCredit:
            nullableNumber(
              row.availableCredit,
            ),

          overCreditLimit:
            booleanValue(
              row.overCreditLimit,
            ),
        };
      },
    );


  const topCreditors =
    arrayValue(
      payload.topCreditors,
    ).map(
      (
        value,
      ): CreditorRow => {
        const row =
          objectValue(value);

        return {
          supplierId:
            stringValue(
              row.supplierId,
            ),

          supplierName:
            stringValue(
              row.supplierName,
            ),

          contactName:
            nullableString(
              row.contactName,
            ),

          phone:
            nullableString(
              row.phone,
            ),

          email:
            nullableString(
              row.email,
            ),

          paymentTermsDays:
            numberValue(
              row.paymentTermsDays,
            ),

          openPurchaseCount:
            numberValue(
              row.openPurchaseCount,
            ),

          totalPayable:
            numberValue(
              row.totalPayable,
            ),

          overdueAmount:
            numberValue(
              row.overdueAmount,
            ),

          currentAmount:
            numberValue(
              row.currentAmount,
            ),

          days1To30:
            numberValue(
              row.days1To30,
            ),

          days31To60:
            numberValue(
              row.days31To60,
            ),

          days61To90:
            numberValue(
              row.days61To90,
            ),

          days90Plus:
            numberValue(
              row.days90Plus,
            ),

          supplierAdvance:
            numberValue(
              row.supplierAdvance,
            ),

          supplierReturnCredit:
            numberValue(
              row.supplierReturnCredit,
            ),

          totalSupplierCredit:
            numberValue(
              row.totalSupplierCredit,
            ),

          netPayableExposure:
            numberValue(
              row.netPayableExposure,
            ),

          maximumDaysOverdue:
            numberValue(
              row.maximumDaysOverdue,
            ),

          oldestDueDate:
            nullableString(
              row.oldestDueDate,
            ),
        };
      },
    );


  const overdueReceivables =
    arrayValue(
      payload.overdueReceivables,
    ).map(
      (
        value,
      ): OverdueReceivableRow => {
        const row =
          objectValue(value);

        return {
          salesOrderId:
            stringValue(
              row.salesOrderId,
            ),

          orderNumber:
            stringValue(
              row.orderNumber,
            ),

          customerId:
            stringValue(
              row.customerId,
            ),

          customerNumber:
            nullableString(
              row.customerNumber,
            ),

          customerName:
            stringValue(
              row.customerName,
            ),

          orderDate:
            stringValue(
              row.orderDate,
            ),

          dueDate:
            stringValue(
              row.dueDate,
            ),

          daysOverdue:
            numberValue(
              row.daysOverdue,
            ),

          agingBucket:
            stringValue(
              row.agingBucket,
            ),

          currencyCode:
            stringValue(
              row.currencyCode,
            ),

          outstandingAmount:
            numberValue(
              row.outstandingAmount,
            ),

          baseOutstandingAmount:
            numberValue(
              row.baseOutstandingAmount,
            ),

          paymentStatus:
            stringValue(
              row.paymentStatus,
            ),

          source:
            stringValue(
              row.source,
            ),
        };
      },
    );


  const overduePayables =
    arrayValue(
      payload.overduePayables,
    ).map(
      (
        value,
      ): OverduePayableRow => {
        const row =
          objectValue(value);

        return {
          sourceType:
            stringValue(
              row.sourceType,
            ) as
            | "quick_purchase"
            | "goods_receipt",

          sourceId:
            stringValue(
              row.sourceId,
            ),

          quickPurchaseId:
            nullableString(
              row.quickPurchaseId,
            ),

          goodsReceiptId:
            nullableString(
              row.goodsReceiptId,
            ),

          documentNumber:
            stringValue(
              row.documentNumber,
            ),

          documentDate:
            stringValue(
              row.documentDate,
            ),

          supplierId:
            nullableString(
              row.supplierId,
            ),

          supplierName:
            stringValue(
              row.supplierName,
            ),

          supplierInvoiceNumber:
            nullableString(
              row.supplierInvoiceNumber,
            ),

          dueDate:
            stringValue(
              row.dueDate,
            ),

          daysOverdue:
            numberValue(
              row.daysOverdue,
            ),

          agingBucket:
            stringValue(
              row.agingBucket,
            ),

          currencyCode:
            stringValue(
              row.currencyCode,
            ),

          outstandingAmount:
            numberValue(
              row.outstandingAmount,
            ),

          baseOutstandingAmount:
            numberValue(
              row.baseOutstandingAmount,
            ),

          paymentStatus:
            stringValue(
              row.paymentStatus,
            ),
        };
      },
    );


  const recentReceipts =
    arrayValue(
      payload.recentReceipts,
    ).map(
      (
        value,
      ): RecentReceiptRow => {
        const row =
          objectValue(value);

        return {
          receiptId:
            stringValue(
              row.receiptId,
            ),

          receiptNumber:
            stringValue(
              row.receiptNumber,
            ),

          receiptDate:
            stringValue(
              row.receiptDate,
            ),

          customerId:
            stringValue(
              row.customerId,
            ),

          customerName:
            stringValue(
              row.customerName,
            ),

          companyName:
            nullableString(
              row.companyName,
            ),

          paymentMethod:
            stringValue(
              row.paymentMethod,
            ),

          currencyCode:
            stringValue(
              row.currencyCode,
            ),

          amount:
            numberValue(
              row.amount,
            ),

          baseAmount:
            numberValue(
              row.baseAmount,
            ),

          allocatedAmount:
            numberValue(
              row.allocatedAmount,
            ),

          unallocatedAmount:
            numberValue(
              row.unallocatedAmount,
            ),

          referenceNumber:
            nullableString(
              row.referenceNumber,
            ),
        };
      },
    );


  const recentSupplierPayments =
    arrayValue(
      payload.recentSupplierPayments,
    ).map(
      (
        value,
      ): RecentSupplierPaymentRow => {
        const row =
          objectValue(value);

        return {
          paymentId:
            stringValue(
              row.paymentId,
            ),

          paymentNumber:
            stringValue(
              row.paymentNumber,
            ),

          paymentDate:
            stringValue(
              row.paymentDate,
            ),

          supplierId:
            stringValue(
              row.supplierId,
            ),

          supplierName:
            stringValue(
              row.supplierName,
            ),

          paymentMethod:
            stringValue(
              row.paymentMethod,
            ),

          currencyCode:
            stringValue(
              row.currencyCode,
            ),

          amount:
            numberValue(
              row.amount,
            ),

          baseAmount:
            numberValue(
              row.baseAmount,
            ),

          allocatedAmount:
            numberValue(
              row.allocatedAmount,
            ),

          unallocatedAmount:
            numberValue(
              row.unallocatedAmount,
            ),

          referenceNumber:
            nullableString(
              row.referenceNumber,
            ),
        };
      },
    );


  return {
    referenceDate:
      stringValue(
        payload.referenceDate,
      ),

    generatedAt:
      stringValue(
        payload.generatedAt,
      ),

    summary: {
      baseCurrency:
        stringValue(
          summaryRow.baseCurrency,
        ) || "AED",

      totalReceivables:
        numberValue(
          summaryRow.totalReceivables,
        ),

      overdueReceivables:
        numberValue(
          summaryRow.overdueReceivables,
        ),

      totalPayables:
        numberValue(
          summaryRow.totalPayables,
        ),

      overduePayables:
        numberValue(
          summaryRow.overduePayables,
        ),

      customerAdvances:
        numberValue(
          summaryRow.customerAdvances,
        ),

      supplierAdvances:
        numberValue(
          summaryRow.supplierAdvances,
        ),

      supplierReturnCredits:
        numberValue(
          summaryRow.supplierReturnCredits,
        ),

      totalSupplierCredits:
        numberValue(
          summaryRow.totalSupplierCredits,
        ),

      unassignedPayables:
        numberValue(
          summaryRow.unassignedPayables,
        ),

      openReceivableCount:
        numberValue(
          summaryRow.openReceivableCount,
        ),

      openPayableCount:
        numberValue(
          summaryRow.openPayableCount,
        ),

      collectionsLast30Days:
        numberValue(
          summaryRow.collectionsLast30Days,
        ),

      supplierPaymentsLast30Days:
        numberValue(
          summaryRow.supplierPaymentsLast30Days,
        ),

      netTradePosition:
        numberValue(
          summaryRow.netTradePosition,
        ),
    },

    receivableAging:
      normalizeAging(
        payload.receivableAging,
      ),

    payableAging:
      normalizeAging(
        payload.payableAging,
      ),

    topDebtors,

    topCreditors,

    overdueReceivables,

    overduePayables,

    recentReceipts,

    recentSupplierPayments,

    risks: {
      customers90Plus:
        numberValue(
          risksRow.customers90Plus,
        ),

      suppliers90Plus:
        numberValue(
          risksRow.suppliers90Plus,
        ),

      oldestPayableDays:
        numberValue(
          risksRow.oldestPayableDays,
        ),

      oldestReceivableDays:
        numberValue(
          risksRow.oldestReceivableDays,
        ),

      payable90PlusAmount:
        numberValue(
          risksRow.payable90PlusAmount,
        ),

      receivable90PlusAmount:
        numberValue(
          risksRow.receivable90PlusAmount,
        ),

      unassignedPayableCount:
        numberValue(
          risksRow.unassignedPayableCount,
        ),

      customersOverCreditLimit:
        numberValue(
          risksRow.customersOverCreditLimit,
        ),

      customersWithOverdueBalance:
        numberValue(
          risksRow.customersWithOverdueBalance,
        ),

      suppliersWithOverdueBalance:
        numberValue(
          risksRow.suppliersWithOverdueBalance,
        ),
    },
  };
}
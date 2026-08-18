import {
    createClient,
} from "@/lib/supabase/server";


/* =========================================================
 * Shared Helpers
 * ========================================================= */

function numberValue(
    value: unknown,
): number {
    const parsed =
        Number(
            value ?? 0,
        );

    return Number.isFinite(
        parsed,
    )
        ? parsed
        : 0;
}


function stringValue(
    value: unknown,
): string {
    return typeof value ===
        "string"
        ? value
        : "";
}


function nullableStringValue(
    value: unknown,
): string | null {
    return typeof value ===
        "string"
        ? value
        : null;
}


function booleanValue(
    value: unknown,
): boolean {
    return value === true;
}


function objectValue(
    value: unknown,
): Record<
    string,
    unknown
> {
    if (
        value &&
        typeof value ===
        "object" &&
        !Array.isArray(
            value,
        )
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
    return Array.isArray(
        value,
    )
        ? value
        : [];
}


/* =========================================================
 * Core P&L Types
 * ========================================================= */

export interface ProfitAndLossSummary {
    revenue: number;

    cogs: number;

    grossProfit: number;

    grossMarginPercentage: number;

    directExpenses: number;

    contributionProfit: number;

    operatingExpenses: number;

    operatingProfit: number;

    financialExpenses: number;

    otherExpenses: number;

    totalExpenses: number;

    netProfit: number;

    netMarginPercentage: number;

    salesOrderCount: number;

    quantitySold: number;
}


/* =========================================================
 * Reporting Period
 * ========================================================= */

export interface ProfitabilityPeriod {
    dateFrom: string;

    dateTo: string;

    days: number;

    trendGranularity:
    | "day"
    | "month";
}


/* =========================================================
 * KPI Comparison
 * ========================================================= */

export interface ProfitabilityComparison {
    revenuePercentage:
    number | null;

    cogsPercentage:
    number | null;

    grossProfitPercentage:
    number | null;

    expensesPercentage:
    number | null;

    netProfitPercentage:
    number | null;

    ordersPercentage:
    number | null;

    grossMarginPointChange:
    number;

    netMarginPointChange:
    number;

    averageOrderValue:
    number;

    previousAverageOrderValue:
    number;
}


/* =========================================================
 * Trend
 * ========================================================= */

export interface ProfitabilityTrendRow {
    period: string;

    label: string;

    revenue: number;

    cogs: number;

    grossProfit: number;

    expenses: number;

    netProfit: number;
}


/* =========================================================
 * Product Profitability
 * ========================================================= */

export interface ProductProfitability {
    productId:
    | string
    | null;

    itemName: string;

    sku:
    | string
    | null;

    quantitySold: number;

    salesOrderCount: number;

    revenue: number;

    cogs: number;

    grossProfit: number;

    grossMarginPercentage: number;
}


/* =========================================================
 * Category Profitability
 * ========================================================= */

export interface CategoryProfitability {
    categoryId:
    | string
    | null;

    categoryName: string;

    salesOrderCount: number;

    quantitySold: number;

    revenue: number;

    cogs: number;

    grossProfit: number;

    grossMarginPercentage: number;
}


/* =========================================================
 * Customer Profitability
 * ========================================================= */

export interface CustomerProfitability {
    customerId:
    | string
    | null;

    customerNumber:
    | string
    | null;

    customerName: string;

    salesOrderCount: number;

    quantitySold: number;

    revenue: number;

    cogs: number;

    grossProfit: number;

    grossMarginPercentage: number;

    averageOrderValue: number;
}


/* =========================================================
 * Warehouse Profitability
 * ========================================================= */

export interface WarehouseProfitability {
    warehouseId:
    | string
    | null;

    warehouseCode:
    | string
    | null;

    warehouseName: string;

    salesOrderCount: number;

    quantitySold: number;

    revenue: number;

    cogs: number;

    grossProfit: number;

    grossMarginPercentage: number;
}


/* =========================================================
 * Sales Source Profitability
 * ========================================================= */

export interface SalesSourceProfitability {
    source: string;

    salesOrderCount: number;

    quantitySold: number;

    revenue: number;

    cogs: number;

    grossProfit: number;

    grossMarginPercentage: number;
}


/* =========================================================
 * Expense Intelligence
 * ========================================================= */

export interface ExpenseCategoryProfitability {
    categoryId: string;

    categoryCode: string;

    categoryName: string;

    expenseType:
    | "direct"
    | "operating"
    | "financial"
    | "other";

    currentAmount: number;

    previousAmount: number;

    changePercentage:
    number | null;
}


/* =========================================================
 * Order Profitability
 * ========================================================= */

export interface OrderProfitability {
    salesOrderId: string;

    orderNumber: string;

    customerId:
    | string
    | null;

    customerName: string;

    source: string;

    quantitySold: number;

    revenue: number;

    cogs: number;

    grossProfit: number;

    grossMarginPercentage: number;
}


/* =========================================================
 * Loss-Making Order
 * ========================================================= */

export interface LossMakingOrder {
    salesOrderId: string;

    orderNumber: string;

    customerName: string;

    revenue: number;

    cogs: number;

    grossProfit: number;

    grossMarginPercentage: number;
}


/* =========================================================
 * Low Margin Product
 * ========================================================= */

export interface LowMarginProduct {
    productId:
    | string
    | null;

    itemName: string;

    sku:
    | string
    | null;

    quantitySold: number;

    revenue: number;

    cogs: number;

    grossProfit: number;

    grossMarginPercentage: number;
}


/* =========================================================
 * Margin Exception Audit
 * ========================================================= */

export interface MarginExceptionProfitability {
    approvalId: string;

    salesOrderId: string;

    orderNumber: string;

    customerId:
    | string
    | null;

    customerName: string;

    source: string;

    requestedReason: string;

    decisionNotes:
    | string
    | null;

    requestedAt: string;

    approvedAt:
    | string
    | null;

    requestedBy:
    | string
    | null;

    requestedByName:
    | string
    | null;

    approvedBy:
    | string
    | null;

    approvedByName:
    | string
    | null;

    lowestApprovedMarginPercentage:
    number | null;

    policyMinimumPercentage:
    number | null;

    policyWarningPercentage:
    number | null;

    recognizedRevenue: number;

    recognizedCogs: number;

    actualGrossProfit: number;

    actualGrossMarginPercentage: number;

    approvedMarginSacrificePoints: number;
}


/* =========================================================
 * Risk Intelligence
 * ========================================================= */

export interface ProfitabilityRisks {
    netLoss: boolean;

    expenseGrowthAlert: boolean;

    lossMakingOrderCount: number;

    lowMarginProductCount: number;

    approvedExceptionCount: number;

    grossMarginPointChange: number;

    expenseGrowthPercentage:
    number | null;

    grossMarginDeteriorating:
    boolean;

    negativeMarginProductCount:
    number;
}


/* =========================================================
 * Dashboard Payload
 * ========================================================= */

export interface ProfitabilityDashboardData {
    period:
    ProfitabilityPeriod;

    previousPeriod:
    ProfitabilityPeriod;

    summary:
    ProfitAndLossSummary;

    previousSummary:
    ProfitAndLossSummary;

    comparison:
    ProfitabilityComparison;

    trend:
    ProfitabilityTrendRow[];

    products:
    ProductProfitability[];

    categories:
    CategoryProfitability[];

    customers:
    CustomerProfitability[];

    warehouses:
    WarehouseProfitability[];

    salesSources:
    SalesSourceProfitability[];

    expenseCategories:
    ExpenseCategoryProfitability[];

    orders:
    OrderProfitability[];

    lossMakingOrders:
    LossMakingOrder[];

    lowMarginProducts:
    LowMarginProduct[];

    marginExceptions:
    MarginExceptionProfitability[];

    risks:
    ProfitabilityRisks;
}


/* =========================================================
 * Summary Normalizer
 * ========================================================= */

function normalizeSummary(
    value: unknown,
): ProfitAndLossSummary {
    const row =
        objectValue(
            value,
        );

    return {
        revenue:
            numberValue(
                row.revenue,
            ),

        cogs:
            numberValue(
                row.cogs,
            ),

        grossProfit:
            numberValue(
                row.gross_profit,
            ),

        grossMarginPercentage:
            numberValue(
                row.gross_margin_percentage,
            ),

        directExpenses:
            numberValue(
                row.direct_expenses,
            ),

        contributionProfit:
            numberValue(
                row.contribution_profit,
            ),

        operatingExpenses:
            numberValue(
                row.operating_expenses,
            ),

        operatingProfit:
            numberValue(
                row.operating_profit,
            ),

        financialExpenses:
            numberValue(
                row.financial_expenses,
            ),

        otherExpenses:
            numberValue(
                row.other_expenses,
            ),

        totalExpenses:
            numberValue(
                row.total_expenses,
            ),

        netProfit:
            numberValue(
                row.net_profit,
            ),

        netMarginPercentage:
            numberValue(
                row.net_margin_percentage,
            ),

        salesOrderCount:
            numberValue(
                row.sales_order_count,
            ),

        quantitySold:
            numberValue(
                row.quantity_sold,
            ),
    };
}


/* =========================================================
 * Period Normalizer
 * ========================================================= */

function normalizePeriod(
    value: unknown,
): ProfitabilityPeriod {
    const row =
        objectValue(
            value,
        );

    const granularity =
        row.trendGranularity ===
            "month"
            ? "month"
            : "day";

    return {
        dateFrom:
            stringValue(
                row.dateFrom,
            ),

        dateTo:
            stringValue(
                row.dateTo,
            ),

        days:
            numberValue(
                row.days,
            ),

        trendGranularity:
            granularity,
    };
}


/* =========================================================
 * Comparison Normalizer
 * ========================================================= */

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
        Number(
            value,
        );

    return Number.isFinite(
        parsed,
    )
        ? parsed
        : null;
}


function normalizeComparison(
    value: unknown,
): ProfitabilityComparison {
    const row =
        objectValue(
            value,
        );

    return {
        revenuePercentage:
            nullableNumber(
                row.revenuePercentage,
            ),

        cogsPercentage:
            nullableNumber(
                row.cogsPercentage,
            ),

        grossProfitPercentage:
            nullableNumber(
                row.grossProfitPercentage,
            ),

        expensesPercentage:
            nullableNumber(
                row.expensesPercentage,
            ),

        netProfitPercentage:
            nullableNumber(
                row.netProfitPercentage,
            ),

        ordersPercentage:
            nullableNumber(
                row.ordersPercentage,
            ),

        grossMarginPointChange:
            numberValue(
                row.grossMarginPointChange,
            ),

        netMarginPointChange:
            numberValue(
                row.netMarginPointChange,
            ),

        averageOrderValue:
            numberValue(
                row.averageOrderValue,
            ),

        previousAverageOrderValue:
            numberValue(
                row.previousAverageOrderValue,
            ),
    };
}


/* =========================================================
 * Dashboard Repository
 * ========================================================= */

export async function getProfitabilityDashboard(
    dateFrom: string,
    dateTo: string,
): Promise<
    ProfitabilityDashboardData
> {
    const supabase =
        await createClient();


    const {
        data,
        error,
    } =
        await supabase.rpc(
            "get_profitability_management_intelligence",
            {
                p_date_from:
                    dateFrom,

                p_date_to:
                    dateTo,
            },
        );


    if (error) {
        throw new Error(
            `Unable to load profitability management intelligence: ${error.message}`,
        );
    }


    const payload =
        objectValue(
            data,
        );


    const trend =
        arrayValue(
            payload.trend,
        ).map(
            (
                value,
            ): ProfitabilityTrendRow => {
                const row =
                    objectValue(
                        value,
                    );

                return {
                    period:
                        stringValue(
                            row.period,
                        ),

                    label:
                        stringValue(
                            row.label,
                        ),

                    revenue:
                        numberValue(
                            row.revenue,
                        ),

                    cogs:
                        numberValue(
                            row.cogs,
                        ),

                    grossProfit:
                        numberValue(
                            row.grossProfit,
                        ),

                    expenses:
                        numberValue(
                            row.expenses,
                        ),

                    netProfit:
                        numberValue(
                            row.netProfit,
                        ),
                };
            },
        );


    const products =
        arrayValue(
            payload.products,
        ).map(
            (
                value,
            ): ProductProfitability => {
                const row =
                    objectValue(
                        value,
                    );

                return {
                    productId:
                        nullableStringValue(
                            row.productId,
                        ),

                    itemName:
                        stringValue(
                            row.itemName,
                        ),

                    sku:
                        nullableStringValue(
                            row.sku,
                        ),

                    quantitySold:
                        numberValue(
                            row.quantitySold,
                        ),

                    salesOrderCount:
                        numberValue(
                            row.salesOrderCount,
                        ),

                    revenue:
                        numberValue(
                            row.revenue,
                        ),

                    cogs:
                        numberValue(
                            row.cogs,
                        ),

                    grossProfit:
                        numberValue(
                            row.grossProfit,
                        ),

                    grossMarginPercentage:
                        numberValue(
                            row.grossMarginPercentage,
                        ),
                };
            },
        );


    const categories =
        arrayValue(
            payload.categories,
        ).map(
            (
                value,
            ): CategoryProfitability => {
                const row =
                    objectValue(
                        value,
                    );

                return {
                    categoryId:
                        nullableStringValue(
                            row.categoryId,
                        ),

                    categoryName:
                        stringValue(
                            row.categoryName,
                        ),

                    salesOrderCount:
                        numberValue(
                            row.salesOrderCount,
                        ),

                    quantitySold:
                        numberValue(
                            row.quantitySold,
                        ),

                    revenue:
                        numberValue(
                            row.revenue,
                        ),

                    cogs:
                        numberValue(
                            row.cogs,
                        ),

                    grossProfit:
                        numberValue(
                            row.grossProfit,
                        ),

                    grossMarginPercentage:
                        numberValue(
                            row.grossMarginPercentage,
                        ),
                };
            },
        );


    const customers =
        arrayValue(
            payload.customers,
        ).map(
            (
                value,
            ): CustomerProfitability => {
                const row =
                    objectValue(
                        value,
                    );

                return {
                    customerId:
                        nullableStringValue(
                            row.customerId,
                        ),

                    customerNumber:
                        nullableStringValue(
                            row.customerNumber,
                        ),

                    customerName:
                        stringValue(
                            row.customerName,
                        ),

                    salesOrderCount:
                        numberValue(
                            row.salesOrderCount,
                        ),

                    quantitySold:
                        numberValue(
                            row.quantitySold,
                        ),

                    revenue:
                        numberValue(
                            row.revenue,
                        ),

                    cogs:
                        numberValue(
                            row.cogs,
                        ),

                    grossProfit:
                        numberValue(
                            row.grossProfit,
                        ),

                    grossMarginPercentage:
                        numberValue(
                            row.grossMarginPercentage,
                        ),

                    averageOrderValue:
                        numberValue(
                            row.averageOrderValue,
                        ),
                };
            },
        );


    const warehouses =
        arrayValue(
            payload.warehouses,
        ).map(
            (
                value,
            ): WarehouseProfitability => {
                const row =
                    objectValue(
                        value,
                    );

                return {
                    warehouseId:
                        nullableStringValue(
                            row.warehouseId,
                        ),

                    warehouseCode:
                        nullableStringValue(
                            row.warehouseCode,
                        ),

                    warehouseName:
                        stringValue(
                            row.warehouseName,
                        ),

                    salesOrderCount:
                        numberValue(
                            row.salesOrderCount,
                        ),

                    quantitySold:
                        numberValue(
                            row.quantitySold,
                        ),

                    revenue:
                        numberValue(
                            row.revenue,
                        ),

                    cogs:
                        numberValue(
                            row.cogs,
                        ),

                    grossProfit:
                        numberValue(
                            row.grossProfit,
                        ),

                    grossMarginPercentage:
                        numberValue(
                            row.grossMarginPercentage,
                        ),
                };
            },
        );


    const salesSources =
        arrayValue(
            payload.salesSources,
        ).map(
            (
                value,
            ): SalesSourceProfitability => {
                const row =
                    objectValue(
                        value,
                    );

                return {
                    source:
                        stringValue(
                            row.source,
                        ),

                    salesOrderCount:
                        numberValue(
                            row.salesOrderCount,
                        ),

                    quantitySold:
                        numberValue(
                            row.quantitySold,
                        ),

                    revenue:
                        numberValue(
                            row.revenue,
                        ),

                    cogs:
                        numberValue(
                            row.cogs,
                        ),

                    grossProfit:
                        numberValue(
                            row.grossProfit,
                        ),

                    grossMarginPercentage:
                        numberValue(
                            row.grossMarginPercentage,
                        ),
                };
            },
        );


    const expenseCategories =
        arrayValue(
            payload.expenseCategories,
        ).map(
            (
                value,
            ): ExpenseCategoryProfitability => {
                const row =
                    objectValue(
                        value,
                    );

                const expenseType =
                    row.expenseType ===
                        "direct" ||
                        row.expenseType ===
                        "operating" ||
                        row.expenseType ===
                        "financial" ||
                        row.expenseType ===
                        "other"
                        ? row.expenseType
                        : "other";

                return {
                    categoryId:
                        stringValue(
                            row.categoryId,
                        ),

                    categoryCode:
                        stringValue(
                            row.categoryCode,
                        ),

                    categoryName:
                        stringValue(
                            row.categoryName,
                        ),

                    expenseType,

                    currentAmount:
                        numberValue(
                            row.currentAmount,
                        ),

                    previousAmount:
                        numberValue(
                            row.previousAmount,
                        ),

                    changePercentage:
                        nullableNumber(
                            row.changePercentage,
                        ),
                };
            },
        );


    const orders =
        arrayValue(
            payload.orders,
        ).map(
            (
                value,
            ): OrderProfitability => {
                const row =
                    objectValue(
                        value,
                    );

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
                        nullableStringValue(
                            row.customerId,
                        ),

                    customerName:
                        stringValue(
                            row.customerName,
                        ),

                    source:
                        stringValue(
                            row.source,
                        ),

                    quantitySold:
                        numberValue(
                            row.quantitySold,
                        ),

                    revenue:
                        numberValue(
                            row.revenue,
                        ),

                    cogs:
                        numberValue(
                            row.cogs,
                        ),

                    grossProfit:
                        numberValue(
                            row.grossProfit,
                        ),

                    grossMarginPercentage:
                        numberValue(
                            row.grossMarginPercentage,
                        ),
                };
            },
        );


    const lossMakingOrders =
        arrayValue(
            payload.lossMakingOrders,
        ).map(
            (
                value,
            ): LossMakingOrder => {
                const row =
                    objectValue(
                        value,
                    );

                return {
                    salesOrderId:
                        stringValue(
                            row.salesOrderId,
                        ),

                    orderNumber:
                        stringValue(
                            row.orderNumber,
                        ),

                    customerName:
                        stringValue(
                            row.customerName,
                        ),

                    revenue:
                        numberValue(
                            row.revenue,
                        ),

                    cogs:
                        numberValue(
                            row.cogs,
                        ),

                    grossProfit:
                        numberValue(
                            row.grossProfit,
                        ),

                    grossMarginPercentage:
                        numberValue(
                            row.grossMarginPercentage,
                        ),
                };
            },
        );


    const lowMarginProducts =
        arrayValue(
            payload.lowMarginProducts,
        ).map(
            (
                value,
            ): LowMarginProduct => {
                const row =
                    objectValue(
                        value,
                    );

                return {
                    productId:
                        nullableStringValue(
                            row.productId,
                        ),

                    itemName:
                        stringValue(
                            row.itemName,
                        ),

                    sku:
                        nullableStringValue(
                            row.sku,
                        ),

                    quantitySold:
                        numberValue(
                            row.quantitySold,
                        ),

                    revenue:
                        numberValue(
                            row.revenue,
                        ),

                    cogs:
                        numberValue(
                            row.cogs,
                        ),

                    grossProfit:
                        numberValue(
                            row.grossProfit,
                        ),

                    grossMarginPercentage:
                        numberValue(
                            row.grossMarginPercentage,
                        ),
                };
            },
        );


    const marginExceptions =
        arrayValue(
            payload.marginExceptions,
        ).map(
            (
                value,
            ): MarginExceptionProfitability => {
                const row =
                    objectValue(
                        value,
                    );

                return {
                    approvalId:
                        stringValue(
                            row.approvalId,
                        ),

                    salesOrderId:
                        stringValue(
                            row.salesOrderId,
                        ),

                    orderNumber:
                        stringValue(
                            row.orderNumber,
                        ),

                    customerId:
                        nullableStringValue(
                            row.customerId,
                        ),

                    customerName:
                        stringValue(
                            row.customerName,
                        ),

                    source:
                        stringValue(
                            row.source,
                        ),

                    requestedReason:
                        stringValue(
                            row.requestedReason,
                        ),

                    decisionNotes:
                        nullableStringValue(
                            row.decisionNotes,
                        ),

                    requestedAt:
                        stringValue(
                            row.requestedAt,
                        ),

                    approvedAt:
                        nullableStringValue(
                            row.approvedAt,
                        ),

                    requestedBy:
                        nullableStringValue(
                            row.requestedBy,
                        ),

                    requestedByName:
                        nullableStringValue(
                            row.requestedByName,
                        ),

                    approvedBy:
                        nullableStringValue(
                            row.approvedBy,
                        ),

                    approvedByName:
                        nullableStringValue(
                            row.approvedByName,
                        ),

                    lowestApprovedMarginPercentage:
                        nullableNumber(
                            row.lowestApprovedMarginPercentage,
                        ),

                    policyMinimumPercentage:
                        nullableNumber(
                            row.policyMinimumPercentage,
                        ),

                    policyWarningPercentage:
                        nullableNumber(
                            row.policyWarningPercentage,
                        ),

                    recognizedRevenue:
                        numberValue(
                            row.recognizedRevenue,
                        ),

                    recognizedCogs:
                        numberValue(
                            row.recognizedCogs,
                        ),

                    actualGrossProfit:
                        numberValue(
                            row.actualGrossProfit,
                        ),

                    actualGrossMarginPercentage:
                        numberValue(
                            row.actualGrossMarginPercentage,
                        ),

                    approvedMarginSacrificePoints:
                        numberValue(
                            row.approvedMarginSacrificePoints,
                        ),
                };
            },
        );


    const risksRow =
        objectValue(
            payload.risks,
        );


    const risks:
        ProfitabilityRisks =
    {
        netLoss:
            booleanValue(
                risksRow.netLoss,
            ),

        expenseGrowthAlert:
            booleanValue(
                risksRow.expenseGrowthAlert,
            ),

        lossMakingOrderCount:
            numberValue(
                risksRow.lossMakingOrderCount,
            ),

        lowMarginProductCount:
            numberValue(
                risksRow.lowMarginProductCount,
            ),

        approvedExceptionCount:
            numberValue(
                risksRow.approvedExceptionCount,
            ),

        grossMarginPointChange:
            numberValue(
                risksRow.grossMarginPointChange,
            ),

        expenseGrowthPercentage:
            nullableNumber(
                risksRow.expenseGrowthPercentage,
            ),

        grossMarginDeteriorating:
            booleanValue(
                risksRow.grossMarginDeteriorating,
            ),

        negativeMarginProductCount:
            numberValue(
                risksRow.negativeMarginProductCount,
            ),
    };


    return {
        period:
            normalizePeriod(
                payload.period,
            ),

        previousPeriod:
            normalizePeriod(
                payload.previousPeriod,
            ),

        summary:
            normalizeSummary(
                payload.summary,
            ),

        previousSummary:
            normalizeSummary(
                payload.previousSummary,
            ),

        comparison:
            normalizeComparison(
                payload.comparison,
            ),

        trend,

        products,

        categories,

        customers,

        warehouses,

        salesSources,

        expenseCategories,

        orders,

        lossMakingOrders,

        lowMarginProducts,

        marginExceptions,

        risks,
    };
}
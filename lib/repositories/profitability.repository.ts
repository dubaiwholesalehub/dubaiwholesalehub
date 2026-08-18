import {
    createClient,
} from "@/lib/supabase/server";


/* =========================================================
 * Types
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


export interface ProfitabilitySalesLine {
    recognitionDate: string;

    salesOrderId: string;
    orderNumber: string;

    customerId:
    | string
    | null;

    productId:
    | string
    | null;

    itemName: string;

    sku:
    | string
    | null;

    warehouseId:
    | string
    | null;

    recognizedQuantity: number;

    unitSellingPrice: number;
    unitCost: number;

    grossRevenue: number;
    recognizedDiscount: number;

    revenue: number;
    cogs: number;

    grossProfit: number;
    grossMarginPercentage: number;
}


export interface ProfitabilityExpenseLine {
    recognitionDate: string;

    expenseId: string;
    expenseNumber: string;

    categoryId: string;

    categoryCode: string;
    categoryName: string;

    expenseType:
    | "direct"
    | "operating"
    | "financial"
    | "other";

    customerId:
    | string
    | null;

    salesOrderId:
    | string
    | null;

    profitabilityExpenseAmount:
    number;

    baseProfitabilityExpenseAmount:
    number;
}


export interface ProductProfitability {
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


export interface OrderProfitability {
    salesOrderId: string;
    orderNumber: string;

    customerId:
    | string
    | null;

    quantitySold: number;

    revenue: number;
    cogs: number;

    grossProfit: number;
    grossMarginPercentage: number;
}


export interface CustomerProfitability {
    customerId:
    | string
    | null;

    customerName: string;

    salesOrderCount: number;

    quantitySold: number;

    revenue: number;
    cogs: number;

    grossProfit: number;
    grossMarginPercentage: number;
}


export interface ExpenseBreakdown {
    expenseType:
    | "direct"
    | "operating"
    | "financial"
    | "other";

    amount: number;
}


export interface DailyProfitability {
    date: string;

    revenue: number;
    cogs: number;
    grossProfit: number;

    expenses: number;

    netProfit: number;
}


export interface ProfitabilityDashboardData {
    summary:
    ProfitAndLossSummary;

    salesLines:
    ProfitabilitySalesLine[];

    expenseLines:
    ProfitabilityExpenseLine[];

    products:
    ProductProfitability[];

    orders:
    OrderProfitability[];

    customers:
    CustomerProfitability[];

    expenseBreakdown:
    ExpenseBreakdown[];

    daily:
    DailyProfitability[];

    lossMakingOrders:
    OrderProfitability[];
}


/* =========================================================
 * Helpers
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


function marginPercentage(
    profit: number,
    revenue: number,
): number {
    if (revenue <= 0) {
        return 0;
    }

    return (
        profit /
        revenue
    ) * 100;
}


/* =========================================================
 * P&L Summary
 * ========================================================= */

export async function getProfitAndLossSummary(
    dateFrom: string,
    dateTo: string,
): Promise<ProfitAndLossSummary> {
    const supabase =
        await createClient();

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "get_profit_and_loss_summary",
            {
                p_date_from:
                    dateFrom,

                p_date_to:
                    dateTo,
            },
        );


    if (error) {
        throw new Error(
            `Unable to load Profit & Loss summary: ${error.message}`,
        );
    }


    const row =
        data?.[0];


    if (!row) {
        return {
            revenue: 0,
            cogs: 0,
            grossProfit: 0,
            grossMarginPercentage: 0,

            directExpenses: 0,
            contributionProfit: 0,

            operatingExpenses: 0,
            operatingProfit: 0,

            financialExpenses: 0,
            otherExpenses: 0,
            totalExpenses: 0,

            netProfit: 0,
            netMarginPercentage: 0,

            salesOrderCount: 0,
            quantitySold: 0,
        };
    }


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
 * Sales Lines
 * ========================================================= */

export async function getProfitabilitySalesLines(
    dateFrom: string,
    dateTo: string,
): Promise<
    ProfitabilitySalesLine[]
> {
    const supabase =
        await createClient();

    const {
        data,
        error,
    } =
        await supabase
            .from(
                "profitability_sales_lines",
            )
            .select(`
        recognition_date,
        sales_order_id,
        order_number,
        customer_id,
        product_id,
        item_name,
        sku,
        warehouse_id,
        recognized_quantity,
        unit_selling_price,
        unit_cost,
        gross_revenue,
        recognized_discount,
        base_net_revenue,
        base_cogs,
        gross_profit,
        gross_margin_percentage
      `)
            .gte(
                "recognition_date",
                dateFrom,
            )
            .lte(
                "recognition_date",
                dateTo,
            )
            .order(
                "recognition_date",
                {
                    ascending: true,
                },
            );


    if (error) {
        throw new Error(
            `Unable to load sales profitability: ${error.message}`,
        );
    }


    return (
        data ?? []
    ).map(
        (
            row,
        ) => ({
            recognitionDate:
                row.recognition_date ??
                "",

            salesOrderId:
                row.sales_order_id ??
                "",

            orderNumber:
                row.order_number ??
                "",

            customerId:
                row.customer_id,

            productId:
                row.product_id,

            itemName:
                row.item_name ??
                "",

            sku:
                row.sku,

            warehouseId:
                row.warehouse_id,

            recognizedQuantity:
                numberValue(
                    row.recognized_quantity,
                ),

            unitSellingPrice:
                numberValue(
                    row.unit_selling_price,
                ),

            unitCost:
                numberValue(
                    row.unit_cost,
                ),

            grossRevenue:
                numberValue(
                    row.gross_revenue,
                ),

            recognizedDiscount:
                numberValue(
                    row.recognized_discount,
                ),

            revenue:
                numberValue(
                    row.base_net_revenue,
                ),

            cogs:
                numberValue(
                    row.base_cogs,
                ),

            grossProfit:
                numberValue(
                    row.gross_profit,
                ),

            grossMarginPercentage:
                numberValue(
                    row.gross_margin_percentage,
                ),
        }),
    );
}


/* =========================================================
 * Expense Lines
 * ========================================================= */

export async function getProfitabilityExpenseLines(
    dateFrom: string,
    dateTo: string,
): Promise<
    ProfitabilityExpenseLine[]
> {
    const supabase =
        await createClient();

    const {
        data,
        error,
    } =
        await supabase
            .from(
                "profitability_expense_lines",
            )
            .select(`
        recognition_date,
        expense_id,
        expense_number,
        category_id,
        category_code,
        category_name,
        expense_type,
        customer_id,
        sales_order_id,
        profitability_expense_amount,
        base_profitability_expense_amount
      `)
            .gte(
                "recognition_date",
                dateFrom,
            )
            .lte(
                "recognition_date",
                dateTo,
            )
            .order(
                "recognition_date",
                {
                    ascending: true,
                },
            );


    if (error) {
        throw new Error(
            `Unable to load expense profitability: ${error.message}`,
        );
    }


    return (
        data ?? []
    ).map(
        (
            row,
        ) => ({
            recognitionDate:
                row.recognition_date ??
                "",

            expenseId:
                row.expense_id ??
                "",

            expenseNumber:
                row.expense_number ??
                "",

            categoryId:
                row.category_id ??
                "",

            categoryCode:
                row.category_code ??
                "",

            categoryName:
                row.category_name ??
                "",

            expenseType:
                row.expense_type as
                ProfitabilityExpenseLine["expenseType"],

            customerId:
                row.customer_id,

            salesOrderId:
                row.sales_order_id,

            profitabilityExpenseAmount:
                numberValue(
                    row.profitability_expense_amount,
                ),

            baseProfitabilityExpenseAmount:
                numberValue(
                    row.base_profitability_expense_amount,
                ),
        }),
    );
}


/* =========================================================
 * Product Aggregation
 * ========================================================= */

function buildProductProfitability(
    lines:
        ProfitabilitySalesLine[],
): ProductProfitability[] {
    const map =
        new Map<
            string,
            ProductProfitability
        >();


    for (
        const line
        of lines
    ) {
        const key =
            line.productId ??
            `name:${line.itemName}`;


        const current =
            map.get(
                key,
            );


        if (current) {
            current.quantitySold +=
                line.recognizedQuantity;

            current.revenue +=
                line.revenue;

            current.cogs +=
                line.cogs;

            current.grossProfit +=
                line.grossProfit;

            continue;
        }


        map.set(
            key,
            {
                productId:
                    line.productId,

                itemName:
                    line.itemName,

                sku:
                    line.sku,

                quantitySold:
                    line.recognizedQuantity,

                revenue:
                    line.revenue,

                cogs:
                    line.cogs,

                grossProfit:
                    line.grossProfit,

                grossMarginPercentage:
                    0,
            },
        );
    }


    return Array.from(
        map.values(),
    )
        .map(
            (
                item,
            ) => ({
                ...item,

                revenue:
                    Number(
                        item.revenue.toFixed(
                            2,
                        ),
                    ),

                cogs:
                    Number(
                        item.cogs.toFixed(
                            2,
                        ),
                    ),

                grossProfit:
                    Number(
                        item.grossProfit.toFixed(
                            2,
                        ),
                    ),

                grossMarginPercentage:
                    Number(
                        marginPercentage(
                            item.grossProfit,
                            item.revenue,
                        ).toFixed(
                            2,
                        ),
                    ),
            }),
        )
        .sort(
            (
                a,
                b,
            ) =>
                b.grossProfit -
                a.grossProfit,
        );
}


/* =========================================================
 * Sales Order Aggregation
 * ========================================================= */

function buildOrderProfitability(
    lines:
        ProfitabilitySalesLine[],
): OrderProfitability[] {
    const map =
        new Map<
            string,
            OrderProfitability
        >();


    for (
        const line
        of lines
    ) {
        const current =
            map.get(
                line.salesOrderId,
            );


        if (current) {
            current.quantitySold +=
                line.recognizedQuantity;

            current.revenue +=
                line.revenue;

            current.cogs +=
                line.cogs;

            current.grossProfit +=
                line.grossProfit;

            continue;
        }


        map.set(
            line.salesOrderId,
            {
                salesOrderId:
                    line.salesOrderId,

                orderNumber:
                    line.orderNumber,

                customerId:
                    line.customerId,

                quantitySold:
                    line.recognizedQuantity,

                revenue:
                    line.revenue,

                cogs:
                    line.cogs,

                grossProfit:
                    line.grossProfit,

                grossMarginPercentage:
                    0,
            },
        );
    }


    return Array.from(
        map.values(),
    )
        .map(
            (
                order,
            ) => ({
                ...order,

                revenue:
                    Number(
                        order.revenue.toFixed(
                            2,
                        ),
                    ),

                cogs:
                    Number(
                        order.cogs.toFixed(
                            2,
                        ),
                    ),

                grossProfit:
                    Number(
                        order.grossProfit.toFixed(
                            2,
                        ),
                    ),

                grossMarginPercentage:
                    Number(
                        marginPercentage(
                            order.grossProfit,
                            order.revenue,
                        ).toFixed(
                            2,
                        ),
                    ),
            }),
        )
        .sort(
            (
                a,
                b,
            ) =>
                b.grossProfit -
                a.grossProfit,
        );
}


/* =========================================================
 * Customer Aggregation
 * ========================================================= */

async function buildCustomerProfitability(
    lines:
        ProfitabilitySalesLine[],
): Promise<
    CustomerProfitability[]
> {
    const supabase =
        await createClient();

    const customerIds =
        Array.from(
            new Set(
                lines
                    .map(
                        (
                            line,
                        ) =>
                            line.customerId,
                    )
                    .filter(
                        (
                            value,
                        ): value is string =>
                            Boolean(
                                value,
                            ),
                    ),
            ),
        );


    const customerNames =
        new Map<
            string,
            string
        >();


    if (
        customerIds.length >
        0
    ) {
        const {
            data,
            error,
        } =
            await supabase
                .from(
                    "customers",
                )
                .select(`
          id,
          display_name,
          company_name,
          customer_number
        `)
                .in(
                    "id",
                    customerIds,
                );


        if (error) {
            throw new Error(
                `Unable to load customer profitability names: ${error.message}`,
            );
        }


        for (
            const customer
            of data ?? []
        ) {
            customerNames.set(
                customer.id,

                customer.display_name ||
                customer.company_name ||
                customer.customer_number,
            );
        }
    }


    const map =
        new Map<
            string,
            CustomerProfitability & {
                orderIds:
                Set<string>;
            }
        >();


    for (
        const line
        of lines
    ) {
        const key =
            line.customerId ??
            "unknown";


        const current =
            map.get(
                key,
            );


        if (current) {
            current.quantitySold +=
                line.recognizedQuantity;

            current.revenue +=
                line.revenue;

            current.cogs +=
                line.cogs;

            current.grossProfit +=
                line.grossProfit;

            current.orderIds.add(
                line.salesOrderId,
            );

            continue;
        }


        map.set(
            key,
            {
                customerId:
                    line.customerId,

                customerName:
                    line.customerId
                        ? (
                            customerNames.get(
                                line.customerId,
                            ) ??
                            "Unknown Customer"
                        )
                        : "Walk-in / Unknown",

                salesOrderCount:
                    0,

                quantitySold:
                    line.recognizedQuantity,

                revenue:
                    line.revenue,

                cogs:
                    line.cogs,

                grossProfit:
                    line.grossProfit,

                grossMarginPercentage:
                    0,

                orderIds:
                    new Set([
                        line.salesOrderId,
                    ]),
            },
        );
    }


    return Array.from(
        map.values(),
    )
        .map(
            (
                customer,
            ) => ({
                customerId:
                    customer.customerId,

                customerName:
                    customer.customerName,

                salesOrderCount:
                    customer.orderIds.size,

                quantitySold:
                    customer.quantitySold,

                revenue:
                    Number(
                        customer.revenue.toFixed(
                            2,
                        ),
                    ),

                cogs:
                    Number(
                        customer.cogs.toFixed(
                            2,
                        ),
                    ),

                grossProfit:
                    Number(
                        customer.grossProfit.toFixed(
                            2,
                        ),
                    ),

                grossMarginPercentage:
                    Number(
                        marginPercentage(
                            customer.grossProfit,
                            customer.revenue,
                        ).toFixed(
                            2,
                        ),
                    ),
            }),
        )
        .sort(
            (
                a,
                b,
            ) =>
                b.grossProfit -
                a.grossProfit,
        );
}


/* =========================================================
 * Expense Breakdown
 * ========================================================= */

function buildExpenseBreakdown(
    lines:
        ProfitabilityExpenseLine[],
): ExpenseBreakdown[] {
    const types:
        ExpenseBreakdown["expenseType"][] =
        [
            "direct",
            "operating",
            "financial",
            "other",
        ];


    return types.map(
        (
            expenseType,
        ) => ({
            expenseType,

            amount:
                Number(
                    lines
                        .filter(
                            (
                                line,
                            ) =>
                                line.expenseType ===
                                expenseType,
                        )
                        .reduce(
                            (
                                total,
                                line,
                            ) =>
                                total +
                                line.baseProfitabilityExpenseAmount,
                            0,
                        )
                        .toFixed(
                            2,
                        ),
                ),
        }),
    );
}


/* =========================================================
 * Daily Profitability
 * ========================================================= */

function buildDailyProfitability(
    sales:
        ProfitabilitySalesLine[],

    expenses:
        ProfitabilityExpenseLine[],
): DailyProfitability[] {
    const map =
        new Map<
            string,
            DailyProfitability
        >();


    for (
        const line
        of sales
    ) {
        const current =
            map.get(
                line.recognitionDate,
            ) ?? {
                date:
                    line.recognitionDate,

                revenue: 0,
                cogs: 0,
                grossProfit: 0,
                expenses: 0,
                netProfit: 0,
            };


        current.revenue +=
            line.revenue;

        current.cogs +=
            line.cogs;

        current.grossProfit +=
            line.grossProfit;


        map.set(
            line.recognitionDate,
            current,
        );
    }


    for (
        const line
        of expenses
    ) {
        const current =
            map.get(
                line.recognitionDate,
            ) ?? {
                date:
                    line.recognitionDate,

                revenue: 0,
                cogs: 0,
                grossProfit: 0,
                expenses: 0,
                netProfit: 0,
            };


        current.expenses +=
            line.baseProfitabilityExpenseAmount;


        map.set(
            line.recognitionDate,
            current,
        );
    }


    return Array.from(
        map.values(),
    )
        .map(
            (
                row,
            ) => ({
                ...row,

                revenue:
                    Number(
                        row.revenue.toFixed(
                            2,
                        ),
                    ),

                cogs:
                    Number(
                        row.cogs.toFixed(
                            2,
                        ),
                    ),

                grossProfit:
                    Number(
                        row.grossProfit.toFixed(
                            2,
                        ),
                    ),

                expenses:
                    Number(
                        row.expenses.toFixed(
                            2,
                        ),
                    ),

                netProfit:
                    Number(
                        (
                            row.grossProfit -
                            row.expenses
                        ).toFixed(
                            2,
                        ),
                    ),
            }),
        )
        .sort(
            (
                a,
                b,
            ) =>
                a.date.localeCompare(
                    b.date,
                ),
        );
}


/* =========================================================
 * Complete Dashboard
 * ========================================================= */

export async function getProfitabilityDashboard(
    dateFrom: string,
    dateTo: string,
): Promise<
    ProfitabilityDashboardData
> {
    const [
        summary,
        salesLines,
        expenseLines,
    ] =
        await Promise.all([
            getProfitAndLossSummary(
                dateFrom,
                dateTo,
            ),

            getProfitabilitySalesLines(
                dateFrom,
                dateTo,
            ),

            getProfitabilityExpenseLines(
                dateFrom,
                dateTo,
            ),
        ]);


    const products =
        buildProductProfitability(
            salesLines,
        );


    const orders =
        buildOrderProfitability(
            salesLines,
        );


    const customers =
        await buildCustomerProfitability(
            salesLines,
        );


    const expenseBreakdown =
        buildExpenseBreakdown(
            expenseLines,
        );


    const daily =
        buildDailyProfitability(
            salesLines,
            expenseLines,
        );


    const lossMakingOrders =
        orders
            .filter(
                (
                    order,
                ) =>
                    order.grossProfit <
                    0,
            )
            .sort(
                (
                    a,
                    b,
                ) =>
                    a.grossProfit -
                    b.grossProfit,
            );


    return {
        summary,
        salesLines,
        expenseLines,
        products,
        orders,
        customers,
        expenseBreakdown,
        daily,
        lossMakingOrders,
    };
}
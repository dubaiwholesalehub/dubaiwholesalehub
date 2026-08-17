import {
    createClient,
} from "@/lib/supabase/server";


/* =========================================================
 * Types
 * ========================================================= */

export type CustomerStatementEntryType =
    | "sale"
    | "receipt";


export type CustomerStatementEntry = {
    id: string;

    date: string;

    documentNumber: string;

    type:
    CustomerStatementEntryType;

    description: string;

    debit: number;

    credit: number;

    balance: number;

    href: string;
};


export type CustomerStatementCustomer = {
    id: string;

    customerNumber: string;

    displayName: string;

    companyName:
    | string
    | null;

    currencyCode: string;
};


export type CustomerStatementSummary = {
    openingBalance: number;

    sales: number;

    receipts: number;

    closingBalance: number;

    closingReceivable: number;

    customerAdvance: number;
};


export type CustomerStatement = {
    customer:
    CustomerStatementCustomer;

    dateFrom:
    string | null;

    dateTo:
    string | null;

    summary:
    CustomerStatementSummary;

    entries:
    CustomerStatementEntry[];
};


export type CustomerStatementOptions = {
    customerId: string;

    dateFrom?: string;

    dateTo?: string;
};


export type CustomerStatementCustomerOption = {
    id: string;

    customerNumber: string;

    displayName: string;

    companyName:
    | string
    | null;
};


/* =========================================================
 * Helpers
 * ========================================================= */

function money(
    value: unknown,
): number {
    const parsed =
        Number(
            value ?? 0,
        );

    if (
        !Number.isFinite(
            parsed,
        )
    ) {
        return 0;
    }

    return Math.round(
        (
            parsed +
            Number.EPSILON
        ) *
        100,
    ) / 100;
}


function cleanDate(
    value?: string,
): string | null {
    const cleaned =
        value?.trim();

    return cleaned
        ? cleaned
        : null;
}


/* =========================================================
 * Customer Options
 * ========================================================= */

export async function getCustomerStatementOptions():
    Promise<
        CustomerStatementCustomerOption[]
    > {
    const supabase =
        await createClient();

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
        customer_number,
        display_name,
        company_name
      `)
            .order(
                "display_name",
                {
                    ascending: true,
                },
            );


    if (error) {
        throw new Error(
            `Unable to load customers: ${error.message}`,
        );
    }


    return (
        data ?? []
    ).map(
        (
            customer,
        ) => ({
            id:
                customer.id,

            customerNumber:
                customer.customer_number,

            displayName:
                customer.display_name,

            companyName:
                customer.company_name,
        }),
    );
}


/* =========================================================
 * Customer Statement
 * ========================================================= */

export async function getCustomerStatement(
    input:
        CustomerStatementOptions,
): Promise<CustomerStatement> {
    const supabase =
        await createClient();


    const dateFrom =
        cleanDate(
            input.dateFrom,
        );

    const dateTo =
        cleanDate(
            input.dateTo,
        );


    if (
        dateFrom &&
        dateTo &&
        dateFrom >
        dateTo
    ) {
        throw new Error(
            "Statement start date cannot be after the end date.",
        );
    }


    /* -------------------------------------------------------
     * Customer
     * ------------------------------------------------------- */

    const {
        data: customer,
        error: customerError,
    } =
        await supabase
            .from(
                "customers",
            )
            .select(`
        id,
        customer_number,
        display_name,
        company_name,
        currency_code
      `)
            .eq(
                "id",
                input.customerId,
            )
            .single();


    if (
        customerError ||
        !customer
    ) {
        throw new Error(
            `Unable to load customer: ${customerError?.message ??
            "Customer not found."
            }`,
        );
    }


    /* -------------------------------------------------------
     * Sales Orders
     *
     * We load all relevant sales up to dateTo because
     * transactions before dateFrom are required to calculate
     * the opening balance.
     * ------------------------------------------------------- */

    let salesQuery =
        supabase
            .from(
                "sales_orders",
            )
            .select(`
                id,
                order_number,
                order_date,
                grand_total,
                status,
                created_at
                `)
            .eq(
                "customer_id",
                input.customerId,
            )
            .neq(
                "status",
                "draft",
            )
            .neq(
                "status",
                "cancelled",
            )
            .order(
                "order_date",
                {
                    ascending: true,
                },
            )
            .order(
                "created_at",
                {
                    ascending: true,
                },
            );


    if (dateTo) {
        salesQuery =
            salesQuery.lte(
                "order_date",
                dateTo,
            );
    }


    const {
        data: sales,
        error: salesError,
    } =
        await salesQuery;


    if (salesError) {
        throw new Error(
            `Unable to load customer sales: ${salesError.message}`,
        );
    }


    /* -------------------------------------------------------
     * Customer Receipts
     *
     * Only posted receipts affect the live customer ledger.
     * Cancelled receipts must not reduce receivables.
     * ------------------------------------------------------- */

    let receiptsQuery =
        supabase
            .from(
                "customer_receipts",
            )
            .select(`
        id,
        receipt_number,
        receipt_date,
        amount,
        payment_method,
        reference_number,
        status,
        created_at
      `)
            .eq(
                "customer_id",
                input.customerId,
            )
            .eq(
                "status",
                "posted",
            )
            .order(
                "receipt_date",
                {
                    ascending: true,
                },
            )
            .order(
                "created_at",
                {
                    ascending: true,
                },
            );


    if (dateTo) {
        receiptsQuery =
            receiptsQuery.lte(
                "receipt_date",
                dateTo,
            );
    }


    const {
        data: receipts,
        error: receiptsError,
    } =
        await receiptsQuery;


    if (receiptsError) {
        throw new Error(
            `Unable to load customer receipts: ${receiptsError.message}`,
        );
    }


    /* =======================================================
     * Build Raw Ledger
     * ======================================================= */

    type RawEntry = {
        id: string;

        date: string;

        createdAt: string;

        documentNumber: string;

        type:
        CustomerStatementEntryType;

        description: string;

        debit: number;

        credit: number;

        href: string;

        sortPriority: number;
    };


    const rawEntries:
        RawEntry[] = [];


    for (
        const sale of
        sales ?? []
    ) {
        rawEntries.push({
            id:
                `sale-${sale.id}`,

            date:
                sale.order_date,

            createdAt:
                sale.created_at,

            documentNumber:
                sale.order_number,

            type:
                "sale",

            description:
                "Sales Order",

            debit:
                money(
                    sale.grand_total,
                ),

            credit:
                0,

            href:
                `/admin/sales/orders/${sale.id}`,

            /*
             * Sales are processed before receipts when both have
             * the same date and no reliable cross-table timestamp
             * ordering is available.
             */
            sortPriority:
                1,
        });
    }


    for (
        const receipt of
        receipts ?? []
    ) {
        const paymentMethod =
            receipt.payment_method
                ?.replaceAll(
                    "_",
                    " ",
                ) ??
            "payment";


        rawEntries.push({
            id:
                `receipt-${receipt.id}`,

            date:
                receipt.receipt_date,

            createdAt:
                receipt.created_at,

            documentNumber:
                receipt.receipt_number,

            type:
                "receipt",

            description:
                `Customer Receipt · ${paymentMethod}`,

            debit:
                0,

            /*
             * Use the full posted receipt amount.
             *
             * Any unallocated portion represents customer advance
             * and therefore must still credit the customer account.
             */
            credit:
                money(
                    receipt.amount,
                ),

            href:
                `/admin/sales/receipts/${receipt.id}`,

            sortPriority:
                2,
        });
    }


    rawEntries.sort(
        (
            left,
            right,
        ) => {
            const dateCompare =
                left.date.localeCompare(
                    right.date,
                );

            if (
                dateCompare !==
                0
            ) {
                return dateCompare;
            }


            const createdCompare =
                left.createdAt.localeCompare(
                    right.createdAt,
                );

            if (
                createdCompare !==
                0
            ) {
                return createdCompare;
            }

            return (
                left.sortPriority -
                right.sortPriority
            );
        },
    );


    /* =======================================================
     * Opening Balance
     * ======================================================= */

    let openingBalance =
        0;


    if (dateFrom) {
        for (
            const entry of
            rawEntries
        ) {
            if (
                entry.date >=
                dateFrom
            ) {
                continue;
            }


            openingBalance =
                money(
                    openingBalance +
                    entry.debit -
                    entry.credit,
                );
        }
    }


    /* =======================================================
     * Statement Period
     * ======================================================= */

    const periodEntries =
        rawEntries.filter(
            (
                entry,
            ) => {
                if (
                    dateFrom &&
                    entry.date <
                    dateFrom
                ) {
                    return false;
                }


                if (
                    dateTo &&
                    entry.date >
                    dateTo
                ) {
                    return false;
                }


                return true;
            },
        );


    let runningBalance =
        openingBalance;

    let salesTotal =
        0;

    let receiptsTotal =
        0;


    const entries:
        CustomerStatementEntry[] =
        periodEntries.map(
            (
                entry,
            ) => {
                salesTotal =
                    money(
                        salesTotal +
                        entry.debit,
                    );


                receiptsTotal =
                    money(
                        receiptsTotal +
                        entry.credit,
                    );


                runningBalance =
                    money(
                        runningBalance +
                        entry.debit -
                        entry.credit,
                    );


                return {
                    id:
                        entry.id,

                    date:
                        entry.date,

                    documentNumber:
                        entry.documentNumber,

                    type:
                        entry.type,

                    description:
                        entry.description,

                    debit:
                        entry.debit,

                    credit:
                        entry.credit,

                    balance:
                        runningBalance,

                    href:
                        entry.href,
                };
            },
        );


    const closingBalance =
        money(
            runningBalance,
        );


    return {
        customer: {
            id:
                customer.id,

            customerNumber:
                customer.customer_number,

            displayName:
                customer.display_name,

            companyName:
                customer.company_name,

            currencyCode:
                customer.currency_code,
        },

        dateFrom,

        dateTo,

        summary: {
            openingBalance:
                money(
                    openingBalance,
                ),

            sales:
                money(
                    salesTotal,
                ),

            receipts:
                money(
                    receiptsTotal,
                ),

            closingBalance,

            closingReceivable:
                closingBalance >
                    0
                    ? closingBalance
                    : 0,

            customerAdvance:
                closingBalance <
                    0
                    ? money(
                        Math.abs(
                            closingBalance,
                        ),
                    )
                    : 0,
        },

        entries,
    };
}

/* =========================================================
 * Customer Financial Positions
 *
 * Lightweight bulk financial summary used by Customer
 * master list.
 * ========================================================= */

export interface CustomerFinancialPosition {
    customerId: string;
    receivable: number;
    advance: number;
    netPosition: number;
}

export async function getCustomerFinancialPositions(
    customerIds: string[],
): Promise<
    Record<
        string,
        CustomerFinancialPosition
    >
> {
    if (customerIds.length === 0) {
        return {};
    }

    const supabase =
        await createClient();

    /*
     * -------------------------------------------------------
     * Outstanding Sales Orders
     * -------------------------------------------------------
     */

    const {
        data: orders,
        error: ordersError,
    } = await supabase
        .from("sales_orders")
        .select(`
      customer_id,
      balance_due,
      status
    `)
        .in(
            "customer_id",
            customerIds,
        )
        .gt(
            "balance_due",
            0,
        );

    if (ordersError) {
        throw new Error(
            `Unable to load customer receivables: ${ordersError.message}`,
        );
    }

    /*
     * -------------------------------------------------------
     * Available Customer Advances
     * -------------------------------------------------------
     */

    const {
        data: receipts,
        error: receiptsError,
    } = await supabase
        .from(
            "customer_receipts",
        )
        .select(`
      customer_id,
      unallocated_amount,
      status
    `)
        .in(
            "customer_id",
            customerIds,
        )
        .eq(
            "status",
            "posted",
        )
        .gt(
            "unallocated_amount",
            0,
        );

    if (receiptsError) {
        throw new Error(
            `Unable to load customer advances: ${receiptsError.message}`,
        );
    }

    /*
     * Start every requested customer at zero.
     */

    const positions: Record<
        string,
        CustomerFinancialPosition
    > = {};

    for (const customerId of customerIds) {
        positions[customerId] = {
            customerId,
            receivable: 0,
            advance: 0,
            netPosition: 0,
        };
    }

    /*
     * Sum outstanding receivables.
     */

    for (const order of orders ?? []) {
        if (
            !order.customer_id ||
            !positions[
            order.customer_id
            ]
        ) {
            continue;
        }

        positions[
            order.customer_id
        ].receivable +=
            Number(
                order.balance_due ??
                0,
            );
    }

    /*
     * Sum unallocated customer advances.
     */

    for (const receipt of receipts ?? []) {
        if (
            !receipt.customer_id ||
            !positions[
            receipt.customer_id
            ]
        ) {
            continue;
        }

        positions[
            receipt.customer_id
        ].advance +=
            Number(
                receipt.unallocated_amount ??
                0,
            );
    }

    /*
     * Calculate net position.
     *
     * Positive = customer owes us.
     * Negative = we hold customer advance.
     */

    for (const position of Object.values(
        positions,
    )) {
        position.receivable =
            Math.round(
                position.receivable *
                100,
            ) / 100;

        position.advance =
            Math.round(
                position.advance *
                100,
            ) / 100;

        position.netPosition =
            Math.round(
                (
                    position.receivable -
                    position.advance
                ) * 100,
            ) / 100;
    }

    return positions;
}
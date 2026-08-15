import {
    createClient,
} from "@/lib/supabase/server";


/* =========================================================
 * Types
 * ========================================================= */

export interface ReceivablesCustomerRow {
    customerId: string;

    customerNumber: string;

    customerName: string;

    receivable: number;

    customerAdvance: number;

    netReceivable: number;

    overdueAmount: number;

    lastSaleDate:
    | string
    | null;
}


export interface ReceivablesAging {
    current: number;

    days1To30: number;

    days31To60: number;

    days61To90: number;

    days90Plus: number;
}


export interface ReceivablesDashboard {
    totalReceivables: number;

    totalCustomerAdvances: number;

    netReceivable: number;

    salesThisMonth: number;

    receiptsThisMonth: number;

    customersWithBalance: number;

    customersWithAdvance: number;

    aging:
    ReceivablesAging;

    customers:
    ReceivablesCustomerRow[];
}


/* =========================================================
 * Helpers
 * ========================================================= */

function toNumber(
    value: unknown,
): number {
    const number =
        Number(
            value ?? 0,
        );

    return Number.isFinite(
        number,
    )
        ? number
        : 0;
}


function roundMoney(
    value: number,
): number {
    return Math.round(
        (
            value +
            Number.EPSILON
        ) *
        100,
    ) / 100;
}


function startOfMonth(
    date: Date,
): string {
    return [
        date.getFullYear(),

        String(
            date.getMonth() + 1,
        ).padStart(
            2,
            "0",
        ),

        "01",
    ].join("-");
}


function differenceInDays(
    laterDate: string,
    earlierDate: string,
): number {
    const later =
        new Date(
            `${laterDate}T00:00:00Z`,
        );

    const earlier =
        new Date(
            `${earlierDate}T00:00:00Z`,
        );

    return Math.max(
        0,
        Math.floor(
            (
                later.getTime() -
                earlier.getTime()
            ) /
            86_400_000,
        ),
    );
}


/* =========================================================
 * Dashboard
 * ========================================================= */

export async function getReceivablesDashboard():
    Promise<ReceivablesDashboard> {
    const supabase =
        await createClient();

    const now =
        new Date();

    const today =
        now
            .toISOString()
            .slice(
                0,
                10,
            );

    const monthStart =
        startOfMonth(
            now,
        );


    /* -------------------------------------------------------
     * Sales Orders
     * ------------------------------------------------------- */

    const {
        data: salesOrders,
        error: salesOrdersError,
    } =
        await supabase
            .from(
                "sales_orders",
            )
            .select(`
        id,
        customer_id,
        order_date,
        grand_total,
        balance_due,
        status,

        customer:customers (
          customer_number,
          display_name
        )
      `)
            .neq(
                "status",
                "draft",
            )
            .neq(
                "status",
                "cancelled",
            );


    if (salesOrdersError) {
        throw new Error(
            `Unable to load receivables: ${salesOrdersError.message}`,
        );
    }


    /* -------------------------------------------------------
     * Customer Receipts
     * ------------------------------------------------------- */

    const {
        data: receipts,
        error: receiptsError,
    } =
        await supabase
            .from(
                "customer_receipts",
            )
            .select(`
        id,
        customer_id,
        receipt_date,
        amount,
        unallocated_amount,
        status
      `)
            .eq(
                "status",
                "posted",
            );


    if (receiptsError) {
        throw new Error(
            `Unable to load customer receipts: ${receiptsError.message}`,
        );
    }


    /* =======================================================
     * Totals
     * ======================================================= */

    let totalReceivables =
        0;

    let salesThisMonth =
        0;

    let receiptsThisMonth =
        0;

    const aging:
        ReceivablesAging = {
        current: 0,

        days1To30: 0,

        days31To60: 0,

        days61To90: 0,

        days90Plus: 0,
    };


    const customerMap =
        new Map<
            string,
            ReceivablesCustomerRow
        >();


    /* =======================================================
     * Sales Orders
     * ======================================================= */

    for (
        const order of
        salesOrders ?? []
    ) {
        const balanceDue =
            roundMoney(
                toNumber(
                    order.balance_due,
                ),
            );

        const grandTotal =
            roundMoney(
                toNumber(
                    order.grand_total,
                ),
            );


        totalReceivables =
            roundMoney(
                totalReceivables +
                balanceDue,
            );


        if (
            order.order_date >=
            monthStart
        ) {
            salesThisMonth =
                roundMoney(
                    salesThisMonth +
                    grandTotal,
                );
        }


        const age =
            differenceInDays(
                today,
                order.order_date,
            );


        if (
            balanceDue >
            0
        ) {
            if (
                age === 0
            ) {
                aging.current =
                    roundMoney(
                        aging.current +
                        balanceDue,
                    );
            } else if (
                age <= 30
            ) {
                aging.days1To30 =
                    roundMoney(
                        aging.days1To30 +
                        balanceDue,
                    );
            } else if (
                age <= 60
            ) {
                aging.days31To60 =
                    roundMoney(
                        aging.days31To60 +
                        balanceDue,
                    );
            } else if (
                age <= 90
            ) {
                aging.days61To90 =
                    roundMoney(
                        aging.days61To90 +
                        balanceDue,
                    );
            } else {
                aging.days90Plus =
                    roundMoney(
                        aging.days90Plus +
                        balanceDue,
                    );
            }
        }


        const customerRelation =
            Array.isArray(
                order.customer,
            )
                ? order.customer[0]
                : order.customer;


        const existing =
            customerMap.get(
                order.customer_id,
            ) ?? {
                customerId:
                    order.customer_id,

                customerNumber:
                    customerRelation
                        ?.customer_number ??
                    "",

                customerName:
                    customerRelation
                        ?.display_name ??
                    "Unknown Customer",

                receivable: 0,

                customerAdvance: 0,

                netReceivable: 0,

                overdueAmount: 0,

                lastSaleDate:
                    null,
            };


        existing.receivable =
            roundMoney(
                existing.receivable +
                balanceDue,
            );


        /*
         * Until actual due dates are introduced,
         * 31+ days is treated as overdue for dashboard attention.
         */

        if (
            balanceDue >
            0 &&
            age >
            30
        ) {
            existing.overdueAmount =
                roundMoney(
                    existing.overdueAmount +
                    balanceDue,
                );
        }


        if (
            !existing.lastSaleDate ||
            order.order_date >
            existing.lastSaleDate
        ) {
            existing.lastSaleDate =
                order.order_date;
        }


        customerMap.set(
            order.customer_id,
            existing,
        );
    }


    /* =======================================================
     * Receipts / Customer Advances
     * ======================================================= */

    let totalCustomerAdvances =
        0;


    for (
        const receipt of
        receipts ?? []
    ) {
        const amount =
            roundMoney(
                toNumber(
                    receipt.amount,
                ),
            );

        const unallocated =
            roundMoney(
                toNumber(
                    receipt.unallocated_amount,
                ),
            );


        if (
            receipt.receipt_date >=
            monthStart
        ) {
            receiptsThisMonth =
                roundMoney(
                    receiptsThisMonth +
                    amount,
                );
        }


        totalCustomerAdvances =
            roundMoney(
                totalCustomerAdvances +
                unallocated,
            );


        const existing =
            customerMap.get(
                receipt.customer_id,
            );


        if (!existing) {
            const {
                data: customer,
            } =
                await supabase
                    .from(
                        "customers",
                    )
                    .select(`
            customer_number,
            display_name
          `)
                    .eq(
                        "id",
                        receipt.customer_id,
                    )
                    .maybeSingle();


            customerMap.set(
                receipt.customer_id,
                {
                    customerId:
                        receipt.customer_id,

                    customerNumber:
                        customer
                            ?.customer_number ??
                        "",

                    customerName:
                        customer
                            ?.display_name ??
                        "Unknown Customer",

                    receivable: 0,

                    customerAdvance:
                        unallocated,

                    netReceivable: 0,

                    overdueAmount: 0,

                    lastSaleDate:
                        null,
                },
            );

            continue;
        }


        existing.customerAdvance =
            roundMoney(
                existing.customerAdvance +
                unallocated,
            );
    }


    /* =======================================================
     * Net Customer Balances
     * ======================================================= */

    const customers =
        [
            ...customerMap.values(),
        ]
            .map(
                (
                    customer,
                ) => {
                    const netReceivable =
                        roundMoney(
                            customer.receivable -
                            customer.customerAdvance,
                        );


                    return {
                        ...customer,

                        netReceivable,
                    };
                },
            )
            .filter(
                (
                    customer,
                ) =>
                    customer.receivable >
                    0 ||
                    customer.customerAdvance >
                    0,
            )
            .sort(
                (
                    left,
                    right,
                ) =>
                    right.netReceivable -
                    left.netReceivable,
            );


    const customersWithBalance =
        customers.filter(
            (
                customer,
            ) =>
                customer.netReceivable >
                0,
        ).length;


    const customersWithAdvance =
        customers.filter(
            (
                customer,
            ) =>
                customer.customerAdvance >
                0,
        ).length;


    const netReceivable =
        roundMoney(
            totalReceivables -
            totalCustomerAdvances,
        );


    return {
        totalReceivables:
            roundMoney(
                totalReceivables,
            ),

        totalCustomerAdvances:
            roundMoney(
                totalCustomerAdvances,
            ),

        netReceivable,

        salesThisMonth:
            roundMoney(
                salesThisMonth,
            ),

        receiptsThisMonth:
            roundMoney(
                receiptsThisMonth,
            ),

        customersWithBalance,

        customersWithAdvance,

        aging,

        customers,
    };
}
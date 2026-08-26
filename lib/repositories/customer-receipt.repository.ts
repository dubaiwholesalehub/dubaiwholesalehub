import { createClient } from "@/lib/supabase/server";

export type CustomerReceiptPaymentMethod =
    | "cash"
    | "bank"
    | "card"
    | "cheque"
    | "other";

export type CustomerReceiptAllocationInput = {
    salesOrderId: string;
    amount: number;
};

export type PostCustomerReceiptInput = {
    customerId: string;

    receiptDate: string;

    paymentMethod:
    CustomerReceiptPaymentMethod;

    financialAccountId: string;

    currencyCode?: string;
    exchangeRate?: number;

    amount: number;

    referenceNumber?: string;
    bankName?: string;

    chequeNumber?: string;
    chequeDate?: string;

    notes?: string;

    allocations:
    CustomerReceiptAllocationInput[];
};

function emptyToString(
    value?: string,
) {
    return value?.trim() ?? "";
}

export async function postCustomerReceipt(
    input: PostCustomerReceiptInput,
): Promise<string> {
    const supabase =
        await createClient();

    const {
        data,
        error,
    } = await supabase.rpc(
        "post_customer_receipt_with_account",
        {
            p_customer_id:
                input.customerId,

            p_receipt_date:
                input.receiptDate,

            p_payment_method:
                input.paymentMethod,

            p_currency_code:
                input.currencyCode ??
                "AED",

            p_exchange_rate:
                input.exchangeRate ??
                1,

            p_amount:
                input.amount,

            p_reference_number:
                emptyToString(
                    input.referenceNumber,
                ),

            p_bank_name:
                emptyToString(
                    input.bankName,
                ),

            p_cheque_number:
                emptyToString(
                    input.chequeNumber,
                ),

            p_cheque_date:
                (input.chequeDate || null) as unknown as string,

            p_notes:
                emptyToString(
                    input.notes,
                ),

            p_allocations:
                input.allocations.map(
                    (allocation) => ({
                        sales_order_id:
                            allocation.salesOrderId,

                        amount:
                            allocation.amount,
                    }),
                ),
            p_financial_account_id:
                input.financialAccountId,
        },
    );

    if (error) {
        throw new Error(
            `Unable to post customer receipt: ${error.message}`,
        );
    }

    if (
        typeof data !== "string" ||
        !data
    ) {
        throw new Error(
            "Customer receipt was posted but no receipt ID was returned.",
        );
    }

    return data;
}

/* =========================================================
 * Customer Receipt Read Models
 * ========================================================= */

export type CustomerReceiptStatus =
    | "posted"
    | "cancelled";

export type CustomerReceiptListRow = {
    id: string;

    receiptNumber: string;
    receiptDate: string;

    customerId: string;
    customerNumber: string | null;
    customerName: string;

    paymentMethod:
    CustomerReceiptPaymentMethod;

    currencyCode: string;

    amount: number;
    allocatedAmount: number;
    unallocatedAmount: number;

    referenceNumber: string | null;

    status: CustomerReceiptStatus;

    createdAt: string;
};

export type GetCustomerReceiptsInput = {
    search?: string;

    status?:
    | CustomerReceiptStatus
    | "all";

    paymentMethod?:
    | CustomerReceiptPaymentMethod
    | "all";

    dateFrom?: string;
    dateTo?: string;

    page?: number;
    pageSize?: number;
};

export type CustomerReceiptPage = {
    data: CustomerReceiptListRow[];

    count: number;

    page: number;
    pageSize: number;
    totalPages: number;
};

export type CustomerReceiptSummary = {
    totalReceipts: number;

    totalAmount: number;
    totalAllocated: number;
    totalUnallocated: number;

    postedCount: number;
    cancelledCount: number;
};


/* =========================================================
 * Helpers
 * ========================================================= */

function receiptNumber(
    value: unknown,
): number {
    const parsed =
        Number(value ?? 0);

    return Number.isFinite(parsed)
        ? parsed
        : 0;
}

function receiptString(
    value: unknown,
): string {
    return typeof value === "string"
        ? value
        : "";
}


/* =========================================================
 * Get Customer Receipts
 * ========================================================= */

export async function getCustomerReceiptPage(
    input: GetCustomerReceiptsInput = {},
): Promise<CustomerReceiptPage> {
    const supabase =
        await createClient();

    const page =
        Math.max(
            input.page ?? 1,
            1,
        );

    const pageSize =
        Math.min(
            Math.max(
                input.pageSize ?? 25,
                1,
            ),
            100,
        );

    const from =
        (page - 1) *
        pageSize;

    const to =
        from +
        pageSize -
        1;

    let query =
        supabase
            .from(
                "customer_receipts",
            )
            .select(
                `
                id,
                receipt_number,
                receipt_date,
                customer_id,
                payment_method,
                currency_code,
                amount,
                allocated_amount,
                unallocated_amount,
                reference_number,
                status,
                created_at,
                customer:customers (
                    customer_number,
                    display_name,
                    company_name
                )
                `,
                {
                    count: "exact",
                },
            );


    /* -----------------------------------------------------
     * Search
     * ----------------------------------------------------- */

    const search =
        input.search?.trim();

    if (search) {
        query =
            query.or(
                [
                    `receipt_number.ilike.%${search}%`,
                    `reference_number.ilike.%${search}%`,
                ].join(","),
            );
    }


    /* -----------------------------------------------------
     * Status
     * ----------------------------------------------------- */

    if (
        input.status &&
        input.status !== "all"
    ) {
        query =
            query.eq(
                "status",
                input.status,
            );
    }


    /* -----------------------------------------------------
     * Payment Method
     * ----------------------------------------------------- */

    if (
        input.paymentMethod &&
        input.paymentMethod !== "all"
    ) {
        query =
            query.eq(
                "payment_method",
                input.paymentMethod,
            );
    }


    /* -----------------------------------------------------
     * Dates
     * ----------------------------------------------------- */

    if (input.dateFrom) {
        query =
            query.gte(
                "receipt_date",
                input.dateFrom,
            );
    }

    if (input.dateTo) {
        query =
            query.lte(
                "receipt_date",
                input.dateTo,
            );
    }


    /* -----------------------------------------------------
     * Execute
     * ----------------------------------------------------- */

    const {
        data,
        error,
        count,
    } =
        await query
            .order(
                "receipt_date",
                {
                    ascending: false,
                },
            )
            .order(
                "created_at",
                {
                    ascending: false,
                },
            )
            .range(
                from,
                to,
            );


    if (error) {
        throw new Error(
            `Unable to load customer receipts: ${error.message}`,
        );
    }


    const rows:
        CustomerReceiptListRow[] =
        (data ?? []).map(
            (row) => {
                const customer =
                    Array.isArray(
                        row.customer,
                    )
                        ? row.customer[0]
                        : row.customer;

                return {
                    id:
                        row.id,

                    receiptNumber:
                        row.receipt_number,

                    receiptDate:
                        row.receipt_date,

                    customerId:
                        row.customer_id,

                    customerNumber:
                        customer
                            ?.customer_number ??
                        null,

                    customerName:
                        customer
                            ?.display_name ||
                        customer
                            ?.company_name ||
                        "Unknown Customer",

                    paymentMethod:
                        row.payment_method as
                        CustomerReceiptPaymentMethod,

                    currencyCode:
                        row.currency_code,

                    amount:
                        receiptNumber(
                            row.amount,
                        ),

                    allocatedAmount:
                        receiptNumber(
                            row.allocated_amount,
                        ),

                    unallocatedAmount:
                        receiptNumber(
                            row.unallocated_amount,
                        ),

                    referenceNumber:
                        row.reference_number,

                    status:
                        row.status as
                        CustomerReceiptStatus,

                    createdAt:
                        row.created_at,
                };
            },
        );


    const total =
        count ?? 0;

    return {
        data: rows,

        count: total,

        page,
        pageSize,

        totalPages:
            Math.max(
                Math.ceil(
                    total /
                    pageSize,
                ),
                1,
            ),
    };
}


/* =========================================================
 * Customer Receipt Summary
 * ========================================================= */

export async function getCustomerReceiptSummary():
    Promise<CustomerReceiptSummary> {
    const supabase =
        await createClient();

    const {
        data,
        error,
    } =
        await supabase
            .from(
                "customer_receipts",
            )
            .select(`
                amount,
                allocated_amount,
                unallocated_amount,
                status
            `);


    if (error) {
        throw new Error(
            `Unable to load customer receipt summary: ${error.message}`,
        );
    }


    let totalAmount = 0;
    let totalAllocated = 0;
    let totalUnallocated = 0;

    let postedCount = 0;
    let cancelledCount = 0;


    for (
        const receipt of
        data ?? []
    ) {
        if (
            receipt.status ===
            "cancelled"
        ) {
            cancelledCount += 1;

            continue;
        }

        postedCount += 1;

        totalAmount +=
            receiptNumber(
                receipt.amount,
            );

        totalAllocated +=
            receiptNumber(
                receipt.allocated_amount,
            );

        totalUnallocated +=
            receiptNumber(
                receipt.unallocated_amount,
            );
    }


    return {
        totalReceipts:
            postedCount,

        totalAmount,

        totalAllocated,

        totalUnallocated,

        postedCount,
        cancelledCount,
    };
}

/* =========================================================
 * Customer Outstanding Sales Orders
 * ========================================================= */

export type CustomerOutstandingOrder = {
    id: string;

    orderNumber: string;
    orderDate: string;

    currencyCode: string;

    grandTotal: number;
    paidAmount: number;
    balanceDue: number;

    paymentStatus: string;
};

export async function getCustomerOutstandingOrders(
    customerId: string,
): Promise<CustomerOutstandingOrder[]> {
    const supabase =
        await createClient();

    const {
        data,
        error,
    } =
        await supabase
            .from("sales_orders")
            .select(`
                id,
                order_number,
                order_date,
                currency_code,
                grand_total,
                paid_amount,
                balance_due,
                payment_status
            `)
            .eq(
                "customer_id",
                customerId,
            )
            .gt(
                "balance_due",
                0,
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

    if (error) {
        throw new Error(
            `Unable to load outstanding sales orders: ${error.message}`,
        );
    }

    return (
        data ?? []
    ).map(
        (order) => ({
            id:
                order.id,

            orderNumber:
                order.order_number,

            orderDate:
                order.order_date,

            currencyCode:
                order.currency_code,

            grandTotal:
                Number(
                    order.grand_total,
                ),

            paidAmount:
                Number(
                    order.paid_amount,
                ),

            balanceDue:
                Number(
                    order.balance_due,
                ),

            paymentStatus:
                order.payment_status,
        }),
    );
}

/* =========================================================
 * Customer Receipt Details
 * ========================================================= */

export type CustomerReceiptAllocation = {
    id: string;

    salesOrderId: string;
    orderNumber: string;

    orderDate: string;

    amount: number;

    grandTotal: number;
    paidAmount: number;
    balanceDue: number;

    paymentStatus: string;
};

export type CustomerReceiptDetails = {
    id: string;

    receiptNumber: string;
    receiptDate: string;

    customerId: string;
    customerNumber: string | null;
    customerName: string;

    paymentMethod:
    CustomerReceiptPaymentMethod;

    currencyCode: string;

    amount: number;
    allocatedAmount: number;
    unallocatedAmount: number;

    referenceNumber: string | null;

    bankName: string | null;

    chequeNumber: string | null;
    chequeDate: string | null;

    notes: string | null;

    status:
    CustomerReceiptStatus;

    postedAt: string | null;

    cancelledAt: string | null;

    cancellationReason:
    string | null;

    createdAt: string;

    allocations:
    CustomerReceiptAllocation[];
};

export async function getCustomerReceiptById(
    receiptId: string,
): Promise<CustomerReceiptDetails | null> {
    const supabase =
        await createClient();

    const {
        data,
        error,
    } =
        await supabase
            .from(
                "customer_receipts",
            )
            .select(`
                id,
                receipt_number,
                receipt_date,

                customer_id,

                payment_method,

                currency_code,
                amount,
                allocated_amount,
                unallocated_amount,

                reference_number,

                bank_name,

                cheque_number,
                cheque_date,

                notes,

                status,

                posted_at,

                cancelled_at,
                cancellation_reason,

                created_at,

                customer:customers (
                    customer_number,
                    display_name,
                    company_name
                ),

                allocations:customer_receipt_allocations (
                    id,
                    sales_order_id,
                    amount,

                    sales_order:sales_orders (
                        order_number,
                        order_date,

                        grand_total,
                        paid_amount,
                        balance_due,

                        payment_status
                    )
                )
            `)
            .eq(
                "id",
                receiptId,
            )
            .maybeSingle();

    if (error) {
        throw new Error(
            `Unable to load customer receipt: ${error.message}`,
        );
    }

    if (!data) {
        return null;
    }

    const customer =
        Array.isArray(
            data.customer,
        )
            ? data.customer[0]
            : data.customer;

    const allocations:
        CustomerReceiptAllocation[] =
        (
            data.allocations ??
            []
        ).map(
            (allocation) => {
                const order =
                    Array.isArray(
                        allocation.sales_order,
                    )
                        ? allocation
                            .sales_order[0]
                        : allocation
                            .sales_order;

                return {
                    id:
                        allocation.id,

                    salesOrderId:
                        allocation.sales_order_id,

                    orderNumber:
                        order
                            ?.order_number ??
                        "Unknown Order",

                    orderDate:
                        order
                            ?.order_date ??
                        "",

                    amount:
                        Number(
                            allocation.amount,
                        ),

                    grandTotal:
                        Number(
                            order
                                ?.grand_total ??
                            0,
                        ),

                    paidAmount:
                        Number(
                            order
                                ?.paid_amount ??
                            0,
                        ),

                    balanceDue:
                        Number(
                            order
                                ?.balance_due ??
                            0,
                        ),

                    paymentStatus:
                        order
                            ?.payment_status ??
                        "unknown",
                };
            },
        );

    return {
        id:
            data.id,

        receiptNumber:
            data.receipt_number,

        receiptDate:
            data.receipt_date,

        customerId:
            data.customer_id,

        customerNumber:
            customer
                ?.customer_number ??
            null,

        customerName:
            customer
                ?.display_name ||
            customer
                ?.company_name ||
            "Unknown Customer",

        paymentMethod:
            data.payment_method as
            CustomerReceiptPaymentMethod,

        currencyCode:
            data.currency_code,

        amount:
            Number(
                data.amount,
            ),

        allocatedAmount:
            Number(
                data.allocated_amount,
            ),

        unallocatedAmount:
            Number(
                data.unallocated_amount,
            ),

        referenceNumber:
            data.reference_number,

        bankName:
            data.bank_name,

        chequeNumber:
            data.cheque_number,

        chequeDate:
            data.cheque_date,

        notes:
            data.notes,

        status:
            data.status as
            CustomerReceiptStatus,

        postedAt:
            data.posted_at,

        cancelledAt:
            data.cancelled_at,

        cancellationReason:
            data.cancellation_reason,

        createdAt:
            data.created_at,

        allocations,
    };
}

/* =========================================================
 * Cancel Customer Receipt
 * ========================================================= */

export async function cancelCustomerReceipt(
    receiptId: string,
    reason: string,
): Promise<string> {
    const supabase =
        await createClient();

    const cleanedReason =
        reason.trim();

    if (!receiptId) {
        throw new Error(
            "Receipt ID is required.",
        );
    }

    if (!cleanedReason) {
        throw new Error(
            "Cancellation reason is required.",
        );
    }

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "cancel_customer_receipt_with_gl",
            {
                p_receipt_id:
                    receiptId,

                p_reason:
                    cleanedReason,
            },
        );

    if (error) {
        throw new Error(
            `Unable to cancel customer receipt: ${error.message}`,
        );
    }

    if (
        typeof data !== "string" ||
        !data
    ) {
        throw new Error(
            "Customer receipt was cancelled but no receipt ID was returned.",
        );
    }

    return data;
}

/* =========================================================
 * Auto Apply Customer Advance
 * ========================================================= */

export async function applyCustomerAdvanceToSalesOrder(
    salesOrderId: string,
): Promise<number> {
    if (!salesOrderId) {
        throw new Error(
            "Sales Order ID is required.",
        );
    }

    const supabase =
        await createClient();

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "apply_customer_advance_to_sales_order",
            {
                p_sales_order_id:
                    salesOrderId,
            },
        );

    if (error) {
        throw new Error(
            `Unable to apply customer advance: ${error.message}`,
        );
    }

    const amount =
        Number(
            data ?? 0,
        );

    return Number.isFinite(
        amount,
    )
        ? amount
        : 0;
}

/* =========================================================
 * Customer Available Advance
 * ========================================================= */

export async function getCustomerAvailableAdvance(
    customerId: string,
    currencyCode = "AED",
): Promise<number> {
    if (!customerId) {
        return 0;
    }

    const supabase =
        await createClient();

    const {
        data,
        error,
    } =
        await supabase
            .from(
                "customer_receipts",
            )
            .select(
                "unallocated_amount",
            )
            .eq(
                "customer_id",
                customerId,
            )
            .eq(
                "status",
                "posted",
            )
            .eq(
                "currency_code",
                currencyCode.toUpperCase(),
            )
            .gt(
                "unallocated_amount",
                0,
            );


    if (error) {
        throw new Error(
            `Unable to load customer advance: ${error.message}`,
        );
    }


    return (
        data ?? []
    ).reduce(
        (
            total,
            receipt,
        ) =>
            total +
            Number(
                receipt.unallocated_amount ??
                0,
            ),
        0,
    );
}
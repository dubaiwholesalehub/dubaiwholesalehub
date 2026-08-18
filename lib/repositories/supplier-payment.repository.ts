import {
    createClient,
} from "@/lib/supabase/server";


/* =========================================================
 * Types
 * ========================================================= */

export type SupplierPaymentMethod =
    | "cash"
    | "bank"
    | "card"
    | "cheque"
    | "other";


export type SupplierPaymentStatus =
    | "posted"
    | "cancelled";


export type SupplierPaymentAllocationInput = {
    quickPurchaseId: string;
    amount: number;
};


export type PostSupplierPaymentInput = {
    supplierId: string;

    paymentDate: string;

    paymentMethod:
    SupplierPaymentMethod;

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
    SupplierPaymentAllocationInput[];
};


export type SupplierOutstandingPurchase = {
    id: string;

    purchaseNumber: string;
    purchaseDate: string;

    supplierInvoiceNumber:
    | string
    | null;

    currencyCode: string;

    grandTotal: number;
    paidAmount: number;
    balanceDue: number;

    paymentStatus: string;

    taxTreatment: string;
};


/* =========================================================
 * Helpers
 * ========================================================= */

function emptyToString(
    value?: string,
) {
    return value?.trim() ?? "";
}


/* =========================================================
 * Post Supplier Payment
 * ========================================================= */

export async function postSupplierPayment(
    input: PostSupplierPaymentInput,
): Promise<string> {
    const supabase =
        await createClient();

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "post_supplier_payment_with_account",
            {
                p_supplier_id:
                    input.supplierId,

                p_payment_date:
                    input.paymentDate,

                p_payment_method:
                    input.paymentMethod,

                p_financial_account_id:
                    input.financialAccountId,

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
                    (
                        input.chequeDate ||
                        null
                    ) as unknown as string,

                p_notes:
                    emptyToString(
                        input.notes,
                    ),

                p_allocations:
                    input.allocations.map(
                        (
                            allocation,
                        ) => ({
                            quick_purchase_id:
                                allocation.quickPurchaseId,

                            amount:
                                allocation.amount,
                        }),
                    ),
            },
        );

    if (error) {
        throw new Error(
            `Unable to post supplier payment: ${error.message}`,
        );
    }

    if (
        typeof data !==
        "string" ||
        !data
    ) {
        throw new Error(
            "Supplier payment was posted but no payment ID was returned.",
        );
    }

    return data;
}


/* =========================================================
 * Outstanding Quick Purchases
 * ========================================================= */

export async function getSupplierOutstandingPurchases(
    supplierId: string,
): Promise<
    SupplierOutstandingPurchase[]
> {
    const supabase =
        await createClient();

    if (!supplierId) {
        return [];
    }

    const {
        data,
        error,
    } =
        await supabase
            .from(
                "quick_purchases",
            )
            .select(`
        id,
        purchase_number,
        purchase_date,
        supplier_invoice_number,
        currency_code,
        grand_total,
        paid_amount,
        balance_due,
        payment_status,
        tax_treatment
      `)
            .eq(
                "supplier_id",
                supplierId,
            )
            .eq(
                "status",
                "posted",
            )
            .gt(
                "balance_due",
                0,
            )
            .order(
                "purchase_date",
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
            `Unable to load supplier outstanding purchases: ${error.message}`,
        );
    }

    return (
        data ?? []
    ).map(
        (purchase) => ({
            id:
                purchase.id,

            purchaseNumber:
                purchase.purchase_number,

            purchaseDate:
                purchase.purchase_date,

            supplierInvoiceNumber:
                purchase.supplier_invoice_number,

            currencyCode:
                purchase.currency_code,

            grandTotal:
                Number(
                    purchase.grand_total,
                ),

            paidAmount:
                Number(
                    purchase.paid_amount,
                ),

            balanceDue:
                Number(
                    purchase.balance_due,
                ),

            paymentStatus:
                purchase.payment_status,

            taxTreatment:
                purchase.tax_treatment,
        }),
    );
}


/* =========================================================
 * Supplier Options
 * ========================================================= */

export type SupplierPaymentSupplierOption = {
    id: string;

    companyName: string;

    contactName:
    | string
    | null;

    city:
    | string
    | null;
};


export async function getSupplierPaymentOptions():
    Promise<
        SupplierPaymentSupplierOption[]
    > {
    const supabase =
        await createClient();

    const {
        data,
        error,
    } =
        await supabase
            .from("suppliers")
            .select(`
        id,
        company_name,
        contact_name,
        city
      `)
            .eq(
                "is_active",
                true,
            )
            .order(
                "company_name",
            );

    if (error) {
        throw new Error(
            `Unable to load supplier options: ${error.message}`,
        );
    }

    return (
        data ?? []
    ).map(
        (supplier) => ({
            id:
                supplier.id,

            companyName:
                supplier.company_name,

            contactName:
                supplier.contact_name,

            city:
                supplier.city,
        }),
    );
}

/* =========================================================
 * Supplier Payment Read Models
 * ========================================================= */

export type SupplierPaymentListRow = {
    id: string;

    paymentNumber: string;
    paymentDate: string;

    supplierId: string;
    supplierName: string;

    paymentMethod:
    SupplierPaymentMethod;

    currencyCode: string;

    amount: number;
    allocatedAmount: number;
    unallocatedAmount: number;

    referenceNumber:
    | string
    | null;

    status:
    SupplierPaymentStatus;

    createdAt: string;
};


export type GetSupplierPaymentsInput = {
    search?: string;

    status?:
    | SupplierPaymentStatus
    | "all";

    paymentMethod?:
    | SupplierPaymentMethod
    | "all";

    dateFrom?: string;
    dateTo?: string;

    page?: number;
    pageSize?: number;
};


export type SupplierPaymentPage = {
    data:
    SupplierPaymentListRow[];

    count: number;

    page: number;
    pageSize: number;
    totalPages: number;
};


export type SupplierPaymentSummary = {
    totalPayments: number;

    totalAmount: number;
    totalAllocated: number;
    totalUnallocated: number;

    postedCount: number;
    cancelledCount: number;
};


/* =========================================================
 * Helpers
 * ========================================================= */

function toNumber(
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


/* =========================================================
 * Supplier Payment Page
 * ========================================================= */

export async function getSupplierPaymentPage(
    input:
        GetSupplierPaymentsInput = {},
): Promise<SupplierPaymentPage> {
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
                "supplier_payments",
            )
            .select(
                `
        id,
        payment_number,
        payment_date,
        supplier_id,
        payment_method,
        currency_code,
        amount,
        allocated_amount,
        unallocated_amount,
        reference_number,
        status,
        created_at,
        supplier:suppliers (
          company_name
        )
        `,
                {
                    count:
                        "exact",
                },
            );


    const search =
        input.search?.trim();

    if (search) {
        query =
            query.or(
                [
                    `payment_number.ilike.%${search}%`,
                    `reference_number.ilike.%${search}%`,
                ].join(","),
            );
    }


    if (
        input.status &&
        input.status !==
        "all"
    ) {
        query =
            query.eq(
                "status",
                input.status,
            );
    }


    if (
        input.paymentMethod &&
        input.paymentMethod !==
        "all"
    ) {
        query =
            query.eq(
                "payment_method",
                input.paymentMethod,
            );
    }


    if (
        input.dateFrom
    ) {
        query =
            query.gte(
                "payment_date",
                input.dateFrom,
            );
    }


    if (
        input.dateTo
    ) {
        query =
            query.lte(
                "payment_date",
                input.dateTo,
            );
    }


    const {
        data,
        error,
        count,
    } =
        await query
            .order(
                "payment_date",
                {
                    ascending:
                        false,
                },
            )
            .order(
                "created_at",
                {
                    ascending:
                        false,
                },
            )
            .range(
                from,
                to,
            );


    if (error) {
        throw new Error(
            `Unable to load supplier payments: ${error.message}`,
        );
    }


    const rows:
        SupplierPaymentListRow[] =
        (
            data ?? []
        ).map(
            (row) => {
                const supplier =
                    Array.isArray(
                        row.supplier,
                    )
                        ? row.supplier[0]
                        : row.supplier;

                return {
                    id:
                        row.id,

                    paymentNumber:
                        row.payment_number,

                    paymentDate:
                        row.payment_date,

                    supplierId:
                        row.supplier_id,

                    supplierName:
                        supplier
                            ?.company_name ??
                        "Unknown Supplier",

                    paymentMethod:
                        row.payment_method as
                        SupplierPaymentMethod,

                    currencyCode:
                        row.currency_code,

                    amount:
                        toNumber(
                            row.amount,
                        ),

                    allocatedAmount:
                        toNumber(
                            row.allocated_amount,
                        ),

                    unallocatedAmount:
                        toNumber(
                            row.unallocated_amount,
                        ),

                    referenceNumber:
                        row.reference_number,

                    status:
                        row.status as
                        SupplierPaymentStatus,

                    createdAt:
                        row.created_at,
                };
            },
        );


    const total =
        count ?? 0;

    return {
        data: rows,

        count:
            total,

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
 * Supplier Payment Summary
 * ========================================================= */

export async function getSupplierPaymentSummary():
    Promise<SupplierPaymentSummary> {
    const supabase =
        await createClient();

    const {
        data,
        error,
    } =
        await supabase
            .from(
                "supplier_payments",
            )
            .select(`
        amount,
        allocated_amount,
        unallocated_amount,
        status
      `);


    if (error) {
        throw new Error(
            `Unable to load supplier payment summary: ${error.message}`,
        );
    }


    let totalAmount = 0;
    let totalAllocated = 0;
    let totalUnallocated = 0;

    let postedCount = 0;
    let cancelledCount = 0;


    for (
        const payment of
        data ?? []
    ) {
        if (
            payment.status ===
            "cancelled"
        ) {
            cancelledCount += 1;

            continue;
        }

        postedCount += 1;

        totalAmount +=
            toNumber(
                payment.amount,
            );

        totalAllocated +=
            toNumber(
                payment.allocated_amount,
            );

        totalUnallocated +=
            toNumber(
                payment.unallocated_amount,
            );
    }


    return {
        totalPayments:
            postedCount,

        totalAmount,

        totalAllocated,

        totalUnallocated,

        postedCount,
        cancelledCount,
    };
}

/* =========================================================
 * Supplier Payment Details
 * ========================================================= */

export type SupplierPaymentAllocation = {
    id: string;

    quickPurchaseId: string;
    purchaseNumber: string;

    supplierInvoiceNumber:
    | string
    | null;

    purchaseDate: string;

    amount: number;

    grandTotal: number;
    paidAmount: number;
    balanceDue: number;

    paymentStatus: string;
};


export type SupplierPaymentDetails = {
    id: string;

    paymentNumber: string;
    paymentDate: string;

    supplierId: string;
    supplierName: string;

    paymentMethod:
    SupplierPaymentMethod;

    currencyCode: string;

    amount: number;
    allocatedAmount: number;
    unallocatedAmount: number;

    referenceNumber:
    | string
    | null;

    bankName:
    | string
    | null;

    chequeNumber:
    | string
    | null;

    chequeDate:
    | string
    | null;

    notes:
    | string
    | null;

    status:
    SupplierPaymentStatus;

    postedAt:
    | string
    | null;

    cancelledAt:
    | string
    | null;

    cancellationReason:
    | string
    | null;

    createdAt: string;

    allocations:
    SupplierPaymentAllocation[];
};


export async function getSupplierPaymentById(
    paymentId: string,
): Promise<
    SupplierPaymentDetails | null
> {
    const supabase =
        await createClient();

    const {
        data,
        error,
    } =
        await supabase
            .from(
                "supplier_payments",
            )
            .select(`
        id,
        payment_number,
        payment_date,

        supplier_id,

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

        supplier:suppliers (
          company_name
        ),

        allocations:supplier_payment_allocations (
          id,
          quick_purchase_id,
          amount,

          quick_purchase:quick_purchases (
            purchase_number,
            supplier_invoice_number,
            purchase_date,

            grand_total,
            paid_amount,
            balance_due,

            payment_status
          )
        )
      `)
            .eq(
                "id",
                paymentId,
            )
            .maybeSingle();


    if (error) {
        throw new Error(
            `Unable to load supplier payment: ${error.message}`,
        );
    }


    if (!data) {
        return null;
    }


    const supplier =
        Array.isArray(
            data.supplier,
        )
            ? data.supplier[0]
            : data.supplier;


    const allocations:
        SupplierPaymentAllocation[] =
        (
            data.allocations ??
            []
        ).map(
            (
                allocation,
            ) => {
                const purchase =
                    Array.isArray(
                        allocation.quick_purchase,
                    )
                        ? allocation
                            .quick_purchase[0]
                        : allocation
                            .quick_purchase;

                return {
                    id:
                        allocation.id,

                    quickPurchaseId:
                        allocation.quick_purchase_id,

                    purchaseNumber:
                        purchase
                            ?.purchase_number ??
                        "Unknown Purchase",

                    supplierInvoiceNumber:
                        purchase
                            ?.supplier_invoice_number ??
                        null,

                    purchaseDate:
                        purchase
                            ?.purchase_date ??
                        "",

                    amount:
                        Number(
                            allocation.amount,
                        ),

                    grandTotal:
                        Number(
                            purchase
                                ?.grand_total ??
                            0,
                        ),

                    paidAmount:
                        Number(
                            purchase
                                ?.paid_amount ??
                            0,
                        ),

                    balanceDue:
                        Number(
                            purchase
                                ?.balance_due ??
                            0,
                        ),

                    paymentStatus:
                        purchase
                            ?.payment_status ??
                        "unknown",
                };
            },
        );


    return {
        id:
            data.id,

        paymentNumber:
            data.payment_number,

        paymentDate:
            data.payment_date,

        supplierId:
            data.supplier_id,

        supplierName:
            supplier
                ?.company_name ??
            "Unknown Supplier",

        paymentMethod:
            data.payment_method as
            SupplierPaymentMethod,

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
            SupplierPaymentStatus,

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
 * Cancel Supplier Payment
 * ========================================================= */

export async function cancelSupplierPayment(
    paymentId: string,
    reason: string,
): Promise<string> {
    const supabase =
        await createClient();

    const cleanedReason =
        reason.trim();

    if (!paymentId) {
        throw new Error(
            "Supplier payment ID is required.",
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
            "cancel_supplier_payment_with_account",
            {
                p_supplier_payment_id:
                    paymentId,

                p_reason:
                    cleanedReason,
            },
        );

    if (error) {
        throw new Error(
            `Unable to cancel supplier payment: ${error.message}`,
        );
    }

    if (
        typeof data !==
        "string" ||
        !data
    ) {
        throw new Error(
            "Supplier payment was cancelled but no payment ID was returned.",
        );
    }

    return data;
}

/* =========================================================
 * Supplier Available Advance
 * ========================================================= */

export async function getSupplierAvailableAdvance(
    supplierId: string,
    currencyCode = "AED",
): Promise<number> {
    if (!supplierId) {
        return 0;
    }

    const supabase =
        await createClient();

    const {
        data,
        error,
    } =
        await supabase
            .from("supplier_payments")
            .select("unallocated_amount")
            .eq(
                "supplier_id",
                supplierId,
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
            `Unable to load supplier advance: ${error.message}`,
        );
    }

    return (
        data ?? []
    ).reduce(
        (
            total,
            payment,
        ) =>
            total +
            Number(
                payment.unallocated_amount ??
                0,
            ),
        0,
    );
}
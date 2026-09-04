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


export type SupplierPaymentAllocationInput =
    | {
        quickPurchaseId: string;
        goodsReceiptId?: never;
        supplierOpeningBalanceId?: never;
        amount: number;
    }
    | {
        quickPurchaseId?: never;
        goodsReceiptId: string;
        supplierOpeningBalanceId?: never;
        amount: number;
    }
    | {
        quickPurchaseId?: never;
        goodsReceiptId?: never;
        supplierOpeningBalanceId: string;
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

    sourceType:
    | "quick_purchase"
    | "goods_receipt"
    | "supplier_opening_balance";

    quickPurchaseId:
    | string
    | null;

    goodsReceiptId:
    | string
    | null;

    supplierOpeningBalanceId:
    | string
    | null;

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

    taxTreatment:
    | string
    | null;
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
                                "quickPurchaseId" in allocation
                                    ? allocation.quickPurchaseId
                                    : null,

                            goods_receipt_id:
                                "goodsReceiptId" in allocation
                                    ? allocation.goodsReceiptId
                                    : null,
                            supplier_opening_balance_id:
                                "supplierOpeningBalanceId" in allocation
                                    ? allocation.supplierOpeningBalanceId
                                    : null,

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

type SupplierPayableOpenItemRow = {
    source_type:
    | "quick_purchase"
    | "goods_receipt"
    | "supplier_opening_balance";

    source_id: string;

    quick_purchase_id:
    | string
    | null;

    goods_receipt_id:
    | string
    | null;

    supplier_opening_balance_id:
    | string
    | null;

    document_number: string;

    document_date: string;

    supplier_id:
    | string
    | null;

    supplier_invoice_number:
    | string
    | null;

    currency_code: string;

    gross_amount:
    | number
    | string;

    paid_amount:
    | number
    | string;

    outstanding_amount:
    | number
    | string;

    payment_status: string;

    due_date: string;
};

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
        await (
            supabase as unknown as {
                from: (
                    relation:
                        "supplier_payable_open_items",
                ) => any;
            }
        )
            .from(
                "supplier_payable_open_items",
            ).select(`
        source_type,
        source_id,
        quick_purchase_id,
        goods_receipt_id,
        supplier_opening_balance_id,
        document_number,
        document_date,
        supplier_invoice_number,
        currency_code,
        gross_amount,
        paid_amount,
        outstanding_amount,
        payment_status,
        due_date
      `)
            .eq(
                "supplier_id",
                supplierId,
            )
            .gt(
                "outstanding_amount",
                0,
            )
            .order(
                "due_date",
                {
                    ascending: true,
                },
            )
            .order(
                "document_date",
                {
                    ascending: true,
                },
            );

    if (error) {
        throw new Error(
            `Unable to load supplier outstanding payables: ${error.message}`,
        );
    }

    const payables =
        (
            data ??
            []
        ) as SupplierPayableOpenItemRow[];
    return payables.map(
        (payable) => ({
            id:
                payable.source_id,

            sourceType:
                payable.source_type as
                | "quick_purchase"
                | "goods_receipt"
                | "supplier_opening_balance",

            quickPurchaseId:
                payable.quick_purchase_id,

            goodsReceiptId:
                payable.goods_receipt_id,

            supplierOpeningBalanceId:
                payable.supplier_opening_balance_id,

            purchaseNumber:
                payable.document_number,

            purchaseDate:
                payable.document_date,

            supplierInvoiceNumber:
                payable.supplier_invoice_number,

            currencyCode:
                payable.currency_code,

            grandTotal:
                Number(
                    payable.gross_amount,
                ),

            paidAmount:
                Number(
                    payable.paid_amount,
                ),

            balanceDue:
                Number(
                    payable.outstanding_amount,
                ),

            paymentStatus:
                payable.payment_status,

            taxTreatment:
                null,
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

    sourceType:
    | "quick_purchase"
    | "goods_receipt"
    | "supplier_opening_balance";

    sourceId: string;

    quickPurchaseId:
    | string
    | null;

    goodsReceiptId:
    | string
    | null;

    supplierOpeningBalanceId:
    | string
    | null;

    documentNumber: string;

    supplierInvoiceNumber:
    | string
    | null;

    documentDate: string;

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

type SupplierPaymentAllocationQueryRow = {
    id: string;

    quick_purchase_id:
    | string
    | null;

    goods_receipt_id:
    | string
    | null;

    supplier_opening_balance_id:
    | string
    | null;

    amount:
    | number
    | string;

    quick_purchase:
    | {
        purchase_number:
        | string
        | null;

        supplier_invoice_number:
        | string
        | null;

        purchase_date:
        | string
        | null;

        grand_total:
        | number
        | string
        | null;

        paid_amount:
        | number
        | string
        | null;

        balance_due:
        | number
        | string
        | null;

        payment_status:
        | string
        | null;
    }
    | {
        purchase_number:
        | string
        | null;

        supplier_invoice_number:
        | string
        | null;

        purchase_date:
        | string
        | null;

        grand_total:
        | number
        | string
        | null;

        paid_amount:
        | number
        | string
        | null;

        balance_due:
        | number
        | string
        | null;

        payment_status:
        | string
        | null;
    }[]
    | null;

    goods_receipt:
    | {
        receipt_number:
        | string
        | null;

        supplier_invoice_number:
        | string
        | null;

        received_date:
        | string
        | null;

        completed_at:
        | string
        | null;

        created_at:
        | string
        | null;

        paid_amount:
        | number
        | string
        | null;

        balance_due:
        | number
        | string
        | null;

        payment_status:
        | string
        | null;
    }
    | {
        receipt_number:
        | string
        | null;

        supplier_invoice_number:
        | string
        | null;

        received_date:
        | string
        | null;

        completed_at:
        | string
        | null;

        created_at:
        | string
        | null;

        paid_amount:
        | number
        | string
        | null;

        balance_due:
        | number
        | string
        | null;

        payment_status:
        | string
        | null;
    }[]
    | null;

    supplier_opening_balance:
    | {
        opening_date:
        | string
        | null;

        reference_number:
        | string
        | null;

        original_amount:
        | number
        | string
        | null;

        status:
        | string
        | null;
    }
    | {
        opening_date:
        | string
        | null;

        reference_number:
        | string
        | null;

        original_amount:
        | number
        | string
        | null;

        status:
        | string
        | null;
    }[]
    | null;
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
          goods_receipt_id,
          supplier_opening_balance_id,
          amount,

          quick_purchase:quick_purchases (
            purchase_number,
            supplier_invoice_number,
            purchase_date,

            grand_total,
            paid_amount,
            balance_due,

            payment_status
          ),

          goods_receipt:goods_receipts (
            receipt_number,
            supplier_invoice_number,
            received_date,
            completed_at,
            created_at,

            paid_amount,
            balance_due,

            payment_status
          ),

          supplier_opening_balance:supplier_opening_balances (
            opening_date,
            reference_number,
            original_amount,
            status
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


    const allocationRows =
        (
            data.allocations ??
            []
        ) as unknown as
        SupplierPaymentAllocationQueryRow[];


    const allocations:
        SupplierPaymentAllocation[] =
        allocationRows.map(
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

                const goodsReceipt =
                    Array.isArray(
                        allocation.goods_receipt,
                    )
                        ? allocation
                            .goods_receipt[0]
                        : allocation
                            .goods_receipt;

                const supplierOpeningBalance =
                    Array.isArray(
                        allocation.supplier_opening_balance,
                    )
                        ? allocation
                            .supplier_opening_balance[0]
                        : allocation
                            .supplier_opening_balance;

                if (
                    allocation.goods_receipt_id &&
                    goodsReceipt
                ) {
                    const paidAmount =
                        Number(
                            goodsReceipt
                                .paid_amount ??
                            0,
                        );

                    const balanceDue =
                        Number(
                            goodsReceipt
                                .balance_due ??
                            0,
                        );

                    return {
                        id:
                            allocation.id,

                        sourceType:
                            "goods_receipt" as const,

                        sourceId:
                            allocation.goods_receipt_id,

                        quickPurchaseId:
                            null,

                        goodsReceiptId:
                            allocation.goods_receipt_id,

                        supplierOpeningBalanceId:
                            null,

                        documentNumber:
                            goodsReceipt
                                .receipt_number ??
                            "Unknown Goods Receipt",

                        supplierInvoiceNumber:
                            goodsReceipt
                                .supplier_invoice_number ??
                            null,

                        documentDate:
                            goodsReceipt
                                .received_date ??
                            goodsReceipt
                                .completed_at
                                ?.slice(
                                    0,
                                    10,
                                ) ??
                            goodsReceipt
                                .created_at
                                ?.slice(
                                    0,
                                    10,
                                ) ??
                            "",

                        amount:
                            Number(
                                allocation.amount,
                            ),

                        grandTotal:
                            paidAmount +
                            balanceDue,

                        paidAmount,

                        balanceDue,

                        paymentStatus:
                            goodsReceipt
                                .payment_status ??
                            "unknown",
                    };
                }

                if (
                    allocation.supplier_opening_balance_id &&
                    supplierOpeningBalance
                ) {
                    const originalAmount =
                        Number(
                            supplierOpeningBalance
                                .original_amount ??
                            0,
                        );

                    return {
                        id:
                            allocation.id,

                        sourceType:
                            "supplier_opening_balance" as const,

                        sourceId:
                            allocation.supplier_opening_balance_id,

                        quickPurchaseId:
                            null,

                        goodsReceiptId:
                            null,

                        supplierOpeningBalanceId:
                            allocation.supplier_opening_balance_id,

                        documentNumber:
                            supplierOpeningBalance
                                .reference_number
                                ?.trim() ||
                            "Opening Balance",

                        supplierInvoiceNumber:
                            null,

                        documentDate:
                            supplierOpeningBalance
                                .opening_date ??
                            "",

                        amount:
                            Number(
                                allocation.amount,
                            ),

                        grandTotal:
                            originalAmount,

                        paidAmount:
                            0,

                        balanceDue:
                            originalAmount,

                        paymentStatus:
                            supplierOpeningBalance
                                .status ??
                            "posted",
                    };
                }

                if (
                    !allocation.quick_purchase_id
                ) {
                    throw new Error(
                        "Supplier Payment allocation is missing its Quick Purchase source.",
                    );
                }


                return {
                    id:
                        allocation.id,

                    sourceType:
                        "quick_purchase" as const,

                    sourceId:
                        allocation.quick_purchase_id,

                    quickPurchaseId:
                        allocation.quick_purchase_id,

                    goodsReceiptId:
                        null,
                    supplierOpeningBalanceId:
                        null,
                    documentNumber:
                        purchase
                            ?.purchase_number ??
                        "Unknown Quick Purchase",

                    supplierInvoiceNumber:
                        purchase
                            ?.supplier_invoice_number ??
                        null,

                    documentDate:
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
            "cancel_supplier_payment_with_gl",
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
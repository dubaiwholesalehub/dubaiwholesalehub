import {
    createClient,
} from "@/lib/supabase/server";


export type SupplierReturnStatus =
    | "draft"
    | "approved"
    | "dispatched"
    | "posted"
    | "cancelled";


export type SupplierReturnTaxTreatment =
    | "standard_vat"
    | "no_vat"
    | "vat_pending"
    | "reverse_charge"
    | "review_required";


export type SupplierReturnListItem = {
    id: string;
    returnNumber: string;

    quickPurchaseId: string;
    purchaseNumber: string;

    supplierId: string;
    supplierName: string;

    warehouseId: string;
    warehouseName: string;

    returnDate: string;
    postingDate: string;

    status: SupplierReturnStatus;

    reason: string;
    notes: string | null;

    currencyCode: string;

    subtotal: number;
    taxAmount: number;
    grandTotal: number;
    inventoryCost: number;

    createdAt: string;
};


export type SupplierReturnItem = {
    id: string;

    lineNumber: number;

    quickPurchaseItemId: string;
    originalInventoryItemId: string;

    productId: string;
    productName: string;
    productSku: string | null;

    warehouseId: string;

    quantityReturned: number;

    originalUnitCost: number;
    returnCost: number;

    lineSubtotal: number;
    taxPercentage: number;
    taxAmount: number;
    lineTotal: number;

    reason: string | null;
    notes: string | null;
};


export type SupplierReturnDetail = {
    id: string;
    returnNumber: string;

    quickPurchaseId: string;
    purchaseNumber: string;
    supplierInvoiceNumber: string | null;

    supplierId: string;
    supplierName: string;

    warehouseId: string;
    warehouseName: string;

    returnDate: string;
    postingDate: string;

    status: SupplierReturnStatus;

    reason: string;
    notes: string | null;

    currencyCode: string;
    exchangeRate: number;

    taxTreatment: SupplierReturnTaxTreatment;

    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    recoverableTaxAmount: number;
    pendingTaxAmount: number;
    grandTotal: number;

    inventoryCost: number;

    inventoryTransactionId: string | null;
    inventoryTransactionNumber: string | null;

    journalEntryId: string | null;
    journalNumber: string | null;

    approvedAt: string | null;
    approvedBy: string | null;

    dispatchedAt: string | null;
    dispatchedBy: string | null;

    postedAt: string | null;
    postedBy: string | null;

    cancelledAt: string | null;
    cancelledBy: string | null;
    cancellationReason: string | null;

    createdAt: string;
    updatedAt: string;

    items: SupplierReturnItem[];
};


export type SupplierReturnCreateItem = {
    quickPurchaseItemId: string;
    quantityReturned: number;
    reason?: string | null;
    notes?: string | null;
};


export type CreateSupplierReturnInput = {
    quickPurchaseId: string;

    returnDate: string;
    postingDate: string;

    reason: string;
    notes?: string | null;

    items: SupplierReturnCreateItem[];
};


export type SupplierReturnSummary = {
    totalReturns: number;
    draftReturns: number;
    approvedReturns: number;
    dispatchedReturns: number;
    postedReturns: number;

    totalPostedValue: number;
};


export type SupplierReturnListResult = {
    rows: SupplierReturnListItem[];

    total: number;
    page: number;
    pageSize: number;
    totalPages: number;

    summary: SupplierReturnSummary;
};


export type SupplierReturnListFilters = {
    search?: string;
    status?: SupplierReturnStatus | "all";

    dateFrom?: string;
    dateTo?: string;

    page?: number;
    pageSize?: number;
};


export type SupplierReturnEligiblePurchase = {
    id: string;
    purchaseNumber: string;

    purchaseDate: string;

    supplierId: string;
    supplierName: string;

    supplierInvoiceNumber: string | null;

    warehouseId: string;
    warehouseName: string;

    currencyCode: string;

    taxTreatment: SupplierReturnTaxTreatment;

    grandTotal: number;
};


export type SupplierReturnEligibleItem = {
    quickPurchaseItemId: string;

    lineNumber: number;

    productId: string;
    productName: string;
    productSku: string | null;

    purchasedQuantity: number;
    quantityAlreadyReturned: number;
    quantityReturnable: number;

    purchaseUnitCost: number;
    originalInventoryUnitCost: number;

    taxPercentage: number;

    lineSubtotal: number;
    taxAmount: number;
    lineTotal: number;
};

export type SupplierReturnCreditSummary = {
    supplierReturnId: string;
    returnNumber: string;

    quickPurchaseId: string;

    supplierId: string;

    currencyCode: string;

    supplierCreditAmount: number;
    supplierCreditAppliedAmount: number;
    supplierCreditRefundedAmount: number;
    supplierCreditAvailable: number;
};


export type SupplierReturnCreditEligiblePurchase = {
    id: string;
    purchaseNumber: string;

    purchaseDate: string;

    supplierId: string;
    supplierName: string;

    currencyCode: string;

    grandTotal: number;
    paidAmount: number;
    balanceDue: number;
    paymentStatus: string;
};


export type SupplierReturnCreditApplication = {
    id: string;

    supplierReturnId: string;
    quickPurchaseId: string;

    purchaseNumber: string;

    supplierId: string;

    applicationDate: string;
    postingDate: string;

    currencyCode: string;
    exchangeRate: number;

    amount: number;
    baseAmount: number;

    journalEntryId: string | null;
    journalNumber: string | null;

    notes: string | null;

    createdAt: string;
};


export type ApplySupplierReturnCreditInput = {
    supplierReturnId: string;
    quickPurchaseId: string;

    amount: number;

    applicationDate: string;
    postingDate: string;

    notes?: string | null;
};

export type SupplierReturnCreditRefund = {
    id: string;

    refundNumber: string;

    supplierReturnId: string;
    supplierId: string;

    financialAccountId: string;
    financialAccountName: string;

    refundDate: string;
    postingDate: string;

    currencyCode: string;
    exchangeRate: number;

    amount: number;
    baseAmount: number;

    accountTransactionId: string | null;
    accountTransactionNumber: string | null;

    journalEntryId: string | null;
    journalNumber: string | null;

    referenceNumber: string | null;
    notes: string | null;

    createdAt: string;
};


export type RefundSupplierReturnCreditInput = {
    supplierReturnId: string;

    financialAccountId: string;

    amount: number;

    refundDate: string;
    postingDate: string;

    referenceNumber?: string | null;
    notes?: string | null;
};


function toNumber(
    value: unknown,
): number {
    const parsed =
        Number(value ?? 0);

    return Number.isFinite(parsed)
        ? parsed
        : 0;
}


export async function createSupplierReturn(
    input: CreateSupplierReturnInput,
): Promise<string> {
    const supabase =
        await createClient();

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "create_supplier_return",
            {
                p_quick_purchase_id:
                    input.quickPurchaseId,

                p_return_date:
                    input.returnDate,

                p_posting_date:
                    input.postingDate,

                p_reason:
                    input.reason,

                p_items:
                    input.items.map(
                        (item) => ({
                            quickPurchaseItemId:
                                item.quickPurchaseItemId,

                            quantityReturned:
                                item.quantityReturned,

                            reason:
                                item.reason ?? null,

                            notes:
                                item.notes ?? null,
                        }),
                    ),

                p_notes:
                    input.notes ?? undefined,
            },
        );

    if (error) {
        throw new Error(
            `Unable to create Supplier Return: ${error.message}`,
        );
    }

    if (!data) {
        throw new Error(
            "Supplier Return was created without an ID.",
        );
    }

    return String(data);
}


export async function approveSupplierReturn(
    supplierReturnId: string,
): Promise<void> {
    const supabase =
        await createClient();

    const {
        error,
    } =
        await supabase.rpc(
            "approve_supplier_return",
            {
                p_supplier_return_id:
                    supplierReturnId,
            },
        );

    if (error) {
        throw new Error(
            `Unable to approve Supplier Return: ${error.message}`,
        );
    }
}


export async function dispatchSupplierReturn(
    supplierReturnId: string,
): Promise<void> {
    const supabase =
        await createClient();

    const {
        error,
    } =
        await supabase.rpc(
            "dispatch_supplier_return_inventory",
            {
                p_supplier_return_id:
                    supplierReturnId,
            },
        );

    if (error) {
        throw new Error(
            `Unable to dispatch Supplier Return: ${error.message}`,
        );
    }
}


export async function postSupplierReturn(
    supplierReturnId: string,
): Promise<void> {
    const supabase =
        await createClient();

    const {
        error,
    } =
        await supabase.rpc(
            "post_supplier_return_gl",
            {
                p_supplier_return_id:
                    supplierReturnId,
            },
        );

    if (error) {
        throw new Error(
            `Unable to post Supplier Return: ${error.message}`,
        );
    }
}

export async function applySupplierReturnCredit(
    input: ApplySupplierReturnCreditInput,
): Promise<string> {
    const supabase =
        await createClient();

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "apply_supplier_return_credit",
            {
                p_supplier_return_id:
                    input.supplierReturnId,

                p_quick_purchase_id:
                    input.quickPurchaseId,

                p_amount:
                    input.amount,

                p_application_date:
                    input.applicationDate,

                p_posting_date:
                    input.postingDate,

                p_notes:
                    input.notes ?? undefined,
            },
        );

    if (error) {
        throw new Error(
            `Unable to apply Supplier Return credit: ${error.message}`,
        );
    }

    if (!data) {
        throw new Error(
            "Supplier Return credit was applied without an application ID.",
        );
    }

    return String(data);
}

export async function refundSupplierReturnCredit(
    input: RefundSupplierReturnCreditInput,
): Promise<string> {
    const supabase =
        await createClient();

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "refund_supplier_return_credit",
            {
                p_supplier_return_id:
                    input.supplierReturnId,

                p_financial_account_id:
                    input.financialAccountId,

                p_amount:
                    input.amount,

                p_refund_date:
                    input.refundDate,

                p_posting_date:
                    input.postingDate,

                p_reference_number:
                    input.referenceNumber ??
                    undefined,

                p_notes:
                    input.notes ??
                    undefined,
            },
        );


    if (error) {
        throw new Error(
            `Unable to receive Supplier Return refund: ${error.message}`,
        );
    }


    if (!data) {
        throw new Error(
            "Supplier Return refund was received without a refund ID.",
        );
    }


    return String(
        data,
    );
}

export async function getSupplierReturnCreditState(
    supplierReturnId: string,
): Promise<SupplierReturnCreditSummary | null> {
    const supabase =
        await createClient();

    const {
        data,
        error,
    } =
        await supabase
            .from(
                "supplier_returns",
            )
            .select(
                `
                id,
                return_number,
                quick_purchase_id,
                supplier_id,
                currency_code,
                supplier_credit_amount,
                supplier_credit_applied_amount
                `,
            )
            .eq(
                "id",
                supplierReturnId,
            )
            .maybeSingle();

    if (error) {
        throw new Error(
            `Unable to load Supplier Return credit state: ${error.message}`,
        );
    }

    if (!data) {
        return null;
    }

    const creditAmount =
        toNumber(
            data.supplier_credit_amount,
        );

    const appliedAmount =
        toNumber(
            data.supplier_credit_applied_amount,
        );

    const {
        data: refundRows,
        error: refundError,
    } =
        await supabase
            .from(
                "supplier_return_credit_refunds",
            )
            .select(
                "amount",
            )
            .eq(
                "supplier_return_id",
                supplierReturnId,
            )
            .not(
                "journal_entry_id",
                "is",
                null,
            );


    if (refundError) {
        throw new Error(
            `Unable to load Supplier Return refunded credit: ${refundError.message}`,
        );
    }


    const refundedAmount =
        (
            refundRows ??
            []
        ).reduce(
            (
                total,
                refund,
            ) =>
                total +
                toNumber(
                    refund.amount,
                ),
            0,
        );

    return {
        supplierReturnId:
            data.id,

        returnNumber:
            data.return_number,

        quickPurchaseId:
            data.quick_purchase_id,

        supplierId:
            data.supplier_id,

        currencyCode:
            data.currency_code,

        supplierCreditAmount:
            creditAmount,

        supplierCreditAppliedAmount:
            appliedAmount,

        supplierCreditRefundedAmount:
            refundedAmount,

        supplierCreditAvailable:
            Math.max(
                creditAmount -
                appliedAmount -
                refundedAmount,
                0,
            ),
    };
}

export async function getSupplierReturnCreditEligiblePurchases(
    supplierReturnId: string,
): Promise<SupplierReturnCreditEligiblePurchase[]> {
    const supabase =
        await createClient();

    const creditState =
        await getSupplierReturnCreditState(
            supplierReturnId,
        );

    if (
        !creditState ||
        creditState.supplierCreditAvailable <= 0
    ) {
        return [];
    }

    const {
        data: supplier,
        error: supplierError,
    } =
        await supabase
            .from(
                "suppliers",
            )
            .select(
                `
                id,
                company_name
                `,
            )
            .eq(
                "id",
                creditState.supplierId,
            )
            .maybeSingle();

    if (supplierError) {
        throw new Error(
            `Unable to load supplier: ${supplierError.message}`,
        );
    }

    const {
        data,
        error,
    } =
        await supabase
            .from(
                "quick_purchases",
            )
            .select(
                `
                id,
                purchase_number,
                purchase_date,
                supplier_id,
                currency_code,
                grand_total,
                paid_amount,
                balance_due,
                payment_status
                `,
            )
            .eq(
                "supplier_id",
                creditState.supplierId,
            )
            .eq(
                "currency_code",
                creditState.currencyCode,
            )
            .gt(
                "balance_due",
                0,
            )
            .neq(
                "id",
                creditState.quickPurchaseId,
            )
            .order(
                "purchase_date",
                {
                    ascending:
                        false,
                },
            );

    if (error) {
        throw new Error(
            `Unable to load eligible Quick Purchases: ${error.message}`,
        );
    }

    return (
        data ?? []
    ).map(
        (row) => ({
            id:
                row.id,

            purchaseNumber:
                row.purchase_number,

            purchaseDate:
                row.purchase_date,

            supplierId:
                row.supplier_id ?? "",

            supplierName:
                supplier?.company_name ??
                "Unknown supplier",

            currencyCode:
                row.currency_code,

            grandTotal:
                toNumber(
                    row.grand_total,
                ),

            paidAmount:
                toNumber(
                    row.paid_amount,
                ),

            balanceDue:
                toNumber(
                    row.balance_due,
                ),

            paymentStatus:
                row.payment_status,
        }),
    );
}

export async function getSupplierReturnCreditApplications(
    supplierReturnId: string,
): Promise<SupplierReturnCreditApplication[]> {
    const supabase =
        await createClient();

    const {
        data: applications,
        error,
    } =
        await supabase
            .from(
                "supplier_return_credit_applications",
            )
            .select(
                `
                id,
                supplier_return_id,
                quick_purchase_id,
                supplier_id,
                application_date,
                posting_date,
                currency_code,
                exchange_rate,
                amount,
                base_amount,
                journal_entry_id,
                notes,
                created_at
                `,
            )
            .eq(
                "supplier_return_id",
                supplierReturnId,
            )
            .order(
                "created_at",
                {
                    ascending:
                        false,
                },
            );

    if (error) {
        throw new Error(
            `Unable to load Supplier Return credit applications: ${error.message}`,
        );
    }

    if (
        !applications ||
        applications.length === 0
    ) {
        return [];
    }

    const purchaseIds =
        [
            ...new Set(
                applications.map(
                    (application) =>
                        application.quick_purchase_id,
                ),
            ),
        ];

    const journalIds =
        [
            ...new Set(
                applications
                    .map(
                        (application) =>
                            application.journal_entry_id,
                    )
                    .filter(
                        (
                            value,
                        ): value is string =>
                            Boolean(value),
                    ),
            ),
        ];

    const {
        data: purchases,
        error: purchaseError,
    } =
        await supabase
            .from(
                "quick_purchases",
            )
            .select(
                `
                id,
                purchase_number
                `,
            )
            .in(
                "id",
                purchaseIds,
            );

    if (purchaseError) {
        throw new Error(
            `Unable to load credit application purchases: ${purchaseError.message}`,
        );
    }

    const journals =
        journalIds.length > 0
            ? await supabase
                .from(
                    "gl_journal_entries",
                )
                .select(
                    `
                      id,
                      journal_number
                      `,
                )
                .in(
                    "id",
                    journalIds,
                )
            : {
                data: [],
                error: null,
            };

    if (journals.error) {
        throw new Error(
            `Unable to load credit application journals: ${journals.error.message}`,
        );
    }

    const purchaseNumberById =
        new Map(
            (
                purchases ??
                []
            ).map(
                (purchase) => [
                    purchase.id,
                    purchase.purchase_number,
                ],
            ),
        );

    const journalNumberById =
        new Map(
            (
                journals.data ??
                []
            ).map(
                (journal) => [
                    journal.id,
                    journal.journal_number,
                ],
            ),
        );

    return applications.map(
        (application) => ({
            id:
                application.id,

            supplierReturnId:
                application.supplier_return_id,

            quickPurchaseId:
                application.quick_purchase_id,

            purchaseNumber:
                purchaseNumberById.get(
                    application.quick_purchase_id,
                ) ??
                "Unknown purchase",

            supplierId:
                application.supplier_id,

            applicationDate:
                application.application_date,

            postingDate:
                application.posting_date,

            currencyCode:
                application.currency_code,

            exchangeRate:
                toNumber(
                    application.exchange_rate,
                ),

            amount:
                toNumber(
                    application.amount,
                ),

            baseAmount:
                toNumber(
                    application.base_amount,
                ),

            journalEntryId:
                application.journal_entry_id,

            journalNumber:
                application.journal_entry_id
                    ? journalNumberById.get(
                        application.journal_entry_id,
                    ) ??
                    null
                    : null,

            notes:
                application.notes,

            createdAt:
                application.created_at,
        }),
    );
}

export async function getSupplierReturnCreditRefunds(
    supplierReturnId: string,
): Promise<SupplierReturnCreditRefund[]> {
    const supabase =
        await createClient();

    const {
        data,
        error,
    } =
        await supabase
            .from(
                "supplier_return_credit_refunds",
            )
            .select(
                `
                id,
                refund_number,
                supplier_return_id,
                supplier_id,
                financial_account_id,
                refund_date,
                posting_date,
                currency_code,
                exchange_rate,
                amount,
                base_amount,
                account_transaction_id,
                journal_entry_id,
                reference_number,
                notes,
                created_at,

                financial_account:financial_accounts (
                    account_name
                ),

                account_transaction:account_transactions (
                    transaction_number
                ),

                journal_entry:gl_journal_entries (
                    journal_number
                )
                `,
            )
            .eq(
                "supplier_return_id",
                supplierReturnId,
            )
            .order(
                "created_at",
                {
                    ascending:
                        false,
                },
            );


    if (error) {
        throw new Error(
            `Unable to load Supplier Return refund history: ${error.message}`,
        );
    }


    return (
        data ??
        []
    ).map(
        (refund) => {
            const financialAccount =
                Array.isArray(
                    refund.financial_account,
                )
                    ? refund.financial_account[0]
                    : refund.financial_account;

            const accountTransaction =
                Array.isArray(
                    refund.account_transaction,
                )
                    ? refund.account_transaction[0]
                    : refund.account_transaction;

            const journalEntry =
                Array.isArray(
                    refund.journal_entry,
                )
                    ? refund.journal_entry[0]
                    : refund.journal_entry;


            return {
                id:
                    refund.id,

                refundNumber:
                    refund.refund_number,

                supplierReturnId:
                    refund.supplier_return_id,

                supplierId:
                    refund.supplier_id,

                financialAccountId:
                    refund.financial_account_id,

                financialAccountName:
                    financialAccount
                        ?.account_name ??
                    "Unknown account",

                refundDate:
                    refund.refund_date,

                postingDate:
                    refund.posting_date,

                currencyCode:
                    refund.currency_code,

                exchangeRate:
                    toNumber(
                        refund.exchange_rate,
                    ),

                amount:
                    toNumber(
                        refund.amount,
                    ),

                baseAmount:
                    toNumber(
                        refund.base_amount,
                    ),

                accountTransactionId:
                    refund.account_transaction_id,

                accountTransactionNumber:
                    accountTransaction
                        ?.transaction_number ??
                    null,

                journalEntryId:
                    refund.journal_entry_id,

                journalNumber:
                    journalEntry
                        ?.journal_number ??
                    null,

                referenceNumber:
                    refund.reference_number,

                notes:
                    refund.notes,

                createdAt:
                    refund.created_at,
            };
        },
    );
}

/*
 * Kept here because all database numeric values returned by
 * Supabase may arrive as strings.
 *
 * The read-side repository functions added next will use this
 * helper consistently.
 */
export const supplierReturnNumber =
    toNumber;

/* =========================================================
* Read-Side Helpers
* ========================================================= */

function normalizePage(
    value?: number,
): number {
    if (
        !Number.isInteger(value) ||
        !value ||
        value < 1
    ) {
        return 1;
    }

    return value;
}


function normalizePageSize(
    value?: number,
): number {
    if (
        !Number.isInteger(value) ||
        !value ||
        value < 1
    ) {
        return 25;
    }

    return Math.min(
        value,
        100,
    );
}


function sanitizeSearchTerm(
    value: string,
): string {
    return value
        .trim()
        .replace(
            /[%_,]/g,
            " ",
        )
        .replace(
            /\s+/g,
            " ",
        );
}


/* =========================================================
 * Supplier Return Summary
 * ========================================================= */

export async function getSupplierReturnSummary(): Promise<
    SupplierReturnSummary
> {
    const supabase =
        await createClient();

    const [
        totalResult,
        draftResult,
        approvedResult,
        dispatchedResult,
        postedResult,
        postedValueResult,
    ] =
        await Promise.all([
            supabase
                .from(
                    "supplier_returns",
                )
                .select(
                    "id",
                    {
                        count:
                            "exact",
                        head:
                            true,
                    },
                ),

            supabase
                .from(
                    "supplier_returns",
                )
                .select(
                    "id",
                    {
                        count:
                            "exact",
                        head:
                            true,
                    },
                )
                .eq(
                    "status",
                    "draft",
                ),

            supabase
                .from(
                    "supplier_returns",
                )
                .select(
                    "id",
                    {
                        count:
                            "exact",
                        head:
                            true,
                    },
                )
                .eq(
                    "status",
                    "approved",
                ),

            supabase
                .from(
                    "supplier_returns",
                )
                .select(
                    "id",
                    {
                        count:
                            "exact",
                        head:
                            true,
                    },
                )
                .eq(
                    "status",
                    "dispatched",
                ),

            supabase
                .from(
                    "supplier_returns",
                )
                .select(
                    "id",
                    {
                        count:
                            "exact",
                        head:
                            true,
                    },
                )
                .eq(
                    "status",
                    "posted",
                ),

            supabase
                .from(
                    "supplier_returns",
                )
                .select(
                    "grand_total",
                )
                .eq(
                    "status",
                    "posted",
                ),
        ]);

    const firstError =
        totalResult.error ??
        draftResult.error ??
        approvedResult.error ??
        dispatchedResult.error ??
        postedResult.error ??
        postedValueResult.error;

    if (firstError) {
        throw new Error(
            `Unable to load Supplier Return summary: ${firstError.message}`,
        );
    }

    const totalPostedValue =
        (
            postedValueResult.data ??
            []
        ).reduce(
            (
                total,
                row,
            ) =>
                total +
                toNumber(
                    row.grand_total,
                ),
            0,
        );

    return {
        totalReturns:
            totalResult.count ??
            0,

        draftReturns:
            draftResult.count ??
            0,

        approvedReturns:
            approvedResult.count ??
            0,

        dispatchedReturns:
            dispatchedResult.count ??
            0,

        postedReturns:
            postedResult.count ??
            0,

        totalPostedValue,
    };
}


/* =========================================================
 * Supplier Return List
 * ========================================================= */

export async function getSupplierReturnPage(
    filters: SupplierReturnListFilters = {},
): Promise<SupplierReturnListResult> {
    const supabase =
        await createClient();

    const page =
        normalizePage(
            filters.page,
        );

    const pageSize =
        normalizePageSize(
            filters.pageSize,
        );

    const rangeStart =
        (
            page -
            1
        ) *
        pageSize;

    const rangeEnd =
        rangeStart +
        pageSize -
        1;

    const searchTerm =
        sanitizeSearchTerm(
            filters.search ??
            "",
        );

    let query =
        supabase
            .from(
                "supplier_returns",
            )
            .select(
                `
                *,
                quick_purchase:quick_purchases (
                    id,
                    purchase_number
                ),
                supplier:suppliers (
                    id,
                    company_name
                ),
                warehouse:warehouses (
                    id,
                    name
                )
                `,
                {
                    count:
                        "exact",
                },
            );

    if (
        filters.status &&
        filters.status !==
        "all"
    ) {
        query =
            query.eq(
                "status",
                filters.status,
            );
    }

    if (
        filters.dateFrom
    ) {
        query =
            query.gte(
                "return_date",
                filters.dateFrom,
            );
    }

    if (
        filters.dateTo
    ) {
        query =
            query.lte(
                "return_date",
                filters.dateTo,
            );
    }

    if (searchTerm) {
        query =
            query.or(
                [
                    `return_number.ilike.%${searchTerm}%`,
                    `reason.ilike.%${searchTerm}%`,
                ].join(
                    ",",
                ),
            );
    }

    const {
        data,
        error,
        count,
    } =
        await query
            .order(
                "return_date",
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
                rangeStart,
                rangeEnd,
            );

    if (error) {
        throw new Error(
            `Unable to load Supplier Returns: ${error.message}`,
        );
    }

    const rows:
        SupplierReturnListItem[] =
        (
            data ??
            []
        ).map(
            (row) => {
                const quickPurchase =
                    Array.isArray(
                        row.quick_purchase,
                    )
                        ? row
                            .quick_purchase[0]
                        : row
                            .quick_purchase;

                const supplier =
                    Array.isArray(
                        row.supplier,
                    )
                        ? row
                            .supplier[0]
                        : row
                            .supplier;

                const warehouse =
                    Array.isArray(
                        row.warehouse,
                    )
                        ? row
                            .warehouse[0]
                        : row
                            .warehouse;

                return {
                    id:
                        row.id,

                    returnNumber:
                        row.return_number,

                    quickPurchaseId:
                        row.quick_purchase_id,

                    purchaseNumber:
                        quickPurchase
                            ?.purchase_number ??
                        "—",

                    supplierId:
                        row.supplier_id,

                    supplierName:
                        supplier
                            ?.company_name ??
                        "—",

                    warehouseId:
                        row.warehouse_id,

                    warehouseName:
                        warehouse
                            ?.name ??
                        "—",

                    returnDate:
                        row.return_date,

                    postingDate:
                        row.posting_date,

                    status:
                        row.status as
                        SupplierReturnStatus,

                    reason:
                        row.reason,

                    notes:
                        row.notes,

                    currencyCode:
                        row.currency_code,

                    subtotal:
                        toNumber(
                            row.subtotal,
                        ),

                    taxAmount:
                        toNumber(
                            row.tax_amount,
                        ),

                    grandTotal:
                        toNumber(
                            row.grand_total,
                        ),

                    inventoryCost:
                        toNumber(
                            row.inventory_cost,
                        ),

                    createdAt:
                        row.created_at,
                };
            },
        );

    const total =
        count ??
        0;

    const summary =
        await getSupplierReturnSummary();

    return {
        rows,

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

        summary,
    };
}


/* =========================================================
 * Supplier Return Detail
 * ========================================================= */

export async function getSupplierReturnById(
    supplierReturnId: string,
): Promise<SupplierReturnDetail | null> {
    const supabase =
        await createClient();

    const {
        data,
        error,
    } =
        await supabase
            .from(
                "supplier_returns",
            )
            .select(
                `
                *,
                quick_purchase:quick_purchases (
                    id,
                    purchase_number,
                    supplier_invoice_number
                ),
                supplier:suppliers (
                    id,
                    company_name
                ),
                warehouse:warehouses (
                    id,
                    name
                ),
                inventory_transaction:inventory_transactions (
                    id,
                    transaction_number
                ),
                journal_entry:gl_journal_entries (
                    id,
                    journal_number
                ),
                supplier_return_items (
                    *,
                    product:products (
                        id,
                        sku,
                        name
                    )
                )
                `,
            )
            .eq(
                "id",
                supplierReturnId,
            )
            .maybeSingle();

    if (error) {
        throw new Error(
            `Unable to load Supplier Return: ${error.message}`,
        );
    }

    if (!data) {
        return null;
    }

    const quickPurchase =
        Array.isArray(
            data.quick_purchase,
        )
            ? data
                .quick_purchase[0]
            : data
                .quick_purchase;

    const supplier =
        Array.isArray(
            data.supplier,
        )
            ? data
                .supplier[0]
            : data
                .supplier;

    const warehouse =
        Array.isArray(
            data.warehouse,
        )
            ? data
                .warehouse[0]
            : data
                .warehouse;

    const inventoryTransaction =
        Array.isArray(
            data.inventory_transaction,
        )
            ? data
                .inventory_transaction[0]
            : data
                .inventory_transaction;

    const journalEntry =
        Array.isArray(
            data.journal_entry,
        )
            ? data
                .journal_entry[0]
            : data
                .journal_entry;

    const items:
        SupplierReturnItem[] =
        (
            data
                .supplier_return_items ??
            []
        )
            .sort(
                (
                    left,
                    right,
                ) =>
                    left.line_number -
                    right.line_number,
            )
            .map(
                (item) => {
                    const product =
                        Array.isArray(
                            item.product,
                        )
                            ? item
                                .product[0]
                            : item
                                .product;

                    return {
                        id:
                            item.id,

                        lineNumber:
                            item.line_number,

                        quickPurchaseItemId:
                            item.quick_purchase_item_id,

                        originalInventoryItemId:
                            item.original_inventory_item_id,

                        productId:
                            item.product_id,

                        productName:
                            product
                                ?.name ??
                            "Unknown product",

                        productSku:
                            product
                                ?.sku ??
                            null,

                        warehouseId:
                            item.warehouse_id,

                        quantityReturned:
                            toNumber(
                                item.quantity_returned,
                            ),

                        originalUnitCost:
                            toNumber(
                                item.original_unit_cost,
                            ),

                        returnCost:
                            toNumber(
                                item.return_cost,
                            ),

                        lineSubtotal:
                            toNumber(
                                item.line_subtotal,
                            ),

                        taxPercentage:
                            toNumber(
                                item.tax_percentage,
                            ),

                        taxAmount:
                            toNumber(
                                item.tax_amount,
                            ),

                        lineTotal:
                            toNumber(
                                item.line_total,
                            ),

                        reason:
                            item.reason,

                        notes:
                            item.notes,
                    };
                },
            );

    return {
        id:
            data.id,

        returnNumber:
            data.return_number,

        quickPurchaseId:
            data.quick_purchase_id,

        purchaseNumber:
            quickPurchase
                ?.purchase_number ??
            "—",

        supplierInvoiceNumber:
            quickPurchase
                ?.supplier_invoice_number ??
            null,

        supplierId:
            data.supplier_id,

        supplierName:
            supplier
                ?.company_name ??
            "—",

        warehouseId:
            data.warehouse_id,

        warehouseName:
            warehouse
                ?.name ??
            "—",

        returnDate:
            data.return_date,

        postingDate:
            data.posting_date,

        status:
            data.status as
            SupplierReturnStatus,

        reason:
            data.reason,

        notes:
            data.notes,

        currencyCode:
            data.currency_code,

        exchangeRate:
            toNumber(
                data.exchange_rate,
            ),

        taxTreatment:
            data.tax_treatment as
            SupplierReturnTaxTreatment,

        subtotal:
            toNumber(
                data.subtotal,
            ),

        discountAmount:
            toNumber(
                data.discount_amount,
            ),

        taxAmount:
            toNumber(
                data.tax_amount,
            ),

        recoverableTaxAmount:
            toNumber(
                data.recoverable_tax_amount,
            ),

        pendingTaxAmount:
            toNumber(
                data.pending_tax_amount,
            ),

        grandTotal:
            toNumber(
                data.grand_total,
            ),

        inventoryCost:
            toNumber(
                data.inventory_cost,
            ),

        inventoryTransactionId:
            data.inventory_transaction_id,

        inventoryTransactionNumber:
            inventoryTransaction
                ?.transaction_number ??
            null,

        journalEntryId:
            data.journal_entry_id,

        journalNumber:
            journalEntry
                ?.journal_number ??
            null,

        approvedAt:
            data.approved_at,

        approvedBy:
            data.approved_by,

        dispatchedAt:
            data.dispatched_at,

        dispatchedBy:
            data.dispatched_by,

        postedAt:
            data.posted_at,

        postedBy:
            data.posted_by,

        cancelledAt:
            data.cancelled_at,

        cancelledBy:
            data.cancelled_by,

        cancellationReason:
            data.cancellation_reason,

        createdAt:
            data.created_at,

        updatedAt:
            data.updated_at,

        items,
    };
}

/* =========================================================
 * Eligible Quick Purchases for Supplier Return
 * ========================================================= */

export async function getEligibleSupplierReturnPurchases(): Promise<
    SupplierReturnEligiblePurchase[]
> {
    const supabase =
        await createClient();

    const {
        data,
        error,
    } =
        await supabase
            .from(
                "quick_purchases",
            )
            .select(
                `
                id,
                purchase_number,
                purchase_date,
                supplier_id,
                supplier_invoice_number,
                warehouse_id,
                currency_code,
                tax_treatment,
                grand_total,
                inventory_transaction_id,

                supplier:suppliers (
                    id,
                    company_name
                ),

                warehouse:warehouses (
                    id,
                    name
                ),

                quick_purchase_items (
                    id,
                    quantity,

                    supplier_return_items (
                        quantity_returned,

                        supplier_return:supplier_returns (
                            status
                        )
                    )
                )
                `,
            )
            .eq(
                "status",
                "posted",
            )
            .not(
                "supplier_id",
                "is",
                null,
            )
            .not(
                "inventory_transaction_id",
                "is",
                null,
            )
            .not(
                "tax_treatment",
                "in",
                '("reverse_charge","review_required")',
            )
            .order(
                "purchase_date",
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
            );

    if (error) {
        throw new Error(
            `Unable to load Supplier Return eligible purchases: ${error.message}`,
        );
    }

    return (
        data ??
        []
    )
        .filter(
            (purchase) => {
                return (
                    purchase
                        .quick_purchase_items ??
                    []
                ).some(
                    (item) => {
                        const returnedQuantity =
                            (
                                item
                                    .supplier_return_items ??
                                []
                            ).reduce(
                                (
                                    total,
                                    returnItem,
                                ) => {
                                    const supplierReturn =
                                        Array.isArray(
                                            returnItem
                                                .supplier_return,
                                        )
                                            ? returnItem
                                                .supplier_return[0]
                                            : returnItem
                                                .supplier_return;

                                    if (
                                        supplierReturn
                                            ?.status ===
                                        "cancelled"
                                    ) {
                                        return total;
                                    }

                                    return (
                                        total +
                                        toNumber(
                                            returnItem
                                                .quantity_returned,
                                        )
                                    );
                                },
                                0,
                            );

                        return (
                            toNumber(
                                item.quantity,
                            ) -
                            returnedQuantity
                        ) >
                            0;
                    },
                );
            },
        )
        .map(
            (purchase) => {
                const supplier =
                    Array.isArray(
                        purchase.supplier,
                    )
                        ? purchase
                            .supplier[0]
                        : purchase
                            .supplier;

                const warehouse =
                    Array.isArray(
                        purchase.warehouse,
                    )
                        ? purchase
                            .warehouse[0]
                        : purchase
                            .warehouse;

                return {
                    id:
                        purchase.id,

                    purchaseNumber:
                        purchase.purchase_number,

                    purchaseDate:
                        purchase.purchase_date,

                    supplierId:
                        purchase.supplier_id!,

                    supplierName:
                        supplier
                            ?.company_name ??
                        "—",

                    supplierInvoiceNumber:
                        purchase
                            .supplier_invoice_number,

                    warehouseId:
                        purchase.warehouse_id,

                    warehouseName:
                        warehouse
                            ?.name ??
                        "—",

                    currencyCode:
                        purchase.currency_code,

                    taxTreatment:
                        purchase
                            .tax_treatment as
                        SupplierReturnTaxTreatment,

                    grandTotal:
                        toNumber(
                            purchase.grand_total,
                        ),
                };
            },
        );
}


/* =========================================================
 * Eligible Items for One Quick Purchase
 * ========================================================= */

export async function getSupplierReturnEligibleItems(
    quickPurchaseId: string,
): Promise<SupplierReturnEligibleItem[]> {
    const supabase =
        await createClient();

    const {
        data: purchase,
        error: purchaseError,
    } =
        await supabase
            .from(
                "quick_purchases",
            )
            .select(
                `
                id,
                purchase_number,
                status,
                supplier_id,
                inventory_transaction_id,
                tax_treatment
                `,
            )
            .eq(
                "id",
                quickPurchaseId,
            )
            .maybeSingle();

    if (purchaseError) {
        throw new Error(
            `Unable to load Quick Purchase: ${purchaseError.message}`,
        );
    }

    if (!purchase) {
        throw new Error(
            "Quick Purchase was not found.",
        );
    }

    if (
        purchase.status !==
        "posted"
    ) {
        throw new Error(
            `Quick Purchase ${purchase.purchase_number} is not posted.`,
        );
    }

    if (
        !purchase.supplier_id
    ) {
        throw new Error(
            `Quick Purchase ${purchase.purchase_number} does not have a registered supplier.`,
        );
    }

    if (
        !purchase
            .inventory_transaction_id
    ) {
        throw new Error(
            `Quick Purchase ${purchase.purchase_number} does not have an inventory transaction.`,
        );
    }

    if (
        purchase
            .tax_treatment ===
        "reverse_charge" ||
        purchase
            .tax_treatment ===
        "review_required"
    ) {
        throw new Error(
            `Supplier Returns for tax treatment "${purchase.tax_treatment}" are not supported.`,
        );
    }

    const {
        data: items,
        error: itemError,
    } =
        await supabase
            .from(
                "quick_purchase_items",
            )
            .select(
                `
                id,
                line_number,
                product_id,
                quantity,
                unit_cost,
                line_subtotal,
                tax_percentage,
                tax_amount,
                line_total,

                product:products (
                    id,
                    sku,
                    name
                ),

                supplier_return_items (
                    quantity_returned,

                    supplier_return:supplier_returns (
                        status
                    )
                )
                `,
            )
            .eq(
                "quick_purchase_id",
                quickPurchaseId,
            )
            .order(
                "line_number",
                {
                    ascending:
                        true,
                },
            );

    if (itemError) {
        throw new Error(
            `Unable to load Quick Purchase items: ${itemError.message}`,
        );
    }

    const {
        data:
        inventoryItems,
        error:
        inventoryError,
    } =
        await supabase
            .from(
                "inventory_transaction_items",
            )
            .select(
                `
                id,
                source_document_item_id,
                product_id,
                unit_cost
                `,
            )
            .eq(
                "inventory_transaction_id",
                purchase
                    .inventory_transaction_id,
            );

    if (inventoryError) {
        throw new Error(
            `Unable to load Quick Purchase inventory lineage: ${inventoryError.message}`,
        );
    }

    const inventoryMap =
        new Map(
            (
                inventoryItems ??
                []
            )
                .filter(
                    (item) =>
                        Boolean(
                            item
                                .source_document_item_id,
                        ),
                )
                .map(
                    (item) => [
                        item
                            .source_document_item_id!,
                        item,
                    ],
                ),
        );

    return (
        items ??
        []
    )
        .map(
            (item) => {
                const product =
                    Array.isArray(
                        item.product,
                    )
                        ? item
                            .product[0]
                        : item
                            .product;

                const alreadyReturned =
                    (
                        item
                            .supplier_return_items ??
                        []
                    ).reduce(
                        (
                            total,
                            returnItem,
                        ) => {
                            const supplierReturn =
                                Array.isArray(
                                    returnItem
                                        .supplier_return,
                                )
                                    ? returnItem
                                        .supplier_return[0]
                                    : returnItem
                                        .supplier_return;

                            if (
                                supplierReturn
                                    ?.status ===
                                "cancelled"
                            ) {
                                return total;
                            }

                            return (
                                total +
                                toNumber(
                                    returnItem
                                        .quantity_returned,
                                )
                            );
                        },
                        0,
                    );

                const purchasedQuantity =
                    toNumber(
                        item.quantity,
                    );

                const returnableQuantity =
                    Math.max(
                        purchasedQuantity -
                        alreadyReturned,
                        0,
                    );

                const inventoryItem =
                    inventoryMap.get(
                        item.id,
                    );

                if (
                    !inventoryItem
                ) {
                    throw new Error(
                        `Quick Purchase ${purchase.purchase_number} line ${item.line_number} does not have valid inventory lineage.`,
                    );
                }

                if (
                    inventoryItem
                        .product_id !==
                    item.product_id
                ) {
                    throw new Error(
                        `Quick Purchase ${purchase.purchase_number} line ${item.line_number} inventory lineage points to a different product.`,
                    );
                }

                return {
                    quickPurchaseItemId:
                        item.id,

                    lineNumber:
                        item.line_number,

                    productId:
                        item.product_id,

                    productName:
                        product
                            ?.name ??
                        "Unknown product",

                    productSku:
                        product
                            ?.sku ??
                        null,

                    purchasedQuantity,

                    quantityAlreadyReturned:
                        alreadyReturned,

                    quantityReturnable:
                        returnableQuantity,

                    purchaseUnitCost:
                        toNumber(
                            item.unit_cost,
                        ),

                    originalInventoryUnitCost:
                        toNumber(
                            inventoryItem
                                .unit_cost,
                        ),

                    taxPercentage:
                        toNumber(
                            item.tax_percentage,
                        ),

                    lineSubtotal:
                        toNumber(
                            item.line_subtotal,
                        ),

                    taxAmount:
                        toNumber(
                            item.tax_amount,
                        ),

                    lineTotal:
                        toNumber(
                            item.line_total,
                        ),
                };
            },
        )
        .filter(
            (item) =>
                item
                    .quantityReturnable >
                0,
        );
}
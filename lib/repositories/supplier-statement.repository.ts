import {
    createClient,
} from "@/lib/supabase/server";


/* =========================================================
 * Types
 * ========================================================= */

export type SupplierStatementEntryType =
    | "purchase"
    | "payment"
    | "legacy_payment";


export type SupplierStatementEntry = {
    id: string;

    date: string;

    type:
    SupplierStatementEntryType;

    documentNumber: string;

    referenceNumber:
    | string
    | null;

    debit: number;

    credit: number;

    runningBalance: number;

    quickPurchaseId:
    | string
    | null;

    supplierPaymentId:
    | string
    | null;

    description:
    | string
    | null;
};


export type SupplierStatementSummary = {
    openingBalance: number;

    periodPurchases: number;

    periodPayments: number;

    closingBalance: number;

    payableAmount: number;

    advanceAmount: number;

    totalOutstandingPurchases: number;

    totalUnallocatedAdvance: number;
};


export type SupplierStatement = {
    supplier: {
        id: string;

        companyName: string;

        contactName:
        | string
        | null;

        email:
        | string
        | null;

        phone:
        | string
        | null;

        city:
        | string
        | null;
    };

    dateFrom:
    | string
    | null;

    dateTo:
    | string
    | null;

    summary:
    SupplierStatementSummary;

    entries:
    SupplierStatementEntry[];
};


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


function isBeforeDate(
    date: string,
    dateFrom:
        | string
        | undefined,
) {
    return Boolean(
        dateFrom &&
        date <
        dateFrom,
    );
}


function isAfterDate(
    date: string,
    dateTo:
        | string
        | undefined,
) {
    return Boolean(
        dateTo &&
        date >
        dateTo,
    );
}


/* =========================================================
 * Get Supplier Statement
 * ========================================================= */

export async function getSupplierStatement(
    supplierId: string,
    input: {
        dateFrom?: string;
        dateTo?: string;
    } = {},
): Promise<SupplierStatement | null> {
    if (!supplierId) {
        return null;
    }

    const supabase =
        await createClient();


    /* -------------------------------------------------------
     * Supplier
     * ------------------------------------------------------- */

    const {
        data: supplier,
        error: supplierError,
    } =
        await supabase
            .from("suppliers")
            .select(`
        id,
        company_name,
        contact_name,
        email,
        phone,
        city
      `)
            .eq(
                "id",
                supplierId,
            )
            .maybeSingle();


    if (supplierError) {
        throw new Error(
            `Unable to load supplier: ${supplierError.message}`,
        );
    }


    if (!supplier) {
        return null;
    }


    /* -------------------------------------------------------
     * All Quick Purchases
     *
     * We intentionally load all dates because date-range
     * statements require a correct opening balance.
     * ------------------------------------------------------- */

    const {
        data: purchases,
        error: purchasesError,
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
        grand_total,
        payment_opening_amount,
        balance_due,
        status,
        notes,
        created_at
      `)
            .eq(
                "supplier_id",
                supplierId,
            )
            .eq(
                "status",
                "posted",
            )
            .order(
                "purchase_date",
                {
                    ascending:
                        true,
                },
            )
            .order(
                "created_at",
                {
                    ascending:
                        true,
                },
            );


    if (purchasesError) {
        throw new Error(
            `Unable to load supplier purchases: ${purchasesError.message}`,
        );
    }


    /* -------------------------------------------------------
     * Supplier Payments
     *
     * Cancelled payments do not affect financial balance.
     * ------------------------------------------------------- */

    const {
        data: payments,
        error: paymentsError,
    } =
        await supabase
            .from(
                "supplier_payments",
            )
            .select(`
        id,
        payment_number,
        payment_date,
        amount,
        unallocated_amount,
        reference_number,
        payment_method,
        status,
        notes,
        created_at
      `)
            .eq(
                "supplier_id",
                supplierId,
            )
            .eq(
                "status",
                "posted",
            )
            .order(
                "payment_date",
                {
                    ascending:
                        true,
                },
            )
            .order(
                "created_at",
                {
                    ascending:
                        true,
                },
            );


    if (paymentsError) {
        throw new Error(
            `Unable to load supplier payments: ${paymentsError.message}`,
        );
    }


    /* =======================================================
     * Build Raw Ledger
     * ======================================================= */

    type RawEntry = {
        id: string;

        date: string;

        sortTimestamp: string;

        sortPriority: number;

        type:
        SupplierStatementEntryType;

        documentNumber: string;

        referenceNumber:
        | string
        | null;

        debit: number;

        credit: number;

        quickPurchaseId:
        | string
        | null;

        supplierPaymentId:
        | string
        | null;

        description:
        | string
        | null;
    };


    const rawEntries:
        RawEntry[] = [];


    for (
        const purchase of
        purchases ?? []
    ) {
        const grandTotal =
            numberValue(
                purchase.grand_total,
            );

        const openingPayment =
            numberValue(
                purchase.payment_opening_amount,
            );


        /*
         * Purchase = amount owed to supplier.
         */

        rawEntries.push({
            id:
                `purchase-${purchase.id}`,

            date:
                purchase.purchase_date,

            sortTimestamp:
                purchase.created_at,

            sortPriority: 1,

            type:
                "purchase",

            documentNumber:
                purchase.purchase_number,

            referenceNumber:
                purchase.supplier_invoice_number,

            debit:
                grandTotal,

            credit: 0,

            quickPurchaseId:
                purchase.id,

            supplierPaymentId:
                null,

            description:
                purchase.notes,
        });


        /*
         * Transitional historical payment.
         *
         * This keeps purchases entered before supplier_payments
         * was introduced reconciled in the statement.
         */

        if (
            openingPayment >
            0
        ) {
            rawEntries.push({
                id:
                    `legacy-payment-${purchase.id}`,

                date:
                    purchase.purchase_date,

                sortTimestamp:
                    purchase.created_at,

                sortPriority: 2,

                type:
                    "legacy_payment",

                documentNumber:
                    `${purchase.purchase_number} / Opening Payment`,

                referenceNumber:
                    null,

                debit: 0,

                credit:
                    openingPayment,

                quickPurchaseId:
                    purchase.id,

                supplierPaymentId:
                    null,

                description:
                    "Historical payment recorded before Supplier Payments ledger.",
            });
        }
    }


    for (
        const payment of
        payments ?? []
    ) {
        rawEntries.push({
            id:
                `payment-${payment.id}`,

            date:
                payment.payment_date,

            sortTimestamp:
                payment.created_at,

            sortPriority: 3,

            type:
                "payment",

            documentNumber:
                payment.payment_number,

            referenceNumber:
                payment.reference_number,

            debit: 0,

            credit:
                numberValue(
                    payment.amount,
                ),

            quickPurchaseId:
                null,

            supplierPaymentId:
                payment.id,

            description:
                payment.notes,
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
                dateCompare !== 0
            ) {
                return dateCompare;
            }

            const timestampCompare =
                left.sortTimestamp.localeCompare(
                    right.sortTimestamp,
                );

            if (
                timestampCompare !==
                0
            ) {
                return timestampCompare;
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


    for (
        const entry of
        rawEntries
    ) {
        if (
            isBeforeDate(
                entry.date,
                input.dateFrom,
            )
        ) {
            openingBalance +=
                entry.debit -
                entry.credit;
        }
    }


    openingBalance =
        roundMoney(
            openingBalance,
        );


    /* =======================================================
     * Period Entries + Running Balance
     * ======================================================= */

    let runningBalance =
        openingBalance;

    let periodPurchases = 0;
    let periodPayments = 0;


    const entries:
        SupplierStatementEntry[] =
        [];


    for (
        const entry of
        rawEntries
    ) {
        if (
            isBeforeDate(
                entry.date,
                input.dateFrom,
            )
        ) {
            continue;
        }

        if (
            isAfterDate(
                entry.date,
                input.dateTo,
            )
        ) {
            continue;
        }


        runningBalance =
            roundMoney(
                runningBalance +
                entry.debit -
                entry.credit,
            );


        periodPurchases =
            roundMoney(
                periodPurchases +
                entry.debit,
            );


        periodPayments =
            roundMoney(
                periodPayments +
                entry.credit,
            );


        entries.push({
            id:
                entry.id,

            date:
                entry.date,

            type:
                entry.type,

            documentNumber:
                entry.documentNumber,

            referenceNumber:
                entry.referenceNumber,

            debit:
                entry.debit,

            credit:
                entry.credit,

            runningBalance,

            quickPurchaseId:
                entry.quickPurchaseId,

            supplierPaymentId:
                entry.supplierPaymentId,

            description:
                entry.description,
        });
    }


    const closingBalance =
        roundMoney(
            runningBalance,
        );


    /* =======================================================
     * Current Operational Payables
     *
     * These are current balances, independent of date filter.
     * ======================================================= */

    const totalOutstandingPurchases =
        roundMoney(
            (
                purchases ??
                []
            ).reduce(
                (
                    total,
                    purchase,
                ) =>
                    total +
                    numberValue(
                        purchase.balance_due,
                    ),
                0,
            ),
        );


    const totalUnallocatedAdvance =
        roundMoney(
            (
                payments ??
                []
            ).reduce(
                (
                    total,
                    payment,
                ) =>
                    total +
                    numberValue(
                        payment.unallocated_amount,
                    ),
                0,
            ),
        );


    return {
        supplier: {
            id:
                supplier.id,

            companyName:
                supplier.company_name,

            contactName:
                supplier.contact_name,

            email:
                supplier.email,

            phone:
                supplier.phone,

            city:
                supplier.city,
        },

        dateFrom:
            input.dateFrom ??
            null,

        dateTo:
            input.dateTo ??
            null,

        summary: {
            openingBalance,

            periodPurchases,

            periodPayments,

            closingBalance,

            payableAmount:
                Math.max(
                    closingBalance,
                    0,
                ),

            advanceAmount:
                Math.max(
                    -closingBalance,
                    0,
                ),

            totalOutstandingPurchases,

            totalUnallocatedAdvance,
        },

        entries,
    };
}
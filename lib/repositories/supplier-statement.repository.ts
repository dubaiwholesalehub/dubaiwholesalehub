import {
    createClient,
} from "@/lib/supabase/server";


/* =========================================================
 * Types
 * ========================================================= */

export type SupplierStatementEntryType =
    | "purchase"
    | "goods_receipt"
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

    goodsReceiptId:
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
     * All Completed Goods Receipts
     *
     * We intentionally load all dates because statements
     * require the complete historical supplier liability
     * ledger, including GRNs that are already fully paid.
     * ------------------------------------------------------- */

    const {
        data: goodsReceipts,
        error: goodsReceiptsError,
    } =
        await (
            supabase as unknown as {
                from: (
                    relation:
                        "goods_receipts",
                ) => any;
            }
        )
            .from(
                "goods_receipts",
            )
            .select(`
        id,
        receipt_number,
        purchase_order_id,
        supplier_invoice_number,
        received_date,
        completed_at,
        created_at,
        status,
        internal_notes,
        paid_amount,
        balance_due,
        payment_status
      `)
            .eq(
                "supplier_id",
                supplierId,
            )
            .eq(
                "status",
                "completed",
            )
            .order(
                "received_date",
                {
                    ascending: true,
                    nullsFirst: false,
                },
            )
            .order(
                "created_at",
                {
                    ascending: true,
                },
            );


    if (goodsReceiptsError) {
        throw new Error(
            `Unable to load supplier Goods Receipts: ${goodsReceiptsError.message}`,
        );
    }

    const goodsReceiptPayables =
        await Promise.all(
            (
                goodsReceipts ??
                []
            ).map(
                async (
                    receipt: any,
                ) => {
                    const {
                        data,
                        error,
                    } =
                        await supabase.rpc(
                            "get_goods_receipt_payable_amount" as never,
                            {
                                p_goods_receipt_id:
                                    receipt.id,
                            } as never,
                        );

                    if (error) {
                        throw new Error(
                            `Unable to calculate payable for ${receipt.receipt_number}: ${error.message}`,
                        );
                    }

                    return {
                        ...receipt,

                        payableAmount:
                            numberValue(
                                data,
                            ),
                    };
                },
            ),
        );
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

        goodsReceiptId:
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

            goodsReceiptId:
                null,

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
                goodsReceiptId:
                    null,
                supplierPaymentId:
                    null,

                description:
                    "Historical payment recorded before Supplier Payments ledger.",
            });
        }
    }

    /* -------------------------------------------------------
 * Goods Receipt liabilities
 * ------------------------------------------------------- */

    for (
        const receipt of
        goodsReceiptPayables
    ) {
        const receiptDate =
            receipt.received_date ??
            receipt.completed_at?.slice(
                0,
                10,
            ) ??
            receipt.created_at.slice(
                0,
                10,
            );

        rawEntries.push({
            id:
                `goods-receipt-${receipt.id}`,

            date:
                receiptDate,

            sortTimestamp:
                receipt.completed_at ??
                receipt.created_at,

            sortPriority: 1,

            type:
                "goods_receipt",

            documentNumber:
                receipt.receipt_number,

            referenceNumber:
                receipt.supplier_invoice_number,

            debit:
                receipt.payableAmount,

            credit: 0,

            quickPurchaseId:
                null,

            goodsReceiptId:
                receipt.id,

            supplierPaymentId:
                null,

            description:
                receipt.internal_notes,
        });
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
            goodsReceiptId:
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

            goodsReceiptId:
                entry.goodsReceiptId,

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

    const {
        data: currentPayables,
        error: currentPayablesError,
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
            )
            .select(`
        outstanding_amount
      `)
            .eq(
                "supplier_id",
                supplierId,
            )
            .gt(
                "outstanding_amount",
                0,
            );


    if (currentPayablesError) {
        throw new Error(
            `Unable to load current supplier payables: ${currentPayablesError.message}`,
        );
    }


    const totalOutstandingPurchases =
        roundMoney(
            (
                currentPayables ??
                []
            ).reduce(
                (
                    total: number,
                    payable: any,
                ) =>
                    total +
                    numberValue(
                        payable.outstanding_amount,
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
/* =========================================================
 * Supplier Financial Positions
 *
 * Lightweight bulk financial summary used by Supplier
 * master list.
 * ========================================================= */

export interface SupplierFinancialPosition {
    supplierId: string;
    payable: number;
    advance: number;
    netPosition: number;
}

export async function getSupplierFinancialPositions(
    supplierIds: string[],
): Promise<
    Record<
        string,
        SupplierFinancialPosition
    >
> {
    if (supplierIds.length === 0) {
        return {};
    }

    const supabase =
        await createClient();

        /* -------------------------------------------------------
     * Consolidated Outstanding Supplier Payables
     * ------------------------------------------------------- */

    const {
        data: purchases,
        error: purchasesError,
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
            )
            .select(`
        supplier_id,
        outstanding_amount
      `)
            .in(
                "supplier_id",
                supplierIds,
            )
            .gt(
                "outstanding_amount",
                0,
            );


    if (purchasesError) {
        throw new Error(
            `Unable to load supplier payables: ${purchasesError.message}`,
        );
    }

    /*
     * -------------------------------------------------------
     * Available Supplier Advances
     * -------------------------------------------------------
     */

    const {
        data: payments,
        error: paymentsError,
    } = await supabase
        .from(
            "supplier_payments",
        )
        .select(`
      supplier_id,
      unallocated_amount,
      status
    `)
        .in(
            "supplier_id",
            supplierIds,
        )
        .eq(
            "status",
            "posted",
        )
        .gt(
            "unallocated_amount",
            0,
        );

    if (paymentsError) {
        throw new Error(
            `Unable to load supplier advances: ${paymentsError.message}`,
        );
    }

    const positions: Record<
        string,
        SupplierFinancialPosition
    > = {};

    for (const supplierId of supplierIds) {
        positions[supplierId] = {
            supplierId,
            payable: 0,
            advance: 0,
            netPosition: 0,
        };
    }

    /*
     * Outstanding purchases.
     */

    for (const purchase of purchases ?? []) {
        if (
            !purchase.supplier_id ||
            !positions[
            purchase.supplier_id
            ]
        ) {
            continue;
        }

        positions[
            purchase.supplier_id
        ].payable +=
            Number(
                purchase.outstanding_amount ??
                0,
            );
    }

    /*
     * Unallocated supplier payments = available advance.
     */

    for (const payment of payments ?? []) {
        if (
            !payment.supplier_id ||
            !positions[
            payment.supplier_id
            ]
        ) {
            continue;
        }

        positions[
            payment.supplier_id
        ].advance +=
            Number(
                payment.unallocated_amount ??
                0,
            );
    }

    /*
     * Positive = we owe supplier.
     * Negative = supplier advance remains with supplier.
     */

    for (const position of Object.values(
        positions,
    )) {
        position.payable =
            Math.round(
                position.payable * 100,
            ) / 100;

        position.advance =
            Math.round(
                position.advance * 100,
            ) / 100;

        position.netPosition =
            Math.round(
                (
                    position.payable -
                    position.advance
                ) * 100,
            ) / 100;
    }

    return positions;
}
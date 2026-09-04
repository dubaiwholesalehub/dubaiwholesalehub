import { createClient } from "@/lib/supabase/server";

/* =========================================================
 * Shared Types
 * ========================================================= */

export type OpeningBalanceStatus =
    | "posted"
    | "settled"
    | "cancelled";

export type OpeningBalancePartyOption = {
    id: string;
    number: string | null;
    name: string;
};

/* =========================================================
 * Customer Opening Balances
 * ========================================================= */

export type PostCustomerOpeningBalanceInput = {
    customerId: string;
    openingDate: string;
    dueDate?: string | null;
    referenceNumber?: string;
    currencyCode?: string;
    exchangeRate?: number;
    amount: number;
    notes?: string;
};

export type CustomerOpeningBalance = {
    id: string;
    customerId: string;

    openingDate: string;
    dueDate: string | null;

    referenceNumber: string | null;

    currencyCode: string;
    exchangeRate: number;

    originalAmount: number;
    outstandingAmount: number;

    notes: string | null;

    status: OpeningBalanceStatus;

    postedAt: string;
    cancelledAt: string | null;
    cancellationReason: string | null;

    customerName: string;
    customerNumber: string | null;
};

export async function postCustomerOpeningBalance(
    input: PostCustomerOpeningBalanceInput,
): Promise<string> {
    const supabase =
        await createClient();

    const {
        data,
        error,
    } = await supabase.rpc(
        "post_customer_opening_balance",
        {
            p_customer_id:
                input.customerId,

            p_opening_date:
                input.openingDate,

            p_due_date: (input.dueDate || null) as unknown as string,

            p_reference_number:
                input.referenceNumber?.trim() ??
                "",

            p_currency_code:
                input.currencyCode ??
                "AED",

            p_exchange_rate:
                input.exchangeRate ??
                1,

            p_amount:
                input.amount,

            p_notes:
                input.notes?.trim() ??
                "",
        },
    );

    if (error) {
        throw new Error(
            `Unable to post customer opening balance: ${error.message}`,
        );
    }

    if (
        typeof data !== "string" ||
        !data
    ) {
        throw new Error(
            "Customer opening balance was posted but no ID was returned.",
        );
    }

    return data;
}

/* =========================================================
 * Supplier Opening Balances
 * ========================================================= */

export type PostSupplierOpeningBalanceInput = {
    supplierId: string;
    openingDate: string;
    dueDate?: string | null;
    referenceNumber?: string;
    currencyCode?: string;
    exchangeRate?: number;
    amount: number;
    notes?: string;
};

export async function postSupplierOpeningBalance(
    input: PostSupplierOpeningBalanceInput,
): Promise<string> {
    const supabase =
        await createClient();

    const {
        data,
        error,
    } = await supabase.rpc(
        "post_supplier_opening_balance",
        {
            p_supplier_id:
                input.supplierId,

            p_opening_date:
                input.openingDate,

            p_due_date: (input.dueDate || null) as unknown as string,

            p_reference_number:
                input.referenceNumber?.trim() ??
                "",

            p_currency_code:
                input.currencyCode ??
                "AED",

            p_exchange_rate:
                input.exchangeRate ??
                1,

            p_amount:
                input.amount,

            p_notes:
                input.notes?.trim() ??
                "",
        },
    );

    if (error) {
        throw new Error(
            `Unable to post supplier opening balance: ${error.message}`,
        );
    }

    if (
        typeof data !== "string" ||
        !data
    ) {
        throw new Error(
            "Supplier opening balance was posted but no ID was returned.",
        );
    }

    return data;
}

/* =========================================================
 * Cancellation
 * ========================================================= */

export async function cancelCustomerOpeningBalance(
    openingBalanceId: string,
    reversalDate: string,
    reason: string,
): Promise<void> {
    const supabase =
        await createClient();

    const {
        error,
    } = await supabase.rpc(
        "cancel_customer_opening_balance",
        {
            p_customer_opening_balance_id:
                openingBalanceId,

            p_reversal_date:
                reversalDate,

            p_reason:
                reason.trim(),
        },
    );

    if (error) {
        throw new Error(
            `Unable to cancel customer opening balance: ${error.message}`,
        );
    }
}

export async function cancelSupplierOpeningBalance(
    openingBalanceId: string,
    reversalDate: string,
    reason: string,
): Promise<void> {
    const supabase =
        await createClient();

    const {
        error,
    } = await supabase.rpc(
        "cancel_supplier_opening_balance",
        {
            p_supplier_opening_balance_id:
                openingBalanceId,

            p_reversal_date:
                reversalDate,

            p_reason:
                reason.trim(),
        },
    );

    if (error) {
        throw new Error(
            `Unable to cancel supplier opening balance: ${error.message}`,
        );
    }
}

/* =========================================================
 * Opening Balance Register
 * ========================================================= */

export type CustomerOpeningBalanceRegisterRow = {
    id: string;

    customerId: string;
    customerNumber: string | null;
    customerName: string;

    openingDate: string;
    dueDate: string | null;

    referenceNumber: string | null;

    currencyCode: string;
    originalAmount: number;
    outstandingAmount: number;

    status: OpeningBalanceStatus;

    notes: string | null;

    postedAt: string;

    cancelledAt: string | null;
    cancellationReason: string | null;
};

export type SupplierOpeningBalanceRegisterRow = {
    id: string;

    supplierId: string;
    supplierName: string;

    openingDate: string;
    dueDate: string | null;

    referenceNumber: string | null;

    currencyCode: string;
    originalAmount: number;
    outstandingAmount: number;

    status: OpeningBalanceStatus;

    notes: string | null;

    postedAt: string;

    cancelledAt: string | null;
    cancellationReason: string | null;
};

export async function getCustomerOpeningBalances(): Promise<
    CustomerOpeningBalanceRegisterRow[]
> {
    const supabase =
        await createClient();

    const {
        data,
        error,
    } = await supabase
        .from(
            "customer_opening_balances",
        )
        .select(`
            id,
            customer_id,
            opening_date,
            due_date,
            reference_number,
            currency_code,
            original_amount,
            status,
            notes,
            posted_at,
            cancelled_at,
            cancellation_reason,

            customer:customers (
                customer_number,
                display_name,
                company_name
            )
        `)
        .order(
            "opening_date",
            {
                ascending: false,
            },
        )
        .order(
            "created_at",
            {
                ascending: false,
            },
        );

    if (error) {
        throw new Error(
            `Unable to load customer opening balances: ${error.message}`,
        );
    }

    return Promise.all(
        (data ?? []).map(
            async (row) => {
                const customer =
                    Array.isArray(
                        row.customer,
                    )
                        ? row.customer[0]
                        : row.customer;

                let outstandingAmount =
                    0;

                if (
                    row.status !==
                    "cancelled"
                ) {
                    const {
                        data:
                        outstanding,
                        error:
                        outstandingError,
                    } =
                        await supabase.rpc(
                            "get_customer_opening_balance_outstanding",
                            {
                                p_customer_opening_balance_id:
                                    row.id,
                            },
                        );

                    if (
                        outstandingError
                    ) {
                        throw new Error(
                            `Unable to calculate customer opening balance outstanding amount: ${outstandingError.message}`,
                        );
                    }

                    outstandingAmount =
                        Number(
                            outstanding ??
                            0,
                        );
                }

                return {
                    id:
                        row.id,

                    customerId:
                        row.customer_id,

                    customerNumber:
                        customer
                            ?.customer_number ??
                        null,

                    customerName:
                        customer
                            ?.display_name ??
                        customer
                            ?.company_name ??
                        "Unknown Customer",

                    openingDate:
                        row.opening_date,

                    dueDate:
                        row.due_date,

                    referenceNumber:
                        row.reference_number,

                    currencyCode:
                        row.currency_code,

                    originalAmount:
                        Number(
                            row.original_amount,
                        ),

                    outstandingAmount,

                    status:
                        row.status as OpeningBalanceStatus,

                    notes:
                        row.notes,

                    postedAt:
                        row.posted_at,

                    cancelledAt:
                        row.cancelled_at,

                    cancellationReason:
                        row.cancellation_reason,
                };
            },
        ),
    );
}

export async function getSupplierOpeningBalances(): Promise<
    SupplierOpeningBalanceRegisterRow[]
> {
    const supabase =
        await createClient();

    const {
        data,
        error,
    } = await supabase
        .from(
            "supplier_opening_balances",
        )
        .select(`
            id,
            supplier_id,
            opening_date,
            due_date,
            reference_number,
            currency_code,
            original_amount,
            status,
            notes,
            posted_at,
            cancelled_at,
            cancellation_reason,

            supplier:suppliers (
                company_name
            )
        `)
        .order(
            "opening_date",
            {
                ascending: false,
            },
        )
        .order(
            "created_at",
            {
                ascending: false,
            },
        );

    if (error) {
        throw new Error(
            `Unable to load supplier opening balances: ${error.message}`,
        );
    }

    return Promise.all(
        (data ?? []).map(
            async (row) => {
                const supplier =
                    Array.isArray(
                        row.supplier,
                    )
                        ? row.supplier[0]
                        : row.supplier;

                let outstandingAmount =
                    0;

                if (
                    row.status !==
                    "cancelled"
                ) {
                    const {
                        data:
                        outstanding,
                        error:
                        outstandingError,
                    } =
                        await supabase.rpc(
                            "get_supplier_opening_balance_outstanding",
                            {
                                p_supplier_opening_balance_id:
                                    row.id,
                            },
                        );

                    if (
                        outstandingError
                    ) {
                        throw new Error(
                            `Unable to calculate supplier opening balance outstanding amount: ${outstandingError.message}`,
                        );
                    }

                    outstandingAmount =
                        Number(
                            outstanding ??
                            0,
                        );
                }

                return {
                    id:
                        row.id,

                    supplierId:
                        row.supplier_id,

                    supplierName:
                        supplier
                            ?.company_name ??
                        "Unknown Supplier",

                    openingDate:
                        row.opening_date,

                    dueDate:
                        row.due_date,

                    referenceNumber:
                        row.reference_number,

                    currencyCode:
                        row.currency_code,

                    originalAmount:
                        Number(
                            row.original_amount,
                        ),

                    outstandingAmount,

                    status:
                        row.status as OpeningBalanceStatus,

                    notes:
                        row.notes,

                    postedAt:
                        row.posted_at,

                    cancelledAt:
                        row.cancelled_at,

                    cancellationReason:
                        row.cancellation_reason,
                };
            },
        ),
    );
}
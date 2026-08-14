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
        "post_customer_receipt",
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
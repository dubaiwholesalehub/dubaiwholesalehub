"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";

import {
    getCustomerOutstandingOrders,
    postCustomerReceipt,
    type CustomerReceiptPaymentMethod,
} from "@/lib/repositories/customer-receipt.repository";

export async function loadCustomerOutstandingOrders(
    customerId: string,
) {
    await requireAdmin();

    if (!customerId) {
        return [];
    }

    return getCustomerOutstandingOrders(
        customerId,
    );
}

export type CreateCustomerReceiptInput = {
    customerId: string;

    receiptDate: string;

    paymentMethod:
    CustomerReceiptPaymentMethod;

    financialAccountId: string;

    amount: number;

    referenceNumber?: string;

    bankName?: string;

    chequeNumber?: string;
    chequeDate?: string;

    notes?: string;

    allocations: Array<{
        salesOrderId?: string | null;
        customerOpeningBalanceId?: string | null;
        amount: number;
    }>;
};

export type CreateCustomerReceiptResult =
    | {
        success: true;
        receiptId: string;
        message: string;
    }
    | {
        success: false;
        message: string;
    };

export async function createCustomerReceipt(
    input: CreateCustomerReceiptInput,
): Promise<CreateCustomerReceiptResult> {
    await requireAdmin();

    try {
        if (!input.customerId) {
            throw new Error(
                "Please select a customer.",
            );
        }

        if (!input.receiptDate) {
            throw new Error(
                "Receipt date is required.",
            );
        }

        if (
            !Number.isFinite(
                input.amount,
            ) ||
            input.amount <= 0
        ) {
            throw new Error(
                "Receipt amount must be greater than zero.",
            );
        }

        const allowedMethods:
            CustomerReceiptPaymentMethod[] =
            [
                "cash",
                "bank",
                "card",
                "cheque",
                "other",
            ];

        if (
            !allowedMethods.includes(
                input.paymentMethod,
            )
        ) {
            throw new Error(
                "Invalid payment method.",
            );
        }

        if (
            input.paymentMethod ===
            "cheque" &&
            !input.chequeNumber?.trim()
        ) {
            throw new Error(
                "Cheque number is required.",
            );
        }

        if (
            !input.financialAccountId?.trim()
        ) {
            throw new Error(
                "Please select a financial account.",
            );
        }
        const allocationTotal =
            input.allocations.reduce(
                (
                    total,
                    allocation,
                ) =>
                    total +
                    allocation.amount,
                0,
            );

        if (
            allocationTotal >
            input.amount + 0.01
        ) {
            throw new Error(
                "Allocated amount cannot exceed the receipt amount.",
            );
        }

        for (
            const allocation of
            input.allocations
        ) {
            if (
                !allocation.salesOrderId
            ) {
                throw new Error(
                    "Invalid sales order allocation.",
                );
            }

            if (
                !Number.isFinite(
                    allocation.amount,
                ) ||
                allocation.amount <= 0
            ) {
                throw new Error(
                    "Allocation amount must be greater than zero.",
                );
            }
        }

        const receiptId =
            await postCustomerReceipt({
                customerId:
                    input.customerId,

                receiptDate:
                    input.receiptDate,

                paymentMethod:
                    input.paymentMethod,

                financialAccountId:
                    input.financialAccountId,

                currencyCode:
                    "AED",

                exchangeRate: 1,

                amount:
                    input.amount,

                referenceNumber:
                    input.referenceNumber,

                bankName:
                    input.bankName,

                chequeNumber:
                    input.chequeNumber,

                chequeDate:
                    input.chequeDate,

                notes:
                    input.notes,

                allocations:
                    input.allocations,
            });

        revalidatePath(
            "/admin/sales/receipts",
        );

        revalidatePath(
            "/admin/sales/orders",
        );

        revalidatePath(
            "/admin/customers",
        );

        return {
            success: true,

            receiptId,

            message:
                "Customer receipt posted successfully.",
        };
    } catch (error) {
        return {
            success: false,

            message:
                error instanceof Error
                    ? error.message
                    : "Unable to post customer receipt.",
        };
    }
}
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import {
    cancelCustomerOpeningBalance,
    cancelSupplierOpeningBalance,
    postCustomerOpeningBalance,
    postSupplierOpeningBalance,
} from "@/lib/repositories/opening-balance.repository";

const PATH =
    "/admin/accounts/opening-balances";

function getString(
    formData: FormData,
    name: string,
) {
    return String(
        formData.get(name) ?? "",
    ).trim();
}

function getAmount(
    formData: FormData,
) {
    const amount =
        Number(
            formData.get("amount"),
        );

    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {
        throw new Error(
            "Opening balance amount must be greater than zero.",
        );
    }

    return amount;
}

function redirectWithError(
    type: "customer" | "supplier",
    error: unknown,
): never {
    const message =
        error instanceof Error
            ? error.message
            : "Unable to post opening balance.";

    redirect(
        `${PATH}?tab=${type}&error=${encodeURIComponent(
            message,
        )}`,
    );
}

export async function postCustomerOpeningBalanceAction(
    formData: FormData,
) {
    await requireAdmin();

    try {
        const customerId =
            getString(
                formData,
                "customerId",
            );

        const openingDate =
            getString(
                formData,
                "openingDate",
            );

        if (!customerId) {
            throw new Error(
                "Customer is required.",
            );
        }

        if (!openingDate) {
            throw new Error(
                "Opening date is required.",
            );
        }

        await postCustomerOpeningBalance({
            customerId,

            openingDate,

            dueDate:
                getString(
                    formData,
                    "dueDate",
                ) || null,

            referenceNumber:
                getString(
                    formData,
                    "referenceNumber",
                ),

            currencyCode:
                "AED",

            exchangeRate:
                1,

            amount:
                getAmount(
                    formData,
                ),

            notes:
                getString(
                    formData,
                    "notes",
                ),
        });
    } catch (error) {
        redirectWithError(
            "customer",
            error,
        );
    }

    revalidatePath(PATH);

    redirect(
        `${PATH}?tab=customer&success=${encodeURIComponent(
            "Customer opening receivable posted successfully.",
        )}`,
    );
}

export async function postSupplierOpeningBalanceAction(
    formData: FormData,
) {
    await requireAdmin();

    try {
        const supplierId =
            getString(
                formData,
                "supplierId",
            );

        const openingDate =
            getString(
                formData,
                "openingDate",
            );

        if (!supplierId) {
            throw new Error(
                "Supplier is required.",
            );
        }

        if (!openingDate) {
            throw new Error(
                "Opening date is required.",
            );
        }

        await postSupplierOpeningBalance({
            supplierId,

            openingDate,

            dueDate:
                getString(
                    formData,
                    "dueDate",
                ) || null,

            referenceNumber:
                getString(
                    formData,
                    "referenceNumber",
                ),

            currencyCode:
                "AED",

            exchangeRate:
                1,

            amount:
                getAmount(
                    formData,
                ),

            notes:
                getString(
                    formData,
                    "notes",
                ),
        });
    } catch (error) {
        redirectWithError(
            "supplier",
            error,
        );
    }

    revalidatePath(PATH);

    redirect(
        `${PATH}?tab=supplier&success=${encodeURIComponent(
            "Supplier opening payable posted successfully.",
        )}`,
    );
}

export async function cancelCustomerOpeningBalanceAction(
    formData: FormData,
) {
    await requireAdmin();

    const id =
        getString(
            formData,
            "openingBalanceId",
        );

    const reason =
        getString(
            formData,
            "reason",
        );

    if (!id) {
        redirectWithError(
            "customer",
            new Error(
                "Opening balance is required.",
            ),
        );
    }

    if (!reason) {
        redirectWithError(
            "customer",
            new Error(
                "Cancellation reason is required.",
            ),
        );
    }

    try {
        await cancelCustomerOpeningBalance(
            id,
            new Date()
                .toISOString()
                .slice(0, 10),
            reason,
        );
    } catch (error) {
        redirectWithError(
            "customer",
            error,
        );
    }

    revalidatePath(PATH);

    redirect(
        `${PATH}?tab=customer&success=${encodeURIComponent(
            "Customer opening balance cancelled successfully.",
        )}`,
    );
}

export async function cancelSupplierOpeningBalanceAction(
    formData: FormData,
) {
    await requireAdmin();

    const id =
        getString(
            formData,
            "openingBalanceId",
        );

    const reason =
        getString(
            formData,
            "reason",
        );

    if (!id) {
        redirectWithError(
            "supplier",
            new Error(
                "Opening balance is required.",
            ),
        );
    }

    if (!reason) {
        redirectWithError(
            "supplier",
            new Error(
                "Cancellation reason is required.",
            ),
        );
    }

    try {
        await cancelSupplierOpeningBalance(
            id,
            new Date()
                .toISOString()
                .slice(0, 10),
            reason,
        );
    } catch (error) {
        redirectWithError(
            "supplier",
            error,
        );
    }

    revalidatePath(PATH);

    redirect(
        `${PATH}?tab=supplier&success=${encodeURIComponent(
            "Supplier opening balance cancelled successfully.",
        )}`,
    );
}
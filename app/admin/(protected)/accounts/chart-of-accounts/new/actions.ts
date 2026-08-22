"use server";

import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export async function createCustomGlAccountAction(
    formData: FormData,
) {
    await requireAdmin();

    const parentId =
        String(
            formData.get("parentId") ?? "",
        ).trim();

    const accountCode =
        String(
            formData.get("accountCode") ?? "",
        ).trim();

    const accountName =
        String(
            formData.get("accountName") ?? "",
        ).trim();

    const description =
        String(
            formData.get("description") ?? "",
        ).trim();

    const allowManualPosting =
        formData.get("allowManualPosting") === "on";

    const rawDisplayOrder =
        String(
            formData.get("displayOrder") ?? "0",
        ).trim();

    const displayOrder =
        Number(rawDisplayOrder);

    if (!parentId) {
        throw new Error(
            "Parent GL account is required.",
        );
    }

    if (!accountCode) {
        throw new Error(
            "GL account code is required.",
        );
    }

    if (!accountName) {
        throw new Error(
            "GL account name is required.",
        );
    }

    if (
        !Number.isInteger(displayOrder) ||
        displayOrder < 0
    ) {
        throw new Error(
            "Display order must be a non-negative whole number.",
        );
    }

    const supabase =
        await createClient();

    const {
        data,
        error,
    } = await supabase.rpc(
        "create_custom_gl_account",
        {
            p_parent_id:
                parentId,

            p_account_code:
                accountCode,

            p_account_name:
                accountName,

            p_description:
                description || undefined,

            p_allow_manual_posting:
                allowManualPosting,

            p_display_order:
                displayOrder,
        },
    );

    if (error) {
        throw new Error(
            `Unable to create GL account: ${error.message}`,
        );
    }

    redirect(
        `/admin/accounts/chart-of-accounts?created=${encodeURIComponent(
            String(data ?? ""),
        )}`,
    );
}
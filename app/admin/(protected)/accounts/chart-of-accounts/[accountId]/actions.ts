"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  requireAdmin,
} from "@/lib/auth/require-admin";

import {
  createClient,
} from "@/lib/supabase/server";


export async function updateCustomGlAccountAction(
  accountId: string,
  formData: FormData,
) {
  await requireAdmin();

  const accountName =
    String(
      formData.get(
        "accountName",
      ) ?? "",
    ).trim();

  const description =
    String(
      formData.get(
        "description",
      ) ?? "",
    ).trim();

  const allowManualPosting =
    formData.get(
      "allowManualPosting",
    ) === "on";

  const rawDisplayOrder =
    String(
      formData.get(
        "displayOrder",
      ) ?? "0",
    ).trim();

  const displayOrder =
    Number(
      rawDisplayOrder,
    );

  if (!accountName) {
    throw new Error(
      "GL account name is required.",
    );
  }

  if (
    !Number.isInteger(
      displayOrder,
    ) ||
    displayOrder < 0
  ) {
    throw new Error(
      "Display order must be a non-negative whole number.",
    );
  }

  const supabase =
    await createClient();

  const {
    error,
  } = await supabase.rpc(
    "update_custom_gl_account",
    {
      p_gl_account_id:
        accountId,

      p_account_name:
        accountName,

      p_description:
        description || "",

      p_allow_manual_posting:
        allowManualPosting,

      p_display_order:
        displayOrder,
    },
  );

  if (error) {
    throw new Error(
      `Unable to update GL account: ${error.message}`,
    );
  }

  revalidatePath(
    "/admin/accounts/chart-of-accounts",
  );

  revalidatePath(
    `/admin/accounts/chart-of-accounts/${accountId}`,
  );

  redirect(
    "/admin/accounts/chart-of-accounts",
  );
}


export async function setCustomGlAccountActiveAction(
  accountId: string,
  isActive: boolean,
) {
  await requireAdmin();

  const supabase =
    await createClient();

  const {
    error,
  } = await supabase.rpc(
    "set_custom_gl_account_active",
    {
      p_gl_account_id:
        accountId,

      p_is_active:
        isActive,
    },
  );

  if (error) {
    throw new Error(
      `Unable to ${
        isActive
          ? "activate"
          : "deactivate"
      } GL account: ${error.message}`,
    );
  }

  revalidatePath(
    "/admin/accounts/chart-of-accounts",
  );

  revalidatePath(
    `/admin/accounts/chart-of-accounts/${accountId}`,
  );

  redirect(
    "/admin/accounts/chart-of-accounts",
  );
}
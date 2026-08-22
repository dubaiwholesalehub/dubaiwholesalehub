"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  requireAdmin,
} from "@/lib/auth/require-admin";

import {
  createClient,
} from "@/lib/supabase/server";


const PERIODS_PATH =
  "/admin/accounts/accounting-periods";


export async function softCloseAccountingPeriodAction(
  periodId: string,
  formData: FormData,
) {
  await requireAdmin();

  const notes =
    String(
      formData.get(
        "notes",
      ) ?? "",
    ).trim();

  const supabase =
    await createClient();

  const {
    error,
  } = await supabase.rpc(
    "soft_close_accounting_period",
    {
      p_period_id:
        periodId,

      p_notes:
        notes ||
        undefined,
    },
  );

  if (error) {
    throw new Error(
      `Unable to soft close accounting period: ${error.message}`,
    );
  }

  revalidatePath(
    PERIODS_PATH,
  );
}


export async function closeAccountingPeriodAction(
  periodId: string,
  formData: FormData,
) {
  await requireAdmin();

  const notes =
    String(
      formData.get(
        "notes",
      ) ?? "",
    ).trim();

  if (
    notes.length < 3
  ) {
    throw new Error(
      "A meaningful closing note is required.",
    );
  }

  const supabase =
    await createClient();

  const {
    error,
  } = await supabase.rpc(
    "close_accounting_period",
    {
      p_period_id:
        periodId,

      p_notes:
        notes,
    },
  );

  if (error) {
    throw new Error(
      `Unable to close accounting period: ${error.message}`,
    );
  }

  revalidatePath(
    PERIODS_PATH,
  );
}


export async function reopenAccountingPeriodAction(
  periodId: string,
  formData: FormData,
) {
  await requireAdmin();

  const reason =
    String(
      formData.get(
        "reason",
      ) ?? "",
    ).trim();

  if (
    reason.length < 3
  ) {
    throw new Error(
      "A meaningful reopen reason is required.",
    );
  }

  const supabase =
    await createClient();

  const {
    error,
  } = await supabase.rpc(
    "reopen_accounting_period",
    {
      p_period_id:
        periodId,

      p_reason:
        reason,
    },
  );

  if (error) {
    throw new Error(
      `Unable to reopen accounting period: ${error.message}`,
    );
  }

  revalidatePath(
    PERIODS_PATH,
  );
}
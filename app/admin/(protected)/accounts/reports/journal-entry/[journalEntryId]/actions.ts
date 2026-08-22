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


export async function reverseJournalAction(
  journalEntryId: string,
  formData: FormData,
) {
  await requireAdmin();

  const reversalDate =
    String(
      formData.get(
        "reversalDate",
      ) ?? "",
    ).trim();

  const reason =
    String(
      formData.get(
        "reason",
      ) ?? "",
    ).trim();

  if (!reversalDate) {
    throw new Error(
      "Reversal date is required.",
    );
  }

  if (
    reason.length < 3
  ) {
    throw new Error(
      "A meaningful reversal reason is required.",
    );
  }

  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "reverse_gl_journal",
    {
      p_journal_entry_id:
        journalEntryId,

      p_reversal_date:
        reversalDate,

      p_reason:
        reason,
    },
  );

  if (error) {
    throw new Error(
      `Unable to reverse journal: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "Reversal did not return a Journal ID.",
    );
  }

  revalidatePath(
    `/admin/accounts/reports/journal-entry/${journalEntryId}`,
  );

  revalidatePath(
    `/admin/accounts/reports/journal-entry/${data}`,
  );

  revalidatePath(
    "/admin/accounts/reports/trial-balance",
  );

  revalidatePath(
    "/admin/accounts/reports/profit-and-loss",
  );

  revalidatePath(
    "/admin/accounts/reports/balance-sheet",
  );

  redirect(
    `/admin/accounts/reports/journal-entry/${data}`,
  );
}
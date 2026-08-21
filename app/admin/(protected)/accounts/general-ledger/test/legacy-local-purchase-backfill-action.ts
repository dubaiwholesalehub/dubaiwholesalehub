"use server";

import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export async function runLegacyLocalPurchaseGlBackfillAction() {
  await requireAdmin();

  const supabase = await createClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "backfill_legacy_local_purchase_gl",
  );

  if (error) {
    throw new Error(
      `Legacy local purchase GL backfill failed: ${error.message}`,
    );
  }

  const result =
    data &&
    typeof data === "object" &&
    !Array.isArray(data)
      ? data
      : {};

  const legacyLocalPurchases =
    "legacyLocalPurchases" in result
      ? Number(result.legacyLocalPurchases)
      : 0;

  const legacyInventoryValue =
    "legacyInventoryValue" in result
      ? Number(result.legacyInventoryValue)
      : 0;

  const roundingAdjustment =
    "roundingAdjustment" in result
      ? Number(result.roundingAdjustment)
      : 0;

  redirect(
    `/admin/accounts/general-ledger/test?legacyLocalPurchaseBackfill=success&legacyLocalPurchases=${legacyLocalPurchases}&legacyInventoryValue=${legacyInventoryValue}&roundingAdjustment=${roundingAdjustment}`,
  );
}
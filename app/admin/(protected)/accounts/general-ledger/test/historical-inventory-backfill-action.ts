"use server";

import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export async function runHistoricalInventoryGlBackfillAction() {
  await requireAdmin();

  const supabase = await createClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "backfill_historical_inventory_gl",
  );

  if (error) {
    throw new Error(
      `Historical inventory GL backfill failed: ${error.message}`,
    );
  }

  const result =
    data &&
    typeof data === "object" &&
    !Array.isArray(data)
      ? data
      : {};

  const quickPurchases =
    "quickPurchases" in result
      ? Number(result.quickPurchases)
      : 0;

  const quickPurchaseInventoryValue =
    "quickPurchaseInventoryValue" in result
      ? Number(result.quickPurchaseInventoryValue)
      : 0;

  const salesIssues =
    "salesIssues" in result
      ? Number(result.salesIssues)
      : 0;

  const cogsValue =
    "cogsValue" in result
      ? Number(result.cogsValue)
      : 0;

  const totalSources =
    "totalSources" in result
      ? Number(result.totalSources)
      : 0;

  redirect(
    `/admin/accounts/general-ledger/test?historicalInventoryBackfill=success&quickPurchases=${quickPurchases}&quickPurchaseInventoryValue=${quickPurchaseInventoryValue}&salesIssues=${salesIssues}&cogsValue=${cogsValue}&historicalInventoryTotal=${totalSources}`,
  );
}
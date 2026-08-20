"use server";

import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export async function runHistoricalGlBackfillAction() {
    await requireAdmin();

    const supabase = await createClient();

    const {
        data,
        error,
    } = await supabase.rpc(
        "backfill_historical_receipt_payment_gl",
    );

    if (error) {
        throw new Error(
            `Historical GL backfill failed: ${error.message}`,
        );
    }

    const result =
        data &&
            typeof data === "object" &&
            !Array.isArray(data)
            ? data
            : {};

    const customerReceipts =
        "customerReceipts" in result
            ? Number(result.customerReceipts)
            : 0;

    const supplierPayments =
        "supplierPayments" in result
            ? Number(result.supplierPayments)
            : 0;

    const totalSources =
        "totalSources" in result
            ? Number(result.totalSources)
            : 0;

    redirect(
        `/admin/accounts/general-ledger/test?historicalBackfill=success&historicalReceipts=${customerReceipts}&historicalPayments=${supplierPayments}&historicalTotal=${totalSources}`,
    );
}
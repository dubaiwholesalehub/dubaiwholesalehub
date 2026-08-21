"use server";

import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export async function runHistoricalArApBackfillAction() {
  await requireAdmin();

  const supabase = await createClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "backfill_historical_ar_ap_gl",
  );

  if (error) {
    throw new Error(
      `Historical AR/AP GL reconciliation failed: ${error.message}`,
    );
  }

  const result =
    data &&
    typeof data === "object" &&
    !Array.isArray(data)
      ? data
      : {};

  const salesOrders =
    "salesOrders" in result
      ? Number(result.salesOrders)
      : 0;

  const salesOrderValue =
    "salesOrderValue" in result
      ? Number(result.salesOrderValue)
      : 0;

  const historicalReceipts =
    "historicalReceipts" in result
      ? Number(result.historicalReceipts)
      : 0;

  const historicalReceiptArValue =
    "historicalReceiptArValue" in result
      ? Number(result.historicalReceiptArValue)
      : 0;

  const historicalSupplierPayments =
    "historicalSupplierPayments" in result
      ? Number(result.historicalSupplierPayments)
      : 0;

  const historicalSupplierPaymentApValue =
    "historicalSupplierPaymentApValue" in result
      ? Number(result.historicalSupplierPaymentApValue)
      : 0;

  const supplierAdvanceApplications =
    "supplierAdvanceApplications" in result
      ? Number(result.supplierAdvanceApplications)
      : 0;

  const supplierAdvanceApplicationValue =
    "supplierAdvanceApplicationValue" in result
      ? Number(result.supplierAdvanceApplicationValue)
      : 0;

  const openingPayments =
    "openingPayments" in result
      ? Number(result.openingPayments)
      : 0;

  const openingPaymentValue =
    "openingPaymentValue" in result
      ? Number(result.openingPaymentValue)
      : 0;

  const draftReceiptAllocations =
    "draftReceiptAllocations" in result
      ? Number(result.draftReceiptAllocations)
      : 0;

  const draftReceiptAllocationValue =
    "draftReceiptAllocationValue" in result
      ? Number(result.draftReceiptAllocationValue)
      : 0;

  redirect(
    `/admin/accounts/general-ledger/test?historicalArAp=success&salesOrders=${salesOrders}&salesOrderValue=${salesOrderValue}&historicalReceipts=${historicalReceipts}&historicalReceiptArValue=${historicalReceiptArValue}&historicalSupplierPayments=${historicalSupplierPayments}&historicalSupplierPaymentApValue=${historicalSupplierPaymentApValue}&supplierAdvanceApplications=${supplierAdvanceApplications}&supplierAdvanceApplicationValue=${supplierAdvanceApplicationValue}&openingPayments=${openingPayments}&openingPaymentValue=${openingPaymentValue}&draftReceiptAllocations=${draftReceiptAllocations}&draftReceiptAllocationValue=${draftReceiptAllocationValue}`,
  );
}
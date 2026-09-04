import Link from "next/link";
import { ArrowLeft, Scale } from "lucide-react";

import OpeningBalanceForms from "@/components/admin/accounts/opening-balances/OpeningBalanceForms";
import OpeningBalanceRegister from "@/components/admin/accounts/opening-balances/OpeningBalanceRegister";
import {
  getCustomerOpeningBalances,
  getSupplierOpeningBalances,
} from "@/lib/repositories/opening-balance.repository";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getCustomerLookupOptions } from "@/lib/repositories/customer.repository";
import { getActiveSupplierOptions } from "@/lib/repositories/supplier.repository";

import {
  cancelCustomerOpeningBalanceAction,
  cancelSupplierOpeningBalanceAction,
  postCustomerOpeningBalanceAction,
  postSupplierOpeningBalanceAction,
} from "./actions";

interface OpeningBalancesPageProps {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
}

export default async function OpeningBalancesPage({
  searchParams,
}: OpeningBalancesPageProps) {
  await requireAdmin();

  const [
    customers,
    suppliers,
    customerOpeningBalances,
    supplierOpeningBalances,
    messages,
  ] = await Promise.all([
    getCustomerLookupOptions(),
    getActiveSupplierOptions(),
    getCustomerOpeningBalances(),
    getSupplierOpeningBalances(),
    searchParams,
  ]);

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/admin/accounts"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Accounts & Reports
        </Link>

        <div className="mt-4 flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Scale className="size-5" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Opening Balances
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Enter customer receivables and supplier payables that existed
              before ERP go-live.
            </p>
          </div>
        </div>
      </header>

      {messages.success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {messages.success}
        </div>
      ) : null}

      {messages.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {messages.error}
        </div>
      ) : null}

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <strong>Production opening date: 01 September 2026.</strong> Use this
        workspace only for amounts already outstanding before ERP operations
        began. Do not use Sales Orders, Quick Sales, Quick Purchases, or
        Purchase Orders to recreate historical opening balances.
      </div>

      <OpeningBalanceForms
        customers={customers}
        suppliers={suppliers}
        customerAction={postCustomerOpeningBalanceAction}
        supplierAction={postSupplierOpeningBalanceAction}
      />
      <OpeningBalanceRegister
        customers={customerOpeningBalances}
        suppliers={supplierOpeningBalances}
        customerCancelAction={cancelCustomerOpeningBalanceAction}
        supplierCancelAction={cancelSupplierOpeningBalanceAction}
      />
    </div>
  );
}

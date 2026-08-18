import { ArrowLeft, ReceiptText } from "lucide-react";

import Link from "next/link";

import NewCustomerReceiptForm from "@/components/admin/sales/receipts/NewCustomerReceiptForm";

import { requireAdmin } from "@/lib/auth/require-admin";

import { getCustomerLookupOptions } from "@/lib/repositories/customer.repository";
import { getFinancialAccounts } from "@/lib/repositories/financial-account.repository";

export default async function NewCustomerReceiptPage() {
  await requireAdmin();

  const [customers, financialAccounts] = await Promise.all([
    getCustomerLookupOptions(),
    getFinancialAccounts(),
  ]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div>
        <Link
          href="/admin/sales/receipts"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Customer Receipts
        </Link>

        <div className="mt-4 flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <ReceiptText className="size-5" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              New Customer Receipt
            </h1>

            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Receive customer money and allocate it against one or more
              outstanding sales orders.
            </p>
          </div>
        </div>
      </div>

      <NewCustomerReceiptForm
        customers={customers.map((customer) => ({
          id: customer.id,

          customerNumber: customer.customer_number,

          displayName: customer.display_name,

          companyName: customer.company_name,
        }))}

        financialAccounts={financialAccounts
          .filter((account) => account.isActive)
          .map((account) => ({
            id: account.id,

            accountName: account.accountName,

            accountCode: account.accountCode,

            accountType: account.accountType,

            currencyCode: account.currencyCode,

            currentBalance: account.currentBalance,
          }))}
      />
    </div>
  );
}

import { ArrowLeft, ArrowRightLeft } from "lucide-react";

import Link from "next/link";

import FinancialTransferForm from "@/components/admin/accounts/FinancialTransferForm";

import { getFinancialAccounts } from "@/lib/repositories/financial-account.repository";

export default async function NewFinancialTransferPage() {
  const accounts = (await getFinancialAccounts()).filter(
    (account) => account.isActive,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/admin/accounts/transfers"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Financial Transfers
      </Link>

      <section>
        <div className="flex items-start gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <ArrowRightLeft className="size-5" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Transfer Funds
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Move money between financial accounts without affecting business
              profit.
            </p>
          </div>
        </div>
      </section>

      <FinancialTransferForm
        accounts={accounts.map((account) => ({
          id: account.id,

          accountName: account.accountName,

          currencyCode: account.currencyCode,

          currentBalance: account.currentBalance,
        }))}
      />
    </div>
  );
}

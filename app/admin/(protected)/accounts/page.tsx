import Link from "next/link";

import {
  ArrowRight,
  Banknote,
  ChartNoAxesCombined,
  HandCoins,
  Landmark,
  ReceiptText,
  WalletCards,
} from "lucide-react";

import {
  getFinancialAccounts,
  getFinancialAccountSummary,
  getRecentAccountTransactions,
} from "@/lib/repositories/financial-account.repository";

function money(value: number) {
  return new Intl.NumberFormat("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function AccountsDashboardPage() {
  const [accounts, summary, transactions] = await Promise.all([
    getFinancialAccounts(),
    getFinancialAccountSummary(),
    getRecentAccountTransactions(10),
  ]);

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium text-amber-600">
          Finance & Accounting
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Accounts Dashboard
        </h1>

        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Monitor cash flow, financial accounts, expenses, profitability,
          receivables, payables and financial risk.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Funds"
          value={summary.totalBalance}
          icon={WalletCards}
        />

        <SummaryCard
          label="Cash in Hand"
          value={summary.cashBalance}
          icon={Banknote}
        />

        <SummaryCard
          label="Bank Balance"
          value={summary.bankBalance}
          icon={Landmark}
        />

        <SummaryCard
          label="Card / Other"
          value={summary.cardBalance + summary.otherBalance}
          icon={WalletCards}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Total Money In</p>

          <p className="mt-2 text-2xl font-semibold text-emerald-700">
            AED {money(summary.moneyIn)}
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Total Money Out</p>

          <p className="mt-2 text-2xl font-semibold text-red-700">
            AED {money(summary.moneyOut)}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-semibold">Financial Accounts</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Cash, bank, card and clearing accounts.
            </p>
          </div>

          <Link
            href="/admin/accounts/cash-bank"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
          >
            View All
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => (
            <Link
              key={account.id}
              href={`/admin/accounts/cash-bank/${account.id}`}
              className="rounded-xl border p-4 transition hover:bg-muted/30"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">{account.accountName}</p>

                  <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                    {account.accountType}
                    {" · "}
                    {account.accountCode}
                  </p>
                </div>

                {account.isDefault ? (
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                    Default
                  </span>
                ) : null}
              </div>

              <p className="mt-4 text-2xl font-bold">
                {account.currencyCode} {money(account.currentBalance)}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-semibold">Recent Money Movements</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Latest posted and cancelled financial account transactions.
            </p>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-muted-foreground">
            No account transactions yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Date</th>

                  <th className="px-4 py-3">Transaction</th>

                  <th className="px-4 py-3">Account</th>

                  <th className="px-4 py-3">Source</th>

                  <th className="px-4 py-3 text-right">Money In</th>

                  <th className="px-4 py-3 text-right">Money Out</th>

                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="px-4 py-4">{transaction.transactionDate}</td>

                    <td className="px-4 py-4 font-semibold">
                      {transaction.transactionNumber}
                    </td>

                    <td className="px-4 py-4">{transaction.accountName}</td>

                    <td className="px-4 py-4">
                      <p className="capitalize">
                        {transaction.transactionType.replaceAll("_", " ")}
                      </p>

                      {transaction.referenceNumber ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {transaction.referenceNumber}
                        </p>
                      ) : null}
                    </td>

                    <td className="px-4 py-4 text-right font-semibold text-emerald-700">
                      {transaction.direction === "in"
                        ? `AED ${money(transaction.amount)}`
                        : "—"}
                    </td>

                    <td className="px-4 py-4 text-right font-semibold text-red-700">
                      {transaction.direction === "out"
                        ? `AED ${money(transaction.amount)}`
                        : "—"}
                    </td>

                    <td className="px-4 py-4 capitalize">
                      {transaction.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Link
          href="/admin/accounts/cash-bank"
          className="group rounded-2xl border bg-card p-5 transition hover:border-amber-300 hover:bg-amber-50/40"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition group-hover:bg-amber-100 group-hover:text-amber-700">
              <Landmark className="size-5" />
            </div>

            <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-amber-700" />
          </div>

          <p className="mt-4 font-semibold">Cash &amp; Bank Ledger</p>

          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Review financial accounts and all money movements.
          </p>
        </Link>

        <Link
          href="/admin/accounts/expenses"
          className="group rounded-2xl border bg-card p-5 transition hover:border-amber-300 hover:bg-amber-50/40"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex size-11 items-center justify-center rounded-xl bg-red-50 text-red-700">
              <ReceiptText className="size-5" />
            </div>

            <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-amber-700" />
          </div>

          <p className="mt-4 font-semibold">Expense Ledger</p>

          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Record operating and direct expenses.
          </p>
        </Link>

        <Link
          href="/admin/accounts/profitability"
          className="group rounded-2xl border bg-card p-5 transition hover:border-emerald-300 hover:bg-emerald-50/40"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <ChartNoAxesCombined className="size-5" />
            </div>

            <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-emerald-700" />
          </div>

          <p className="mt-4 font-semibold">Profitability Intelligence</p>

          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Analyze revenue, COGS, gross profit, expenses and business
            profitability.
          </p>
        </Link>

        <Link
          href="/admin/accounts/receivables-payables"
          className="group rounded-2xl border bg-card p-5 transition hover:border-blue-300 hover:bg-blue-50/40"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <HandCoins className="size-5" />
            </div>

            <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-blue-700" />
          </div>

          <p className="mt-4 font-semibold">Receivables &amp; Payables</p>

          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Monitor customer dues, supplier liabilities, aging, advances and
            credit risk.
          </p>
        </Link>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;

  value: number;

  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>

          <p className="mt-2 text-2xl font-semibold">AED {money(value)}</p>
        </div>

        <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

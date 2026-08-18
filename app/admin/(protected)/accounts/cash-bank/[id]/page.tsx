import { ArrowLeft, Landmark } from "lucide-react";

import Link from "next/link";

import { notFound } from "next/navigation";

import {
  getAccountTransactions,
  getFinancialAccountById,
} from "@/lib/repositories/financial-account.repository";

import { postOpeningBalanceAction } from "./actions";

interface AccountLedgerPageProps {
  params: Promise<{
    id: string;
  }>;
}

function money(value: number) {
  return new Intl.NumberFormat("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function AccountLedgerPage({
  params,
}: AccountLedgerPageProps) {
  const { id } = await params;

  const [account, transactions] = await Promise.all([
    getFinancialAccountById(id),

    getAccountTransactions(id),
  ]);

  if (!account) {
    notFound();
  }

  const posted = transactions.filter(
    (transaction) => transaction.status === "posted",
  );

  const moneyIn = posted
    .filter((transaction) => transaction.direction === "in")
    .reduce((total, transaction) => total + transaction.amount, 0);

  const moneyOut = posted
    .filter((transaction) => transaction.direction === "out")
    .reduce((total, transaction) => total + transaction.amount, 0);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/accounts/cash-bank"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Cash & Bank
      </Link>

      <section className="rounded-2xl border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="flex size-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Landmark className="size-5" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold">{account.accountName}</h1>

            <p className="mt-1 text-sm text-muted-foreground">
              {account.accountCode}
              {" · "}
              {account.accountType}
              {" · "}
              {account.currencyCode}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Opening Balance" value={account.openingBalance} />

        <Metric label="Money In" value={moneyIn} />

        <Metric label="Money Out" value={moneyOut} />

        <Metric label="Current Balance" value={account.currentBalance} strong />
      </section>
      {account.openingBalance === 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="font-semibold">Set Opening Balance</h2>

          <p className="mt-1 text-sm text-amber-900/70">
            Enter the amount this account already held before transactions began
            in the ERP.
          </p>

          <form
            action={postOpeningBalanceAction}
            className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          >
            <input type="hidden" name="accountId" value={account.id} />

            <label className="space-y-2">
              <span className="text-sm font-medium">Date</span>

              <input
                type="date"
                name="transactionDate"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
                className="h-11 w-full rounded-lg border bg-white px-3 text-sm"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium">Opening Balance</span>

              <input
                type="number"
                name="amount"
                step="0.01"
                required
                placeholder="5000.00"
                className="h-11 w-full rounded-lg border bg-white px-3 text-sm"
              />
            </label>

            <label className="space-y-2 xl:col-span-2">
              <span className="text-sm font-medium">Description</span>

              <input
                name="description"
                placeholder="Initial cash balance"
                className="h-11 w-full rounded-lg border bg-white px-3 text-sm"
              />
            </label>

            <div className="md:col-span-2 xl:col-span-4">
              <button
                type="submit"
                className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Post Opening Balance
              </button>
            </div>
          </form>
        </section>
      ) : null}
      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Account Ledger</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Complete transaction history for this account.
          </p>
        </div>

        {transactions.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            No transactions for this account.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Date</th>

                  <th className="px-4 py-3">Transaction</th>

                  <th className="px-4 py-3">Type</th>

                  <th className="px-4 py-3">Description</th>

                  <th className="px-4 py-3 text-right">In</th>

                  <th className="px-4 py-3 text-right">Out</th>

                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className={
                      transaction.status === "cancelled" ? "opacity-50" : ""
                    }
                  >
                    <td className="px-4 py-4">{transaction.transactionDate}</td>

                    <td className="px-4 py-4 font-semibold">
                      {transaction.transactionNumber}

                      {transaction.referenceNumber ? (
                        <p className="mt-1 text-xs font-normal text-muted-foreground">
                          {transaction.referenceNumber}
                        </p>
                      ) : null}
                    </td>

                    <td className="px-4 py-4 capitalize">
                      {transaction.transactionType.replaceAll("_", " ")}
                    </td>

                    <td className="px-4 py-4 text-muted-foreground">
                      {transaction.description ?? "—"}
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
    </div>
  );
}

function Metric({
  label,
  value,
  strong,
}: {
  label: string;

  value: number;

  strong?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>

      <p
        className={[
          "mt-2 text-2xl",
          strong ? "font-bold" : "font-semibold",
        ].join(" ")}
      >
        AED {money(value)}
      </p>
    </div>
  );
}

import Link from "next/link";

import {
  ArrowRight,
  Landmark,
} from "lucide-react";

import {
  getFinancialAccounts,
  getFinancialAccountSummary,
  getRecentAccountTransactions,
} from "@/lib/repositories/financial-account.repository";


function money(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-AE",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(value);
}


export default async function CashBankPage() {
  const [
    accounts,
    summary,
    transactions,
  ] =
    await Promise.all([
      getFinancialAccounts(),

      getFinancialAccountSummary(),

      getRecentAccountTransactions(
        100,
      ),
    ]);


  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-amber-600">
          Accounts
        </p>

        <h1 className="mt-1 text-2xl font-semibold">
          Cash & Bank
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Current financial-account balances and operational money movements.
        </p>
      </div>


      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Total Balance"
          value={
            summary.totalBalance
          }
        />

        <Metric
          label="Money In"
          value={
            summary.moneyIn
          }
        />

        <Metric
          label="Money Out"
          value={
            summary.moneyOut
          }
        />

        <Metric
          label="Transactions"
          value={
            summary.postedTransactionCount
          }
          money={false}
        />
      </section>


      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {accounts.map(
          (
            account,
          ) => (
            <Link
              key={
                account.id
              }
              href={`/admin/accounts/cash-bank/${account.id}`}
              className="rounded-2xl border bg-card p-5 transition hover:border-amber-200 hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">
                    {
                      account.accountName
                    }
                  </p>

                  <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                    {
                      account.accountType
                    }
                    {" · "}
                    {
                      account.accountCode
                    }
                  </p>
                </div>

                <Landmark className="size-5 text-muted-foreground" />
              </div>

              <p className="mt-5 text-2xl font-bold">
                {
                  account.currencyCode
                }{" "}
                {money(
                  account.currentBalance,
                )}
              </p>

              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Opening:{" "}
                  {
                    account.currencyCode
                  }{" "}
                  {money(
                    account.openingBalance,
                  )}
                </span>

                <ArrowRight className="size-4" />
              </div>
            </Link>
          ),
        )}
      </section>


      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">
            Account Transactions
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Latest money-in and money-out movements across all financial accounts.
          </p>
        </div>

        {transactions.length ===
        0 ? (
          <div className="px-6 py-16 text-center text-muted-foreground">
            No account transactions.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">
                    Date
                  </th>

                  <th className="px-4 py-3">
                    Transaction
                  </th>

                  <th className="px-4 py-3">
                    Account
                  </th>

                  <th className="px-4 py-3">
                    Type
                  </th>

                  <th className="px-4 py-3">
                    Reference
                  </th>

                  <th className="px-4 py-3 text-right">
                    In
                  </th>

                  <th className="px-4 py-3 text-right">
                    Out
                  </th>

                  <th className="px-4 py-3">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {transactions.map(
                  (
                    transaction,
                  ) => (
                    <tr
                      key={
                        transaction.id
                      }
                    >
                      <td className="px-4 py-4">
                        {
                          transaction.transactionDate
                        }
                      </td>

                      <td className="px-4 py-4 font-semibold">
                        {
                          transaction.transactionNumber
                        }
                      </td>

                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/accounts/cash-bank/${transaction.accountId}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {
                            transaction.accountName
                          }
                        </Link>
                      </td>

                      <td className="px-4 py-4 capitalize">
                        {
                          transaction.transactionType.replaceAll(
                            "_",
                            " ",
                          )
                        }
                      </td>

                      <td className="px-4 py-4 text-muted-foreground">
                        {
                          transaction.referenceNumber ??
                          "—"
                        }
                      </td>

                      <td className="px-4 py-4 text-right font-semibold text-emerald-700">
                        {transaction.direction ===
                        "in"
                          ? `AED ${money(
                              transaction.amount,
                            )}`
                          : "—"}
                      </td>

                      <td className="px-4 py-4 text-right font-semibold text-red-700">
                        {transaction.direction ===
                        "out"
                          ? `AED ${money(
                              transaction.amount,
                            )}`
                          : "—"}
                      </td>

                      <td className="px-4 py-4 capitalize">
                        {
                          transaction.status
                        }
                      </td>
                    </tr>
                  ),
                )}
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
  money:
    showMoney = true,
}: {
  label: string;

  value: number;

  money?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold">
        {showMoney
          ? `AED ${money(
              value,
            )}`
          : value}
      </p>
    </div>
  );
}
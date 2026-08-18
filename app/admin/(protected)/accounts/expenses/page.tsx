import {
  Plus,
  ReceiptText,
} from "lucide-react";

import Link from "next/link";

import {
  getExpensePage,
  getExpenseSummary,
} from "@/lib/repositories/expense.repository";


export default async function ExpensesPage() {
  const [
    result,
    summary,
  ] =
    await Promise.all([
      getExpensePage({
        page: 1,
        pageSize: 100,
      }),

      getExpenseSummary(),
    ]);


  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-amber-600">
            Accounts
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Expense Ledger
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Track operating, direct and financial expenses with VAT and cash/bank posting.
          </p>
        </div>

        <Link
          href="/admin/accounts/expenses/new"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white"
        >
          <Plus className="size-4" />

          New Expense
        </Link>
      </div>


      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Posted Expenses"
          value={
            summary.totalGrossAmount
          }
        />

        <SummaryCard
          label="Net Expense"
          value={
            summary.totalNetAmount
          }
        />

        <SummaryCard
          label="Recoverable VAT"
          value={
            summary.totalRecoverableTax
          }
        />

        <SummaryCard
          label="VAT Pending"
          value={
            summary.totalPendingTax
          }
        />
      </div>


      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-5 py-4">
          <p className="text-sm text-muted-foreground">
            {result.count} expense
            {result.count === 1
              ? ""
              : "s"}
          </p>
        </div>

        {result.data.length ===
        0 ? (
          <div className="px-6 py-16 text-center">
            <ReceiptText className="mx-auto size-9 text-muted-foreground" />

            <p className="mt-3 font-medium">
              No expenses yet
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">
                    Date
                  </th>

                  <th className="px-4 py-3">
                    Expense
                  </th>

                  <th className="px-4 py-3">
                    Category
                  </th>

                  <th className="px-4 py-3">
                    Payee
                  </th>

                  <th className="px-4 py-3">
                    Paid From
                  </th>

                  <th className="px-4 py-3 text-right">
                    Net
                  </th>

                  <th className="px-4 py-3 text-right">
                    VAT
                  </th>

                  <th className="px-4 py-3 text-right">
                    Total
                  </th>

                  <th className="px-4 py-3">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {result.data.map(
                  (
                    expense,
                  ) => (
                    <tr
                      key={
                        expense.id
                      }
                      className="hover:bg-muted/30"
                    >
                      <td className="px-4 py-4">
                        {
                          expense.expenseDate
                        }
                      </td>

                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/accounts/expenses/${expense.id}`}
                          className="font-semibold text-primary hover:underline"
                        >
                          {
                            expense.expenseNumber
                          }
                        </Link>
                      </td>

                      <td className="px-4 py-4">
                        {
                          expense.categoryName
                        }
                      </td>

                      <td className="px-4 py-4 text-muted-foreground">
                        {
                          expense.payeeName ||
                          expense.supplierName ||
                          "—"
                        }
                      </td>

                      <td className="px-4 py-4">
                        {
                          expense.financialAccountName ??
                          "—"
                        }
                      </td>

                      <td className="px-4 py-4 text-right">
                        AED{" "}
                        {money(
                          expense.netAmount,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right">
                        AED{" "}
                        {money(
                          expense.taxAmount,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right font-semibold">
                        AED{" "}
                        {money(
                          expense.grossAmount,
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <span className="capitalize">
                          {
                            expense.status
                          }
                        </span>
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


function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold">
        AED{" "}
        {money(
          value,
        )}
      </p>
    </div>
  );
}


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
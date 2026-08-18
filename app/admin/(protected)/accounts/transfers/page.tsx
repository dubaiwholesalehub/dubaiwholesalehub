import Link from "next/link";

import {
  ArrowRightLeft,
  Plus,
} from "lucide-react";

import {
  getFinancialTransfers,
} from "@/lib/repositories/financial-transfer.repository";


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


export default async function FinancialTransfersPage() {
  const transfers =
    await getFinancialTransfers();


  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-amber-600">
            Accounts
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Financial Transfers
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Move funds between Cash, Bank and other financial accounts without affecting business profit.
          </p>
        </div>

        <Link
          href="/admin/accounts/transfers/new"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white"
        >
          <Plus className="size-4" />

          Transfer Funds
        </Link>
      </div>


      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b px-5 py-4">
          <p className="text-sm text-muted-foreground">
            {transfers.length} transfer
            {transfers.length === 1
              ? ""
              : "s"}
          </p>
        </div>


        {transfers.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <ArrowRightLeft className="mx-auto size-9 text-muted-foreground" />

            <p className="mt-3 font-medium">
              No financial transfers yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">
                    Date
                  </th>

                  <th className="px-4 py-3">
                    Transfer
                  </th>

                  <th className="px-4 py-3">
                    From
                  </th>

                  <th className="px-4 py-3">
                    To
                  </th>

                  <th className="px-4 py-3 text-right">
                    Out
                  </th>

                  <th className="px-4 py-3 text-right">
                    In
                  </th>

                  <th className="px-4 py-3">
                    Reference
                  </th>

                  <th className="px-4 py-3">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {transfers.map(
                  (
                    transfer,
                  ) => (
                    <tr
                      key={
                        transfer.id
                      }
                      className={
                        transfer.status ===
                        "cancelled"
                          ? "opacity-50"
                          : ""
                      }
                    >
                      <td className="px-4 py-4">
                        {
                          transfer.transferDate
                        }
                      </td>

                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/accounts/transfers/${transfer.id}`}
                          className="font-semibold text-primary hover:underline"
                        >
                          {
                            transfer.transferNumber
                          }
                        </Link>
                      </td>

                      <td className="px-4 py-4">
                        {
                          transfer.fromAccountName
                        }
                      </td>

                      <td className="px-4 py-4">
                        {
                          transfer.toAccountName
                        }
                      </td>

                      <td className="px-4 py-4 text-right font-semibold text-red-700">
                        {
                          transfer.fromCurrencyCode
                        }{" "}
                        {money(
                          transfer.fromAmount,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right font-semibold text-emerald-700">
                        {
                          transfer.toCurrencyCode
                        }{" "}
                        {money(
                          transfer.toAmount,
                        )}
                      </td>

                      <td className="px-4 py-4 text-muted-foreground">
                        {
                          transfer.referenceNumber ??
                          "—"
                        }
                      </td>

                      <td className="px-4 py-4 capitalize">
                        {
                          transfer.status
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
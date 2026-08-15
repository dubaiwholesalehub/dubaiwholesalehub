import Link from "next/link";

import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  BookOpenText,
  CalendarClock,
  CircleDollarSign,
  HandCoins,
  ReceiptText,
  ShoppingBag,
  WalletCards,
} from "lucide-react";

import type {
  PayablesDashboard,
} from "@/lib/purchasing/payables-dashboard.repository";


interface PayablesDashboardSectionProps {
  payables:
    PayablesDashboard;
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


export default function PayablesDashboardSection({
  payables,
}: PayablesDashboardSectionProps) {
  return (
    <section className="space-y-6">
      {/* ===================================================
       * Section Header
       * =================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-violet-600">
            Accounts Payable
          </p>

          <h2 className="mt-1 text-xl font-semibold text-neutral-950">
            Supplier Payables Overview
          </h2>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-600">
            Monitor outstanding supplier balances, advances, payments,
            VAT documentation and payable aging.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/purchasing/supplier-payments/new"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 transition hover:border-violet-200 hover:text-violet-700"
          >
            <HandCoins className="size-4" />

            Supplier Payment
          </Link>

          <Link
            href="/admin/purchasing/supplier-statement"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            <BookOpenText className="size-4" />

            Supplier Statement
          </Link>
        </div>
      </div>


      {/* ===================================================
       * Main Payables KPIs
       * =================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PayablesMetric
          title="Outstanding Payables"
          value={`AED ${money(
            payables.totalOutstanding,
          )}`}
          description={`${payables.suppliersWithBalance} supplier${
            payables.suppliersWithBalance === 1
              ? ""
              : "s"
          } with payable balances.`}
          icon={CircleDollarSign}
          href="/admin/purchasing/supplier-statement"
        />

        <PayablesMetric
          title="Supplier Advances"
          value={`AED ${money(
            payables.totalSupplierAdvances,
          )}`}
          description={`${payables.suppliersWithAdvance} supplier${
            payables.suppliersWithAdvance === 1
              ? ""
              : "s"
          } with available advance.`}
          icon={WalletCards}
          href="/admin/purchasing/supplier-payments"
        />

        <PayablesMetric
          title="Net Payable"
          value={
            payables.netPayable >= 0
              ? `AED ${money(
                  payables.netPayable,
                )}`
              : `Advance AED ${money(
                  Math.abs(
                    payables.netPayable,
                  ),
                )}`
          }
          description="Outstanding purchases less unallocated supplier advances."
          icon={Banknote}
          href="/admin/purchasing/supplier-statement"
        />

        <PayablesMetric
          title="Pending VAT Documents"
          value={`AED ${money(
            payables.pendingVatDocumentation,
          )}`}
          description="VAT currently held pending supplier documentation."
          icon={ReceiptText}
          href="/admin/purchasing/quick-purchase"
          warning={
            payables.pendingVatDocumentation >
            0
          }
        />
      </div>


      {/* ===================================================
       * Monthly Movement
       * =================================================== */}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-neutral-500">
                Quick Purchases This Month
              </p>

              <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
                AED{" "}
                {money(
                  payables.purchasesThisMonth,
                )}
              </p>

              <p className="mt-1 text-xs text-neutral-500">
                Posted Quick Purchase value.
              </p>
            </div>

            <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <ShoppingBag className="size-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-neutral-500">
                Supplier Payments This Month
              </p>

              <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
                AED{" "}
                {money(
                  payables.paymentsThisMonth,
                )}
              </p>

              <p className="mt-1 text-xs text-neutral-500">
                Posted Supplier Payment value.
              </p>
            </div>

            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <HandCoins className="size-5" />
            </div>
          </div>
        </div>
      </div>


      {/* ===================================================
       * Aging
       * =================================================== */}

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <CalendarClock className="size-5" />
            </div>

            <div>
              <h3 className="font-semibold text-neutral-950">
                Payables Aging
              </h3>

              <p className="mt-1 text-sm text-neutral-500">
                Current Quick Purchase balances grouped by age.
              </p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-5">
          <AgingCell
            label="Current"
            description="Today"
            amount={
              payables.aging.current
            }
          />

          <AgingCell
            label="1–30 Days"
            description="Recent balance"
            amount={
              payables.aging.days1To30
            }
          />

          <AgingCell
            label="31–60 Days"
            description="Needs attention"
            amount={
              payables.aging.days31To60
            }
            attention
          />

          <AgingCell
            label="61–90 Days"
            description="Older balance"
            amount={
              payables.aging.days61To90
            }
            attention
          />

          <AgingCell
            label="90+ Days"
            description="Oldest balance"
            amount={
              payables.aging.days90Plus
            }
            attention
          />
        </div>

        <div className="border-t border-neutral-100 bg-neutral-50 px-5 py-3 text-xs leading-5 text-neutral-500">
          Aging currently uses Quick Purchase date because supplier due dates
          and credit terms are not yet stored. We can upgrade this later to
          due-date-based aging.
        </div>
      </div>


      {/* ===================================================
       * Supplier Balances
       * =================================================== */}

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-neutral-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-neutral-950">
              Supplier Balances
            </h3>

            <p className="mt-1 text-sm text-neutral-500">
              Outstanding purchases, available advances and net supplier position.
            </p>
          </div>

          <Link
            href="/admin/purchasing/supplier-statement"
            className="inline-flex items-center gap-1 text-sm font-semibold text-violet-600 hover:text-violet-700"
          >
            Full Supplier Statement

            <ArrowRight className="size-4" />
          </Link>
        </div>


        {payables.suppliers.length ===
        0 ? (
          <div className="px-6 py-14 text-center">
            <CircleDollarSign className="mx-auto size-9 text-neutral-300" />

            <p className="mt-3 font-medium text-neutral-900">
              No supplier balances
            </p>

            <p className="mt-1 text-sm text-neutral-500">
              There are currently no outstanding Quick Purchases or supplier advances.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
              <thead className="border-b border-neutral-100 bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-5 py-3">
                    Supplier
                  </th>

                  <th className="px-4 py-3 text-right">
                    Outstanding
                  </th>

                  <th className="px-4 py-3 text-right">
                    Advance
                  </th>

                  <th className="px-4 py-3 text-right">
                    Net Payable
                  </th>

                  <th className="px-4 py-3 text-right">
                    31+ Days
                  </th>

                  <th className="px-4 py-3 text-right">
                    Pending VAT
                  </th>

                  <th className="px-4 py-3">
                    Last Purchase
                  </th>

                  <th className="px-5 py-3 text-right">
                    Statement
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {payables.suppliers.map(
                  (
                    supplier,
                  ) => (
                    <tr
                      key={
                        supplier.supplierId
                      }
                      className="transition hover:bg-neutral-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-neutral-950">
                          {
                            supplier.supplierName
                          }
                        </p>
                      </td>

                      <td className="px-4 py-4 text-right font-medium text-neutral-900">
                        AED{" "}
                        {money(
                          supplier.outstandingPurchases,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {supplier.supplierAdvance >
                        0 ? (
                          <span className="font-semibold text-violet-700">
                            AED{" "}
                            {money(
                              supplier.supplierAdvance,
                            )}
                          </span>
                        ) : (
                          <span className="text-neutral-400">
                            —
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {supplier.netPayable >
                        0 ? (
                          <span className="font-bold text-amber-700">
                            AED{" "}
                            {money(
                              supplier.netPayable,
                            )}
                          </span>
                        ) : supplier.netPayable <
                          0 ? (
                          <span className="font-bold text-violet-700">
                            Advance AED{" "}
                            {money(
                              Math.abs(
                                supplier.netPayable,
                              ),
                            )}
                          </span>
                        ) : (
                          <span className="font-semibold text-emerald-700">
                            AED 0.00
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {supplier.overdueAmount >
                        0 ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-red-700">
                            <AlertTriangle className="size-3.5" />

                            AED{" "}
                            {money(
                              supplier.overdueAmount,
                            )}
                          </span>
                        ) : (
                          <span className="text-neutral-400">
                            —
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {supplier.pendingVatAmount >
                        0 ? (
                          <span className="font-semibold text-amber-700">
                            AED{" "}
                            {money(
                              supplier.pendingVatAmount,
                            )}
                          </span>
                        ) : (
                          <span className="text-neutral-400">
                            —
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-neutral-500">
                        {
                          supplier.lastPurchaseDate ??
                          "—"
                        }
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/admin/purchasing/supplier-statement?supplierId=${supplier.supplierId}`}
                          className="inline-flex items-center gap-1 font-semibold text-violet-600 hover:text-violet-700"
                        >
                          View

                          <ArrowRight className="size-4" />
                        </Link>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}


function PayablesMetric({
  title,
  value,
  description,
  icon: Icon,
  href,
  warning,
}: {
  title: string;

  value: string;

  description: string;

  icon:
    React.ElementType;

  href: string;

  warning?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-neutral-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
            {value}
          </p>

          <p className="mt-2 text-xs leading-5 text-neutral-500">
            {description}
          </p>
        </div>

        <div
          className={[
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            warning
              ? "bg-amber-50 text-amber-700"
              : "bg-violet-50 text-violet-700",
          ].join(" ")}
        >
          <Icon className="size-5" />
        </div>
      </div>
    </Link>
  );
}


function AgingCell({
  label,
  description,
  amount,
  attention,
}: {
  label: string;

  description: string;

  amount: number;

  attention?: boolean;
}) {
  return (
    <div className="border-b border-neutral-100 p-5 last:border-b-0 sm:border-r xl:border-b-0">
      <p className="text-sm font-semibold text-neutral-700">
        {label}
      </p>

      <p
        className={[
          "mt-2 text-xl font-bold",
          attention &&
          amount >
            0
            ? "text-amber-700"
            : "text-neutral-950",
        ].join(" ")}
      >
        AED{" "}
        {money(
          amount,
        )}
      </p>

      <p className="mt-1 text-xs text-neutral-500">
        {description}
      </p>
    </div>
  );
}
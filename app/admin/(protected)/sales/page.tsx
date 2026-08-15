import Link from "next/link";

import {
  ArrowRight,
  Banknote,
  BookOpenText,
  CalendarClock,
  CircleDollarSign,
  HandCoins,
  ReceiptText,
  ShoppingCart,
  Users,
  WalletCards,
  Zap,
} from "lucide-react";

import { requireAdmin } from "@/lib/auth/require-admin";

import { getReceivablesDashboard } from "@/lib/sales/receivables-dashboard.repository";

function money(value: number) {
  return new Intl.NumberFormat("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function SalesDashboardPage() {
  await requireAdmin();

  const receivables = await getReceivablesDashboard();

  return (
    <div className="space-y-8">
      {/* ===================================================
       * Header
       * =================================================== */}

      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-600">Sales Management</p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">
            Sales Dashboard
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
            Monitor customer receivables, advances, receipts, sales activity and
            aging.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/sales/quick-sale"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 transition hover:border-blue-200 hover:text-blue-600"
          >
            <Zap className="size-4" />
            Quick Sale
          </Link>

          <Link
            href="/admin/sales/receipts/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <HandCoins className="size-4" />
            Customer Receipt
          </Link>
        </div>
      </section>

      {/* ===================================================
       * Main AR KPIs
       * =================================================== */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Customer Receivables"
          value={`AED ${money(receivables.totalReceivables)}`}
          description={`${receivables.customersWithBalance} customer${
            receivables.customersWithBalance === 1 ? "" : "s"
          } with outstanding balances.`}
          icon={CircleDollarSign}
          href="/admin/sales/customer-statement"
        />

        <MetricCard
          title="Customer Advances"
          value={`AED ${money(receivables.totalCustomerAdvances)}`}
          description={`${receivables.customersWithAdvance} customer${
            receivables.customersWithAdvance === 1 ? "" : "s"
          } with available advance.`}
          icon={WalletCards}
          href="/admin/sales/receipts"
        />

        <MetricCard
          title="Net Receivable"
          value={
            receivables.netReceivable >= 0
              ? `AED ${money(receivables.netReceivable)}`
              : `Advance AED ${money(Math.abs(receivables.netReceivable))}`
          }
          description="Receivables less unallocated customer advances."
          icon={Banknote}
          href="/admin/sales/customer-statement"
        />

        <MetricCard
          title="Receipts This Month"
          value={`AED ${money(receivables.receiptsThisMonth)}`}
          description="Posted customer receipts in the current month."
          icon={ReceiptText}
          href="/admin/sales/receipts"
        />
      </section>

      {/* ===================================================
       * Monthly Sales
       * =================================================== */}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-neutral-500">
                Sales This Month
              </p>

              <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
                AED {money(receivables.salesThisMonth)}
              </p>

              <p className="mt-1 text-xs text-neutral-500">
                Non-draft, non-cancelled Sales Order value.
              </p>
            </div>

            <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <ShoppingCart className="size-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-neutral-500">
                Receipts This Month
              </p>

              <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
                AED {money(receivables.receiptsThisMonth)}
              </p>

              <p className="mt-1 text-xs text-neutral-500">
                Posted customer payments received this month.
              </p>
            </div>

            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <HandCoins className="size-5" />
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================
       * Aging
       * =================================================== */}

      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <CalendarClock className="size-5" />
            </div>

            <div>
              <h2 className="font-semibold text-neutral-950">
                Receivables Aging
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Outstanding Sales Order balances grouped by age.
              </p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-5">
          <AgingCell
            label="Current"
            description="Today"
            amount={receivables.aging.current}
          />

          <AgingCell
            label="1–30 Days"
            description="Recent balance"
            amount={receivables.aging.days1To30}
          />

          <AgingCell
            label="31–60 Days"
            description="Needs follow-up"
            amount={receivables.aging.days31To60}
            attention
          />

          <AgingCell
            label="61–90 Days"
            description="Older receivable"
            amount={receivables.aging.days61To90}
            attention
          />

          <AgingCell
            label="90+ Days"
            description="Oldest receivable"
            amount={receivables.aging.days90Plus}
            attention
          />
        </div>

        <div className="border-t border-neutral-100 bg-neutral-50 px-5 py-3 text-xs leading-5 text-neutral-500">
          Aging currently uses Sales Order date. Later we can upgrade this to
          payment-due-date aging using customer credit terms.
        </div>
      </section>

      {/* ===================================================
       * Customer Balances
       * =================================================== */}

      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-neutral-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-neutral-950">
              Customer Balances
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Outstanding receivables, customer advances and current net
              customer position.
            </p>
          </div>

          <Link
            href="/admin/sales/customer-statement"
            className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            Full Customer Statement
            <ArrowRight className="size-4" />
          </Link>
        </div>

        {receivables.customers.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Users className="mx-auto size-9 text-neutral-300" />

            <p className="mt-3 font-medium text-neutral-900">
              No customer balances
            </p>

            <p className="mt-1 text-sm text-neutral-500">
              There are currently no outstanding receivables or customer
              advances.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-sm">
              <thead className="border-b border-neutral-100 bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-5 py-3">Customer</th>

                  <th className="px-4 py-3 text-right">Receivable</th>

                  <th className="px-4 py-3 text-right">Advance</th>

                  <th className="px-4 py-3 text-right">Net Balance</th>

                  <th className="px-4 py-3 text-right">31+ Days</th>

                  <th className="px-4 py-3">Last Sale</th>

                  <th className="px-5 py-3 text-right">Statement</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {receivables.customers.map((customer) => (
                  <tr
                    key={customer.customerId}
                    className="transition hover:bg-neutral-50"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-neutral-950">
                        {customer.customerName}
                      </p>

                      {customer.customerNumber ? (
                        <p className="mt-1 text-xs text-neutral-500">
                          {customer.customerNumber}
                        </p>
                      ) : null}
                    </td>

                    <td className="px-4 py-4 text-right font-medium text-neutral-900">
                      AED {money(customer.receivable)}
                    </td>

                    <td className="px-4 py-4 text-right">
                      {customer.customerAdvance > 0 ? (
                        <span className="font-semibold text-violet-700">
                          AED {money(customer.customerAdvance)}
                        </span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>

                    <td className="px-4 py-4 text-right">
                      {customer.netReceivable > 0 ? (
                        <span className="font-bold text-amber-700">
                          AED {money(customer.netReceivable)}
                        </span>
                      ) : customer.netReceivable < 0 ? (
                        <span className="font-bold text-violet-700">
                          Advance AED {money(Math.abs(customer.netReceivable))}
                        </span>
                      ) : (
                        <span className="font-semibold text-emerald-700">
                          AED 0.00
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4 text-right">
                      {customer.overdueAmount > 0 ? (
                        <span className="font-semibold text-red-700">
                          AED {money(customer.overdueAmount)}
                        </span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>

                    <td className="px-4 py-4 text-neutral-500">
                      {customer.lastSaleDate ?? "—"}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/sales/customer-statement?customerId=${customer.customerId}`}
                        className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700"
                      >
                        View
                        <ArrowRight className="size-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ===================================================
       * Quick Actions
       * =================================================== */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <QuickAction
          href="/admin/sales/quick-sale"
          title="Quick Sale"
          description="Complete a fast sale."
          icon={Zap}
        />

        <QuickAction
          href="/admin/sales/orders"
          title="Sales Orders"
          description="View customer orders."
          icon={ShoppingCart}
        />

        <QuickAction
          href="/admin/sales/receipts"
          title="Customer Receipts"
          description="Review payment history."
          icon={ReceiptText}
        />

        <QuickAction
          href="/admin/sales/customer-statement"
          title="Customer Statement"
          description="Open receivables ledger."
          icon={BookOpenText}
        />
      </section>
    </div>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  href,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-neutral-500">{title}</p>

          <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
            {value}
          </p>

          <p className="mt-2 text-xs leading-5 text-neutral-500">
            {description}
          </p>
        </div>

        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
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
      <p className="text-sm font-semibold text-neutral-700">{label}</p>

      <p
        className={[
          "mt-2 text-xl font-bold",

          attention && amount > 0 ? "text-amber-700" : "text-neutral-950",
        ].join(" ")}
      >
        AED {money(amount)}
      </p>

      <p className="mt-1 text-xs text-neutral-500">{description}</p>
    </div>
  );
}

function QuickAction({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border bg-card p-5 transition hover:bg-muted/30"
    >
      <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-5" />
      </div>

      <p className="mt-4 font-semibold">{title}</p>

      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}

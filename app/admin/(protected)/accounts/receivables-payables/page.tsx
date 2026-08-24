import Link from "next/link";

import type { ComponentType } from "react";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BanknoteArrowDown,
  BanknoteArrowUp,
  CalendarClock,
  CircleDollarSign,
  HandCoins,
  Landmark,
  ReceiptText,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import {
  getReceivablesPayablesDashboard,
  type AgingSummary,
} from "@/lib/repositories/receivables-payables.repository";

/* =========================================================
 * Formatting
 * ========================================================= */

function money(value: number) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",

    currency: "AED",

    minimumFractionDigits: 2,

    maximumFractionDigits: 2,
  }).format(value);
}

function dateLabel(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-AE", {
    dateStyle: "medium",
  }).format(date);
}

function paymentMethodLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/* =========================================================
 * Main Page
 * ========================================================= */

export default async function ReceivablesPayablesPage() {
  const data = await getReceivablesPayablesDashboard();

  const {
    summary,
    receivableAging,
    payableAging,
    topDebtors,
    topCreditors,
    overdueReceivables,
    overduePayables,
    recentReceipts,
    recentSupplierPayments,
    risks,
  } = data;

  const netPositionPositive = summary.netTradePosition >= 0;

  return (
    <div className="space-y-6 pb-16">
      {/* ===================================================
       * Header
       * =================================================== */}

      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <HandCoins className="size-6" />
          </div>

          <div>
            <p className="text-sm font-medium text-blue-700">Accounts</p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Receivables &amp; Payables Intelligence
            </h1>

            <p className="mt-1 max-w-4xl text-sm leading-6 text-muted-foreground">
              Current customer receivables, supplier payables, aging, overdue
              exposure, advances, credit risk and collection/payment activity.
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Reference Date
          </p>

          <p className="mt-1 font-semibold">{dateLabel(data.referenceDate)}</p>
        </div>
      </section>

      {/* ===================================================
       * Executive Summary
       * =================================================== */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Receivables"
          value={money(summary.totalReceivables)}
          note={`${summary.openReceivableCount} open Sales Orders`}
          icon={BanknoteArrowDown}
          tone="positive"
        />

        <MetricCard
          label="Overdue Receivables"
          value={money(summary.overdueReceivables)}
          note={`${risks.customersWithOverdueBalance} customers overdue`}
          icon={CalendarClock}
          tone={summary.overdueReceivables > 0 ? "negative" : "neutral"}
        />

        <MetricCard
          label="Total Payables"
          value={money(summary.totalPayables)}
          note={`${summary.openPayableCount} open purchases`}
          icon={BanknoteArrowUp}
        />

        <MetricCard
          label="Overdue Payables"
          value={money(summary.overduePayables)}
          note={`${risks.suppliersWithOverdueBalance} suppliers overdue`}
          icon={CalendarClock}
          tone={summary.overduePayables > 0 ? "negative" : "neutral"}
        />

        <MetricCard
          label="Customer Advances"
          value={money(summary.customerAdvances)}
          note="Unallocated customer money"
          icon={ArrowDownRight}
        />

        <MetricCard
          label="Supplier Advances"
          value={money(summary.supplierAdvances)}
          note="Unallocated supplier payments"
          icon={ArrowUpRight}
        />

        <MetricCard
          label="Supplier Return Credits"
          value={money(summary.supplierReturnCredits)}
          note="Available credit from Supplier Returns"
          icon={ReceiptText}
          tone={summary.supplierReturnCredits > 0 ? "positive" : "neutral"}
        />

        <MetricCard
          label="Total Supplier Credits"
          value={money(summary.totalSupplierCredits)}
          note="Payment advances + return credits"
          icon={BanknoteArrowUp}
          tone={summary.totalSupplierCredits > 0 ? "positive" : "neutral"}
        />

        <MetricCard
          label="Collections — Last 30 Days"
          value={money(summary.collectionsLast30Days)}
          note="Posted customer receipts"
          icon={ReceiptText}
          tone="positive"
        />

        <MetricCard
          label="Supplier Payments — Last 30 Days"
          value={money(summary.supplierPaymentsLast30Days)}
          note="Posted supplier payments"
          icon={Landmark}
        />
      </section>

      {/* ===================================================
       * Net Trade Position
       * =================================================== */}

      <section
        className={
          netPositionPositive
            ? "rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
            : "rounded-2xl border border-amber-200 bg-amber-50 p-5"
        }
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold">Net Trade Position</p>

            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Net customer receivable exposure less net supplier payable
              exposure after available customer and supplier credits.
            </p>
          </div>

          <div className="text-right">
            <p
              className={
                netPositionPositive
                  ? "text-3xl font-bold text-emerald-700"
                  : "text-3xl font-bold text-amber-700"
              }
            >
              {money(summary.netTradePosition)}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              {netPositionPositive
                ? "Receivables exceed payables"
                : "Payables exceed receivables"}
            </p>
          </div>
        </div>
      </section>

      {/* ===================================================
       * Risk Monitor
       * =================================================== */}

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex items-center gap-3 border-b px-5 py-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <ShieldAlert className="size-4" />
          </div>

          <div>
            <h2 className="font-semibold">Credit &amp; Aging Risk Monitor</h2>

            <p className="mt-0.5 text-sm text-muted-foreground">
              Current risk indicators across customer and supplier balances.
            </p>
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-5">
          <RiskCard
            label="Customers Overdue"
            value={risks.customersWithOverdueBalance}
            danger={risks.customersWithOverdueBalance > 0}
          />

          <RiskCard
            label="Suppliers Overdue"
            value={risks.suppliersWithOverdueBalance}
            danger={risks.suppliersWithOverdueBalance > 0}
          />

          <RiskCard
            label="Customers Over Credit Limit"
            value={risks.customersOverCreditLimit}
            danger={risks.customersOverCreditLimit > 0}
          />

          <RiskCard
            label="Customer 90+ Days"
            value={risks.customers90Plus}
            danger={risks.customers90Plus > 0}
          />

          <RiskCard
            label="Supplier 90+ Days"
            value={risks.suppliers90Plus}
            danger={risks.suppliers90Plus > 0}
          />
        </div>

        <div className="grid gap-3 border-t p-5 md:grid-cols-2 xl:grid-cols-4">
          <RiskDetail
            label="Oldest Receivable"
            value={`${risks.oldestReceivableDays} days`}
            danger={risks.oldestReceivableDays > 30}
          />

          <RiskDetail
            label="Oldest Payable"
            value={`${risks.oldestPayableDays} days`}
            danger={risks.oldestPayableDays > 30}
          />

          <RiskDetail
            label="Receivable 90+ Exposure"
            value={money(risks.receivable90PlusAmount)}
            danger={risks.receivable90PlusAmount > 0}
          />

          <RiskDetail
            label="Payable 90+ Exposure"
            value={money(risks.payable90PlusAmount)}
            danger={risks.payable90PlusAmount > 0}
          />
        </div>
      </section>

      {/* ===================================================
       * Aging
       * =================================================== */}

      <section className="grid gap-6 xl:grid-cols-2">
        <AgingCard
          title="Receivable Aging"
          subtitle="Customer outstanding by due-date aging."
          aging={receivableAging}
          total={summary.totalReceivables}
          type="receivable"
        />

        <AgingCard
          title="Payable Aging"
          subtitle="Supplier outstanding by due-date aging."
          aging={payableAging}
          total={summary.totalPayables}
          type="payable"
        />
      </section>

      {/* ===================================================
       * Debtors / Creditors
       * =================================================== */}

      <section className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border bg-card">
          <SectionHeader
            icon={Users}
            title="Top Debtors"
            description="Customers ranked by current outstanding receivable."
          />

          {topDebtors.length === 0 ? (
            <EmptyState message="No customer receivables." />
          ) : (
            <div className="divide-y">
              {topDebtors.slice(0, 10).map((customer) => (
                <div key={customer.customerId} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{customer.customerName}</p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {customer.customerNumber ?? "No customer number"} ·{" "}
                        {customer.openOrderCount} open orders
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold">
                        {money(customer.totalReceivable)}
                      </p>

                      {customer.overdueAmount > 0 ? (
                        <p className="mt-1 text-xs font-semibold text-red-700">
                          {money(customer.overdueAmount)} overdue
                        </p>
                      ) : (
                        <p className="mt-1 text-xs font-semibold text-emerald-700">
                          Current
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    {customer.maximumDaysOverdue > 0 ? (
                      <span className="rounded-full bg-red-50 px-2 py-1 font-semibold text-red-700">
                        {customer.maximumDaysOverdue} days overdue
                      </span>
                    ) : null}

                    {customer.overCreditLimit ? (
                      <span className="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-800">
                        Over credit limit
                      </span>
                    ) : null}

                    {customer.customerAdvance > 0 ? (
                      <span className="rounded-full bg-violet-100 px-2 py-1 font-semibold text-violet-700">
                        Advance {money(customer.customerAdvance)}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border bg-card">
          <SectionHeader
            icon={CircleDollarSign}
            title="Top Creditors"
            description="Suppliers ranked by current outstanding payable."
          />

          {topCreditors.length === 0 ? (
            <EmptyState message="No supplier payables." />
          ) : (
            <div className="divide-y">
              {topCreditors.slice(0, 10).map((supplier) => (
                <Link
                  key={supplier.supplierId}
                  href={`/admin/purchasing/supplier-statement?supplierId=${supplier.supplierId}`}
                  className="block px-5 py-4 transition hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{supplier.supplierName}</p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {supplier.openPurchaseCount} open purchases ·{" "}
                        {supplier.paymentTermsDays === 0
                          ? "Due immediately"
                          : `${supplier.paymentTermsDays} day terms`}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold">
                        {money(supplier.totalPayable)}
                      </p>

                      {supplier.overdueAmount > 0 ? (
                        <p className="mt-1 text-xs font-semibold text-red-700">
                          {money(supplier.overdueAmount)} overdue
                        </p>
                      ) : (
                        <p className="mt-1 text-xs font-semibold text-emerald-700">
                          Current
                        </p>
                      )}
                    </div>
                  </div>

                  {supplier.totalSupplierCredit > 0 ? (
                    <div className="mt-2 space-y-1 text-xs">
                      {supplier.supplierAdvance > 0 ? (
                        <p className="font-medium text-violet-700">
                          Payment advance {money(supplier.supplierAdvance)}
                        </p>
                      ) : null}

                      {supplier.supplierReturnCredit > 0 ? (
                        <p className="font-medium text-emerald-700">
                          Supplier Return credit{" "}
                          {money(supplier.supplierReturnCredit)}
                        </p>
                      ) : null}

                      <p className="font-semibold text-muted-foreground">
                        Total credit {money(supplier.totalSupplierCredit)} · Net
                        exposure {money(supplier.netPayableExposure)}
                      </p>
                    </div>
                  ) : null}
                </Link>
              ))}
            </div>
          )}
        </section>
      </section>

      {/* ===================================================
       * Overdue Priority
       * =================================================== */}

      <section className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border bg-card">
          <SectionHeader
            icon={TrendingDown}
            title="Collection Priority"
            description="Most overdue customer Sales Orders."
          />

          {overdueReceivables.length === 0 ? (
            <EmptyState message="No overdue customer receivables." />
          ) : (
            <div className="divide-y">
              {overdueReceivables.slice(0, 10).map((order) => (
                <Link
                  key={order.salesOrderId}
                  href={`/admin/sales/orders/${order.salesOrderId}`}
                  className="block px-5 py-4 transition hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{order.orderNumber}</p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {order.customerName} · Due {dateLabel(order.dueDate)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-red-700">
                        {money(order.baseOutstandingAmount)}
                      </p>

                      <p className="mt-1 text-xs font-semibold text-red-600">
                        {order.daysOverdue} days overdue
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border bg-card">
          <SectionHeader
            icon={TrendingUp}
            title="Payment Priority"
            description="Most overdue supplier Quick Purchases."
          />

          {overduePayables.length === 0 ? (
            <EmptyState message="No overdue supplier payables." />
          ) : (
            <div className="divide-y">
              {overduePayables.slice(0, 10).map((purchase) => (
                <div key={purchase.quickPurchaseId} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{purchase.purchaseNumber}</p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {purchase.supplierName} · Due{" "}
                        {dateLabel(purchase.dueDate)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-red-700">
                        {money(purchase.baseOutstandingAmount)}
                      </p>

                      <p className="mt-1 text-xs font-semibold text-red-600">
                        {purchase.daysOverdue} days overdue
                      </p>
                    </div>
                  </div>

                  {purchase.supplierId ? (
                    <Link
                      href={`/admin/purchasing/supplier-statement?supplierId=${purchase.supplierId}`}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary"
                    >
                      Supplier statement
                      <ArrowRight className="size-3" />
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </section>

      {/* ===================================================
       * Recent Activity
       * =================================================== */}

      <section className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border bg-card">
          <SectionHeader
            icon={BanknoteArrowDown}
            title="Recent Collections"
            description="Latest posted customer receipts."
          />

          {recentReceipts.length === 0 ? (
            <EmptyState message="No customer receipts yet." />
          ) : (
            <div className="divide-y">
              {recentReceipts.slice(0, 10).map((receipt) => (
                <div key={receipt.receiptId} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{receipt.receiptNumber}</p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {receipt.customerName} ·{" "}
                        {paymentMethodLabel(receipt.paymentMethod)} ·{" "}
                        {dateLabel(receipt.receiptDate)}
                      </p>
                    </div>

                    <p className="font-bold text-emerald-700">
                      {money(receipt.baseAmount)}
                    </p>
                  </div>

                  {receipt.unallocatedAmount > 0 ? (
                    <p className="mt-2 text-xs font-medium text-violet-700">
                      Unallocated advance {money(receipt.unallocatedAmount)}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border bg-card">
          <SectionHeader
            icon={BanknoteArrowUp}
            title="Recent Supplier Payments"
            description="Latest posted supplier payments."
          />

          {recentSupplierPayments.length === 0 ? (
            <EmptyState message="No supplier payments yet." />
          ) : (
            <div className="divide-y">
              {recentSupplierPayments.slice(0, 10).map((payment) => (
                <Link
                  key={payment.paymentId}
                  href={`/admin/purchasing/supplier-statement?supplierId=${payment.supplierId}`}
                  className="block px-5 py-4 transition hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{payment.paymentNumber}</p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {payment.supplierName} ·{" "}
                        {paymentMethodLabel(payment.paymentMethod)} ·{" "}
                        {dateLabel(payment.paymentDate)}
                      </p>
                    </div>

                    <p className="font-bold text-red-700">
                      {money(payment.baseAmount)}
                    </p>
                  </div>

                  {payment.unallocatedAmount > 0 ? (
                    <p className="mt-2 text-xs font-medium text-violet-700">
                      Supplier advance {money(payment.unallocatedAmount)}
                    </p>
                  ) : null}
                </Link>
              ))}
            </div>
          )}
        </section>
      </section>

      {/* ===================================================
       * Unassigned Payables Warning
       * =================================================== */}

      {summary.unassignedPayables > 0 || risks.unassignedPayableCount > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" />

            <div>
              <p className="font-semibold">Unassigned Payables Need Review</p>

              <p className="mt-1 text-sm text-muted-foreground">
                {risks.unassignedPayableCount} open purchases totaling{" "}
                {money(summary.unassignedPayables)} are not linked to a
                registered supplier.
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

/* =========================================================
 * Components
 * ========================================================= */

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  note: string;

  icon: ComponentType<{
    className?: string;
  }>;

  tone?: "positive" | "negative" | "neutral";
}) {
  return (
    <article className="rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>

          <p
            className={`mt-2 text-2xl font-semibold tracking-tight ${
              tone === "positive"
                ? "text-emerald-700"
                : tone === "negative"
                  ? "text-red-700"
                  : ""
            }`}
          >
            {value}
          </p>
        </div>

        <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-4" />
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{note}</p>
    </article>
  );
}

function AgingCard({
  title,
  subtitle,
  aging,
  total,
  type,
}: {
  title: string;
  subtitle: string;

  aging: AgingSummary;

  total: number;

  type: "receivable" | "payable";
}) {
  const rows = [
    {
      label: "Current",

      value: aging.current,
    },
    {
      label: "1–30 Days",

      value: aging.days1To30,
    },
    {
      label: "31–60 Days",

      value: aging.days31To60,
    },
    {
      label: "61–90 Days",

      value: aging.days61To90,
    },
    {
      label: "90+ Days",

      value: aging.days90Plus,
    },
  ];

  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <div className="border-b px-5 py-4">
        <h2 className="font-semibold">{title}</h2>

        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="p-5">
        <div className="space-y-4">
          {rows.map((row) => {
            const percentage = total > 0 ? (row.value / total) * 100 : 0;

            return (
              <div key={row.label}>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium">{row.label}</span>

                  <span
                    className={
                      row.label === "Current"
                        ? "font-semibold"
                        : row.value > 0
                          ? "font-semibold text-red-700"
                          : "font-semibold text-muted-foreground"
                    }
                  >
                    {money(row.value)}
                  </span>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={
                      row.label === "Current"
                        ? "h-full rounded-full bg-emerald-500"
                        : type === "receivable"
                          ? "h-full rounded-full bg-red-400"
                          : "h-full rounded-full bg-amber-500"
                    }
                    style={{
                      width: `${Math.min(percentage, 100)}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 border-t pt-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Total</span>

            <span className="text-lg font-bold">{money(total)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function RiskCard({
  label,
  value,
  danger,
}: {
  label: string;
  value: number;
  danger: boolean;
}) {
  return (
    <div
      className={
        danger
          ? "rounded-xl border border-red-200 bg-red-50 p-4"
          : "rounded-xl border border-emerald-200 bg-emerald-50 p-4"
      }
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>

      <p
        className={
          danger
            ? "mt-2 text-xl font-bold text-red-700"
            : "mt-2 text-xl font-bold text-emerald-700"
        }
      >
        {value}
      </p>
    </div>
  );
}

function RiskDetail({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger: boolean;
}) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>

      <p className={danger ? "mt-2 font-bold text-red-700" : "mt-2 font-bold"}>
        {value}
      </p>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{
    className?: string;
  }>;

  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b px-5 py-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-4" />
      </div>

      <div>
        <h2 className="font-semibold">{title}</h2>

        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-5 py-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

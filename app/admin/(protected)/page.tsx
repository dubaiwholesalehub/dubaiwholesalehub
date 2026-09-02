import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Boxes,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  PackageCheck,
  PackageSearch,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
  WalletCards,
} from "lucide-react";

import { getInventoryDashboard } from "@/lib/inventory/inventory-dashboard.repository";
import { getFinancialAccountSummary } from "@/lib/repositories/financial-account.repository";
import { getProfitabilityDashboard } from "@/lib/repositories/profitability.repository";
import { getReceivablesPayablesDashboard } from "@/lib/repositories/receivables-payables.repository";
import {
  getSalesOrderPage,
  getSalesOrderSummary,
} from "@/lib/repositories/sales-order.repository";
import { getPurchaseOrders } from "@/lib/repositories/purchase-orders/purchase-order.repository";

export default async function AdminDashboardPage() {
  const today = new Date();

  const dateTo = formatDateForRepository(today);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const dateFrom = formatDateForRepository(monthStart);

  const sales = await getSalesOrderSummary();

  const trade = await getReceivablesPayablesDashboard();

  const financial = await getFinancialAccountSummary();

  const inventory = await getInventoryDashboard();

  const profitability = await getProfitabilityDashboard(dateFrom, dateTo);

  const ordersToFulfil =
    sales.confirmed + sales.processing + sales.partiallyFulfilled;

  const procurementNeeded = sales.awaitingProcurement + sales.awaitingStock;

  const recentSales = await getSalesOrderPage({
    page: 1,
    pageSize: 5,
  });

  const recentPurchases = await getPurchaseOrders({
    page: 1,
    pageSize: 5,
  });

  return (
    <div className="mx-auto max-w-[1600px] space-y-8">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
            Business Overview
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 lg:text-4xl">
            Dashboard
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Live overview of sales, collections, supplier obligations, cash,
            inventory and profitability.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <QuickButton
            href="/admin/sales/quick-sale"
            label="Quick Sale"
            icon={ShoppingCart}
            primary
          />

          <QuickButton
            href="/admin/purchasing/quick-purchase"
            label="Quick Purchase"
            icon={ReceiptText}
          />
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-950">
            Financial Position
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Key financial numbers requiring daily visibility.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Active Sales"
            value={money(sales.totalOrderValue)}
            description={`${sales.total} total sales orders`}
            href="/admin/sales/orders"
            icon={ShoppingCart}
          />

          <MetricCard
            title="Gross Receivables"
            value={money(trade.summary.totalReceivables)}
            description={`${trade.summary.openReceivableCount} open receivable${
              trade.summary.openReceivableCount === 1 ? "" : "s"
            }`}
            href="/admin/accounts/receivables-payables"
            icon={Users}
            attention={trade.summary.overdueReceivables > 0}
          />

          <MetricCard
            title="Gross Payables"
            value={money(trade.summary.totalPayables)}
            description={`${trade.summary.openPayableCount} open payable${
              trade.summary.openPayableCount === 1 ? "" : "s"
            }`}
            href="/admin/accounts/receivables-payables"
            icon={CreditCard}
            attention={trade.summary.overduePayables > 0}
          />

          <MetricCard
            title="Cash & Bank"
            value={money(financial.totalBalance)}
            description={`${money(financial.cashBalance)} cash · ${money(
              financial.bankBalance,
            )} bank`}
            href="/admin/accounts/cash-bank"
            icon={Banknote}
          />
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-950">Operations</h2>

          <p className="mt-1 text-sm text-slate-500">
            Orders, procurement, stock and current-month profitability.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Orders to Fulfil"
            value={formatNumber(ordersToFulfil)}
            description={`${sales.processing} processing · ${sales.partiallyFulfilled} partial`}
            href="/admin/sales/orders"
            icon={Truck}
            attention={ordersToFulfil > 0}
          />

          <MetricCard
            title="Procurement Needed"
            value={formatNumber(procurementNeeded)}
            description={`${sales.awaitingProcurement} procurement · ${sales.awaitingStock} stock`}
            href="/admin/sales/orders"
            icon={ClipboardList}
            attention={procurementNeeded > 0}
          />

          <MetricCard
            title="Inventory Value"
            value={money(inventory.inventoryValue)}
            description={`${formatNumber(
              inventory.totalStockQuantity,
            )} units on hand`}
            href="/admin/inventory/stock"
            icon={Boxes}
          />

          <MetricCard
            title="Net Profit"
            value={money(profitability.summary.netProfit)}
            description={`${percentage(
              profitability.summary.netMarginPercentage,
            )} margin · this month`}
            href="/admin/accounts/profitability"
            icon={TrendingUp}
            positive={profitability.summary.netProfit > 0}
            attention={profitability.summary.netProfit < 0}
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-950">
              Attention Needed
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Items that may require action from the team.
            </p>
          </div>

          <div className="grid gap-px bg-slate-100 sm:grid-cols-2">
            <AttentionItem
              title="Overdue Receivables"
              value={money(trade.summary.overdueReceivables)}
              description="Customer balances past their due date."
              href="/admin/accounts/receivables-payables"
              icon={CircleDollarSign}
              active={trade.summary.overdueReceivables > 0}
            />

            <AttentionItem
              title="Overdue Payables"
              value={money(trade.summary.overduePayables)}
              description="Supplier balances past their due date."
              href="/admin/accounts/receivables-payables"
              icon={WalletCards}
              active={trade.summary.overduePayables > 0}
            />

            <AttentionItem
              title="Low Stock"
              value={formatNumber(inventory.lowStockProducts)}
              description="Products currently below their stock threshold."
              href="/admin/inventory/stock?stockStatus=low_stock"
              icon={AlertTriangle}
              active={inventory.lowStockProducts > 0}
            />

            <AttentionItem
              title="Out of Stock"
              value={formatNumber(inventory.outOfStockProducts)}
              description="Products currently unavailable in stock."
              href="/admin/inventory/stock?stockStatus=out_of_stock"
              icon={PackageSearch}
              active={inventory.outOfStockProducts > 0}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Quick Actions
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Common daily ERP operations.
          </p>

          <div className="mt-5 space-y-2">
            <ActionLink
              href="/admin/sales/quick-sale"
              title="Create Quick Sale"
              icon={ShoppingCart}
            />

            <ActionLink
              href="/admin/sales/receipts"
              title="Customer Receipt"
              icon={CircleDollarSign}
            />

            <ActionLink
              href="/admin/purchasing/quick-purchase"
              title="Create Quick Purchase"
              icon={ReceiptText}
            />

            <ActionLink
              href="/admin/purchasing/supplier-payments"
              title="Supplier Payment"
              icon={CreditCard}
            />

            <ActionLink
              href="/admin/accounts/expenses"
              title="Record Expense"
              icon={WalletCards}
            />

            <ActionLink
              href="/admin/goods-receipts"
              title="Goods Receipts"
              icon={PackageCheck}
            />
          </div>
        </section>
              <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-950">
            Recent Activity
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Latest sales orders and purchase orders.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <RecentSalesPanel
            orders={recentSales.data}
          />

          <RecentPurchasesPanel
            orders={recentPurchases.data}
          />
        </div>
      </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-slate-950 px-6 py-5 text-white shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-orange-400">
              Trade Position
            </p>

            <p className="mt-2 text-2xl font-bold">
              {money(trade.summary.netTradePosition)}
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Net receivable position after customer advances versus supplier
              exposure.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4">
            <MiniValue
              label="Customer Advances"
              value={money(trade.summary.customerAdvances)}
            />

            <MiniValue
              label="Supplier Advances"
              value={money(trade.summary.supplierAdvances)}
            />

            <MiniValue
              label="Collections 30d"
              value={money(trade.summary.collectionsLast30Days)}
            />

            <MiniValue
              label="Supplier Payments 30d"
              value={money(trade.summary.supplierPaymentsLast30Days)}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  description: string;
  href: string;
  icon: typeof ShoppingCart;
  attention?: boolean;
  positive?: boolean;
}

function MetricCard({
  title,
  value,
  description,
  href,
  icon: Icon,
  attention = false,
  positive = false,
}: MetricCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-orange-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <p
            className={[
              "mt-2 truncate text-2xl font-bold tracking-tight",
              attention
                ? "text-amber-700"
                : positive
                  ? "text-emerald-700"
                  : "text-slate-950",
            ].join(" ")}
          >
            {value}
          </p>
        </div>

        <div
          className={[
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            attention
              ? "bg-amber-50 text-amber-700"
              : positive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-orange-50 text-orange-600",
          ].join(" ")}
        >
          <Icon className="size-5" />
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-xs leading-5 text-slate-500">{description}</p>

        <ArrowRight className="size-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-orange-600" />
      </div>
    </Link>
  );
}

interface AttentionItemProps {
  title: string;
  value: string;
  description: string;
  href: string;
  icon: typeof AlertTriangle;
  active: boolean;
}

function AttentionItem({
  title,
  value,
  description,
  href,
  icon: Icon,
  active,
}: AttentionItemProps) {
  return (
    <Link
      href={href}
      className="group bg-white p-5 transition hover:bg-slate-50"
    >
      <div className="flex items-start gap-4">
        <div
          className={[
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            active
              ? "bg-amber-50 text-amber-700"
              : "bg-slate-100 text-slate-500",
          ].join(" ")}
        >
          <Icon className="size-5" />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-700">{title}</p>

          <p
            className={[
              "mt-1 text-xl font-bold",
              active ? "text-amber-700" : "text-slate-950",
            ].join(" ")}
          >
            {value}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
      </div>
    </Link>
  );
}

interface QuickButtonProps {
  href: string;
  label: string;
  icon: typeof ShoppingCart;
  primary?: boolean;
}

function QuickButton({
  href,
  label,
  icon: Icon,
  primary = false,
}: QuickButtonProps) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition",
        primary
          ? "bg-orange-600 text-white hover:bg-orange-700"
          : "border border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50",
      ].join(" ")}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}

interface ActionLinkProps {
  href: string;
  title: string;
  icon: typeof ShoppingCart;
}

function ActionLink({ href, title, icon: Icon }: ActionLinkProps) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 transition hover:border-orange-300 hover:bg-orange-50"
    >
      <div className="flex items-center gap-3">
        <Icon className="size-4 text-slate-500 transition group-hover:text-orange-600" />

        <span className="text-sm font-semibold text-slate-700">{title}</span>
      </div>

      <ArrowRight className="size-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-orange-600" />
    </Link>
  );
}

function RecentSalesPanel({
  orders,
}: {
  orders: Awaited<
    ReturnType<typeof getSalesOrderPage>
  >["data"];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
        <div>
          <h3 className="font-semibold text-slate-950">
            Recent Sales
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Latest 5 sales orders
          </p>
        </div>

        <Link
          href="/admin/sales/orders"
          className="text-sm font-semibold text-orange-600 hover:text-orange-700"
        >
          View all
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-700">
            No sales orders yet
          </p>

          <p className="mt-1 text-xs text-slate-500">
            New sales orders will appear here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/admin/sales/orders/${order.id}`}
              className="group block px-6 py-4 transition hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">
                      {order.order_number}
                    </p>

                    <StatusPill
                      status={order.status}
                    />
                  </div>

                  <p className="mt-1 truncate text-sm text-slate-600">
                    {order.customer?.display_name ??
                      order.customer?.company_name ??
                      "Unknown customer"}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {formatDashboardDate(
                      order.order_date,
                    )}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="font-semibold text-slate-950">
                    {money(order.grand_total)}
                  </p>

                  <p
                    className={[
                      "mt-1 text-xs font-medium",
                      order.balance_due > 0
                        ? "text-amber-700"
                        : "text-emerald-700",
                    ].join(" ")}
                  >
                    {order.balance_due > 0
                      ? `${money(
                          order.balance_due,
                        )} due`
                      : "Paid"}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function RecentPurchasesPanel({
  orders,
}: {
  orders: Awaited<
    ReturnType<typeof getPurchaseOrders>
  >["data"];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
        <div>
          <h3 className="font-semibold text-slate-950">
            Recent Purchase Orders
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Latest 5 purchase orders
          </p>
        </div>

        <Link
          href="/admin/purchase-orders"
          className="text-sm font-semibold text-orange-600 hover:text-orange-700"
        >
          View all
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-700">
            No purchase orders yet
          </p>

          <p className="mt-1 text-xs text-slate-500">
            New purchase orders will appear here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/admin/purchase-orders/${order.id}`}
              className="group block px-6 py-4 transition hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">
                      {order.po_number}
                    </p>

                    <StatusPill
                      status={order.status}
                    />
                  </div>

                  <p className="mt-1 truncate text-sm text-slate-600">
                    {order.supplier_name}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {formatDashboardDate(
                      order.order_date,
                    )}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="font-semibold text-slate-950">
                    {money(
                      Number(order.total_amount),
                    )}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {order.currency_code}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function StatusPill({
  status,
}: {
  status: string;
}) {
  const normalized =
    status
      .replaceAll("_", " ")
      .trim();

  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold capitalize text-slate-600">
      {normalized}
    </span>
  );
}

function MiniValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>

      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}

function money(value: number): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-AE", {
    maximumFractionDigits: 4,
  }).format(value);
}

function percentage(value: number): string {
  return `${new Intl.NumberFormat("en-AE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

function formatDateForRepository(value: Date): string {
  const year = value.getFullYear();

  const month = String(value.getMonth() + 1).padStart(2, "0");

  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDashboardDate(
  value: string,
): string {
  const date =
    new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat(
    "en-AE",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}

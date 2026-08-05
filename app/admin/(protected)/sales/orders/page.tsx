import {
  Plus,
  ShoppingCart,
} from "lucide-react";

import PageHeader from "@/components/admin/shared/PageHeader";
import SalesOrderFilters from "@/components/admin/sales/orders/SalesOrderFilters";
import SalesOrderPagination from "@/components/admin/sales/orders/SalesOrderPagination";
import SalesOrderSummaryCards from "@/components/admin/sales/orders/SalesOrderSummaryCards";
import SalesOrderTable from "@/components/admin/sales/orders/SalesOrderTable";
import {
  getSalesOrderPage,
  getSalesOrderSummary,
  type SalesOrderFulfilmentStatus,
  type SalesOrderPaymentStatus,
  type SalesOrderSource,
  type SalesOrderStatus,
} from "@/lib/repositories/sales-order.repository";

interface SalesOrdersPageProps {
  searchParams: Promise<
    Record<
      string,
      string | string[] | undefined
    >
  >;
}

function getStringParam(
  value: string | string[] | undefined,
): string | undefined {
  return typeof value === "string"
    ? value
    : undefined;
}

function getPositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) &&
    parsed > 0
    ? parsed
    : fallback;
}

function normalizeStatus(
  value: string | undefined,
): SalesOrderStatus | "all" {
  const statuses:
    readonly SalesOrderStatus[] = [
      "draft",
      "confirmed",
      "processing",
      "partially_fulfilled",
      "fulfilled",
      "completed",
      "cancelled",
      "closed",
    ];

  return statuses.includes(
    value as SalesOrderStatus,
  )
    ? (value as SalesOrderStatus)
    : "all";
}

function normalizeFulfilmentStatus(
  value: string | undefined,
): SalesOrderFulfilmentStatus | "all" {
  const statuses:
    readonly SalesOrderFulfilmentStatus[] = [
      "unplanned",
      "awaiting_stock",
      "awaiting_procurement",
      "partially_allocated",
      "allocated",
      "partially_fulfilled",
      "fulfilled",
      "not_required",
    ];

  return statuses.includes(
    value as SalesOrderFulfilmentStatus,
  )
    ? (value as SalesOrderFulfilmentStatus)
    : "all";
}

function normalizePaymentStatus(
  value: string | undefined,
): SalesOrderPaymentStatus | "all" {
  const statuses:
    readonly SalesOrderPaymentStatus[] = [
      "unpaid",
      "partially_paid",
      "paid",
      "overpaid",
      "refunded",
    ];

  return statuses.includes(
    value as SalesOrderPaymentStatus,
  )
    ? (value as SalesOrderPaymentStatus)
    : "all";
}

function normalizeSource(
  value: string | undefined,
): SalesOrderSource | "all" {
  const sources:
    readonly SalesOrderSource[] = [
      "internal",
      "hmshoponline",
      "dubaiwholesalehub",
      "import",
    ];

  return sources.includes(
    value as SalesOrderSource,
  )
    ? (value as SalesOrderSource)
    : "all";
}

export default async function SalesOrdersPage({
  searchParams,
}: SalesOrdersPageProps) {
  const params = await searchParams;

  const search =
    getStringParam(params.search)?.trim() ??
    "";

  const status = normalizeStatus(
    getStringParam(params.status),
  );

  const fulfilmentStatus =
    normalizeFulfilmentStatus(
      getStringParam(
        params.fulfilmentStatus,
      ),
    );

  const paymentStatus =
    normalizePaymentStatus(
      getStringParam(
        params.paymentStatus,
      ),
    );

  const source = normalizeSource(
    getStringParam(params.source),
  );

  const dateFrom =
    getStringParam(params.dateFrom) ?? "";

  const dateTo =
    getStringParam(params.dateTo) ?? "";

  const page = getPositiveInteger(
    getStringParam(params.page),
    1,
  );

  const pageSize = Math.min(
    getPositiveInteger(
      getStringParam(params.pageSize),
      25,
    ),
    100,
  );

  const [result, summary] =
    await Promise.all([
      getSalesOrderPage({
        search: search || undefined,
        status,
        fulfilmentStatus,
        paymentStatus,
        source,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        pageSize,
      }),

      getSalesOrderSummary(),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Orders"
        description="Manage confirmed customer orders, inventory fulfilment, outstanding payments and delivery progress."
        icon={ShoppingCart}
        action={{
          href: "/admin/sales/orders/new",
          label: "New Sales Order",
          icon: Plus,
        }}
      />

      <SalesOrderSummaryCards
        summary={summary}
      />

      <SalesOrderFilters
        values={{
          search,
          status,
          fulfilmentStatus,
          paymentStatus,
          source,
          dateFrom,
          dateTo,
          pageSize: String(pageSize),
        }}
      />

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {result.count} matching sales order
            {result.count === 1 ? "" : "s"}
          </p>
        </div>

        <SalesOrderTable
          orders={result.data}
        />

        <SalesOrderPagination
          page={result.page}
          totalPages={result.totalPages}
          totalCount={result.count}
          pageSize={result.pageSize}
          searchParams={{
            search:
              search || undefined,
            status,
            fulfilmentStatus,
            paymentStatus,
            source,
            dateFrom:
              dateFrom || undefined,
            dateTo:
              dateTo || undefined,
            pageSize:
              String(pageSize),
          }}
        />
      </section>
    </div>
  );
}
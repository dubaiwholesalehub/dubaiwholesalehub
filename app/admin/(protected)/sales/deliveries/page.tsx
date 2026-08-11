import {
  Plus,
  Truck,
} from "lucide-react";

import PageHeader from "@/components/admin/shared/PageHeader";
import DeliveryOrderFilters from "@/components/admin/sales/deliveries/DeliveryOrderFilters";
import DeliveryOrderPagination from "@/components/admin/sales/deliveries/DeliveryOrderPagination";
import DeliveryOrderSummaryCards from "@/components/admin/sales/deliveries/DeliveryOrderSummaryCards";
import DeliveryOrderTable from "@/components/admin/sales/deliveries/DeliveryOrderTable";
import {
  getDeliveryOrderPage,
  getDeliveryOrderSummary,
  type DeliveryMethod,
  type DeliveryOrderPriority,
  type DeliveryOrderStatus,
} from "@/lib/repositories/delivery-order.repository";

interface DeliveryOrdersPageProps {
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
): DeliveryOrderStatus | "all" {
  const statuses:
    readonly DeliveryOrderStatus[] = [
      "draft",
      "picking",
      "picked",
      "packing",
      "packed",
      "dispatched",
      "delivered",
      "cancelled",
    ];

  return statuses.includes(
    value as DeliveryOrderStatus,
  )
    ? (value as DeliveryOrderStatus)
    : "all";
}

function normalizePriority(
  value: string | undefined,
): DeliveryOrderPriority | "all" {
  const priorities:
    readonly DeliveryOrderPriority[] = [
      "low",
      "normal",
      "high",
      "urgent",
    ];

  return priorities.includes(
    value as DeliveryOrderPriority,
  )
    ? (value as DeliveryOrderPriority)
    : "all";
}

function normalizeDeliveryMethod(
  value: string | undefined,
): DeliveryMethod | "all" {
  const methods:
    readonly DeliveryMethod[] = [
      "company_delivery",
      "customer_pickup",
      "courier",
      "freight",
      "export_shipment",
      "dropship",
      "other",
    ];

  return methods.includes(
    value as DeliveryMethod,
  )
    ? (value as DeliveryMethod)
    : "all";
}

export default async function DeliveryOrdersPage({
  searchParams,
}: DeliveryOrdersPageProps) {
  const params = await searchParams;

  const search =
    getStringParam(
      params.search,
    )?.trim() ?? "";

  const status =
    normalizeStatus(
      getStringParam(
        params.status,
      ),
    );

  const priority =
    normalizePriority(
      getStringParam(
        params.priority,
      ),
    );

  const deliveryMethod =
    normalizeDeliveryMethod(
      getStringParam(
        params.deliveryMethod,
      ),
    );

  const dateFrom =
    getStringParam(
      params.dateFrom,
    ) ?? "";

  const dateTo =
    getStringParam(
      params.dateTo,
    ) ?? "";

  const page =
    getPositiveInteger(
      getStringParam(
        params.page,
      ),
      1,
    );

  const pageSize =
    Math.min(
      getPositiveInteger(
        getStringParam(
          params.pageSize,
        ),
        25,
      ),
      100,
    );

  const [
    result,
    summary,
  ] = await Promise.all([
    getDeliveryOrderPage({
      search:
        search || undefined,

      status,
      priority,
      deliveryMethod,

      dateFrom:
        dateFrom || undefined,

      dateTo:
        dateTo || undefined,

      page,
      pageSize,
    }),

    getDeliveryOrderSummary(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery Orders"
        description="Manage warehouse picking, packing, dispatch and customer delivery execution."
        icon={Truck}
        action={{
          href:
            "/admin/sales/deliveries/new",
          label:
            "Create Delivery",
          icon: Plus,
        }}
      />

      <DeliveryOrderSummaryCards
        summary={summary}
      />

      <DeliveryOrderFilters
        values={{
          search,
          status,
          priority,
          deliveryMethod,
          dateFrom,
          dateTo,
          pageSize:
            String(pageSize),
        }}
      />

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {result.count} matching delivery order
            {result.count === 1
              ? ""
              : "s"}
          </p>
        </div>

        <DeliveryOrderTable
          deliveries={result.data}
        />

        <DeliveryOrderPagination
          page={result.page}
          totalPages={
            result.totalPages
          }
          totalCount={
            result.count
          }
          pageSize={
            result.pageSize
          }
          searchParams={{
            search:
              search || undefined,

            status,
            priority,
            deliveryMethod,

            dateFrom:
              dateFrom ||
              undefined,

            dateTo:
              dateTo ||
              undefined,

            pageSize:
              String(pageSize),
          }}
        />
      </section>
    </div>
  );
}
import Link from "next/link";
import {
  AlertTriangle,
  ChevronRight,
  Plus,
  Truck,
} from "lucide-react";

import DataTable, {
  type DataTableColumn,
} from "@/components/admin/shared/DataTable";
import EmptyState from "@/components/admin/shared/EmptyState";
import type {
  DeliveryMethod,
  DeliveryOrderPriority,
  DeliveryOrderStatus,
  GetDeliveryOrdersResult,
} from "@/lib/repositories/delivery-order.repository";

import DeliveryStatusBadge from "@/components/admin/sales/deliveries/DeliveryStatusBadge";

type DeliveryOrderListRow =
  GetDeliveryOrdersResult["data"][number];

interface DeliveryOrderTableProps {
  deliveries: DeliveryOrderListRow[];
}

const columns: DataTableColumn<DeliveryOrderListRow>[] = [
  {
    key: "delivery_number",
    header: "Delivery No.",
    width: "175px",
    render: (delivery) => (
      <div>
        <Link
          href={`/admin/sales/deliveries/${delivery.id}`}
          className="font-semibold text-foreground transition-colors hover:text-primary"
        >
          {delivery.delivery_number}
        </Link>

        {delivery.sales_order ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Order: {delivery.sales_order.order_number}
          </p>
        ) : null}
      </div>
    ),
  },
  {
    key: "customer",
    header: "Customer",
    render: (delivery) => (
      <div className="min-w-0">
        <p className="font-semibold">
          {delivery.customer?.display_name ??
            "Unknown customer"}
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          {delivery.customer?.customer_number ??
            "Customer unavailable"}
        </p>
      </div>
    ),
  },
  {
    key: "warehouse",
    header: "Warehouse",
    render: (delivery) => (
      <div>
        <p>
          {delivery.warehouse?.name ??
            "Unknown warehouse"}
        </p>

        {delivery.warehouse?.code ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {delivery.warehouse.code}
          </p>
        ) : null}
      </div>
    ),
  },
  {
    key: "delivery_date",
    header: "Delivery Date",
    width: "145px",
    render: (delivery) =>
      formatDate(delivery.delivery_date),
  },
  {
    key: "expected_date",
    header: "Expected",
    width: "155px",
    render: (delivery) => (
      <ExpectedDateCell
        date={delivery.expected_delivery_date}
        status={delivery.status}
      />
    ),
  },
  {
    key: "method",
    header: "Method",
    width: "165px",
    render: (delivery) => (
      <DeliveryMethodBadge
        method={delivery.delivery_method}
      />
    ),
  },
  {
    key: "priority",
    header: "Priority",
    width: "120px",
    align: "center",
    render: (delivery) => (
      <PriorityBadge
        priority={delivery.priority}
      />
    ),
  },
  {
    key: "items",
    header: "Items",
    width: "90px",
    align: "right",
    render: (delivery) => (
      <span className="font-medium">
        {delivery.item_count}
      </span>
    ),
  },
  {
    key: "planned",
    header: "Planned",
    width: "120px",
    align: "right",
    render: (delivery) =>
      formatQuantity(
        delivery.planned_quantity,
      ),
  },
  {
    key: "dispatched",
    header: "Dispatched",
    width: "125px",
    align: "right",
    render: (delivery) =>
      formatQuantity(
        delivery.dispatched_quantity,
      ),
  },
  {
    key: "delivered",
    header: "Delivered",
    width: "120px",
    align: "right",
    render: (delivery) =>
      formatQuantity(
        delivery.delivered_quantity,
      ),
  },
  {
    key: "status",
    header: "Status",
    width: "145px",
    align: "center",
    render: (delivery) => (
      <DeliveryStatusBadge
        status={delivery.status}
      />
    ),
  },
  {
    key: "actions",
    header: (
      <span className="sr-only">
        Actions
      </span>
    ),
    width: "70px",
    align: "right",
    render: (delivery) => (
      <Link
        href={`/admin/sales/deliveries/${delivery.id}`}
        aria-label={`View ${delivery.delivery_number}`}
        className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ChevronRight className="size-4" />
      </Link>
    ),
  },
];

export default function DeliveryOrderTable({
  deliveries,
}: DeliveryOrderTableProps) {
  return (
    <DataTable
      rows={deliveries}
      columns={columns}
      getRowKey={(delivery) =>
        delivery.id
      }
      minimumWidth="1700px"
      emptyState={
        <EmptyState
          icon={Truck}
          title="No delivery orders found"
          description="Try changing the search criteria or create a delivery from a confirmed Sales Order with reserved stock."
          action={{
            href: "/admin/sales/deliveries/new",
            label: "Create Delivery",
            icon: Plus,
          }}
        />
      }
    />
  );
}

function PriorityBadge({
  priority,
}: {
  priority: DeliveryOrderPriority;
}) {
  const configuration: Record<
    DeliveryOrderPriority,
    {
      label: string;
      className: string;
    }
  > = {
    low: {
      label: "Low",
      className:
        "border-slate-200 bg-slate-50 text-slate-600",
    },
    normal: {
      label: "Normal",
      className:
        "border-blue-200 bg-blue-50 text-blue-700",
    },
    high: {
      label: "High",
      className:
        "border-amber-200 bg-amber-50 text-amber-700",
    },
    urgent: {
      label: "Urgent",
      className:
        "border-red-200 bg-red-50 text-red-700",
    },
  };

  const item =
    configuration[priority];

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${item.className}`}
    >
      {item.label}
    </span>
  );
}

function DeliveryMethodBadge({
  method,
}: {
  method: DeliveryMethod;
}) {
  const labels: Record<
    DeliveryMethod,
    string
  > = {
    company_delivery:
      "Company Delivery",
    customer_pickup:
      "Customer Pickup",
    courier: "Courier",
    freight: "Freight",
    export_shipment:
      "Export Shipment",
    dropship: "Dropship",
    other: "Other",
  };

  return (
    <span className="inline-flex rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground">
      {labels[method]}
    </span>
  );
}

function ExpectedDateCell({
  date,
  status,
}: {
  date: string | null;
  status: DeliveryOrderStatus;
}) {
  if (!date) {
    return (
      <span className="text-muted-foreground">
        Not set
      </span>
    );
  }

  const overdue =
    isOverdue(date, status);

  return (
    <div>
      <p
        className={
          overdue
            ? "font-semibold text-red-700"
            : undefined
        }
      >
        {formatDate(date)}
      </p>

      {overdue ? (
        <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-red-700">
          <AlertTriangle className="size-3.5" />
          Overdue
        </p>
      ) : null}
    </div>
  );
}

function isOverdue(
  date: string,
  status: DeliveryOrderStatus,
): boolean {
  if (
    status === "delivered" ||
    status === "cancelled"
  ) {
    return false;
  }

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  return date < today;
}

function formatDate(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    "en-AE",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(
    new Date(`${value}T00:00:00`),
  );
}

function formatQuantity(
  value: number,
): string {
  return new Intl.NumberFormat(
    "en-AE",
    {
      maximumFractionDigits: 4,
    },
  ).format(value);
}
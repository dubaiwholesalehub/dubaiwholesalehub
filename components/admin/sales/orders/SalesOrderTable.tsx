import Link from "next/link";
import { ChevronRight, Plus, ShoppingCart } from "lucide-react";

import DataTable, {
  type DataTableColumn,
} from "@/components/admin/shared/DataTable";
import EmptyState from "@/components/admin/shared/EmptyState";
import type {
  GetSalesOrdersResult,
  SalesOrderFulfilmentStatus,
  SalesOrderPaymentStatus,
  SalesOrderSource,
} from "@/lib/repositories/sales-order.repository";

type SalesOrderListRow = GetSalesOrdersResult["data"][number];

interface SalesOrderTableProps {
  orders: SalesOrderListRow[];
}

const columns: DataTableColumn<SalesOrderListRow>[] = [
  {
    key: "order_number",
    header: "Order No.",
    width: "165px",
    render: (order) => (
      <div>
        <Link
          href={`/admin/sales/orders/${order.id}`}
          className="font-semibold text-foreground transition-colors hover:text-primary"
        >
          {order.order_number}
        </Link>

        {order.quotation ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Quote: {order.quotation.quotation_number}
          </p>
        ) : null}
      </div>
    ),
  },
  {
    key: "customer",
    header: "Customer",
    render: (order) => (
      <div className="min-w-0">
        <p className="font-semibold">
          {order.customer?.display_name ?? "Unknown customer"}
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          {order.customer?.customer_number ?? "Customer unavailable"}
        </p>
      </div>
    ),
  },
  {
    key: "order_date",
    header: "Order Date",
    width: "140px",
    render: (order) => formatDate(order.order_date),
  },
  {
    key: "warehouse",
    header: "Warehouse",
    render: (order) => (
      <div>
        <p>{order.warehouse?.name ?? "Not selected"}</p>

        {order.warehouse?.code ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {order.warehouse.code}
          </p>
        ) : null}
      </div>
    ),
  },
  {
    key: "source",
    header: "Source",
    width: "165px",
    render: (order) => <SourceBadge source={order.source} />,
  },
  {
    key: "fulfilment",
    header: "Fulfilment",
    width: "170px",
    render: (order) => <FulfilmentBadge status={order.fulfilment_status} />,
  },
  {
    key: "payment",
    header: "Payment",
    width: "145px",
    render: (order) => <PaymentBadge status={order.payment_status} />,
  },
  {
    key: "balance",
    header: "Balance Due",
    align: "right",
    width: "155px",
    render: (order) => (
      <span
        className={
          order.balance_due > 0
            ? "font-semibold text-amber-700"
            : "font-semibold text-emerald-700"
        }
      >
        {formatCurrency(order.balance_due, order.currency_code)}
      </span>
    ),
  },
  {
    key: "total",
    header: "Grand Total",
    align: "right",
    width: "155px",
    render: (order) => (
      <span className="font-semibold">
        {formatCurrency(order.grand_total, order.currency_code)}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    align: "center",
    width: "145px",
    render: (order) => <OrderStatusBadge status={order.status} />,
  },
  {
    key: "actions",
    header: <span className="sr-only">Actions</span>,
    align: "right",
    width: "70px",
    render: (order) => (
      <Link
        href={`/admin/sales/orders/${order.id}`}
        aria-label={`View ${order.order_number}`}
        className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ChevronRight className="size-4" />
      </Link>
    ),
  },
];

export default function SalesOrderTable({ orders }: SalesOrderTableProps) {
  return (
    <DataTable
      rows={orders}
      columns={columns}
      getRowKey={(order) => order.id}
      minimumWidth="1600px"
      emptyState={
        <EmptyState
          icon={ShoppingCart}
          title="No sales orders found"
          description="Try changing the search criteria or filters. Create a sales order directly or convert an accepted quotation."
          action={{
            href: "/admin/sales/orders/new",
            label: "New Sales Order",
            icon: Plus,
          }}
        />
      }
    />
  );
}

function SourceBadge({ source }: { source: SalesOrderSource }) {
  const labels: Record<SalesOrderSource, string> = {
    internal: "Internal",
    hmshoponline: "HMShopOnline",
    dubaiwholesalehub: "Dubai Wholesale Hub",
    import: "Imported",
  };

  return (
    <span className="inline-flex rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground">
      {labels[source]}
    </span>
  );
}

function FulfilmentBadge({ status }: { status: SalesOrderFulfilmentStatus }) {
  const configuration: Record<
    SalesOrderFulfilmentStatus,
    {
      label: string;
      className: string;
    }
  > = {
    unplanned: {
      label: "Unplanned",
      className: "border-slate-200 bg-slate-50 text-slate-700",
    },
    awaiting_stock: {
      label: "Awaiting Stock",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    },
    awaiting_procurement: {
      label: "Awaiting Procurement",
      className: "border-orange-200 bg-orange-50 text-orange-700",
    },
    partially_allocated: {
      label: "Partially Allocated",
      className: "border-blue-200 bg-blue-50 text-blue-700",
    },
    allocated: {
      label: "Allocated",
      className: "border-cyan-200 bg-cyan-50 text-cyan-700",
    },
    partially_fulfilled: {
      label: "Partially Fulfilled",
      className: "border-violet-200 bg-violet-50 text-violet-700",
    },
    fulfilled: {
      label: "Fulfilled",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
    not_required: {
      label: "Not Required",
      className: "border-slate-200 bg-slate-50 text-slate-600",
    },
  };

  const item = configuration[status];

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${item.className}`}
    >
      {item.label}
    </span>
  );
}

function PaymentBadge({ status }: { status: SalesOrderPaymentStatus }) {
  const configuration: Record<
    SalesOrderPaymentStatus,
    {
      label: string;
      className: string;
    }
  > = {
    unpaid: {
      label: "Unpaid",
      className: "border-red-200 bg-red-50 text-red-700",
    },
    partially_paid: {
      label: "Partially Paid",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    },
    paid: {
      label: "Paid",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
    overpaid: {
      label: "Overpaid",
      className: "border-blue-200 bg-blue-50 text-blue-700",
    },
    refunded: {
      label: "Refunded",
      className: "border-violet-200 bg-violet-50 text-violet-700",
    },
  };

  const item = configuration[status];

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${item.className}`}
    >
      {item.label}
    </span>
  );
}

function OrderStatusBadge({
  status,
}: {
  status: SalesOrderListRow["status"];
}) {
  const configuration: Record<
    SalesOrderListRow["status"],
    {
      label: string;
      className: string;
    }
  > = {
    draft: {
      label: "Draft",
      className:
        "border-slate-200 bg-slate-50 text-slate-700",
    },
    confirmed: {
      label: "Confirmed",
      className:
        "border-blue-200 bg-blue-50 text-blue-700",
    },
    processing: {
      label: "Processing",
      className:
        "border-cyan-200 bg-cyan-50 text-cyan-700",
    },
    partially_fulfilled: {
      label: "Partially Fulfilled",
      className:
        "border-violet-200 bg-violet-50 text-violet-700",
    },
    fulfilled: {
      label: "Fulfilled",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
    completed: {
      label: "Completed",
      className:
        "border-green-200 bg-green-50 text-green-700",
    },
    cancelled: {
      label: "Cancelled",
      className:
        "border-red-200 bg-red-50 text-red-700",
    },
    closed: {
      label: "Closed",
      className:
        "border-zinc-200 bg-zinc-100 text-zinc-700",
    },
  };

  const item = configuration[status];

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${item.className}`}
    >
      {item.label}
    </span>
  );
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

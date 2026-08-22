import Link from "next/link";
import {
  ChevronRight,
  Plus,
  RotateCcw,
} from "lucide-react";

import DataTable, {
  type DataTableColumn,
} from "@/components/admin/shared/DataTable";
import EmptyState from "@/components/admin/shared/EmptyState";
import type {
  GetSalesReturnsResult,
  SalesReturnStatus,
} from "@/lib/repositories/sales-return.repository";

type SalesReturnListRow =
  GetSalesReturnsResult["data"][number];

interface SalesReturnTableProps {
  returns: SalesReturnListRow[];
}

const columns: DataTableColumn<SalesReturnListRow>[] = [
  {
    key: "return_number",
    header: "Return No.",
    width: "170px",
    render: (salesReturn) => (
      <div>
        <Link
          href={`/admin/sales/returns/${salesReturn.id}`}
          className="font-semibold text-foreground transition-colors hover:text-primary"
        >
          {salesReturn.return_number}
        </Link>

        {salesReturn.sales_order ? (
          <p className="mt-1 text-xs text-muted-foreground">
            SO: {salesReturn.sales_order.order_number}
          </p>
        ) : null}
      </div>
    ),
  },
  {
    key: "customer",
    header: "Customer",
    render: (salesReturn) => (
      <div className="min-w-0">
        <p className="font-semibold">
          {salesReturn.customer?.display_name ??
            "Unknown customer"}
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          {salesReturn.customer?.customer_number ??
            "Customer unavailable"}
        </p>
      </div>
    ),
  },
  {
    key: "return_date",
    header: "Return Date",
    width: "140px",
    render: (salesReturn) =>
      formatDate(
        salesReturn.return_date,
      ),
  },
  {
    key: "reason",
    header: "Reason",
    width: "240px",
    render: (salesReturn) => (
      <div className="max-w-[240px]">
        <p
          className="truncate"
          title={salesReturn.reason}
        >
          {salesReturn.reason}
        </p>

        {salesReturn.notes ? (
          <p
            className="mt-1 truncate text-xs text-muted-foreground"
            title={salesReturn.notes}
          >
            {salesReturn.notes}
          </p>
        ) : null}
      </div>
    ),
  },
  {
    key: "inventory",
    header: "Inventory",
    width: "175px",
    render: (salesReturn) => (
      <InventoryStatus
        salesReturn={salesReturn}
      />
    ),
  },
  {
    key: "accounting",
    header: "Accounting",
    width: "185px",
    render: (salesReturn) => (
      <AccountingStatus
        salesReturn={salesReturn}
      />
    ),
  },
  {
    key: "total",
    header: "Credit Value",
    align: "right",
    width: "160px",
    render: (salesReturn) => (
      <span className="font-semibold">
        {formatCurrency(
          salesReturn.grand_total,
          salesReturn.currency_code,
        )}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    align: "center",
    width: "140px",
    render: (salesReturn) => (
      <ReturnStatusBadge
        status={salesReturn.status}
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
    align: "right",
    width: "70px",
    render: (salesReturn) => (
      <Link
        href={`/admin/sales/returns/${salesReturn.id}`}
        aria-label={`View ${salesReturn.return_number}`}
        className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ChevronRight className="size-4" />
      </Link>
    ),
  },
];

export default function SalesReturnTable({
  returns,
}: SalesReturnTableProps) {
  return (
    <DataTable
      rows={returns}
      columns={columns}
      getRowKey={(salesReturn) =>
        salesReturn.id
      }
      minimumWidth="1450px"
      emptyState={
        <EmptyState
          icon={RotateCcw}
          title="No sales returns found"
          description="Try changing the search criteria or filters, or create a return against an eligible fulfilled sales order."
          action={{
            href: "/admin/sales/returns/new",
            label: "New Sales Return",
            icon: Plus,
          }}
        />
      }
    />
  );
}

/* =========================================================
 * Inventory Status
 * ========================================================= */

function InventoryStatus({
  salesReturn,
}: {
  salesReturn: SalesReturnListRow;
}) {
  if (
    salesReturn.inventory_transaction_id
  ) {
    return (
      <div>
        <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
          Received
        </span>

        {salesReturn.inventory_transaction ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {
              salesReturn
                .inventory_transaction
                .transaction_number
            }
          </p>
        ) : null}
      </div>
    );
  }

  if (
    salesReturn.status === "approved"
  ) {
    return (
      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
        Awaiting Receipt
      </span>
    );
  }

  if (
    salesReturn.status === "draft"
  ) {
    return (
      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
        Not Received
      </span>
    );
  }

  if (
    salesReturn.status === "cancelled"
  ) {
    return (
      <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
        Cancelled
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
      Pending
    </span>
  );
}

/* =========================================================
 * Accounting Status
 * ========================================================= */

function AccountingStatus({
  salesReturn,
}: {
  salesReturn: SalesReturnListRow;
}) {
  const hasCreditJournal =
    Boolean(
      salesReturn.credit_journal_entry_id,
    );

  const hasInventoryJournal =
    Boolean(
      salesReturn.inventory_journal_entry_id,
    );

  if (
    hasCreditJournal &&
    hasInventoryJournal
  ) {
    return (
      <div>
        <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
          Fully Posted
        </span>

        {salesReturn.credit_journal ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {
              salesReturn
                .credit_journal
                .journal_number
            }
          </p>
        ) : null}
      </div>
    );
  }

  if (
    hasCreditJournal ||
    hasInventoryJournal
  ) {
    return (
      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
        Partially Posted
      </span>
    );
  }

  if (
    salesReturn.status === "received"
  ) {
    return (
      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
        Awaiting Posting
      </span>
    );
  }

  if (
    salesReturn.status === "cancelled"
  ) {
    return (
      <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
        Cancelled
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
      Not Posted
    </span>
  );
}

/* =========================================================
 * Return Status
 * ========================================================= */

function ReturnStatusBadge({
  status,
}: {
  status: SalesReturnStatus;
}) {
  const configuration: Record<
    SalesReturnStatus,
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

    approved: {
      label: "Approved",
      className:
        "border-blue-200 bg-blue-50 text-blue-700",
    },

    received: {
      label: "Received",
      className:
        "border-amber-200 bg-amber-50 text-amber-700",
    },

    posted: {
      label: "Posted",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700",
    },

    cancelled: {
      label: "Cancelled",
      className:
        "border-red-200 bg-red-50 text-red-700",
    },
  };

  const item =
    configuration[status];

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${item.className}`}
    >
      {item.label}
    </span>
  );
}

/* =========================================================
 * Formatting
 * ========================================================= */

function formatDate(
  value: string,
): string {
  const date =
    new Date(
      `${value}T00:00:00`,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-AE",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(
    date,
  );
}

function formatCurrency(
  value: number,
  currency: string,
): string {
  try {
    return new Intl.NumberFormat(
      "en-AE",
      {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    ).format(
      value,
    );
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}
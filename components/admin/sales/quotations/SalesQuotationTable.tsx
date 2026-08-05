import Link from "next/link";
import {
  ChevronRight,
  FileText,
  Plus,
} from "lucide-react";

import DataTable, {
  type DataTableColumn,
} from "@/components/admin/shared/DataTable";
import EmptyState from "@/components/admin/shared/EmptyState";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import type {
  GetSalesQuotationsResult,
  SalesQuotationSource,
} from "@/lib/repositories/sales-quotation.repository";

type SalesQuotationListRow =
  GetSalesQuotationsResult["data"][number];

interface SalesQuotationTableProps {
  quotations: SalesQuotationListRow[];
}

const columns: DataTableColumn<SalesQuotationListRow>[] =
  [
    {
      key: "quotation_number",
      header: "Quotation No.",
      width: "170px",
      render: (quotation) => (
        <Link
          href={`/admin/sales/quotations/${quotation.id}`}
          className="font-semibold text-foreground transition-colors hover:text-primary"
        >
          {quotation.quotation_number}
        </Link>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (quotation) => (
        <div className="min-w-0">
          <p className="font-semibold">
            {quotation.customer?.display_name ??
              "Unknown customer"}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            {quotation.customer?.customer_number ??
              "Customer unavailable"}
          </p>
        </div>
      ),
    },
    {
      key: "date",
      header: "Quotation Date",
      width: "145px",
      render: (quotation) =>
        formatDate(quotation.quotation_date),
    },
    {
      key: "valid_until",
      header: "Valid Until",
      width: "145px",
      render: (quotation) =>
        quotation.valid_until
          ? formatDate(quotation.valid_until)
          : "Not specified",
    },
    {
      key: "source",
      header: "Source",
      width: "175px",
      render: (quotation) => (
        <SourceBadge
          source={quotation.source}
        />
      ),
    },
    {
      key: "warehouse",
      header: "Warehouse",
      render: (quotation) => (
        <div>
          <p>
            {quotation.warehouse?.name ??
              "Not selected"}
          </p>

          {quotation.warehouse?.code ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {quotation.warehouse.code}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "total",
      header: "Grand Total",
      align: "right",
      width: "160px",
      render: (quotation) => (
        <span className="font-semibold">
          {formatCurrency(
            quotation.grand_total,
            quotation.currency_code,
          )}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      width: "125px",
      render: (quotation) => (
        <StatusBadge
          status={quotation.status}
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
      render: (quotation) => (
        <Link
          href={`/admin/sales/quotations/${quotation.id}`}
          aria-label={`View ${quotation.quotation_number}`}
          className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </Link>
      ),
    },
  ];

export default function SalesQuotationTable({
  quotations,
}: SalesQuotationTableProps) {
  return (
    <DataTable
      rows={quotations}
      columns={columns}
      getRowKey={(quotation) =>
        quotation.id
      }
      minimumWidth="1250px"
      emptyState={
        <EmptyState
          icon={FileText}
          title="No sales quotations found"
          description="Try changing the search criteria or filters. Create a quotation when you are ready to send an offer to a customer."
          action={{
            href: "/admin/sales/quotations/new",
            label: "New Quotation",
            icon: Plus,
          }}
        />
      }
    />
  );
}

function SourceBadge({
  source,
}: {
  source: SalesQuotationSource;
}) {
  const labels: Record<
    SalesQuotationSource,
    string
  > = {
    internal: "Internal",
    hmshoponline: "HMShopOnline",
    dubaiwholesalehub:
      "Dubai Wholesale Hub",
    import: "Imported",
  };

  return (
    <span className="inline-flex rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground">
      {labels[source]}
    </span>
  );
}

function formatDate(value: string): string {
  const date = new Date(
    `${value}T00:00:00`,
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatCurrency(
  value: number,
  currency: string,
): string {
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
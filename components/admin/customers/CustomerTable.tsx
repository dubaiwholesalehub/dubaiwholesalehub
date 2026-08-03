import Link from "next/link";
import {
  Building2,
  ChevronRight,
  Plus,
  UserRound,
  Users,
} from "lucide-react";

import DataTable, {
  type DataTableColumn,
} from "@/components/admin/shared/DataTable";
import EmptyState from "@/components/admin/shared/EmptyState";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import type {
  Customer,
  CustomerSource,
} from "@/lib/repositories/customer.repository";

interface CustomerTableProps {
  customers: Customer[];
}

const currencyFormatter = new Intl.NumberFormat(
  "en-AE",
  {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  },
);

const columns: DataTableColumn<Customer>[] = [
  {
    key: "customer_number",
    header: "Customer No.",
    width: "165px",
    render: (customer) => (
      <span className="font-semibold">
        {customer.customer_number}
      </span>
    ),
  },
  {
    key: "customer",
    header: "Customer",
    render: (customer) => (
      <div className="min-w-0">
        <Link
          href={`/admin/customers/${customer.id}`}
          className="font-semibold text-foreground transition-colors hover:text-primary"
        >
          {customer.display_name}
        </Link>

        {customer.company_name &&
        customer.company_name !==
          customer.display_name ? (
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {customer.company_name}
          </p>
        ) : null}
      </div>
    ),
  },
  {
    key: "type",
    header: "Type",
    width: "130px",
    render: (customer) => (
      <CustomerTypeBadge
        type={customer.customer_type}
      />
    ),
  },
  {
    key: "contact",
    header: "Contact",
    render: (customer) => (
      <div>
        <p>
          {customer.phone?.trim() ||
            customer.whatsapp?.trim() ||
            "Not provided"}
        </p>

        {customer.email ? (
          <p className="mt-1 max-w-56 truncate text-xs text-muted-foreground">
            {customer.email}
          </p>
        ) : null}
      </div>
    ),
  },
  {
    key: "source",
    header: "Source",
    width: "170px",
    render: (customer) => (
      <CustomerSourceBadge
        source={customer.source}
      />
    ),
  },
  {
    key: "credit",
    header: "Credit Limit",
    align: "right",
    width: "150px",
    render: (customer) => (
      <span className="font-medium">
        {customer.currency_code}{" "}
        {currencyFormatter.format(
          customer.credit_limit,
        )}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    align: "center",
    width: "120px",
    render: (customer) => (
      <StatusBadge
        status={customer.status}
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
    render: (customer) => (
      <Link
        href={`/admin/customers/${customer.id}`}
        aria-label={`View ${customer.display_name}`}
        className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ChevronRight className="size-4" />
      </Link>
    ),
  },
];

export default function CustomerTable({
  customers,
}: CustomerTableProps) {
  return (
    <DataTable
      rows={customers}
      columns={columns}
      getRowKey={(customer) =>
        customer.id
      }
      minimumWidth="1150px"
      emptyState={
        <EmptyState
          title="No customers found"
          description="Try changing the search criteria or filters. If no customer records exist, create your first customer."
          icon={Users}
          action={{
            href: "/admin/customers/new",
            label: "New Customer",
            icon: Plus,
          }}
        />
      }
    />
  );
}

interface CustomerTypeBadgeProps {
  type: Customer["customer_type"];
}

function CustomerTypeBadge({
  type,
}: CustomerTypeBadgeProps) {
  const Icon =
    type === "business"
      ? Building2
      : UserRound;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-semibold capitalize text-foreground">
      <Icon className="size-3.5" />
      {type}
    </span>
  );
}

interface CustomerSourceBadgeProps {
  source: CustomerSource;
}

function CustomerSourceBadge({
  source,
}: CustomerSourceBadgeProps) {
  const labels: Record<
    CustomerSource,
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
import Link from "next/link";
import { Building2, ChevronRight, Plus, UserRound, Users } from "lucide-react";

import DataTable, {
  type DataTableColumn,
} from "@/components/admin/shared/DataTable";
import EmptyState from "@/components/admin/shared/EmptyState";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import type {
  Customer,
  CustomerSource,
} from "@/lib/repositories/customer.repository";
import type { CustomerFinancialPosition } from "@/lib/repositories/customer-statement.repository";

interface CustomerTableProps {
  customers: Customer[];

  financialPositions: Record<string, CustomerFinancialPosition>;
}

const currencyFormatter = new Intl.NumberFormat("en-AE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function createColumns(
  financialPositions: Record<string, CustomerFinancialPosition>,
): DataTableColumn<Customer>[] {
  return [
    {
      key: "customer_number",
      header: "Customer No.",
      width: "165px",
      render: (customer) => (
        <span className="font-semibold">{customer.customer_number}</span>
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
          customer.company_name !== customer.display_name ? (
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
      render: (customer) => <CustomerTypeBadge type={customer.customer_type} />,
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
      render: (customer) => <CustomerSourceBadge source={customer.source} />,
    },
    {
      key: "credit",
      header: "Credit Limit",
      align: "right",
      width: "150px",
      render: (customer) => (
        <span className="font-medium">
          {customer.currency_code}{" "}
          {currencyFormatter.format(customer.credit_limit)}
        </span>
      ),
    },
    {
      key: "receivable",
      header: "Receivable",
      align: "right",
      width: "145px",
      render: (customer) => {
        const position = financialPositions[customer.id];

        const value = position?.receivable ?? 0;

        return <FinancialAmount value={value} type="receivable" />;
      },
    },
    {
      key: "advance",
      header: "Advance",
      align: "right",
      width: "145px",
      render: (customer) => {
        const position = financialPositions[customer.id];

        const value = position?.advance ?? 0;

        return <FinancialAmount value={value} type="advance" />;
      },
    },
    {
      key: "netPosition",
      header: "Net Position",
      align: "right",
      width: "165px",
      render: (customer) => {
        const position = financialPositions[customer.id];

        return (
          <CustomerNetPosition
            customerId={customer.id}
            value={position?.netPosition ?? 0}
          />
        );
      },
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      width: "120px",
      render: (customer) => <StatusBadge status={customer.status} />,
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
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
}

export default function CustomerTable({
  customers,
  financialPositions,
}: CustomerTableProps) {
  const columns = createColumns(financialPositions);
  return (
    <DataTable
      rows={customers}
      columns={columns}
      getRowKey={(customer) => customer.id}
      minimumWidth="1580px"
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

function CustomerTypeBadge({ type }: CustomerTypeBadgeProps) {
  const Icon = type === "business" ? Building2 : UserRound;

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

function CustomerSourceBadge({ source }: CustomerSourceBadgeProps) {
  const labels: Record<CustomerSource, string> = {
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

interface FinancialAmountProps {
  value: number;

  type: "receivable" | "advance";
}

function FinancialAmount({ value, type }: FinancialAmountProps) {
  if (Math.abs(value) < 0.005) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  const className =
    type === "receivable" ? "text-amber-700" : "text-violet-700";

  return (
    <span className={`whitespace-nowrap text-sm font-semibold ${className}`}>
      AED {currencyFormatter.format(value)}
    </span>
  );
}

function CustomerNetPosition({
  customerId,
  value,
}: {
  customerId: string;
  value: number;
}) {
  const absoluteValue = Math.abs(value);

  if (absoluteValue < 0.005) {
    return (
      <Link
        href={`/admin/sales/customer-statement?customerId=${customerId}`}
        className="inline-flex whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
      >
        Settled
      </Link>
    );
  }

  const isReceivable = value > 0;

  return (
    <Link
      href={`/admin/sales/customer-statement?customerId=${customerId}`}
      className={[
        "inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold transition",
        isReceivable
          ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
          : "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100",
      ].join(" ")}
    >
      AED {currencyFormatter.format(absoluteValue)}{" "}
      {isReceivable ? "Due" : "Advance"}
    </Link>
  );
}

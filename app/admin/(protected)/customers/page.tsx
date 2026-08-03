import {
  Plus,
  Users,
} from "lucide-react";

import CustomerFilters from "@/components/admin/customers/CustomerFilters";
import CustomerPagination from "@/components/admin/customers/CustomerPagination";
import CustomerSummaryCards from "@/components/admin/customers/CustomerSummaryCards";
import CustomerTable from "@/components/admin/customers/CustomerTable";
import PageHeader from "@/components/admin/shared/PageHeader";
import {
  getCustomerPage,
  getCustomerSummary,
  type CustomerSource,
  type CustomerStatus,
  type CustomerType,
} from "@/lib/repositories/customer.repository";

interface CustomersPageProps {
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
): CustomerStatus | "all" {
  const statuses:
    readonly CustomerStatus[] = [
      "active",
      "inactive",
      "blocked",
    ];

  return statuses.includes(
    value as CustomerStatus,
  )
    ? (value as CustomerStatus)
    : "all";
}

function normalizeCustomerType(
  value: string | undefined,
): CustomerType | "all" {
  const types:
    readonly CustomerType[] = [
      "business",
      "individual",
    ];

  return types.includes(
    value as CustomerType,
  )
    ? (value as CustomerType)
    : "all";
}

function normalizeSource(
  value: string | undefined,
): CustomerSource | "all" {
  const sources:
    readonly CustomerSource[] = [
      "internal",
      "hmshoponline",
      "dubaiwholesalehub",
      "import",
    ];

  return sources.includes(
    value as CustomerSource,
  )
    ? (value as CustomerSource)
    : "all";
}

export default async function CustomersPage({
  searchParams,
}: CustomersPageProps) {
  const params = await searchParams;

  const search =
    getStringParam(params.search)?.trim() ??
    "";

  const status = normalizeStatus(
    getStringParam(params.status),
  );

  const customerType =
    normalizeCustomerType(
      getStringParam(
        params.customerType,
      ),
    );

  const source = normalizeSource(
    getStringParam(params.source),
  );

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
      getCustomerPage({
        search: search || undefined,
        status,
        customerType,
        source,
        page,
        pageSize,
      }),

      getCustomerSummary(),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Manage retail, wholesale and export customer records, contact information, credit settings and sales-channel sources."
        icon={Users}
        action={{
          href: "/admin/customers/new",
          label: "New Customer",
          icon: Plus,
        }}
      />

      <CustomerSummaryCards
        summary={summary}
      />

      <CustomerFilters
        values={{
          search,
          status,
          customerType,
          source,
          pageSize: String(pageSize),
        }}
      />

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {result.count} matching customer
            {result.count === 1 ? "" : "s"}
          </p>
        </div>

        <CustomerTable
          customers={result.data}
        />

        <CustomerPagination
          page={result.page}
          totalPages={result.totalPages}
          totalCount={result.count}
          pageSize={result.pageSize}
          searchParams={{
            search:
              search || undefined,
            status,
            customerType,
            source,
            pageSize:
              String(pageSize),
          }}
        />
      </section>
    </div>
  );
}
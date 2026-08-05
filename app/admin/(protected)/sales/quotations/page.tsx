import {
  FileText,
  Plus,
} from "lucide-react";

import PageHeader from "@/components/admin/shared/PageHeader";
import SalesQuotationFilters from "@/components/admin/sales/quotations/SalesQuotationFilters";
import SalesQuotationPagination from "@/components/admin/sales/quotations/SalesQuotationPagination";
import SalesQuotationSummaryCards from "@/components/admin/sales/quotations/SalesQuotationSummaryCards";
import SalesQuotationTable from "@/components/admin/sales/quotations/SalesQuotationTable";
import {
  getSalesQuotationPage,
  getSalesQuotationSummary,
  type SalesQuotationSource,
  type SalesQuotationStatus,
} from "@/lib/repositories/sales-quotation.repository";

interface SalesQuotationsPageProps {
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
): SalesQuotationStatus | "all" {
  const statuses:
    readonly SalesQuotationStatus[] = [
      "draft",
      "sent",
      "accepted",
      "rejected",
      "expired",
      "cancelled",
      "converted",
    ];

  return statuses.includes(
    value as SalesQuotationStatus,
  )
    ? (value as SalesQuotationStatus)
    : "all";
}

function normalizeSource(
  value: string | undefined,
): SalesQuotationSource | "all" {
  const sources:
    readonly SalesQuotationSource[] = [
      "internal",
      "hmshoponline",
      "dubaiwholesalehub",
      "import",
    ];

  return sources.includes(
    value as SalesQuotationSource,
  )
    ? (value as SalesQuotationSource)
    : "all";
}

export default async function SalesQuotationsPage({
  searchParams,
}: SalesQuotationsPageProps) {
  const params = await searchParams;

  const search =
    getStringParam(params.search)?.trim() ??
    "";

  const status = normalizeStatus(
    getStringParam(params.status),
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
      getSalesQuotationPage({
        search: search || undefined,
        status,
        source,
        page,
        pageSize,
      }),

      getSalesQuotationSummary(),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Quotations"
        description="Prepare and manage retail, wholesale and export quotations before converting accepted offers into sales orders."
        icon={FileText}
        action={{
          href: "/admin/sales/quotations/new",
          label: "New Quotation",
          icon: Plus,
        }}
      />

      <SalesQuotationSummaryCards
        summary={summary}
      />

      <SalesQuotationFilters
        values={{
          search,
          status,
          source,
          pageSize: String(pageSize),
        }}
      />

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {result.count} matching quotation
            {result.count === 1 ? "" : "s"}
          </p>
        </div>

        <SalesQuotationTable
          quotations={result.data}
        />

        <SalesQuotationPagination
          page={result.page}
          totalPages={result.totalPages}
          totalCount={result.count}
          pageSize={result.pageSize}
          searchParams={{
            search:
              search || undefined,
            status,
            source,
            pageSize:
              String(pageSize),
          }}
        />
      </section>
    </div>
  );
}
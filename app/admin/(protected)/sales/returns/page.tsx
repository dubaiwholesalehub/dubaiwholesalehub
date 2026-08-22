import {
  Plus,
  RotateCcw,
} from "lucide-react";

import PageHeader from "@/components/admin/shared/PageHeader";
import SalesReturnFilters from "@/components/admin/sales/returns/SalesReturnFilters";
import SalesReturnPagination from "@/components/admin/sales/returns/SalesReturnPagination";
import SalesReturnSummaryCards from "@/components/admin/sales/returns/SalesReturnSummaryCards";
import SalesReturnTable from "@/components/admin/sales/returns/SalesReturnTable";
import {
  getSalesReturnPage,
  getSalesReturnSummary,
  type SalesReturnStatus,
} from "@/lib/repositories/sales-return.repository";

interface SalesReturnsPageProps {
  searchParams: Promise<
    Record<
      string,
      string | string[] | undefined
    >
  >;
}

function getStringParam(
  value:
    | string
    | string[]
    | undefined,
): string | undefined {
  return typeof value === "string"
    ? value
    : undefined;
}

function getPositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  const parsed =
    Number(
      value,
    );

  return Number.isInteger(
    parsed,
  ) &&
    parsed > 0
    ? parsed
    : fallback;
}

function normalizeStatus(
  value: string | undefined,
): SalesReturnStatus | "all" {
  const statuses:
    readonly SalesReturnStatus[] = [
      "draft",
      "approved",
      "received",
      "posted",
      "cancelled",
    ];

  return statuses.includes(
    value as SalesReturnStatus,
  )
    ? (
        value as
          SalesReturnStatus
      )
    : "all";
}

export default async function SalesReturnsPage({
  searchParams,
}: SalesReturnsPageProps) {
  const params =
    await searchParams;

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
  ] =
    await Promise.all([
      getSalesReturnPage({
        search:
          search ||
          undefined,

        status,

        dateFrom:
          dateFrom ||
          undefined,

        dateTo:
          dateTo ||
          undefined,

        page,

        pageSize,
      }),

      getSalesReturnSummary(),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Returns"
        description="Manage customer returns, stock receipts, customer credits and General Ledger posting."
        icon={RotateCcw}
        action={{
          href:
            "/admin/sales/returns/new",

          label:
            "New Sales Return",

          icon:
            Plus,
        }}
      />

      <SalesReturnSummaryCards
        summary={summary}
      />

      <SalesReturnFilters
        values={{
          search,

          status,

          pageSize:
            String(
              pageSize,
            ),
        }}
      />

      <SalesReturnTable
        returns={
          result.data
        }
      />

      <SalesReturnPagination
        page={
          result.page
        }
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
            search ||
            undefined,

          status,

          dateFrom:
            dateFrom ||
            undefined,

          dateTo:
            dateTo ||
            undefined,

          pageSize:
            String(
              pageSize,
            ),
        }}
      />
    </div>
  );
}
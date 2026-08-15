import {
  Plus,
  ReceiptText,
} from "lucide-react";

import PageHeader from "@/components/admin/shared/PageHeader";
import CustomerReceiptFilters from "@/components/admin/sales/receipts/CustomerReceiptFilters";
import CustomerReceiptPagination from "@/components/admin/sales/receipts/CustomerReceiptPagination";
import CustomerReceiptSummaryCards from "@/components/admin/sales/receipts/CustomerReceiptSummaryCards";
import CustomerReceiptTable from "@/components/admin/sales/receipts/CustomerReceiptTable";

import {
  getCustomerReceiptPage,
  getCustomerReceiptSummary,
  type CustomerReceiptPaymentMethod,
  type CustomerReceiptStatus,
} from "@/lib/repositories/customer-receipt.repository";

interface CustomerReceiptsPageProps {
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
): CustomerReceiptStatus | "all" {
  return value === "posted" ||
    value === "cancelled"
    ? value
    : "all";
}

function normalizePaymentMethod(
  value: string | undefined,
): CustomerReceiptPaymentMethod | "all" {
  const methods:
    CustomerReceiptPaymentMethod[] = [
      "cash",
      "bank",
      "card",
      "cheque",
      "other",
    ];

  return methods.includes(
    value as CustomerReceiptPaymentMethod,
  )
    ? (value as CustomerReceiptPaymentMethod)
    : "all";
}

export default async function CustomerReceiptsPage({
  searchParams,
}: CustomerReceiptsPageProps) {
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

  const paymentMethod =
    normalizePaymentMethod(
      getStringParam(
        params.paymentMethod,
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
    getCustomerReceiptPage({
      search:
        search || undefined,

      status,

      paymentMethod,

      dateFrom:
        dateFrom || undefined,

      dateTo:
        dateTo || undefined,

      page,
      pageSize,
    }),

    getCustomerReceiptSummary(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Receipts"
        description="Track customer payments, allocations, outstanding balances and receipt history."
        icon={ReceiptText}
        action={{
          href: "/admin/sales/receipts/new",
          label: "New Receipt",
          icon: Plus,
        }}
      />

      <CustomerReceiptSummaryCards
        summary={summary}
      />

      <CustomerReceiptFilters
        values={{
          search,
          status,
          paymentMethod,
          dateFrom,
          dateTo,
          pageSize:
            String(pageSize),
        }}
      />

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {result.count} matching receipt
            {result.count === 1
              ? ""
              : "s"}
          </p>
        </div>

        <CustomerReceiptTable
          receipts={result.data}
        />

        <CustomerReceiptPagination
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

            paymentMethod,

            dateFrom:
              dateFrom || undefined,

            dateTo:
              dateTo || undefined,

            pageSize:
              String(pageSize),
          }}
        />
      </section>
    </div>
  );
}
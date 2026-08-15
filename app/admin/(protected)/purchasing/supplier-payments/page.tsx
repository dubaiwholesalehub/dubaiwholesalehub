import {
  HandCoins,
  Plus,
} from "lucide-react";

import PageHeader from "@/components/admin/shared/PageHeader";

import SupplierPaymentFilters from "@/components/admin/purchasing/supplier-payments/SupplierPaymentFilters";

import SupplierPaymentPagination from "@/components/admin/purchasing/supplier-payments/SupplierPaymentPagination";

import SupplierPaymentSummaryCards from "@/components/admin/purchasing/supplier-payments/SupplierPaymentSummaryCards";

import SupplierPaymentTable from "@/components/admin/purchasing/supplier-payments/SupplierPaymentTable";

import {
  getSupplierPaymentPage,
  getSupplierPaymentSummary,
  type SupplierPaymentMethod,
  type SupplierPaymentStatus,
} from "@/lib/repositories/supplier-payment.repository";


interface SupplierPaymentsPageProps {
  searchParams: Promise<
    Record<
      string,
      string |
      string[] |
      undefined
    >
  >;
}


function getStringParam(
  value:
    | string
    | string[]
    | undefined,
): string | undefined {
  return typeof value ===
    "string"
    ? value
    : undefined;
}


function getPositiveInteger(
  value:
    string | undefined,

  fallback:
    number,
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
  value:
    string | undefined,
): SupplierPaymentStatus | "all" {
  return value ===
      "posted" ||
    value ===
      "cancelled"
    ? value
    : "all";
}


function normalizePaymentMethod(
  value:
    string | undefined,
): SupplierPaymentMethod | "all" {
  const methods:
    SupplierPaymentMethod[] =
    [
      "cash",
      "bank",
      "card",
      "cheque",
      "other",
    ];

  return methods.includes(
    value as
      SupplierPaymentMethod,
  )
    ? (
        value as
          SupplierPaymentMethod
      )
    : "all";
}


export default async function SupplierPaymentsPage({
  searchParams,
}: SupplierPaymentsPageProps) {
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
  ] =
    await Promise.all([
      getSupplierPaymentPage({
        search:
          search ||
          undefined,

        status,

        paymentMethod,

        dateFrom:
          dateFrom ||
          undefined,

        dateTo:
          dateTo ||
          undefined,

        page,

        pageSize,
      }),

      getSupplierPaymentSummary(),
    ]);


  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Payments"
        description="Track supplier payments, allocations, outstanding payables and supplier advances."
        icon={HandCoins}
        action={{
          href:
            "/admin/purchasing/supplier-payments/new",

          label:
            "New Supplier Payment",

          icon:
            Plus,
        }}
      />

      <SupplierPaymentSummaryCards
        summary={
          summary
        }
      />

      <SupplierPaymentFilters
        values={{
          search,

          status,

          paymentMethod,

          dateFrom,

          dateTo,

          pageSize:
            String(
              pageSize,
            ),
        }}
      />

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {result.count} matching supplier payment
            {result.count === 1
              ? ""
              : "s"}
          </p>
        </div>

        <SupplierPaymentTable
          payments={
            result.data
          }
        />

        <SupplierPaymentPagination
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

            paymentMethod,

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
      </section>
    </div>
  );
}
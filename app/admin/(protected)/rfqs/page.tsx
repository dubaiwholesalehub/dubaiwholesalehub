import Link from "next/link";
import { getRfqs } from "@/lib/repositories/rfq";
import { RfqTable } from "@/components/admin/rfqs/rfq-table";
import { RfqToolbar } from "@/components/admin/rfqs/rfq-toolbar";
import type { Database } from "@/lib/database.types";

interface RfqsPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
  }>;
}
type RfqStatus =
  Database["public"]["Enums"]["rfq_status"];

type RfqStatusFilter = RfqStatus | "all";

const rfqStatuses: readonly RfqStatusFilter[] = [
  "all",
  "draft",
  "ready",
  "sent",
  "partially_quoted",
  "quoted",
  "under_review",
  "awarded",
  "closed",
  "cancelled",
];

function parseRfqStatus(
  value: string | undefined,
): RfqStatusFilter | undefined {
  if (!value) {
    return undefined;
  }

  return rfqStatuses.includes(
    value as RfqStatusFilter,
  )
    ? (value as RfqStatusFilter)
    : undefined;
}

export default async function RfqsPage({
  searchParams,
}: RfqsPageProps) {
  const params = await searchParams;

  const search = params.search?.trim() ?? "";
  const status =
  parseRfqStatus(params.status?.trim());
  const page = Math.max(Number(params.page) || 1, 1);

  const { data: rfqs } = await getRfqs({
    search: search || undefined,
    status,
    page,
  });
  const totalRfqs = rfqs.length;

const draftRfqs = rfqs.filter(
  (rfq) => rfq.status === "draft",
).length;

const awaitingQuotationRfqs = rfqs.filter(
  (rfq) =>
    rfq.status === "sent" ||
    rfq.status === "partially_quoted" ||
    rfq.status === "quoted",
).length;

const awardedRfqs = rfqs.filter(
  (rfq) => rfq.status === "awarded",
).length;
    return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Request for Quotations
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Create, manage, send, compare, and award supplier quotations.
          </p>
        </div>

        <Link
          href="/admin/rfqs/new"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Create RFQ
        </Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <RfqsSummaryCard
          label="Total RFQs"
          value={String(totalRfqs)}
          description="All procurement requests"
        />

        <RfqsSummaryCard
          label="Draft"
          value={String(draftRfqs)}
          description="RFQs being prepared"
        />

        <RfqsSummaryCard
          label="Awaiting Quotations"
          value={String(awaitingQuotationRfqs)}
          description="Open supplier requests"
        />

        <RfqsSummaryCard
          label="Awarded"
          value={String(awardedRfqs)}
          description="Completed supplier awards"
        />
      </section>

      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="border-b p-4">
          <h2 className="font-semibold">
            RFQ Repository
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Search and manage all requests for quotation.
          </p>
        </div>
        <RfqToolbar
          search={search}
          status={
            status === "all"
              ? ""
              : status ?? ""
          }
        />
        <RfqTable rfqs={rfqs} />

      </section>
    </div>
  );
}

interface RfqsSummaryCardProps {
  label: string;
  value: string;
  description: string;
}

function RfqsSummaryCard({
  label,
  value,
  description,
}: RfqsSummaryCardProps) {
  return (
    <article className="rounded-lg border bg-card p-5 text-card-foreground">
      <p className="text-sm font-medium text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 text-3xl font-semibold tracking-tight">
        {value}
      </p>

      <p className="mt-1 text-xs text-muted-foreground">
        {description}
      </p>
    </article>
  );
}
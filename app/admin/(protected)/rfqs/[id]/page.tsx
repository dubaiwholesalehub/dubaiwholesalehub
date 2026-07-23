import { notFound } from "next/navigation";

import {
  getRfqDetailSummary,
  getRfqHeaderById,
} from "@/lib/repositories/rfq";

import { RfqStatusBadge } from "@/components/admin/rfqs/rfq-status-badge";
import { RfqWorkspaceTabs } from "@/components/admin/rfqs/rfq-workspace-tabs";
import {
  RfqGeneralInformation,
  RfqImportantDates,
  RfqSummaryCards,
} from "@/components/admin/rfqs/detail";

import { getRfqTimeline } from "@/lib/repositories/rfq";
import { RfqTimeline } from "@/components/admin/rfqs/timeline";
import { getRfqComparisonData } from "@/lib/repositories/rfq";
import { ComparisonTable } from "@/components/admin/rfqs/comparison";


interface RfqDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function RfqDetailPage({
  params,
}: RfqDetailPageProps) {
  const { id } = await params;

  const [rfq, summary, timeline, comparison] = await Promise.all([
    getRfqHeaderById(id),
    getRfqDetailSummary(id),
    getRfqTimeline(id),
    getRfqComparisonData(id),
  ]);

  if (!rfq || !summary) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {rfq.rfq_number}
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {rfq.title}
          </h1>

          {rfq.description && (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {rfq.description}
            </p>
          )}
        </div>

        <RfqStatusBadge status={rfq.status} />
      </header>

      <div className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <RfqWorkspaceTabs
            rfqId={rfq.id}
            active="overview"
          />
        </div>

        <div className="p-6">
          <RfqSummaryCards
            currency={rfq.currency_code}
            itemCount={summary.itemCount}
            supplierCount={summary.supplierCount}
            quotationCount={summary.quotationCount}
            pendingResponses={summary.pendingSupplierCount}
          />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <RfqGeneralInformation
            currency={rfq.currency_code}
            deliveryLocation={rfq.delivery_location}
            incoterm={rfq.incoterm}
            paymentTerms={rfq.payment_terms}
          />

          <RfqImportantDates
            responseDeadline={rfq.response_deadline}
            requiredDeliveryDate={rfq.required_delivery_date}
            createdAt={rfq.created_at}
            updatedAt={rfq.updated_at}
          />
        </div>
        <div className="mt-6">
          <ComparisonTable data={comparison} />
        </div>
        <div className="mt-6">
          <RfqTimeline events={timeline} />
        </div>
      </div>
    </div>
  );
}

interface InfoCardProps {
  label: string;
  value: string;
}

function InfoCard({
  label,
  value,
}: InfoCardProps) {
  return (
    <div className="rounded-lg border bg-background p-5">
      <p className="text-sm text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 text-3xl font-semibold tracking-tight">
        {value}
      </p>
    </div>
  );
}
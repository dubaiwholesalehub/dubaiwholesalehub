import {
  CheckCircle2,
  CircleDollarSign,
  FileText,
  Send,
  ShoppingCart,
} from "lucide-react";

import SummaryCards from "@/components/admin/shared/SummaryCards";
import type {
  SalesQuotationSummary,
} from "@/lib/repositories/sales-quotation.repository";

interface SalesQuotationSummaryCardsProps {
  summary: SalesQuotationSummary;
}

export default function SalesQuotationSummaryCards({
  summary,
}: SalesQuotationSummaryCardsProps) {
  return (
    <SummaryCards
      className="xl:grid-cols-5"
      cards={[
        {
          key: "total",
          label: "Total Quotations",
          value: summary.total,
          description: "All quotation records",
          icon: FileText,
        },
        {
          key: "draft",
          label: "Draft",
          value: summary.draft,
          description: "Still being prepared",
          icon: FileText,
          iconClassName:
            "bg-slate-100 text-slate-700",
        },
        {
          key: "sent",
          label: "Sent",
          value: summary.sent,
          description: "Awaiting customer response",
          icon: Send,
          iconClassName:
            "bg-blue-50 text-blue-700",
        },
        {
          key: "accepted",
          label: "Accepted",
          value: summary.accepted,
          description: "Approved by customers",
          icon: CheckCircle2,
          iconClassName:
            "bg-emerald-50 text-emerald-700",
        },
        {
          key: "pipeline",
          label: "Pipeline Value",
          value: formatCurrency(
            summary.totalValue,
            "AED",
          ),
          description: "Sent, accepted and converted",
          icon: CircleDollarSign,
          iconClassName:
            "bg-violet-50 text-violet-700",
        },
      ]}
    />
  );
}

function formatCurrency(
  value: number,
  currency: string,
): string {
  try {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}
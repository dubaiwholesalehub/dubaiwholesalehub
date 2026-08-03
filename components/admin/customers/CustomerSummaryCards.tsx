import {
  Building2,
  CheckCircle2,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";

import SummaryCards from "@/components/admin/shared/SummaryCards";
import type { CustomerSummary } from "@/lib/repositories/customer.repository";

interface CustomerSummaryCardsProps {
  summary: CustomerSummary;
}

export default function CustomerSummaryCards({
  summary,
}: CustomerSummaryCardsProps) {
  return (
    <SummaryCards
      className="xl:grid-cols-5"
      cards={[
        {
          key: "total",
          label: "Total Customers",
          value: summary.total,
          description: "All customer records",
          icon: Users,
        },
        {
          key: "active",
          label: "Active",
          value: summary.active,
          description: "Available for transactions",
          icon: CheckCircle2,
          iconClassName:
            "bg-emerald-50 text-emerald-700",
        },
        {
          key: "inactive",
          label: "Inactive",
          value: summary.inactive,
          description: "Currently inactive",
          icon: XCircle,
          iconClassName:
            "bg-slate-100 text-slate-600",
        },
        {
          key: "business",
          label: "Business",
          value: summary.business,
          description: "Company customers",
          icon: Building2,
          iconClassName:
            "bg-blue-50 text-blue-700",
        },
        {
          key: "individual",
          label: "Individual",
          value: summary.individual,
          description: "Individual customers",
          icon: UserRound,
          iconClassName:
            "bg-violet-50 text-violet-700",
        },
      ]}
    />
  );
}
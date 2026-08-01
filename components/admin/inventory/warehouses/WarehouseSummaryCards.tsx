import { Building2, CheckCircle2, Star, XCircle } from "lucide-react";

import SummaryCards from "@/components/admin/shared/SummaryCards";
import type { WarehouseSummary } from "@/lib/repositories/warehouse.repository";

interface WarehouseSummaryCardsProps {
  summary: WarehouseSummary;
}

export default function WarehouseSummaryCards({
  summary,
}: WarehouseSummaryCardsProps) {
  return (
    <SummaryCards
      cards={[
        {
          key: "total",
          label: "Total Warehouses",
          value: summary.total,
          description: "All registered locations",
          icon: Building2,
        },
        {
          key: "active",
          label: "Active",
          value: summary.active,
          description: "Available for operations",
          icon: CheckCircle2,
          iconClassName: "bg-emerald-50 text-emerald-700",
        },
        {
          key: "inactive",
          label: "Inactive",
          value: summary.inactive,
          description: "Currently disabled",
          icon: XCircle,
          iconClassName: "bg-red-50 text-red-700",
        },
        {
          key: "default",
          label: "Default Warehouse",
          value: summary.defaultWarehouse?.code ?? "Not set",
          description:
            summary.defaultWarehouse?.name ?? "No default warehouse selected",
          icon: Star,
          iconClassName: "bg-amber-50 text-amber-700",
        },
      ]}
    />
  );
}

import {
  CheckCircle2,
  Circle,
  Clock3,
  Package,
  Truck,
  XCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type StatusBadgeVariant =
  | "active"
  | "inactive"
  | "draft"
  | "published"
  | "pending"
  | "completed"
  | "cancelled"
  | "processing";

interface StatusBadgeProps {
  status: StatusBadgeVariant;
  className?: string;
}

const STATUS_CONFIG: Record<
  StatusBadgeVariant,
  {
    label: string;
    icon: React.ComponentType<{
      className?: string;
    }>;
    className: string;
  }
> = {
  active: {
    label: "Active",
    icon: CheckCircle2,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
  },

  inactive: {
    label: "Inactive",
    icon: XCircle,
    className:
      "border-red-200 bg-red-50 text-red-700",
  },

  draft: {
    label: "Draft",
    icon: Circle,
    className:
      "border-slate-200 bg-slate-50 text-slate-700",
  },

  pending: {
    label: "Pending",
    icon: Clock3,
    className:
      "border-amber-200 bg-amber-50 text-amber-700",
  },

  processing: {
    label: "Processing",
    icon: Package,
    className:
      "border-blue-200 bg-blue-50 text-blue-700",
  },

  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
  },

  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    className:
      "border-red-200 bg-red-50 text-red-700",
  },

  published: {
    label: "Published",
    icon: Truck,
    className:
      "border-indigo-200 bg-indigo-50 text-indigo-700",
  },
};

export default function StatusBadge({
  status,
  className,
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
        config.className,
        className,
      )}
    >
      <Icon className="size-3.5" />

      {config.label}
    </span>
  );
}
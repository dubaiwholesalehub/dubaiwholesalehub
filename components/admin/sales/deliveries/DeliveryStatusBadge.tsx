import type {
  DeliveryOrderStatus,
} from "@/lib/repositories/delivery-order.repository";

interface DeliveryStatusBadgeProps {
  status: DeliveryOrderStatus;
  showDot?: boolean;
}

const configuration: Record<
  DeliveryOrderStatus,
  {
    label: string;
    className: string;
    dotClassName: string;
  }
> = {
  draft: {
    label: "Draft",
    className:
      "border-slate-200 bg-slate-50 text-slate-700",
    dotClassName:
      "bg-slate-500",
  },

  picking: {
    label: "Picking",
    className:
      "border-blue-200 bg-blue-50 text-blue-700",
    dotClassName:
      "bg-blue-500",
  },

  picked: {
    label: "Picked",
    className:
      "border-cyan-200 bg-cyan-50 text-cyan-700",
    dotClassName:
      "bg-cyan-500",
  },

  packing: {
    label: "Packing",
    className:
      "border-indigo-200 bg-indigo-50 text-indigo-700",
    dotClassName:
      "bg-indigo-500",
  },

  packed: {
    label: "Packed",
    className:
      "border-violet-200 bg-violet-50 text-violet-700",
    dotClassName:
      "bg-violet-500",
  },

  dispatched: {
    label: "Dispatched",
    className:
      "border-orange-200 bg-orange-50 text-orange-700",
    dotClassName:
      "bg-orange-500",
  },

  delivered: {
    label: "Delivered",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
    dotClassName:
      "bg-emerald-500",
  },

  cancelled: {
    label: "Cancelled",
    className:
      "border-red-200 bg-red-50 text-red-700",
    dotClassName:
      "bg-red-500",
  },
};

export default function DeliveryStatusBadge({
  status,
  showDot = true,
}: DeliveryStatusBadgeProps) {
  const item =
    configuration[status];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${item.className}`}
    >
      {showDot ? (
        <span
          aria-hidden="true"
          className={`size-1.5 rounded-full ${item.dotClassName}`}
        />
      ) : null}

      {item.label}
    </span>
  );
}
import {
  ArrowLeft,
  Truck,
} from "lucide-react";

import EmptyState from "@/components/admin/shared/EmptyState";

export default function DeliveryOrderNotFound() {
  return (
    <EmptyState
      icon={Truck}
      title="Delivery order not found"
      description="The requested Delivery Order does not exist or is no longer available."
      action={{
        href:
          "/admin/sales/deliveries",
        label:
          "Back to Delivery Orders",
        icon: ArrowLeft,
      }}
    />
  );
}
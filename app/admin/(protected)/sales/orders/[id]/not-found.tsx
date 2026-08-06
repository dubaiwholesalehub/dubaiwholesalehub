import {
  ArrowLeft,
  ShoppingCart,
} from "lucide-react";

import EmptyState from "@/components/admin/shared/EmptyState";

export default function SalesOrderNotFound() {
  return (
    <div className="rounded-xl border bg-card">
      <EmptyState
        icon={ShoppingCart}
        title="Sales order not found"
        description="The requested sales order does not exist or may have been removed."
        action={{
          href: "/admin/sales/orders",
          label: "Back to Sales Orders",
          icon: ArrowLeft,
        }}
      />
    </div>
  );
}
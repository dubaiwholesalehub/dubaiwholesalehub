import {
  ArrowLeft,
  Users,
} from "lucide-react";

import EmptyState from "@/components/admin/shared/EmptyState";

export default function CustomerNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState
        icon={Users}
        title="Customer not found"
        description="The requested customer may have been removed or the address may be incorrect."
        action={{
          href: "/admin/customers",
          label: "Back to Customers",
          icon: ArrowLeft,
        }}
      />
    </div>
  );
}
import {
  ArrowLeft,
  PackageSearch,
} from "lucide-react";

import EmptyState from "@/components/admin/shared/EmptyState";

export default function ProductWorkspaceNotFound() {
  return (
    <EmptyState
      icon={PackageSearch}
      title="Product not found"
      description="The requested product does not exist or is no longer available."
      action={{
        href: "/admin/products",
        label: "Back to Products",
        icon: ArrowLeft,
      }}
    />
  );
}
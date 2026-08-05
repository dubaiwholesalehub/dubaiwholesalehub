import {
  ArrowLeft,
  FileText,
} from "lucide-react";

import EmptyState from "@/components/admin/shared/EmptyState";

export default function SalesQuotationNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState
        icon={FileText}
        title="Sales quotation not found"
        description="The requested quotation may have been removed or the address may be incorrect."
        action={{
          href: "/admin/sales/quotations",
          label: "Back to Quotations",
          icon: ArrowLeft,
        }}
      />
    </div>
  );
}
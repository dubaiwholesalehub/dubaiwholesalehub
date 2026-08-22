import {
  RotateCcw,
} from "lucide-react";

import PageHeader from "@/components/admin/shared/PageHeader";
import SalesReturnForm from "@/components/admin/sales/returns/SalesReturnForm";

import {
  getEligibleSalesReturnOrders,
} from "@/lib/repositories/sales-return.repository";

export default async function NewSalesReturnPage() {
  const orders =
    await getEligibleSalesReturnOrders();

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Sales Return"
        description="Create a controlled customer return from previously delivered Sales Order items."
        icon={RotateCcw}
      />

      <SalesReturnForm
        orders={orders}
      />
    </div>
  );
}
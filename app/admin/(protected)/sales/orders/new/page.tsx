import {
  ArrowLeft,
  ShoppingCart,
} from "lucide-react";

import PageHeader from "@/components/admin/shared/PageHeader";
import SalesOrderForm from "@/components/admin/sales/orders/SalesOrderForm";
import {
  getSalesOrderFormOptions,
} from "@/lib/repositories/sales-order.repository";

import {
  createSalesOrderAction,
} from "../actions";

export default async function NewSalesOrderPage() {
  const options =
    await getSalesOrderFormOptions();

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Sales Order"
        description="Create a customer sales order."
        icon={ShoppingCart}
        backLink={{
          href: "/admin/sales/orders",
          label: "Sales Orders",
          icon: ArrowLeft,
        }}
      />

      <SalesOrderForm
        mode="create"
        options={options}
        onSubmit={
          createSalesOrderAction
        }
      />
    </div>
  );
}
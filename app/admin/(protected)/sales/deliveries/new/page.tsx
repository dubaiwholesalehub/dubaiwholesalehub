import {
  ArrowLeft,
  Truck,
} from "lucide-react";

import PageHeader from "@/components/admin/shared/PageHeader";
import CreateDeliveryList from "@/components/admin/sales/deliveries/CreateDeliveryList";
import {
  getDeliverableSalesOrders,
} from "@/lib/repositories/delivery-order.repository";

export default async function NewDeliveryOrderPage() {
  const orders =
    await getDeliverableSalesOrders();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Delivery Order"
        description="Select a confirmed Sales Order with reserved stock. The system will create a draft Delivery Order with all currently deliverable items."
        icon={Truck}
        backLink={{
          href:
            "/admin/sales/deliveries",
          label:
            "Delivery Orders",
          icon: ArrowLeft,
        }}
      />

      <section className="rounded-xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">
            Deliverable Sales Orders
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Only orders with assigned warehouses and remaining reserved stock are shown.
          </p>
        </div>

        <div className="p-5">
          <CreateDeliveryList
            orders={orders}
          />
        </div>
      </section>
    </div>
  );
}
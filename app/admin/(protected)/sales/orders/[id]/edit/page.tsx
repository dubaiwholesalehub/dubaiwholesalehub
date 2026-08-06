import {
  ArrowLeft,
  Pencil,
} from "lucide-react";
import { notFound } from "next/navigation";

import PageHeader from "@/components/admin/shared/PageHeader";
import SalesOrderForm from "@/components/admin/sales/orders/SalesOrderForm";
import {
  getSalesOrderById,
  getSalesOrderFormOptions,
} from "@/lib/repositories/sales-order.repository";

import {
  updateSalesOrderAction,
} from "../../actions";

interface EditSalesOrderPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditSalesOrderPage({
  params,
}: EditSalesOrderPageProps) {
  const { id } = await params;

  const [
    order,
    options,
  ] = await Promise.all([
    getSalesOrderById(id),
    getSalesOrderFormOptions(),
  ]);

  if (!order) {
    notFound();
  }

  if (order.status !== "draft") {
    throw new Error(
      "Only draft sales orders can be edited.",
    );
  }

  const submitAction =
    updateSalesOrderAction.bind(
      null,
      order.id,
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${order.order_number}`}
        description="Update customer, delivery and commercial information for this draft sales order."
        icon={Pencil}
        backLink={{
          href: `/admin/sales/orders/${order.id}`,
          label: order.order_number,
          icon: ArrowLeft,
        }}
      />

      <SalesOrderForm
        mode="edit"
        options={options}
        initialValues={{
          quotation_id:
            order.quotation_id,

          customer_id:
            order.customer_id,

          customer_contact_id:
            order.customer_contact_id,

          billing_address_id:
            order.billing_address_id,

          shipping_address_id:
            order.shipping_address_id,

          warehouse_id:
            order.warehouse_id,

          order_date:
            order.order_date,

          requested_delivery_date:
            order.requested_delivery_date,

          expected_delivery_date:
            order.expected_delivery_date,

          status:
            order.status,

          fulfilment_status:
            order.fulfilment_status,

          payment_status:
            order.payment_status,

          source:
            order.source,

          external_reference:
            order.external_reference,

          customer_reference:
            order.customer_reference,

          currency_code:
            order.currency_code,

          exchange_rate:
            order.exchange_rate,

          shipping_amount:
            order.shipping_amount,

          payment_terms_days:
            order.payment_terms_days,

          delivery_terms:
            order.delivery_terms,

          payment_terms:
            order.payment_terms,

          customer_notes:
            order.customer_notes,

          internal_notes:
            order.internal_notes,
        }}
        onSubmit={submitAction}
      />
    </div>
  );
}
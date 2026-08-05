import {
  ArrowLeft,
  Pencil,
} from "lucide-react";
import { notFound } from "next/navigation";

import PageHeader from "@/components/admin/shared/PageHeader";
import SalesQuotationForm from "@/components/admin/sales/quotations/SalesQuotationForm";
import {
  getSalesQuotationById,
  getSalesQuotationFormOptions,
} from "@/lib/repositories/sales-quotation.repository";

import {
  updateSalesQuotationAction,
} from "../../actions";

interface EditSalesQuotationPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditSalesQuotationPage({
  params,
}: EditSalesQuotationPageProps) {
  const { id } = await params;

  const [
    quotation,
    options,
  ] = await Promise.all([
    getSalesQuotationById(id),
    getSalesQuotationFormOptions(),
  ]);

  if (!quotation) {
    notFound();
  }

  if (quotation.status !== "draft") {
    throw new Error(
      "Only draft quotations can be edited.",
    );
  }

  const submitAction =
    updateSalesQuotationAction.bind(
      null,
      quotation.id,
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Sales Quotation"
        description={`Update ${quotation.quotation_number}.`}
        icon={Pencil}
        backLink={{
          href: `/admin/sales/quotations/${quotation.id}`,
          label:
            quotation.quotation_number,
          icon: ArrowLeft,
        }}
      />

      <SalesQuotationForm
        mode="edit"
        options={options}
        initialValues={{
          customer_id:
            quotation.customer_id,

          customer_contact_id:
            quotation.customer_contact_id,

          billing_address_id:
            quotation.billing_address_id,

          shipping_address_id:
            quotation.shipping_address_id,

          warehouse_id:
            quotation.warehouse_id,

          quotation_date:
            quotation.quotation_date,

          valid_until:
            quotation.valid_until,

          status:
            quotation.status,

          source:
            quotation.source,

          external_reference:
            quotation.external_reference,

          customer_reference:
            quotation.customer_reference,

          currency_code:
            quotation.currency_code,

          exchange_rate:
            quotation.exchange_rate,

          shipping_amount:
            quotation.shipping_amount,

          payment_terms_days:
            quotation.payment_terms_days,

          delivery_terms:
            quotation.delivery_terms,

          payment_terms:
            quotation.payment_terms,

          customer_notes:
            quotation.customer_notes,

          internal_notes:
            quotation.internal_notes,
        }}
        onSubmit={submitAction}
      />
    </div>
  );
}
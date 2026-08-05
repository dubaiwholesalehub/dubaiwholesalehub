import {
  ArrowLeft,
  Pencil,
} from "lucide-react";
import { notFound } from "next/navigation";

import PageHeader from "@/components/admin/shared/PageHeader";
import SalesQuotationItemForm from "@/components/admin/sales/quotations/items/SalesQuotationItemForm";
import {
  getSalesQuotationById,
  getSalesQuotationItemById,
  getSalesQuotationItemFormOptions,
} from "@/lib/repositories/sales-quotation.repository";

import {
  updateSalesQuotationItemAction,
} from "../../../../actions";

interface EditSalesQuotationItemPageProps {
  params: Promise<{
    id: string;
    itemId: string;
  }>;
}

export default async function EditSalesQuotationItemPage({
  params,
}: EditSalesQuotationItemPageProps) {
  const {
    id,
    itemId,
  } = await params;

  const [
    quotation,
    item,
    options,
  ] = await Promise.all([
    getSalesQuotationById(id),
    getSalesQuotationItemById(itemId),
    getSalesQuotationItemFormOptions(),
  ]);

  if (
    !quotation ||
    !item ||
    item.sales_quotation_id !==
      quotation.id
  ) {
    notFound();
  }

  if (quotation.status !== "draft") {
    throw new Error(
      "Items can only be edited on draft quotations.",
    );
  }

  const submitAction =
    updateSalesQuotationItemAction.bind(
      null,
      quotation.id,
      item.id,
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Quotation Item"
        description={`Update line ${item.line_number} in ${quotation.quotation_number}.`}
        icon={Pencil}
        backLink={{
          href: `/admin/sales/quotations/${quotation.id}`,
          label:
            quotation.quotation_number,
          icon: ArrowLeft,
        }}
      />

      <SalesQuotationItemForm
        mode="edit"
        quotationId={quotation.id}
        currencyCode={
          quotation.currency_code
        }
        options={options}
        initialValues={{
          product_id:
            item.product_id,

          unit_id:
            item.unit_id,

          sku:
            item.sku,

          item_name:
            item.item_name,

          description:
            item.description,

          quantity:
            item.quantity,

          unit_price:
            item.unit_price,

          discount_percentage:
            item.discount_percentage,

          tax_percentage:
            item.tax_percentage,

          requested_delivery_date:
            item.requested_delivery_date,

          line_notes:
            item.line_notes,
        }}
        onSubmit={submitAction}
      />
    </div>
  );
}
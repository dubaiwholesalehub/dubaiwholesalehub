import {
  ArrowLeft,
  PackagePlus,
} from "lucide-react";
import { notFound } from "next/navigation";

import PageHeader from "@/components/admin/shared/PageHeader";
import SalesQuotationItemForm from "@/components/admin/sales/quotations/items/SalesQuotationItemForm";
import {
  getSalesQuotationById,
  getSalesQuotationItemFormOptions,
} from "@/lib/repositories/sales-quotation.repository";

import {
  addSalesQuotationItemAction,
} from "../../../actions";

interface NewSalesQuotationItemPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function NewSalesQuotationItemPage({
  params,
}: NewSalesQuotationItemPageProps) {
  const { id } = await params;

  const [
    quotation,
    options,
  ] = await Promise.all([
    getSalesQuotationById(id),
    getSalesQuotationItemFormOptions(),
  ]);

  if (!quotation) {
    notFound();
  }

  if (quotation.status !== "draft") {
    throw new Error(
      "Items can only be added to draft quotations.",
    );
  }

  const submitAction =
    addSalesQuotationItemAction.bind(
      null,
      quotation.id,
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Quotation Item"
        description={`Add a product or custom item to ${quotation.quotation_number}.`}
        icon={PackagePlus}
        backLink={{
          href: `/admin/sales/quotations/${quotation.id}`,
          label:
            quotation.quotation_number,
          icon: ArrowLeft,
        }}
      />

      <SalesQuotationItemForm
        mode="create"
        quotationId={quotation.id}
        currencyCode={
          quotation.currency_code
        }
        options={options}
        onSubmit={submitAction}
      />
    </div>
  );
}
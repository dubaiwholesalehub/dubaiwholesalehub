import {
  ArrowLeft,
  FilePlus2,
} from "lucide-react";

import PageHeader from "@/components/admin/shared/PageHeader";
import SalesQuotationForm from "@/components/admin/sales/quotations/SalesQuotationForm";
import {
  getSalesQuotationFormOptions,
} from "@/lib/repositories/sales-quotation.repository";

import {
  createSalesQuotationAction,
} from "../actions";

export default async function NewSalesQuotationPage() {
  const options =
    await getSalesQuotationFormOptions();

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Sales Quotation"
        description="Prepare a retail, wholesale or export offer for a customer."
        icon={FilePlus2}
        backLink={{
          href: "/admin/sales/quotations",
          label: "Sales Quotations",
          icon: ArrowLeft,
        }}
      />

      <SalesQuotationForm
        mode="create"
        options={options}
        onSubmit={
          createSalesQuotationAction
        }
      />
    </div>
  );
}
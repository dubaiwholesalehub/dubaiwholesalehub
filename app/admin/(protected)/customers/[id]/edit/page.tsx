import {
  ArrowLeft,
  Pencil,
} from "lucide-react";
import { notFound } from "next/navigation";

import CustomerForm from "@/components/admin/customers/CustomerForm";
import PageHeader from "@/components/admin/shared/PageHeader";
import { getCustomerById } from "@/lib/repositories/customer.repository";

import { updateCustomerAction } from "../../actions";

interface EditCustomerPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditCustomerPage({
  params,
}: EditCustomerPageProps) {
  const { id } = await params;

  const customer =
    await getCustomerById(id);

  if (!customer) {
    notFound();
  }

  const submitAction =
    updateCustomerAction.bind(
      null,
      customer.id,
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Customer"
        description={`Update ${customer.customer_number} — ${customer.display_name}.`}
        icon={Pencil}
        backLink={{
          href: `/admin/customers/${customer.id}`,
          label: customer.display_name,
          icon: ArrowLeft,
        }}
      />

      <CustomerForm
        mode="edit"
        initialValues={{
          customer_type:
            customer.customer_type,

          display_name:
            customer.display_name,

          company_name:
            customer.company_name,

          first_name:
            customer.first_name,

          last_name:
            customer.last_name,

          email:
            customer.email,

          phone:
            customer.phone,

          whatsapp:
            customer.whatsapp,

          tax_registration_number:
            customer.tax_registration_number,

          currency_code:
            customer.currency_code,

          credit_limit:
            customer.credit_limit,

          payment_terms_days:
            customer.payment_terms_days,

          status:
            customer.status,

          source:
            customer.source,

          external_customer_id:
            customer.external_customer_id,

          internal_notes:
            customer.internal_notes,
        }}
        onSubmit={submitAction}
      />
    </div>
  );
}
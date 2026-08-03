import {
  ArrowLeft,
  ContactRound,
} from "lucide-react";
import { notFound } from "next/navigation";

import CustomerContactForm from "@/components/admin/customers/contacts/CustomerContactForm";
import PageHeader from "@/components/admin/shared/PageHeader";
import {
  getCustomerById,
  getCustomerContactById,
} from "@/lib/repositories/customer.repository";

import {
  updateCustomerContactAction,
} from "../../../../actions";

interface EditCustomerContactPageProps {
  params: Promise<{
    id: string;
    contactId: string;
  }>;
}

export default async function EditCustomerContactPage({
  params,
}: EditCustomerContactPageProps) {
  const {
    id,
    contactId,
  } = await params;

  const [
    customer,
    contact,
  ] = await Promise.all([
    getCustomerById(id),
    getCustomerContactById(contactId),
  ]);

  if (
    !customer ||
    !contact ||
    contact.customer_id !== customer.id
  ) {
    notFound();
  }

  const submitAction =
    updateCustomerContactAction.bind(
      null,
      customer.id,
      contact.id,
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Customer Contact"
        description={`Update ${contact.contact_name} for ${customer.display_name}.`}
        icon={ContactRound}
        backLink={{
          href: `/admin/customers/${customer.id}`,
          label: customer.display_name,
          icon: ArrowLeft,
        }}
      />

      <CustomerContactForm
        mode="edit"
        customerId={customer.id}
        initialValues={{
          contact_name:
            contact.contact_name,

          job_title:
            contact.job_title,

          email:
            contact.email,

          phone:
            contact.phone,

          whatsapp:
            contact.whatsapp,

          is_primary:
            contact.is_primary,

          is_active:
            contact.is_active,

          notes:
            contact.notes,
        }}
        onSubmit={submitAction}
      />
    </div>
  );
}
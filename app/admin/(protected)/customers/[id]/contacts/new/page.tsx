import {
  ArrowLeft,
  ContactRound,
} from "lucide-react";
import { notFound } from "next/navigation";

import CustomerContactForm from "@/components/admin/customers/contacts/CustomerContactForm";
import PageHeader from "@/components/admin/shared/PageHeader";
import { getCustomerById } from "@/lib/repositories/customer.repository";

import {
  createCustomerContactAction,
} from "../../../actions";

interface NewCustomerContactPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function NewCustomerContactPage({
  params,
}: NewCustomerContactPageProps) {
  const { id } = await params;

  const customer =
    await getCustomerById(id);

  if (!customer) {
    notFound();
  }

  const submitAction =
    createCustomerContactAction.bind(
      null,
      customer.id,
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Customer Contact"
        description={`Add a contact person for ${customer.display_name}.`}
        icon={ContactRound}
        backLink={{
          href: `/admin/customers/${customer.id}`,
          label: customer.display_name,
          icon: ArrowLeft,
        }}
      />

      <CustomerContactForm
        mode="create"
        customerId={customer.id}
        onSubmit={submitAction}
      />
    </div>
  );
}
import {
  ArrowLeft,
  MapPin,
} from "lucide-react";
import { notFound } from "next/navigation";

import CustomerAddressForm from "@/components/admin/customers/addresses/CustomerAddressForm";
import PageHeader from "@/components/admin/shared/PageHeader";
import { getCustomerById } from "@/lib/repositories/customer.repository";

import {
  createCustomerAddressAction,
} from "../../../actions";

interface NewCustomerAddressPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function NewCustomerAddressPage({
  params,
}: NewCustomerAddressPageProps) {
  const { id } = await params;

  const customer =
    await getCustomerById(id);

  if (!customer) {
    notFound();
  }

  const submitAction =
    createCustomerAddressAction.bind(
      null,
      customer.id,
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Customer Address"
        description={`Add a billing or shipping address for ${customer.display_name}.`}
        icon={MapPin}
        backLink={{
          href: `/admin/customers/${customer.id}`,
          label: customer.display_name,
          icon: ArrowLeft,
        }}
      />

      <CustomerAddressForm
        mode="create"
        customerId={customer.id}
        onSubmit={submitAction}
      />
    </div>
  );
}
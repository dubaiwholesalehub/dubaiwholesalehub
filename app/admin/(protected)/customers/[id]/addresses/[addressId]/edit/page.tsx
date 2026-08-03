import {
  ArrowLeft,
  MapPin,
} from "lucide-react";
import { notFound } from "next/navigation";

import CustomerAddressForm from "@/components/admin/customers/addresses/CustomerAddressForm";
import PageHeader from "@/components/admin/shared/PageHeader";
import {
  getCustomerAddressById,
  getCustomerById,
} from "@/lib/repositories/customer.repository";

import {
  updateCustomerAddressAction,
} from "../../../../actions";

interface EditCustomerAddressPageProps {
  params: Promise<{
    id: string;
    addressId: string;
  }>;
}

export default async function EditCustomerAddressPage({
  params,
}: EditCustomerAddressPageProps) {
  const {
    id,
    addressId,
  } = await params;

  const [
    customer,
    address,
  ] = await Promise.all([
    getCustomerById(id),
    getCustomerAddressById(addressId),
  ]);

  if (
    !customer ||
    !address ||
    address.customer_id !== customer.id
  ) {
    notFound();
  }

  const submitAction =
    updateCustomerAddressAction.bind(
      null,
      customer.id,
      address.id,
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Customer Address"
        description={`Update an address for ${customer.display_name}.`}
        icon={MapPin}
        backLink={{
          href: `/admin/customers/${customer.id}`,
          label: customer.display_name,
          icon: ArrowLeft,
        }}
      />

      <CustomerAddressForm
        mode="edit"
        customerId={customer.id}
        initialValues={{
          address_type:
            address.address_type,

          address_name:
            address.address_name,

          contact_name:
            address.contact_name,

          phone:
            address.phone,

          address_line_1:
            address.address_line_1,

          address_line_2:
            address.address_line_2,

          city:
            address.city,

          state:
            address.state,

          country:
            address.country,

          postal_code:
            address.postal_code,

          is_default:
            address.is_default,

          is_active:
            address.is_active,

          delivery_instructions:
            address.delivery_instructions,
        }}
        onSubmit={submitAction}
      />
    </div>
  );
}
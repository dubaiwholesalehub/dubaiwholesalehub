import {
  ArrowLeft,
  UserPlus,
} from "lucide-react";

import CustomerForm from "@/components/admin/customers/CustomerForm";
import PageHeader from "@/components/admin/shared/PageHeader";

import { createCustomerAction } from "../actions";

export default function NewCustomerPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New Customer"
        description="Create a retail, wholesale, export or internal customer record."
        icon={UserPlus}
        backLink={{
          href: "/admin/customers",
          label: "Customers",
          icon: ArrowLeft,
        }}
      />

      <CustomerForm
        mode="create"
        onSubmit={createCustomerAction}
      />
    </div>
  );
}
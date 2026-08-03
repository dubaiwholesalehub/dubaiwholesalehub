import Link from "next/link";
import {
  ContactRound,
  Pencil,
  Plus,
  Star,
} from "lucide-react";

import DataTable, {
  type DataTableColumn,
} from "@/components/admin/shared/DataTable";
import DetailsCard from "@/components/admin/shared/DetailsCard";
import EmptyState from "@/components/admin/shared/EmptyState";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import type {
  CustomerContact,
} from "@/lib/repositories/customer.repository";
import { cn } from "@/lib/utils";

interface CustomerContactsSectionProps {
  customerId: string;
  contacts: CustomerContact[];
}

const columns: DataTableColumn<CustomerContact>[] =
  [
    {
      key: "contact",
      header: "Contact",
      render: (contact) => (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">
              {contact.contact_name}
            </span>

            {contact.is_primary ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                <Star className="size-3" />
                Primary
              </span>
            ) : null}
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            {contact.job_title?.trim() ||
              "No job title"}
          </p>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (contact) =>
        contact.phone?.trim() ||
        contact.whatsapp?.trim() ||
        "—",
    },
    {
      key: "email",
      header: "Email",
      render: (contact) => (
        <span className="block max-w-60 truncate">
          {contact.email?.trim() || "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      width: "120px",
      render: (contact) => (
        <StatusBadge
          status={
            contact.is_active
              ? "active"
              : "inactive"
          }
        />
      ),
    },
    {
      key: "actions",
      header: (
        <span className="sr-only">
          Actions
        </span>
      ),
      align: "right",
      width: "80px",
      render: (contact) => (
        <Link
          href={`/admin/customers/${contact.customer_id}/contacts/${contact.id}/edit`}
          aria-label={`Edit ${contact.contact_name}`}
          className={cn(
            buttonVariants({
              variant: "ghost",
              size: "icon",
            }),
          )}
        >
          <Pencil className="size-4" />
        </Link>
      ),
    },
  ];

export default function CustomerContactsSection({
  customerId,
  contacts,
}: CustomerContactsSectionProps) {
  return (
    <DetailsCard
      title="Customer Contacts"
      description="Owners, buyers, accounts staff, delivery contacts and other representatives."
      footer={
        <Link
          href={`/admin/customers/${customerId}/contacts/new`}
          className={cn(
            buttonVariants({
              variant: "outline",
              size: "default",
            }),
          )}
        >
          <Plus className="size-4" />
          Add Contact
        </Link>
      }
    >
      <DataTable
        rows={contacts}
        columns={columns}
        getRowKey={(contact) =>
          contact.id
        }
        minimumWidth="760px"
        emptyState={
          <EmptyState
            compact
            icon={ContactRound}
            title="No customer contacts"
            description="Add an owner, buyer, accounts contact or another representative."
            action={{
              href: `/admin/customers/${customerId}/contacts/new`,
              label: "Add Contact",
              icon: Plus,
            }}
          />
        }
      />
    </DetailsCard>
  );
}
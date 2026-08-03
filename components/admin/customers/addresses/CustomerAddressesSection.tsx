import Link from "next/link";
import {
  MapPin,
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
  CustomerAddress,
} from "@/lib/repositories/customer.repository";
import { cn } from "@/lib/utils";

interface CustomerAddressesSectionProps {
  customerId: string;
  addresses: CustomerAddress[];
}

const columns:
  DataTableColumn<CustomerAddress>[] = [
    {
      key: "address",
      header: "Address",
      render: (address) => (
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">
              {address.address_name?.trim() ||
                formatAddressType(
                  address.address_type,
                )}
            </span>

            {address.is_default ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                <Star className="size-3" />
                Default
              </span>
            ) : null}
          </div>

          <p className="mt-1 max-w-96 truncate text-xs text-muted-foreground">
            {formatFullAddress(address)}
          </p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      width: "170px",
      render: (address) => (
        <span className="inline-flex rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium">
          {formatAddressType(
            address.address_type,
          )}
        </span>
      ),
    },
    {
      key: "contact",
      header: "Delivery Contact",
      render: (address) => (
        <div>
          <p>
            {address.contact_name?.trim() ||
              "Not provided"}
          </p>

          {address.phone ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {address.phone}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      width: "120px",
      render: (address) => (
        <StatusBadge
          status={
            address.is_active
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
      render: (address) => (
        <Link
          href={`/admin/customers/${address.customer_id}/addresses/${address.id}/edit`}
          aria-label="Edit customer address"
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

export default function CustomerAddressesSection({
  customerId,
  addresses,
}: CustomerAddressesSectionProps) {
  return (
    <DetailsCard
      title="Customer Addresses"
      description="Billing, shipping and delivery locations for this customer."
      footer={
        <Link
          href={`/admin/customers/${customerId}/addresses/new`}
          className={cn(
            buttonVariants({
              variant: "outline",
              size: "default",
            }),
          )}
        >
          <Plus className="size-4" />
          Add Address
        </Link>
      }
    >
      <DataTable
        rows={addresses}
        columns={columns}
        getRowKey={(address) =>
          address.id
        }
        minimumWidth="850px"
        emptyState={
          <EmptyState
            compact
            icon={MapPin}
            title="No customer addresses"
            description="Add a billing, shipping or combined customer address."
            action={{
              href: `/admin/customers/${customerId}/addresses/new`,
              label: "Add Address",
              icon: Plus,
            }}
          />
        }
      />
    </DetailsCard>
  );
}

function formatAddressType(
  value: CustomerAddress["address_type"],
): string {
  const labels: Record<
    CustomerAddress["address_type"],
    string
  > = {
    billing: "Billing",
    shipping: "Shipping",
    both: "Billing & Shipping",
  };

  return labels[value];
}

function formatFullAddress(
  address: CustomerAddress,
): string {
  return [
    address.address_line_1,
    address.address_line_2,
    address.city,
    address.state,
    address.country,
    address.postal_code,
  ]
    .filter(Boolean)
    .join(", ");
}
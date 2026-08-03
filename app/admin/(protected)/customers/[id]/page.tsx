import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CircleDollarSign,
  ContactRound,
  CreditCard,
  FileText,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  ReceiptText,
  UserRound,
  Users,
  Plus,
} from "lucide-react";

import DetailsCard from "@/components/admin/shared/DetailsCard";
import EmptyState from "@/components/admin/shared/EmptyState";
import PageHeader from "@/components/admin/shared/PageHeader";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import {
  getCustomerById,
  type CustomerAddress,
  type CustomerContact,
  type CustomerSource,
} from "@/lib/repositories/customer.repository";
import { cn } from "@/lib/utils";
import CustomerContactsSection from "@/components/admin/customers/contacts/CustomerContactsSection";
import CustomerAddressesSection from "@/components/admin/customers/addresses/CustomerAddressesSection";
import CustomerStatusActions from "@/components/admin/customers/CustomerStatusActions";

interface CustomerDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CustomerDetailsPage({
  params,
}: CustomerDetailsPageProps) {
  const { id } = await params;

  const customer = await getCustomerById(id);

  if (!customer) {
    notFound();
  }

  const primaryContact =
    customer.contacts.find((contact) => contact.is_primary) ?? null;

  const defaultAddress =
    customer.addresses.find((address) => address.is_default) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.display_name}
        description={`${customer.customer_number} · ${formatCustomerType(
          customer.customer_type,
        )} customer`}
        icon={customer.customer_type === "business" ? Building2 : UserRound}
        backLink={{
          href: "/admin/customers",
          label: "Customers",
          icon: ArrowLeft,
        }}
      >
        <StatusBadge status={customer.status} />

        <Link
          href={`/admin/customers/${customer.id}/edit`}
          className={cn(
            buttonVariants({
              variant: "outline",
              size: "default",
            }),
          )}
        >
          <Pencil className="size-4" />
          Edit Customer
        </Link>
        <CustomerStatusActions
          customerId={customer.id}
          currentStatus={customer.status}
        />
      </PageHeader>

      <section className="grid gap-6 xl:grid-cols-2">
        <DetailsCard
          title="Customer Information"
          description="Primary customer identity and classification."
        >
          <div className="divide-y rounded-lg border">
            <InformationRow
              label="Customer Number"
              value={customer.customer_number}
            />

            <InformationRow
              label="Display Name"
              value={customer.display_name}
            />

            <InformationRow
              label="Customer Type"
              value={formatCustomerType(customer.customer_type)}
            />

            <InformationRow
              label="Company Name"
              value={customer.company_name}
            />

            <InformationRow label="First Name" value={customer.first_name} />

            <InformationRow label="Last Name" value={customer.last_name} />

            <InformationRow
              label="Source"
              value={formatCustomerSource(customer.source)}
            />

            <InformationRow
              label="External Customer ID"
              value={customer.external_customer_id}
            />
          </div>
        </DetailsCard>

        <DetailsCard
          title="Contact Information"
          description="Customer communication details."
        >
          <div className="space-y-5">
            <ContactItem icon={Mail} label="Email" value={customer.email} />

            <ContactItem icon={Phone} label="Phone" value={customer.phone} />

            <ContactItem
              icon={MessageCircle}
              label="WhatsApp"
              value={customer.whatsapp}
            />

            <ContactItem
              icon={ReceiptText}
              label="Tax Registration Number"
              value={customer.tax_registration_number}
            />
          </div>
        </DetailsCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <DetailsCard
          title="Commercial Settings"
          description="Currency, credit and payment terms."
        >
          <div className="space-y-5">
            <ContactItem
              icon={CircleDollarSign}
              label="Currency"
              value={customer.currency_code}
            />

            <ContactItem
              icon={CreditCard}
              label="Credit Limit"
              value={formatCurrency(
                customer.credit_limit,
                customer.currency_code,
              )}
            />

            <ContactItem
              icon={CalendarDays}
              label="Payment Terms"
              value={`${customer.payment_terms_days} day${
                customer.payment_terms_days === 1 ? "" : "s"
              }`}
            />
          </div>
        </DetailsCard>

        <DetailsCard
          title="Primary Contact"
          description="Main person associated with this customer."
          footer={
            <Link
              href={`/admin/customers/${customer.id}/contacts/new`}
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
          {primaryContact ? (
            <CustomerContactCard contact={primaryContact} />
          ) : (
            <EmptyState
              compact
              icon={ContactRound}
              title="No primary contact"
              description="No primary contact has been added for this customer yet."
            />
          )}
        </DetailsCard>
      </section>
      <CustomerContactsSection
        customerId={customer.id}
        contacts={customer.contacts}
      />
      <CustomerAddressesSection
        customerId={customer.id}
        addresses={customer.addresses}
      />
      <DetailsCard
        title="Default Address"
        description="Primary billing or shipping location."
      >
        {defaultAddress ? (
          <CustomerAddressCard address={defaultAddress} />
        ) : (
          <EmptyState
            compact
            icon={MapPin}
            title="No default address"
            description="No default billing or shipping address has been added yet."
          />
        )}
      </DetailsCard>

      <DetailsCard
        title="Internal Notes"
        description="Visible only to authorized ERP users."
      >
        <div className="flex items-start gap-3">
          <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

          <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {customer.internal_notes?.trim() || "No internal notes added."}
          </p>
        </div>
      </DetailsCard>

      <DetailsCard title="System Information">
        <div className="grid gap-4 sm:grid-cols-2">
          <SystemInformation
            label="Created"
            value={formatDateTime(customer.created_at)}
          />

          <SystemInformation
            label="Last Updated"
            value={formatDateTime(customer.updated_at)}
          />
        </div>
      </DetailsCard>
    </div>
  );
}

interface InformationRowProps {
  label: string;
  value: string | null;
}

function InformationRow({ label, value }: InformationRowProps) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>

      <span className="text-sm font-medium">
        {value?.trim() || "Not provided"}
      </span>
    </div>
  );
}

interface ContactItemProps {
  icon: React.ComponentType<{
    className?: string;
  }>;
  label: string;
  value: string | null;
}

function ContactItem({ icon: Icon, label, value }: ContactItemProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>

      <div>
        <p className="text-sm font-medium">{label}</p>

        <p className="mt-1 text-sm text-muted-foreground">
          {value?.trim() || "Not provided"}
        </p>
      </div>
    </div>
  );
}

function CustomerContactCard({ contact }: { contact: CustomerContact }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Users className="size-4" />
        </div>

        <div>
          <p className="font-semibold">{contact.contact_name}</p>

          <p className="mt-1 text-sm text-muted-foreground">
            {contact.job_title?.trim() || "No job title"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <ContactDetail label="Email" value={contact.email} />

        <ContactDetail label="Phone" value={contact.phone} />

        <ContactDetail label="WhatsApp" value={contact.whatsapp} />

        <ContactDetail
          label="Status"
          value={contact.is_active ? "Active" : "Inactive"}
        />
      </div>
    </div>
  );
}

function CustomerAddressCard({ address }: { address: CustomerAddress }) {
  const fullAddress = [
    address.address_line_1,
    address.address_line_2,
    address.city,
    address.state,
    address.country,
    address.postal_code,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MapPin className="size-4" />
        </div>

        <div>
          <p className="font-semibold">
            {address.address_name?.trim() ||
              formatAddressType(address.address_type)}
          </p>

          <p className="mt-1 text-sm capitalize text-muted-foreground">
            {formatAddressType(address.address_type)}
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        {fullAddress}
      </p>

      {address.contact_name || address.phone ? (
        <div className="mt-4 grid gap-3 border-t pt-4 text-sm sm:grid-cols-2">
          <ContactDetail label="Contact" value={address.contact_name} />

          <ContactDetail label="Phone" value={address.phone} />
        </div>
      ) : null}
    </div>
  );
}

function ContactDetail({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 font-medium">{value?.trim() || "Not provided"}</p>
    </div>
  );
}

function SystemInformation({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  );
}

function formatCustomerType(value: "individual" | "business"): string {
  return value === "business" ? "Business" : "Individual";
}

function formatCustomerSource(value: CustomerSource): string {
  const labels: Record<CustomerSource, string> = {
    internal: "Internal",
    hmshoponline: "HMShopOnline",
    dubaiwholesalehub: "Dubai Wholesale Hub",
    import: "Imported",
  };

  return labels[value];
}

function formatAddressType(value: CustomerAddress["address_type"]): string {
  const labels: Record<CustomerAddress["address_type"], string> = {
    billing: "Billing Address",
    shipping: "Shipping Address",
    both: "Billing & Shipping",
  };

  return labels[value];
}

function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

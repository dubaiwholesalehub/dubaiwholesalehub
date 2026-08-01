import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Star,
  UserRound,
  XCircle,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { getWarehouseById } from "@/lib/repositories/warehouse.repository";
import { cn } from "@/lib/utils";
import WarehouseStatusButton from "@/components/admin/inventory/warehouses/WarehouseStatusButton";
import StatusBadge from "@/components/admin/shared/StatusBadge";

interface WarehouseDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function WarehouseDetailsPage({
  params,
}: WarehouseDetailsPageProps) {
  const { id } = await params;

  const warehouse = await getWarehouseById(id);

  if (!warehouse) {
    notFound();
  }

  const fullAddress = [
    warehouse.address_line_1,
    warehouse.address_line_2,
    warehouse.city,
    warehouse.state,
    warehouse.country,
    warehouse.postal_code,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/admin/inventory/warehouses"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Warehouses
        </Link>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {warehouse.name}
                </h1>

                <StatusBadge
                  status={warehouse.is_active ? "active" : "inactive"}
                />

                {warehouse.is_default && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    <Star className="size-3.5" />
                    Default
                  </span>
                )}
              </div>

              <p className="mt-1 text-sm text-muted-foreground">
                Warehouse code:{" "}
                <span className="font-medium text-foreground">
                  {warehouse.code}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-start gap-2">
            <Link
              href={`/admin/inventory/warehouses/${warehouse.id}/edit`}
              className={cn(
                buttonVariants({
                  variant: "outline",
                  size: "default",
                }),
              )}
            >
              <Pencil className="size-4" />
              Edit Warehouse
            </Link>

            <WarehouseStatusButton
              warehouseId={warehouse.id}
              isActive={warehouse.is_active}
              isDefault={warehouse.is_default}
            />
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="overflow-hidden rounded-xl border bg-card">
          <header className="border-b px-5 py-4">
            <h2 className="font-semibold">Warehouse Information</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              General warehouse and operational details.
            </p>
          </header>

          <div className="divide-y">
            <InformationRow label="Warehouse Code" value={warehouse.code} />

            <InformationRow label="Warehouse Name" value={warehouse.name} />

            <InformationRow
              label="Status"
              value={warehouse.is_active ? "Active" : "Inactive"}
            />

            <InformationRow
              label="Default Warehouse"
              value={warehouse.is_default ? "Yes" : "No"}
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border bg-card">
          <header className="border-b px-5 py-4">
            <h2 className="font-semibold">Contact Information</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Warehouse contact and communication details.
            </p>
          </header>

          <div className="space-y-5 p-5">
            <ContactItem
              icon={UserRound}
              label="Contact Person"
              value={warehouse.contact_person}
            />

            <ContactItem icon={Phone} label="Phone" value={warehouse.phone} />

            <ContactItem icon={Mail} label="Email" value={warehouse.email} />
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border bg-card">
        <header className="border-b px-5 py-4">
          <h2 className="font-semibold">Warehouse Address</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Physical storage and operational location.
          </p>
        </header>

        <div className="flex items-start gap-3 p-5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <MapPin className="size-4" />
          </div>

          <div>
            <p className="text-sm font-medium">Address</p>

            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {fullAddress || "No address information provided."}
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border bg-card">
        <header className="border-b px-5 py-4">
          <h2 className="font-semibold">System Information</h2>
        </header>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <SystemInformation
            label="Created"
            value={formatDateTime(warehouse.created_at)}
          />

          <SystemInformation
            label="Last Updated"
            value={formatDateTime(warehouse.updated_at)}
          />
        </div>
      </section>
    </div>
  );
}

interface WarehouseStatusBadgeProps {
  isActive: boolean;
}

interface InformationRowProps {
  label: string;
  value: string;
}

function InformationRow({ label, value }: InformationRowProps) {
  return (
    <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>

      <span className="text-sm font-medium">{value}</span>
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

interface SystemInformationProps {
  label: string;
  value: string;
}

function SystemInformation({ label, value }: SystemInformationProps) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  );
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

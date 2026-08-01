import Link from "next/link";
import DataTable, {
  type DataTableColumn,
} from "@/components/admin/shared/DataTable";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import type { Warehouse } from "@/lib/repositories/warehouse.repository";
import { Building2, ChevronRight, Plus, Star } from "lucide-react";

import EmptyState from "@/components/admin/shared/EmptyState";

interface WarehouseTableProps {
  warehouses: Warehouse[];
}

const columns: DataTableColumn<Warehouse>[] = [
  {
    key: "code",
    header: "Code",
    width: "140px",
    render: (warehouse) => (
      <span className="font-semibold">{warehouse.code}</span>
    ),
  },
  {
    key: "name",
    header: "Warehouse",
    render: (warehouse) => (
      <div className="min-w-0">
        <Link
          href={`/admin/inventory/warehouses/${warehouse.id}`}
          className="font-semibold text-foreground transition-colors hover:text-primary"
        >
          {warehouse.name}
        </Link>

        {warehouse.contact_person ? (
          <p className="mt-1 truncate text-xs text-muted-foreground">
            Contact: {warehouse.contact_person}
          </p>
        ) : null}
      </div>
    ),
  },
  {
    key: "location",
    header: "Location",
    render: (warehouse) => (
      <div>
        <p>{warehouse.city?.trim() || "Not provided"}</p>

        {warehouse.country ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {warehouse.country}
          </p>
        ) : null}
      </div>
    ),
  },
  {
    key: "phone",
    header: "Phone",
    render: (warehouse) => warehouse.phone?.trim() || "—",
  },
  {
    key: "default",
    header: "Default",
    align: "center",
    width: "110px",
    render: (warehouse) =>
      warehouse.is_default ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
          <Star className="size-3.5" />
          Default
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "status",
    header: "Status",
    align: "center",
    width: "120px",
    render: (warehouse) => (
      <StatusBadge status={warehouse.is_active ? "active" : "inactive"} />
    ),
  },
  {
    key: "actions",
    header: <span className="sr-only">Actions</span>,
    align: "right",
    width: "80px",
    render: (warehouse) => (
      <Link
        href={`/admin/inventory/warehouses/${warehouse.id}`}
        aria-label={`View ${warehouse.name}`}
        className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ChevronRight className="size-4" />
      </Link>
    ),
  },
];

export default function WarehouseTable({ warehouses }: WarehouseTableProps) {
  return (
    <DataTable
      rows={warehouses}
      columns={columns}
      getRowKey={(warehouse) => warehouse.id}
      minimumWidth="980px"
      emptyState={
        <EmptyState
          title="No warehouses found"
          description="Try changing the search criteria or status filter. If no warehouses exist yet, create your first warehouse."
          icon={Building2}
          action={{
            href: "/admin/inventory/warehouses/new",
            label: "New Warehouse",
            icon: Plus,
          }}
        />
      }
    />
  );
}

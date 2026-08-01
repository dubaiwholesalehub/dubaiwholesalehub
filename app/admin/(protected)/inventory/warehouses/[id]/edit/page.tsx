import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
} from "lucide-react";

import WarehouseForm from "@/components/admin/inventory/warehouses/WarehouseForm";
import { getWarehouseById } from "@/lib/repositories/warehouse.repository";

import { updateWarehouseAction } from "../../actions";

interface EditWarehousePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditWarehousePage({
  params,
}: EditWarehousePageProps) {
  const { id } = await params;

  const warehouse =
    await getWarehouseById(id);

  if (!warehouse) {
    notFound();
  }

  const submitAction =
    updateWarehouseAction.bind(
      null,
      warehouse.id,
    );

  return (
    <div className="space-y-6">
      <header>
        <Link
          href={`/admin/inventory/warehouses/${warehouse.id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {warehouse.name}
        </Link>

        <div className="mt-4 flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Pencil className="size-5" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Edit Warehouse
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Update {warehouse.code} —{" "}
              {warehouse.name}.
            </p>
          </div>
        </div>
      </header>

      <WarehouseForm
        mode="edit"
        initialValues={{
          code: warehouse.code,
          name: warehouse.name,

          address_line_1:
            warehouse.address_line_1,

          address_line_2:
            warehouse.address_line_2,

          city: warehouse.city,
          state: warehouse.state,
          country: warehouse.country,

          postal_code:
            warehouse.postal_code,

          contact_person:
            warehouse.contact_person,

          phone: warehouse.phone,
          email: warehouse.email,

          is_active:
            warehouse.is_active,

          is_default:
            warehouse.is_default,
        }}
        onSubmit={submitAction}
      />
    </div>
  );
}
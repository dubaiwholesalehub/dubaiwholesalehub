import { createClient } from "@/lib/supabase/server";

export interface WarehouseForGrn {
  id: string;
  code: string;
  name: string;

  city: string | null;
  country: string | null;

  is_default: boolean;
}

export async function getActiveWarehousesForGrn(): Promise<
  WarehouseForGrn[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("warehouses")
    .select(`
      id,
      code,
      name,
      city,
      country,
      is_default
    `)
    .eq("is_active", true)
    .order("is_default", {
      ascending: false,
    })
    .order("name", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Unable to load warehouses: ${error.message}`,
    );
  }

  return data ?? [];
}
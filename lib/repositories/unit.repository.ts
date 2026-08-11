import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

type UnitRow =
  Database["public"]["Tables"]["units"]["Row"];

export type Unit = UnitRow;

export async function getAdminUnits():
  Promise<Unit[]> {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase
    .from("units")
    .select(`
      id,
      name,
      short_name,
      is_active,
      created_at,
      updated_at
    `)
    .order("name", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Unable to load units: ${error.message}`,
    );
  }

  return data ?? [];
}

export async function getActiveUnits():
  Promise<Unit[]> {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase
    .from("units")
    .select(`
      id,
      name,
      short_name,
      is_active,
      created_at,
      updated_at
    `)
    .eq("is_active", true)
    .order("name", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Unable to load active units: ${error.message}`,
    );
  }

  return data ?? [];
}
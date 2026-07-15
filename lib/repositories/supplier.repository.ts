import { createClient } from "@/lib/supabase/server";

export async function getAdminSuppliers() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("suppliers")
    .select(`
      id,
      company_name,
      contact_name,
      email,
      phone,
      whatsapp,
      website,
      address,
      city,
      country_id,
      notes,
      is_active,
      created_at,
      updated_at,
      country:countries (
        id,
        name,
        iso2
      )
    `)
    .order("company_name", { ascending: true });

  if (error) {
    throw new Error(`Unable to load suppliers: ${error.message}`);
  }

  return data ?? [];
}

export async function getSupplierCountryOptions() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("countries")
    .select("id, name, iso2")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Unable to load countries: ${error.message}`);
  }

  return data ?? [];
}

export async function getActiveSupplierOptions() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("suppliers")
    .select("id, company_name")
    .eq("is_active", true)
    .order("company_name", { ascending: true });

  if (error) {
    throw new Error(`Unable to load suppliers: ${error.message}`);
  }

  return data ?? [];
}
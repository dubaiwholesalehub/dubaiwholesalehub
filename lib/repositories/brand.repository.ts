import { createClient } from "@/lib/supabase/server";

export async function getAdminBrands() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("brands")
    .select(`
      id,
      name,
      slug,
      description,
      website,
      logo_url,
      country_id,
      is_featured,
      is_active,
      created_at,
      updated_at,
      country:countries (
        id,
        name,
        iso2
      )
    `)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Unable to load brands: ${error.message}`);
  }

  return data ?? [];
}

export async function getActiveBrands() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("brands")
    .select(`
      id,
      name,
      slug,
      description,
      logo_url
    `)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Unable to load brands: ${error.message}`);
  }

  return data ?? [];
}

export async function getBrandCountryOptions() {
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
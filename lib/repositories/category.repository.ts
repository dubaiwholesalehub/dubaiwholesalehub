import { createClient } from "@/lib/supabase/server";

export async function getCategories() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");

  if (error) {
    throw new Error(`Unable to load categories: ${error.message}`);
  }

  return data ?? [];
}

export async function getAdminCategories() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select(
      `
        id,
        name,
        slug,
        description,
        icon,
        image_url,
        seo_title,
        seo_description,
        sort_order,
        is_featured,
        is_active,
        created_at,
        updated_at
      `,
    )
    .order("sort_order")
    .order("name");

  if (error) {
    throw new Error(`Unable to load categories: ${error.message}`);
  }

  return data ?? [];
}
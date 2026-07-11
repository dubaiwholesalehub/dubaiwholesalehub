import { createClient } from "@/lib/supabase/server";

export async function getFeaturedProducts(limit = 4) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      name,
      slug,
      sku,
      moq,
      lead_time,
      packaging,
      short_description,
      category:categories (
        id,
        name,
        slug
      ),
      brand:brands (
        id,
        name,
        slug
      ),
      country:countries (
        id,
        name,
        iso2
      ),
      unit:units (
        id,
        name,
        short_name
      ),
      product_images (
        id,
        storage_path,
        alt_text,
        sort_order,
        is_primary
      )
    `)
    .eq("status", "published")
    .eq("featured", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch featured products:", error);
    throw new Error("Unable to load featured products.");
  }

  return data ?? [];
}
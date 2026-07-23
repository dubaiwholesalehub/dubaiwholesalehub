import { createClient } from "@/lib/supabase/server";

export async function getAdminProducts() {
  const supabase = await createClient();

  const { data, error } = await supabase
  .from("products")
  .select(`
    id,
    name,
    slug,
    sku,
    barcode,
    model_number,
    short_description,
    description,
    category_id,
    subcategory_id,
    brand_id,
    country_id,
    unit_id,
    moq,
    carton_quantity,
    lead_time,
    packaging,
    warranty,
    hs_code,
    weight,
    length,
    width,
    height,
    status,
    featured,
    is_new,
    meta_title,
    meta_description,
    created_at,
    updated_at,
    published_at,
    category:categories (
      id,
      name
    ),
    subcategory:subcategories (
      id,
      name
    ),
    brand:brands (
      id,
      name
    ),
    country:countries (
      id,
      name
    ),
    unit:units (
      id,
      name,
      short_name
    ),
    product_images (
      id,
      storage_path,
      is_primary,
      sort_order,
      alt_text
    )
  `)
  .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load products: ${error.message}`);
  }

  return data ?? [];
}

export async function getProductFormOptions() {
  const supabase = await createClient();

  const [
    categoriesResult,
    subcategoriesResult,
    brandsResult,
    countriesResult,
    unitsResult,
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),

    supabase
      .from("subcategories")
      .select("id, name, category_id")
      .eq("is_active", true)
      .order("name"),

    supabase
      .from("brands")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),

    supabase
      .from("countries")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),

    supabase
      .from("units")
      .select("id, name, short_name")
      .eq("is_active", true)
      .order("name"),
  ]);

  const firstError =
    categoriesResult.error ??
    subcategoriesResult.error ??
    brandsResult.error ??
    countriesResult.error ??
    unitsResult.error;

  if (firstError) {
    throw new Error(
      `Unable to load product options: ${firstError.message}`,
    );
  }

  return {
    categories: categoriesResult.data ?? [],
    subcategories: subcategoriesResult.data ?? [],
    brands: brandsResult.data ?? [],
    countries: countriesResult.data ?? [],
    units: unitsResult.data ?? [],
  };
}

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
    throw new Error(
      `Unable to load featured products: ${error.message}`,
    );
  }

  return data ?? [];
}

export async function getRfqItemOptions() {
  const supabase = await createClient();

  const [productsResult, unitsResult] = await Promise.all([
    supabase
      .from("products")
      .select(`
        id,
        name,
        sku,
        short_description,
        unit_id,
        moq,
        packaging,
        unit:units (
          id,
          name,
          short_name
        ),
        brand:brands (
          id,
          name
        ),
        category:categories (
          id,
          name
        )
      `)
      .in("status", ["draft", "published"])
      .order("name"),

    supabase
      .from("units")
      .select(`
        id,
        name,
        short_name
      `)
      .eq("is_active", true)
      .order("name"),
  ]);

  const firstError =
    productsResult.error ?? unitsResult.error;

  if (firstError) {
    throw new Error(
      `Unable to load RFQ item options: ${firstError.message}`,
    );
  }

  return {
    products: productsResult.data ?? [],
    units: unitsResult.data ?? [],
  };
}
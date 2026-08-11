import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

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

/* =========================================================
 * Category Hierarchy Types
 * ========================================================= */

type CategoryRow =
  Database["public"]["Tables"]["categories"]["Row"];

type SubcategoryRow =
  Database["public"]["Tables"]["subcategories"]["Row"];

export interface AdminSubcategory
  extends SubcategoryRow {
  product_count: number;
}

export interface AdminCategoryHierarchy
  extends CategoryRow {
  product_count: number;
  subcategory_count: number;
  subcategories: AdminSubcategory[];
}

/* =========================================================
 * Admin Category Hierarchy
 * ========================================================= */

export async function getAdminCategoryHierarchy():
  Promise<AdminCategoryHierarchy[]> {
  const supabase =
    await createClient();

  const [
    categoriesResult,
    subcategoriesResult,
    productsResult,
  ] = await Promise.all([
    supabase
      .from("categories")
      .select(`
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
      `)
      .order("sort_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      }),

    supabase
      .from("subcategories")
      .select(`
        id,
        category_id,
        name,
        slug,
        description,
        image_url,
        seo_title,
        seo_description,
        sort_order,
        is_active,
        created_at,
        updated_at
      `)
      .order("sort_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      }),

    supabase
      .from("products")
      .select(`
        id,
        category_id,
        subcategory_id
      `),
  ]);

  const firstError =
    categoriesResult.error ??
    subcategoriesResult.error ??
    productsResult.error;

  if (firstError) {
    throw new Error(
      `Unable to load category hierarchy: ${firstError.message}`,
    );
  }

  const categories =
    categoriesResult.data ?? [];

  const subcategories =
    subcategoriesResult.data ?? [];

  const products =
    productsResult.data ?? [];

  const categoryProductCounts =
    new Map<string, number>();

  const subcategoryProductCounts =
    new Map<string, number>();

  for (const product of products) {
    categoryProductCounts.set(
      product.category_id,
      (
        categoryProductCounts.get(
          product.category_id,
        ) ?? 0
      ) + 1,
    );

    if (product.subcategory_id) {
      subcategoryProductCounts.set(
        product.subcategory_id,
        (
          subcategoryProductCounts.get(
            product.subcategory_id,
          ) ?? 0
        ) + 1,
      );
    }
  }

  const subcategoriesByCategory =
    new Map<
      string,
      AdminSubcategory[]
    >();

  for (const subcategory of subcategories) {
    const mappedSubcategory:
      AdminSubcategory = {
      ...subcategory,

      product_count:
        subcategoryProductCounts.get(
          subcategory.id,
        ) ?? 0,
    };

    const current =
      subcategoriesByCategory.get(
        subcategory.category_id,
      ) ?? [];

    current.push(
      mappedSubcategory,
    );

    subcategoriesByCategory.set(
      subcategory.category_id,
      current,
    );
  }

  return categories.map(
    (category) => {
      const categorySubcategories =
        subcategoriesByCategory.get(
          category.id,
        ) ?? [];

      return {
        ...category,

        product_count:
          categoryProductCounts.get(
            category.id,
          ) ?? 0,

        subcategory_count:
          categorySubcategories.length,

        subcategories:
          categorySubcategories,
      };
    },
  );
}
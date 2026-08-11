"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { categorySchema } from "@/schemas/category.schema";
import { subcategorySchema } from "@/schemas/subcategory.schema";

function createSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function redirectWithMessage(
  type: "success" | "error",
  message: string,
): never {
  redirect(`/admin/categories?${type}=${encodeURIComponent(message)}`);
}

function parseCategoryForm(formData: FormData) {
  return categorySchema.safeParse({
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? "") || undefined,
    description:
      String(formData.get("description") ?? "") || undefined,
    sortOrder: formData.get("sortOrder") ?? 0,
    isFeatured: formData.get("isFeatured") === "on",
  });
}

export async function createCategory(formData: FormData) {
  const parsed = parseCategoryForm(formData);

  if (!parsed.success) {
    redirectWithMessage(
      "error",
      parsed.error.issues[0]?.message ??
      "Please check the category details.",
    );
  }

  const slug = createSlug(parsed.data.slug || parsed.data.name);

  if (!slug) {
    redirectWithMessage("error", "A valid slug is required.");
  }

  const { supabase } = await requireAdmin();

  const { error } = await supabase.from("categories").insert({
    name: parsed.data.name,
    slug,
    description: parsed.data.description || null,
    sort_order: parsed.data.sortOrder,
    is_featured: parsed.data.isFeatured,
    is_active: true,
  });

  if (error?.code === "23505") {
    redirectWithMessage(
      "error",
      "A category with this slug already exists.",
    );
  }

  if (error) {
    redirectWithMessage(
      "error",
      `Unable to create category: ${error.message}`,
    );
  }

  revalidatePath("/");
  revalidatePath("/admin/categories");

  redirectWithMessage("success", "Category created successfully.");
}

export async function updateCategory(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const parsed = parseCategoryForm(formData);

  if (!id) {
    redirectWithMessage("error", "Category ID is missing.");
  }

  if (!parsed.success) {
    redirectWithMessage(
      "error",
      parsed.error.issues[0]?.message ??
      "Please check the category details.",
    );
  }

  const slug = createSlug(parsed.data.slug || parsed.data.name);

  if (!slug) {
    redirectWithMessage("error", "A valid slug is required.");
  }

  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("categories")
    .update({
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      sort_order: parsed.data.sortOrder,
      is_featured: parsed.data.isFeatured,
    })
    .eq("id", id);

  if (error?.code === "23505") {
    redirectWithMessage(
      "error",
      "A category with this slug already exists.",
    );
  }

  if (error) {
    redirectWithMessage(
      "error",
      `Unable to update category: ${error.message}`,
    );
  }

  revalidatePath("/");
  revalidatePath("/admin/categories");

  redirectWithMessage("success", "Category updated successfully.");
}

export async function toggleCategoryStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const nextStatus =
    String(formData.get("nextStatus") ?? "") === "true";

  if (!id) {
    redirectWithMessage("error", "Category ID is missing.");
  }

  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("categories")
    .update({
      is_active: nextStatus,
    })
    .eq("id", id);

  if (error) {
    redirectWithMessage(
      "error",
      `Unable to update category: ${error.message}`,
    );
  }

  revalidatePath("/");
  revalidatePath("/admin/categories");

  redirectWithMessage(
    "success",
    nextStatus
      ? "Category activated successfully."
      : "Category archived successfully.",
  );
}

/* =========================================================
 * Subcategory Helpers
 * ========================================================= */

function parseSubcategoryForm(
  formData: FormData,
) {
  return subcategorySchema.safeParse({
    categoryId: String(
      formData.get("categoryId") ?? "",
    ),

    name: String(
      formData.get("name") ?? "",
    ),

    slug:
      String(
        formData.get("slug") ?? "",
      ) || undefined,

    description:
      String(
        formData.get(
          "description",
        ) ?? "",
      ) || undefined,

    imageUrl:
      String(
        formData.get(
          "imageUrl",
        ) ?? "",
      ) || undefined,

    seoTitle:
      String(
        formData.get(
          "seoTitle",
        ) ?? "",
      ) || undefined,

    seoDescription:
      String(
        formData.get(
          "seoDescription",
        ) ?? "",
      ) || undefined,

    sortOrder:
      formData.get(
        "sortOrder",
      ) ?? 0,
  });
}

function revalidateCategoryPaths() {
  revalidatePath("/");
  revalidatePath("/categories");
  revalidatePath("/products");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
}

/* =========================================================
 * Create Subcategory
 * ========================================================= */

export async function createSubcategory(
  formData: FormData,
): Promise<void> {
  const parsed =
    parseSubcategoryForm(
      formData,
    );

  if (!parsed.success) {
    redirectWithMessage(
      "error",
      parsed.error.issues[0]
        ?.message ??
      "Please check the subcategory details.",
    );
  }

  const slug = createSlug(
    parsed.data.slug ||
    parsed.data.name,
  );

  if (!slug) {
    redirectWithMessage(
      "error",
      "A valid subcategory slug is required.",
    );
  }

  const { supabase } =
    await requireAdmin();

  const {
    data: parentCategory,
    error: parentError,
  } = await supabase
    .from("categories")
    .select("id")
    .eq(
      "id",
      parsed.data.categoryId,
    )
    .maybeSingle();

  if (parentError) {
    redirectWithMessage(
      "error",
      `Unable to verify the parent category: ${parentError.message}`,
    );
  }

  if (!parentCategory) {
    redirectWithMessage(
      "error",
      "The selected parent category was not found.",
    );
  }

  const { error } =
    await supabase
      .from("subcategories")
      .insert({
        category_id:
          parsed.data.categoryId,

        name:
          parsed.data.name,

        slug,

        description:
          parsed.data.description ||
          null,

        image_url:
          parsed.data.imageUrl ||
          null,

        seo_title:
          parsed.data.seoTitle ||
          null,

        seo_description:
          parsed.data
            .seoDescription ||
          null,

        sort_order:
          parsed.data.sortOrder,

        is_active: true,
      });

  if (
    error?.code === "23505"
  ) {
    redirectWithMessage(
      "error",
      "A subcategory with this slug already exists.",
    );
  }

  if (error) {
    redirectWithMessage(
      "error",
      `Unable to create subcategory: ${error.message}`,
    );
  }

  revalidateCategoryPaths();

  redirectWithMessage(
    "success",
    "Subcategory created successfully.",
  );
}

/* =========================================================
 * Update Subcategory
 * ========================================================= */

export async function updateSubcategory(
  formData: FormData,
): Promise<void> {
  const id = String(
    formData.get("id") ?? "",
  ).trim();

  if (!id) {
    redirectWithMessage(
      "error",
      "Subcategory ID is missing.",
    );
  }

  const parsed =
    parseSubcategoryForm(
      formData,
    );

  if (!parsed.success) {
    redirectWithMessage(
      "error",
      parsed.error.issues[0]
        ?.message ??
      "Please check the subcategory details.",
    );
  }

  const slug = createSlug(
    parsed.data.slug ||
    parsed.data.name,
  );

  if (!slug) {
    redirectWithMessage(
      "error",
      "A valid subcategory slug is required.",
    );
  }

  const { supabase } =
    await requireAdmin();

  const {
    data: parentCategory,
    error: parentError,
  } = await supabase
    .from("categories")
    .select("id")
    .eq(
      "id",
      parsed.data.categoryId,
    )
    .maybeSingle();

  if (parentError) {
    redirectWithMessage(
      "error",
      `Unable to verify the parent category: ${parentError.message}`,
    );
  }

  if (!parentCategory) {
    redirectWithMessage(
      "error",
      "The selected parent category was not found.",
    );
  }

  const { error } =
    await supabase
      .from("subcategories")
      .update({
        category_id:
          parsed.data.categoryId,

        name:
          parsed.data.name,

        slug,

        description:
          parsed.data.description ||
          null,

        image_url:
          parsed.data.imageUrl ||
          null,

        seo_title:
          parsed.data.seoTitle ||
          null,

        seo_description:
          parsed.data
            .seoDescription ||
          null,

        sort_order:
          parsed.data.sortOrder,
      })
      .eq("id", id);

  if (
    error?.code === "23505"
  ) {
    redirectWithMessage(
      "error",
      "A subcategory with this slug already exists.",
    );
  }

  if (error) {
    redirectWithMessage(
      "error",
      `Unable to update subcategory: ${error.message}`,
    );
  }

  revalidateCategoryPaths();

  redirectWithMessage(
    "success",
    "Subcategory updated successfully.",
  );
}

/* =========================================================
 * Toggle Subcategory Status
 * ========================================================= */

export async function toggleSubcategoryStatus(
  formData: FormData,
): Promise<void> {
  const id = String(
    formData.get("id") ?? "",
  ).trim();

  const nextStatus =
    String(
      formData.get(
        "nextStatus",
      ) ?? "",
    ) === "true";

  if (!id) {
    redirectWithMessage(
      "error",
      "Subcategory ID is missing.",
    );
  }

  const { supabase } =
    await requireAdmin();

  const { error } =
    await supabase
      .from("subcategories")
      .update({
        is_active:
          nextStatus,
      })
      .eq("id", id);

  if (error) {
    redirectWithMessage(
      "error",
      `Unable to update subcategory status: ${error.message}`,
    );
  }

  revalidateCategoryPaths();

  redirectWithMessage(
    "success",
    nextStatus
      ? "Subcategory activated successfully."
      : "Subcategory archived successfully.",
  );
}
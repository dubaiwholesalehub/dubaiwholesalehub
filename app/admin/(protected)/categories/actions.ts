"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { categorySchema } from "@/schemas/category.schema";

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
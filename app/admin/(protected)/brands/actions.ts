"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { brandSchema } from "@/schemas/brand.schema";

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
  redirect(`/admin/brands?${type}=${encodeURIComponent(message)}`);
}

function optionalFormValue(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();

  return value || undefined;
}

function parseBrandForm(formData: FormData) {
  return brandSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    slug: optionalFormValue(formData, "slug"),
    description: optionalFormValue(formData, "description"),
    website: optionalFormValue(formData, "website"),
    logoUrl: optionalFormValue(formData, "logoUrl"),
    countryId: optionalFormValue(formData, "countryId"),
    isFeatured: formData.get("isFeatured") === "on",
  });
}

export async function createBrand(formData: FormData) {
  const parsed = parseBrandForm(formData);

  if (!parsed.success) {
    redirectWithMessage(
      "error",
      parsed.error.issues[0]?.message ??
        "Please check the brand details.",
    );
  }

  const slug = createSlug(parsed.data.slug || parsed.data.name);

  if (!slug) {
    redirectWithMessage("error", "A valid slug is required.");
  }

  const { supabase } = await requireAdmin();

  const { error } = await supabase.from("brands").insert({
    name: parsed.data.name,
    slug,
    description: parsed.data.description || null,
    website: parsed.data.website || null,
    logo_url: parsed.data.logoUrl || null,
    country_id: parsed.data.countryId || null,
    is_featured: parsed.data.isFeatured,
    is_active: true,
  });

  if (error?.code === "23505") {
    redirectWithMessage(
      "error",
      "A brand with this name or slug already exists.",
    );
  }

  if (error) {
    redirectWithMessage(
      "error",
      `Unable to create brand: ${error.message}`,
    );
  }

  revalidatePath("/");
  revalidatePath("/brands");
  revalidatePath("/admin/brands");

  redirectWithMessage("success", "Brand created successfully.");
}

export async function updateBrand(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const parsed = parseBrandForm(formData);

  if (!id) {
    redirectWithMessage("error", "Brand ID is missing.");
  }

  if (!parsed.success) {
    redirectWithMessage(
      "error",
      parsed.error.issues[0]?.message ??
        "Please check the brand details.",
    );
  }

  const slug = createSlug(parsed.data.slug || parsed.data.name);

  if (!slug) {
    redirectWithMessage("error", "A valid slug is required.");
  }

  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("brands")
    .update({
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      website: parsed.data.website || null,
      logo_url: parsed.data.logoUrl || null,
      country_id: parsed.data.countryId || null,
      is_featured: parsed.data.isFeatured,
    })
    .eq("id", id);

  if (error?.code === "23505") {
    redirectWithMessage(
      "error",
      "A brand with this name or slug already exists.",
    );
  }

  if (error) {
    redirectWithMessage(
      "error",
      `Unable to update brand: ${error.message}`,
    );
  }

  revalidatePath("/");
  revalidatePath("/brands");
  revalidatePath("/admin/brands");

  redirectWithMessage("success", "Brand updated successfully.");
}

export async function toggleBrandStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const nextStatus =
    String(formData.get("nextStatus") ?? "") === "true";

  if (!id) {
    redirectWithMessage("error", "Brand ID is missing.");
  }

  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("brands")
    .update({
      is_active: nextStatus,
    })
    .eq("id", id);

  if (error) {
    redirectWithMessage(
      "error",
      `Unable to update brand: ${error.message}`,
    );
  }

  revalidatePath("/");
  revalidatePath("/brands");
  revalidatePath("/admin/brands");

  redirectWithMessage(
    "success",
    nextStatus
      ? "Brand activated successfully."
      : "Brand archived successfully.",
  );
}
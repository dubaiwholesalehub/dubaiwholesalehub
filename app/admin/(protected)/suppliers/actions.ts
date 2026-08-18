"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { supplierSchema } from "@/schemas/supplier.schema";

function optionalFormValue(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();

  return value || undefined;
}

function redirectWithMessage(
  type: "success" | "error",
  message: string,
): never {
  redirect(
    `/admin/suppliers?${type}=${encodeURIComponent(message)}`,
  );
}

function parseSupplierForm(formData: FormData) {
  return supplierSchema.safeParse({
    companyName: String(formData.get("companyName") ?? ""),
    contactName: optionalFormValue(formData, "contactName"),
    email: optionalFormValue(formData, "email"),
    phone: optionalFormValue(formData, "phone"),
    whatsapp: optionalFormValue(formData, "whatsapp"),
    website: optionalFormValue(formData, "website"),
    address: optionalFormValue(formData, "address"),
    city: optionalFormValue(formData, "city"),
    countryId: optionalFormValue(formData, "countryId"),
    paymentTermsDays: String(
      formData.get("paymentTermsDays") ?? "0",
    ),
    notes: optionalFormValue(formData, "notes"),
  });
}

export async function createSupplier(formData: FormData) {
  const parsed = parseSupplierForm(formData);

  if (!parsed.success) {
    redirectWithMessage(
      "error",
      parsed.error.issues[0]?.message ??
      "Please check the supplier details.",
    );
  }

  const { supabase } = await requireAdmin();

  const { error } = await supabase.from("suppliers").insert({
    company_name: parsed.data.companyName,
    contact_name: parsed.data.contactName || null,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    whatsapp: parsed.data.whatsapp || null,
    website: parsed.data.website || null,
    address: parsed.data.address || null,
    city: parsed.data.city || null,
    country_id: parsed.data.countryId || null,
    payment_terms_days:
      parsed.data.paymentTermsDays,
    notes: parsed.data.notes || null,
    is_active: true,
  });

  if (error) {
    redirectWithMessage(
      "error",
      `Unable to create supplier: ${error.message}`,
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/suppliers");
  revalidatePath("/admin/products");

  redirectWithMessage(
    "success",
    "Supplier created successfully.",
  );
}

export async function updateSupplier(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const parsed = parseSupplierForm(formData);

  if (!id) {
    redirectWithMessage("error", "Supplier ID is missing.");
  }

  if (!parsed.success) {
    redirectWithMessage(
      "error",
      parsed.error.issues[0]?.message ??
      "Please check the supplier details.",
    );
  }

  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("suppliers")
    .update({
      company_name: parsed.data.companyName,
      contact_name: parsed.data.contactName || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      whatsapp: parsed.data.whatsapp || null,
      website: parsed.data.website || null,
      address: parsed.data.address || null,
      city: parsed.data.city || null,
      country_id: parsed.data.countryId || null,
      payment_terms_days:
        parsed.data.paymentTermsDays,
      notes: parsed.data.notes || null,
    })
    .eq("id", id);

  if (error) {
    redirectWithMessage(
      "error",
      `Unable to update supplier: ${error.message}`,
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/suppliers");
  revalidatePath("/admin/products");

  redirectWithMessage(
    "success",
    "Supplier updated successfully.",
  );
}

export async function toggleSupplierStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const nextStatus =
    String(formData.get("nextStatus") ?? "") === "true";

  if (!id) {
    redirectWithMessage("error", "Supplier ID is missing.");
  }

  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("suppliers")
    .update({
      is_active: nextStatus,
    })
    .eq("id", id);

  if (error) {
    redirectWithMessage(
      "error",
      `Unable to update supplier: ${error.message}`,
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/suppliers");
  revalidatePath("/admin/products");

  redirectWithMessage(
    "success",
    nextStatus
      ? "Supplier activated successfully."
      : "Supplier archived successfully.",
  );
}
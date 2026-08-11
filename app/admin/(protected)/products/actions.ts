"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { productSchema } from "@/schemas/product.schema";
import type { ProductInput } from "@/schemas/product.schema";

function optionalValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || undefined;
}

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
  redirect(
    `/admin/products?${type}=${encodeURIComponent(message)}`,
  );
}

function parseProductForm(formData: FormData) {
  return productSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    slug: optionalValue(formData, "slug"),
    sku: optionalValue(formData, "sku"),
    barcode: optionalValue(formData, "barcode"),
    modelNumber: optionalValue(formData, "modelNumber"),

    categoryId: String(formData.get("categoryId") ?? ""),
    subcategoryId: optionalValue(formData, "subcategoryId"),
    brandId: optionalValue(formData, "brandId"),
    countryId: optionalValue(formData, "countryId"),
    unitId: optionalValue(formData, "unitId"),

    shortDescription: optionalValue(
      formData,
      "shortDescription",
    ),
    description: optionalValue(formData, "description"),

    moq: formData.get("moq") ?? 1,
    cartonQuantity: formData.get("cartonQuantity") ?? "",
    leadTime: optionalValue(formData, "leadTime"),
    packaging: optionalValue(formData, "packaging"),
    warranty: optionalValue(formData, "warranty"),
    hsCode: optionalValue(formData, "hsCode"),

    status: String(formData.get("status") ?? "draft"),
    featured: formData.get("featured") === "on",
    isNew: formData.get("isNew") === "on",

    fulfilmentMethod: String(
      formData.get("fulfilmentMethod") ??
      "stock",
    ),

    procurementLeadTimeDays:
      formData.get(
        "procurementLeadTimeDays",
      ) ?? 0,
    minimumStockQuantity:
      formData.get(
        "minimumStockQuantity",
      ) ?? 0,

    reorderQuantity:
      formData.get(
        "reorderQuantity",
      ) ?? 0,

    safetyStockDays:
      formData.get(
        "safetyStockDays",
      ) ?? 7,
    allowBackorder:
      formData.get("allowBackorder") ===
      "on",

    procurementNotes:
      optionalValue(
        formData,
        "procurementNotes",
      ),

    metaTitle: optionalValue(formData, "metaTitle"),
    metaDescription: optionalValue(
      formData,
      "metaDescription",
    ),
  });
}

function buildProductPayload(
  data: ProductInput,
  slug: string,
) {
  return {
    name: data.name,
    slug,
    sku: data.sku || null,
    barcode: data.barcode || null,
    model_number: data.modelNumber || null,

    category_id: data.categoryId,
    subcategory_id: data.subcategoryId || null,
    brand_id: data.brandId || null,
    country_id: data.countryId || null,
    unit_id: data.unitId || null,

    short_description: data.shortDescription || null,
    description: data.description || null,

    moq: data.moq,
    carton_quantity: data.cartonQuantity ?? null,
    lead_time: data.leadTime || null,
    packaging: data.packaging || null,
    warranty: data.warranty || null,
    hs_code: data.hsCode || null,

    status: data.status,
    featured: data.featured,
    is_new: data.isNew,

    fulfilment_method:
      data.fulfilmentMethod,

    procurement_lead_time_days:
      data.fulfilmentMethod === "service"
        ? 0
        : data.procurementLeadTimeDays,
    minimum_stock_quantity:
      data.minimumStockQuantity,

    reorder_quantity:
      data.reorderQuantity,

    safety_stock_days:
      data.safetyStockDays,
    allow_backorder:
      data.fulfilmentMethod === "service"
        ? false
        : data.allowBackorder,

    procurement_notes:
      data.procurementNotes || null,

    meta_title: data.metaTitle || null,
    meta_description: data.metaDescription || null,
  };
}

export async function createProduct(formData: FormData) {
  const parsed = parseProductForm(formData);

  if (!parsed.success) {
    redirectWithMessage(
      "error",
      parsed.error.issues[0]?.message ??
      "Please check the product information.",
    );
  }

  const slug = createSlug(parsed.data.slug || parsed.data.name);

  if (!slug) {
    redirectWithMessage("error", "A valid product slug is required.");
  }

  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("products")
    .insert(buildProductPayload(parsed.data, slug));

  if (error?.code === "23505") {
    redirectWithMessage(
      "error",
      "The product slug, SKU, or another unique value already exists.",
    );
  }

  if (error) {
    redirectWithMessage(
      "error",
      `Unable to create product: ${error.message}`,
    );
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin");
  revalidatePath("/admin/products");

  redirectWithMessage("success", "Product created successfully.");
}

export async function updateProduct(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const parsed = parseProductForm(formData);

  if (!id) {
    redirectWithMessage("error", "Product ID is missing.");
  }

  if (!parsed.success) {
    redirectWithMessage(
      "error",
      parsed.error.issues[0]?.message ??
      "Please check the product information.",
    );
  }

  const slug = createSlug(parsed.data.slug || parsed.data.name);

  if (!slug) {
    redirectWithMessage("error", "A valid product slug is required.");
  }

  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("products")
    .update(buildProductPayload(parsed.data, slug))
    .eq("id", id);

  if (error?.code === "23505") {
    redirectWithMessage(
      "error",
      "The product slug, SKU, or another unique value already exists.",
    );
  }

  if (error) {
    redirectWithMessage(
      "error",
      `Unable to update product: ${error.message}`,
    );
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath(`/products/${slug}`);
  revalidatePath("/admin");
  revalidatePath("/admin/products");

  redirectWithMessage("success", "Product updated successfully.");
}

export async function changeProductStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (
    !id ||
    !["draft", "pending_review", "published", "archived"].includes(
      status,
    )
  ) {
    redirectWithMessage("error", "Invalid product status.");
  }

  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("products")
    .update({
      status: status as
        | "draft"
        | "pending_review"
        | "published"
        | "archived",
    })
    .eq("id", id);

  if (error) {
    redirectWithMessage(
      "error",
      `Unable to change product status: ${error.message}`,
    );
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin");
  revalidatePath("/admin/products");

  redirectWithMessage(
    "success",
    `Product status changed to ${status.replace("_", " ")}.`,
  );
}
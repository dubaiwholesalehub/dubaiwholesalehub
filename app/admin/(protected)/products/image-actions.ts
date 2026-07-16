"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";

const BUCKET_NAME = "products-images";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function redirectWithMessage(
  type: "success" | "error",
  message: string,
): never {
  redirect(
    `/admin/products?${type}=${encodeURIComponent(message)}`,
  );
}

function getFileExtension(file: File) {
  const originalExtension = file.name
    .split(".")
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (originalExtension) {
    return originalExtension;
  }

  switch (file.type) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "bin";
  }
}

export async function uploadProductImages(
  formData: FormData,
) {
  const productId = String(
    formData.get("productId") ?? "",
  );

  const files = formData
    .getAll("images")
    .filter(
      (value): value is File =>
        value instanceof File && value.size > 0,
    );

  if (!productId) {
    redirectWithMessage(
      "error",
      "Product ID is missing.",
    );
  }

  if (files.length === 0) {
    redirectWithMessage(
      "error",
      "Please select at least one image.",
    );
  }

  if (files.length > 10) {
    redirectWithMessage(
      "error",
      "You can upload a maximum of 10 images at once.",
    );
  }

  for (const file of files) {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      redirectWithMessage(
        "error",
        `${file.name} is not a supported image format.`,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      redirectWithMessage(
        "error",
        `${file.name} exceeds the 5 MB limit.`,
      );
    }
  }

  const { supabase } = await requireAdmin();

  const { data: product, error: productError } =
    await supabase
      .from("products")
      .select("id, slug")
      .eq("id", productId)
      .single();

  if (productError || !product) {
    redirectWithMessage(
      "error",
      "The selected product could not be found.",
    );
  }

  const { data: existingImages, error: imageQueryError } =
    await supabase
      .from("product_images")
      .select("id, sort_order, is_primary")
      .eq("product_id", productId)
      .order("sort_order", { ascending: false });

  if (imageQueryError) {
    redirectWithMessage(
      "error",
      `Unable to inspect existing images: ${imageQueryError.message}`,
    );
  }

  let nextSortOrder =
    (existingImages?.[0]?.sort_order ?? -1) + 1;

  const hasPrimaryImage =
    existingImages?.some((image) => image.is_primary) ??
    false;

  const uploadedPaths: string[] = [];

  try {
    for (const [index, file] of files.entries()) {
      const extension = getFileExtension(file);

      const storagePath = [
        productId,
        `${randomUUID()}.${extension}`,
      ].join("/");

      const arrayBuffer = await file.arrayBuffer();

      const { error: uploadError } =
        await supabase.storage
          .from(BUCKET_NAME)
          .upload(storagePath, arrayBuffer, {
            contentType: file.type,
            cacheControl: "31536000",
            upsert: false,
          });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      uploadedPaths.push(storagePath);

      const isPrimary =
        !hasPrimaryImage && index === 0;

      const { error: insertError } = await supabase
        .from("product_images")
        .insert({
          product_id: productId,
          storage_path: storagePath,
          alt_text: product.slug,
          sort_order: nextSortOrder,
          is_primary: isPrimary,
        });

      if (insertError) {
        await supabase.storage
          .from(BUCKET_NAME)
          .remove([storagePath]);

        throw new Error(insertError.message);
      }

      nextSortOrder += 1;
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown upload error.";

    redirectWithMessage(
      "error",
      `Unable to upload images: ${message}`,
    );
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath(`/products/${product.slug}`);
  revalidatePath("/admin/products");

  redirectWithMessage(
    "success",
    `${uploadedPaths.length} image${
      uploadedPaths.length === 1 ? "" : "s"
    } uploaded successfully.`,
  );
}

export async function setPrimaryProductImage(
  formData: FormData,
) {
  const productId = String(
    formData.get("productId") ?? "",
  );

  const imageId = String(formData.get("imageId") ?? "");

  if (!productId || !imageId) {
    redirectWithMessage(
      "error",
      "Product image information is incomplete.",
    );
  }

  const { supabase } = await requireAdmin();

  const { error: resetError } = await supabase
    .from("product_images")
    .update({
      is_primary: false,
    })
    .eq("product_id", productId);

  if (resetError) {
    redirectWithMessage(
      "error",
      `Unable to reset the primary image: ${resetError.message}`,
    );
  }

  const { error: primaryError } = await supabase
    .from("product_images")
    .update({
      is_primary: true,
    })
    .eq("id", imageId)
    .eq("product_id", productId);

  if (primaryError) {
    redirectWithMessage(
      "error",
      `Unable to select the primary image: ${primaryError.message}`,
    );
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin/products");

  redirectWithMessage(
    "success",
    "Primary image updated successfully.",
  );
}

export async function deleteProductImage(
  formData: FormData,
) {
  const productId = String(
    formData.get("productId") ?? "",
  );

  const imageId = String(formData.get("imageId") ?? "");

  if (!productId || !imageId) {
    redirectWithMessage(
      "error",
      "Product image information is incomplete.",
    );
  }

  const { supabase } = await requireAdmin();

  const { data: image, error: imageError } =
    await supabase
      .from("product_images")
      .select("id, storage_path, is_primary")
      .eq("id", imageId)
      .eq("product_id", productId)
      .single();

  if (imageError || !image) {
    redirectWithMessage(
      "error",
      "The selected image could not be found.",
    );
  }

  const { error: storageError } =
    await supabase.storage
      .from(BUCKET_NAME)
      .remove([image.storage_path]);

  if (storageError) {
    redirectWithMessage(
      "error",
      `Unable to delete the stored image: ${storageError.message}`,
    );
  }

  const { error: databaseError } = await supabase
    .from("product_images")
    .delete()
    .eq("id", imageId);

  if (databaseError) {
    redirectWithMessage(
      "error",
      `Unable to remove the image record: ${databaseError.message}`,
    );
  }

  if (image.is_primary) {
    const { data: replacement } = await supabase
      .from("product_images")
      .select("id")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (replacement) {
      await supabase
        .from("product_images")
        .update({
          is_primary: true,
        })
        .eq("id", replacement.id);
    }
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin/products");

  redirectWithMessage(
    "success",
    "Product image deleted successfully.",
  );
}
"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";

const BUCKET_NAME = "wholesale-collections";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES_PER_BATCH = 10;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

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
    default:
      return "bin";
  }
}

export async function uploadWholesaleCollectionImages(
  formData: FormData,
) {
  const collectionId = String(
    formData.get("collectionId") ?? "",
  );

  const files = formData
    .getAll("images")
    .filter(
      (value): value is File =>
        value instanceof File && value.size > 0,
    );

  if (!collectionId) {
    return {
      success: false,
      message: "Collection ID is missing.",
    };
  }

  if (files.length === 0) {
    return {
      success: false,
      message: "Please select at least one photo.",
    };
  }

  if (files.length > MAX_FILES_PER_BATCH) {
    return {
      success: false,
      message: `Upload a maximum of ${MAX_FILES_PER_BATCH} photos per batch.`,
    };
  }

  for (const file of files) {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return {
        success: false,
        message: `${file.name} is not a supported image format.`,
      };
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        message: `${file.name} exceeds the 5 MB limit.`,
      };
    }
  }

  const { supabase } = await requireAdmin();

  const { data: collection, error: collectionError } =
    await supabase
      .from("wholesale_collections")
      .select("id, slug")
      .eq("id", collectionId)
      .single();

  if (collectionError || !collection) {
    return {
      success: false,
      message: "The collection could not be found.",
    };
  }

  const { data: lastImage, error: sortError } =
    await supabase
      .from("wholesale_collection_images")
      .select("sort_order")
      .eq("collection_id", collectionId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (sortError) {
    return {
      success: false,
      message: `Unable to inspect existing photos: ${sortError.message}`,
    };
  }

  let nextSortOrder =
    (lastImage?.sort_order ?? -1) + 1;

  let uploadedCount = 0;

  for (const file of files) {
    const extension = getFileExtension(file);

    const storagePath = [
      collectionId,
      `${randomUUID()}.${extension}`,
    ].join("/");

    try {
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

      const { error: insertError } = await supabase
        .from("wholesale_collection_images")
        .insert({
          collection_id: collectionId,
          storage_path: storagePath,
          sort_order: nextSortOrder,
          is_available: true,
        });

      if (insertError) {
        await supabase.storage
          .from(BUCKET_NAME)
          .remove([storagePath]);

        throw new Error(insertError.message);
      }

      uploadedCount += 1;
      nextSortOrder += 1;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown upload error.";

      revalidatePath(
        `/admin/wholesale-collections/${collectionId}`,
      );

      return {
        success: false,
        message:
          uploadedCount > 0
            ? `${uploadedCount} photo${
                uploadedCount === 1 ? "" : "s"
              } uploaded before the error. ${message}`
            : `Unable to upload photos: ${message}`,
      };
    }
  }

  revalidatePath(
    `/admin/wholesale-collections/${collectionId}`,
  );
  revalidatePath("/admin/wholesale-collections");
  revalidatePath(`/collection/${collection.slug}`);

  return {
    success: true,
    message: `${uploadedCount} photo${
      uploadedCount === 1 ? "" : "s"
    } uploaded successfully.`,
  };
}

export async function deleteWholesaleCollectionImages(
  collectionId: string,
  imageIds: string[],
) {
  if (!collectionId) {
    return {
      success: false,
      message: "Collection ID is missing.",
    };
  }

  const uniqueImageIds = [
    ...new Set(
      imageIds
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];

  if (uniqueImageIds.length === 0) {
    return {
      success: false,
      message: "Please select at least one photo.",
    };
  }

  const { supabase } = await requireAdmin();

  const { data: collection, error: collectionError } =
    await supabase
      .from("wholesale_collections")
      .select("id, slug")
      .eq("id", collectionId)
      .single();

  if (collectionError || !collection) {
    return {
      success: false,
      message: "The collection could not be found.",
    };
  }

  const { data: images, error: imageError } =
    await supabase
      .from("wholesale_collection_images")
      .select("id, storage_path")
      .eq("collection_id", collectionId)
      .in("id", uniqueImageIds);

  if (imageError) {
    return {
      success: false,
      message: `Unable to load selected photos: ${imageError.message}`,
    };
  }

  if (!images || images.length === 0) {
    return {
      success: false,
      message: "The selected photos could not be found.",
    };
  }

  const storagePaths = images.map(
    (image) => image.storage_path,
  );

  const { error: storageError } =
    await supabase.storage
      .from(BUCKET_NAME)
      .remove(storagePaths);

  if (storageError) {
    return {
      success: false,
      message: `Unable to delete stored photos: ${storageError.message}`,
    };
  }

  const databaseIds = images.map(
    (image) => image.id,
  );

  const { error: databaseError } =
    await supabase
      .from("wholesale_collection_images")
      .delete()
      .eq("collection_id", collectionId)
      .in("id", databaseIds);

  if (databaseError) {
    return {
      success: false,
      message: `Storage files were deleted, but the database records could not be removed: ${databaseError.message}`,
    };
  }

  revalidatePath(
    `/admin/wholesale-collections/${collectionId}`,
  );
  revalidatePath("/admin/wholesale-collections");
  revalidatePath(`/collection/${collection.slug}`);

  return {
    success: true,
    message: `${images.length} photo${
      images.length === 1 ? "" : "s"
    } deleted successfully.`,
  };
}

export async function setWholesaleCollectionImageAvailability(
  collectionId: string,
  imageId: string,
  isAvailable: boolean,
) {
  if (!collectionId || !imageId) {
    return {
      success: false,
      message: "Collection or photo ID is missing.",
    };
  }

  const { supabase } = await requireAdmin();

  const { data: collection, error: collectionError } =
    await supabase
      .from("wholesale_collections")
      .select("id, slug")
      .eq("id", collectionId)
      .single();

  if (collectionError || !collection) {
    return {
      success: false,
      message: "The collection could not be found.",
    };
  }

  const { data: image, error: imageError } =
    await supabase
      .from("wholesale_collection_images")
      .select("id, reference_number")
      .eq("id", imageId)
      .eq("collection_id", collectionId)
      .single();

  if (imageError || !image) {
    return {
      success: false,
      message: "The photo could not be found.",
    };
  }

  const { error: updateError } =
    await supabase
      .from("wholesale_collection_images")
      .update({
        is_available: isAvailable,
      })
      .eq("id", imageId)
      .eq("collection_id", collectionId);

  if (updateError) {
    return {
      success: false,
      message: `Unable to update photo: ${updateError.message}`,
    };
  }

  revalidatePath(
    `/admin/wholesale-collections/${collectionId}`,
  );
  revalidatePath("/admin/wholesale-collections");
  revalidatePath(`/collection/${collection.slug}`);

  const reference = `#${String(
    image.reference_number,
  ).padStart(4, "0")}`;

  return {
    success: true,
    message: `${reference} marked ${
      isAvailable ? "available" : "unavailable"
    }.`,
  };
}
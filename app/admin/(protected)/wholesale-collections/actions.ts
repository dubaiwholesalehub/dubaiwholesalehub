"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";

function redirectWithMessage(
  type: "success" | "error",
  message: string,
): never {
  redirect(
    `/admin/wholesale-collections?${type}=${encodeURIComponent(
      message,
    )}`,
  );
}

function makeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createWholesaleCollection(
  formData: FormData,
) {
  const title = String(formData.get("title") ?? "").trim();

  if (!title) {
    redirectWithMessage(
      "error",
      "Please enter a collection name.",
    );
  }

  const baseSlug = makeSlug(title);

  if (!baseSlug) {
    redirectWithMessage(
      "error",
      "Please enter a valid collection name.",
    );
  }

  const { supabase } = await requireAdmin();

  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const { data: existing, error: lookupError } =
      await supabase
        .from("wholesale_collections")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

    if (lookupError) {
      redirectWithMessage(
        "error",
        `Unable to check collection name: ${lookupError.message}`,
      );
    }

    if (!existing) {
      break;
    }

    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const { data, error } = await supabase
    .from("wholesale_collections")
    .insert({
      title,
      slug,
      is_published: false,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirectWithMessage(
      "error",
      `Unable to create collection: ${
        error?.message ?? "Unknown error."
      }`,
    );
  }

  revalidatePath("/admin/wholesale-collections");

  redirect(
    `/admin/wholesale-collections/${data.id}?success=${encodeURIComponent(
      "Collection created. You can now upload photos.",
    )}`,
  );
}

export async function setWholesaleCollectionPublished(
  collectionId: string,
  isPublished: boolean,
) {
  if (!collectionId) {
    return {
      success: false,
      message: "Collection ID is missing.",
    };
  }

  const { supabase } = await requireAdmin();

  const { data: collection, error: collectionError } =
    await supabase
      .from("wholesale_collections")
      .select("id, title, slug, is_published")
      .eq("id", collectionId)
      .single();

  if (collectionError || !collection) {
    return {
      success: false,
      message: "The collection could not be found.",
    };
  }

  if (collection.is_published === isPublished) {
    return {
      success: true,
      message: isPublished
        ? "Collection is already published."
        : "Collection is already unpublished.",
    };
  }

  const { error: updateError } =
    await supabase
      .from("wholesale_collections")
      .update({
        is_published: isPublished,
        updated_at: new Date().toISOString(),
      })
      .eq("id", collectionId);

  if (updateError) {
    return {
      success: false,
      message: `Unable to update collection: ${updateError.message}`,
    };
  }

  revalidatePath("/admin/wholesale-collections");
  revalidatePath(
    `/admin/wholesale-collections/${collectionId}`,
  );
  revalidatePath(`/collection/${collection.slug}`);

  return {
    success: true,
    message: isPublished
      ? `"${collection.title}" published successfully.`
      : `"${collection.title}" unpublished successfully.`,
  };
}

export async function updateWholesaleCollectionWhatsApp(
  collectionId: string,
  whatsappNumber: string,
) {
  if (!collectionId) {
    return {
      success: false,
      message: "Collection ID is missing.",
    };
  }

  const cleanedNumber = whatsappNumber.replace(
    /\D/g,
    "",
  );

  if (
    cleanedNumber &&
    (cleanedNumber.length < 8 ||
      cleanedNumber.length > 15)
  ) {
    return {
      success: false,
      message:
        "Please enter a valid WhatsApp number with country code.",
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

  const { error: updateError } =
    await supabase
      .from("wholesale_collections")
      .update({
        whatsapp_number:
          cleanedNumber || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", collectionId);

  if (updateError) {
    return {
      success: false,
      message: `Unable to save WhatsApp number: ${updateError.message}`,
    };
  }

  revalidatePath(
    `/admin/wholesale-collections/${collectionId}`,
  );
  revalidatePath("/admin/wholesale-collections");
  revalidatePath(`/collection/${collection.slug}`);

  return {
    success: true,
    message: cleanedNumber
      ? "WhatsApp enquiry number saved successfully."
      : "WhatsApp enquiry number removed.",
  };
}
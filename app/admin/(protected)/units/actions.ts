"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { unitSchema } from "@/schemas/unit.schema";

const UNIT_LIST_URL =
  "/admin/units";

function redirectWithMessage(
  type: "success" | "error",
  message: string,
): never {
  redirect(
    `${UNIT_LIST_URL}?${type}=${encodeURIComponent(
      message,
    )}`,
  );
}

function parseUnitForm(
  formData: FormData,
) {
  return unitSchema.safeParse({
    name: String(
      formData.get("name") ?? "",
    ),

    shortName: String(
      formData.get("shortName") ??
        "",
    ),
  });
}

export async function createUnit(
  formData: FormData,
): Promise<void> {
  const parsed =
    parseUnitForm(formData);

  if (!parsed.success) {
    redirectWithMessage(
      "error",
      parsed.error.issues[0]
        ?.message ??
        "Please check the unit details.",
    );
  }

  const { supabase } =
    await requireAdmin();

  const {
    error,
  } = await supabase
    .from("units")
    .insert({
      name: parsed.data.name,
      short_name:
        parsed.data.shortName,
      is_active: true,
    });

  if (error?.code === "23505") {
    redirectWithMessage(
      "error",
      "A unit with this short name already exists.",
    );
  }

  if (error) {
    redirectWithMessage(
      "error",
      `Unable to create unit: ${error.message}`,
    );
  }

  revalidatePath(
    UNIT_LIST_URL,
  );

  revalidatePath(
    "/admin/products",
  );

  redirectWithMessage(
    "success",
    "Unit created successfully.",
  );
}

export async function updateUnit(
  formData: FormData,
): Promise<void> {
  const id = String(
    formData.get("id") ?? "",
  ).trim();

  if (!id) {
    redirectWithMessage(
      "error",
      "Unit ID is missing.",
    );
  }

  const parsed =
    parseUnitForm(formData);

  if (!parsed.success) {
    redirectWithMessage(
      "error",
      parsed.error.issues[0]
        ?.message ??
        "Please check the unit details.",
    );
  }

  const { supabase } =
    await requireAdmin();

  const {
    error,
  } = await supabase
    .from("units")
    .update({
      name: parsed.data.name,
      short_name:
        parsed.data.shortName,
    })
    .eq("id", id);

  if (error?.code === "23505") {
    redirectWithMessage(
      "error",
      "A unit with this short name already exists.",
    );
  }

  if (error) {
    redirectWithMessage(
      "error",
      `Unable to update unit: ${error.message}`,
    );
  }

  revalidatePath(
    UNIT_LIST_URL,
  );

  revalidatePath(
    "/admin/products",
  );

  redirectWithMessage(
    "success",
    "Unit updated successfully.",
  );
}

export async function toggleUnitStatus(
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
      "Unit ID is missing.",
    );
  }

  const { supabase } =
    await requireAdmin();

  const {
    error,
  } = await supabase
    .from("units")
    .update({
      is_active: nextStatus,
    })
    .eq("id", id);

  if (error) {
    redirectWithMessage(
      "error",
      `Unable to update unit status: ${error.message}`,
    );
  }

  revalidatePath(
    UNIT_LIST_URL,
  );

  revalidatePath(
    "/admin/products",
  );

  redirectWithMessage(
    "success",
    nextStatus
      ? "Unit activated successfully."
      : "Unit archived successfully.",
  );
}
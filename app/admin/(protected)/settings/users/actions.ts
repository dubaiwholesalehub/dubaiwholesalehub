"use server";

import { revalidatePath } from "next/cache";

import {
  APP_ROLES,
  requireAdmin,
  type AppRole,
} from "@/lib/auth/require-admin";

import {
  updateManagedUser,
} from "@/lib/repositories/user-management.repository";

export type UpdateUserActionResult = {
  success: boolean;
  message: string;
};

function readRequiredString(
  formData: FormData,
  name: string,
): string {
  const value = formData.get(name);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function isAppRole(
  value: string,
): value is AppRole {
  return APP_ROLES.some(
    (role) => role === value,
  );
}

export async function updateUserAction(
  formData: FormData,
): Promise<UpdateUserActionResult> {
  await requireAdmin();

  try {
    const id =
      readRequiredString(
        formData,
        "id",
      );

    const fullName =
      readRequiredString(
        formData,
        "full_name",
      );

    const designation =
      readRequiredString(
        formData,
        "designation",
      );

    const roleValue =
      readRequiredString(
        formData,
        "role",
      );

    const isActive =
      formData.get("is_active") ===
      "true";

    if (!id) {
      return {
        success: false,
        message:
          "User profile ID is required.",
      };
    }

    if (!fullName) {
      return {
        success: false,
        message:
          "Full name is required.",
      };
    }

    if (!isAppRole(roleValue)) {
      return {
        success: false,
        message:
          "Select a valid ERP role.",
      };
    }

    await updateManagedUser({
      id,
      fullName,
      designation:
        designation || null,
      role: roleValue,
      isActive,
    });

    revalidatePath(
      "/admin/settings/users",
    );

    return {
      success: true,
      message:
        "User updated successfully.",
    };
  } catch (error) {
    console.error(error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to update user.",
    };
  }
}
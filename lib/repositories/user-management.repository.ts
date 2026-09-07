import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type UserManagementRole =
  Database["public"]["Enums"]["app_role"];

export type ManagedUser = {
  id: string;
  email: string;
  fullName: string | null;
  designation: string | null;
  role: UserManagementRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UpdateManagedUserInput = {
  id: string;
  fullName: string;
  designation: string | null;
  role: UserManagementRole;
  isActive: boolean;
};

export async function getManagedUsers(): Promise<ManagedUser[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
        id,
        email,
        full_name,
        designation,
        role,
        is_active,
        created_at,
        updated_at
      `,
    )
    .order("is_active", {
      ascending: false,
    })
    .order("full_name", {
      ascending: true,
      nullsFirst: false,
    })
    .order("email", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Unable to load ERP users: ${error.message}`,
    );
  }

  return (data ?? []).map((user) => ({
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    designation: user.designation,
    role: user.role,
    isActive: user.is_active,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  }));
}

export async function updateManagedUser(
  input: UpdateManagedUserInput,
): Promise<ManagedUser> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "manage_profile",
    {
      p_profile_id: input.id,
      p_full_name: input.fullName,
      p_designation: input.designation ?? "",
      p_role: input.role,
      p_is_active: input.isActive,
    },
  );

  if (error) {
    throw new Error(
      `Unable to update ERP user: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "Unable to update ERP user: no profile was returned.",
    );
  }

  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    designation: data.designation,
    role: data.role,
    isActive: data.is_active,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const MANAGEMENT_ROLES = [
  "super_admin",
  "admin",
  "manager",
] as const;

export async function requireAdmin() {
  const supabase = await createClient();

  const claimsResult = await supabase.auth.getClaims();
  const userId = claimsResult.data?.claims?.sub;

  if (claimsResult.error || !userId) {
    redirect("/admin/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active")
    .eq("id", userId)
    .single();

  if (
    error ||
    !profile ||
    !profile.is_active ||
    !MANAGEMENT_ROLES.includes(profile.role)
  ) {
    redirect(
      "/admin?error=" +
        encodeURIComponent(
          "You do not have permission to manage this section.",
        ),
    );
  }

  return {
    supabase,
    profile,
  };
}
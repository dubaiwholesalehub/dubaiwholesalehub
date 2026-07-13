import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const ALLOWED_ADMIN_ROLES = [
  "super_admin",
  "admin",
  "manager",
  "sales",
  "viewer",
] as const;

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({
  children,
}: AdminLayoutProps) {
  const supabase = await createClient();

  const claimsResult = await supabase.auth.getClaims();

  const claims = claimsResult.data?.claims ?? null;

  if (claimsResult.error || !claims?.sub) {
    redirect("/admin/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active")
    .eq("id", claims.sub)
    .single();

  if (
    profileError ||
    !profile ||
    !profile.is_active ||
    !ALLOWED_ADMIN_ROLES.includes(profile.role)
  ) {
    redirect(
      "/admin/login?error=" +
        encodeURIComponent("Access is not authorized."),
    );
  }

  return <>{children}</>;
}
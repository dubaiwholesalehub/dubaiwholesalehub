import type { ReactNode } from "react";

import { requireAdmin } from "@/lib/auth/require-admin";

export default async function AccountsLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();

  return children;
}
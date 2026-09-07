import type { ReactNode } from "react";

import { requireAdmin } from "@/lib/auth/require-admin";

export default async function PurchasingLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();

  return children;
}
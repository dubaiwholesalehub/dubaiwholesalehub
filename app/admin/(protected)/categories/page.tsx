import { CheckCircle2 } from "lucide-react";

import CategoryManager from "@/components/admin/categories/CategoryManager";
import PageHeader from "@/components/admin/ui/PageHeader";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminCategories } from "@/lib/repositories/category.repository";

interface CategoriesPageProps {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
}

export default async function CategoriesPage({
  searchParams,
}: CategoriesPageProps) {
  await requireAdmin();

  const [categories, messages] = await Promise.all([
    getAdminCategories(),
    searchParams,
  ]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Catalog Management"
        title="Categories"
        description="Create, organize and manage the main product groups in your wholesale catalog."
      />

      {messages.success && (
        <div
          role="status"
          className="mt-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {messages.success}
        </div>
      )}

      {messages.error && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {messages.error}
        </div>
      )}

      <CategoryManager categories={categories} />
    </div>
  );
}
import { CheckCircle2 } from "lucide-react";

import WholesaleCollectionManager from "@/components/admin/wholesale-collections/WholesaleCollectionManager";
import PageHeader from "@/components/admin/ui/PageHeader";
import { requireAdmin } from "@/lib/auth/require-admin";

interface WholesaleCollectionsPageProps {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
}

export default async function WholesaleCollectionsPage({
  searchParams,
}: WholesaleCollectionsPageProps) {
  const { supabase } = await requireAdmin();

  const [messages, collectionsResult] = await Promise.all([
    searchParams,
    supabase
      .from("wholesale_collections")
      .select(
        `
          id,
          title,
          slug,
          is_published,
          created_at,
          wholesale_collection_images(count)
        `,
      )
      .order("created_at", { ascending: false }),
  ]);

  if (collectionsResult.error) {
    throw new Error(
      `Unable to load wholesale collections: ${collectionsResult.error.message}`,
    );
  }

  const collections = (collectionsResult.data ?? []).map(
    (collection) => ({
      id: collection.id,
      title: collection.title,
      slug: collection.slug,
      isPublished: collection.is_published,
      createdAt: collection.created_at,
      imageCount:
        collection.wholesale_collection_images?.[0]?.count ?? 0,
    }),
  );

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Catalog Management"
        title="Wholesale Collections"
        description="Create simple shareable photo galleries for WhatsApp wholesale enquiries."
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

      <WholesaleCollectionManager collections={collections} />
    </div>
  );
}
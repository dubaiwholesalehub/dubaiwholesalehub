import Link from "next/link";
import { ArrowLeft, ExternalLink, ImageIcon } from "lucide-react";
import { notFound } from "next/navigation";

import PageHeader from "@/components/admin/ui/PageHeader";
import { requireAdmin } from "@/lib/auth/require-admin";
import WholesaleCollectionUploader from "@/components/admin/wholesale-collections/WholesaleCollectionUploader";
import WholesaleCollectionGallery from "@/components/admin/wholesale-collections/WholesaleCollectionGallery";
import WholesaleCollectionPublishButton from "@/components/admin/wholesale-collections/WholesaleCollectionPublishButton";
import WholesaleCollectionWhatsAppSettings from "@/components/admin/wholesale-collections/WholesaleCollectionWhatsAppSettings";

interface WholesaleCollectionPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
}

export default async function WholesaleCollectionPage({
  params,
  searchParams,
}: WholesaleCollectionPageProps) {
  const { id } = await params;
  const messages = await searchParams;
  const { supabase } = await requireAdmin();

  const { data: collection, error } = await supabase
    .from("wholesale_collections")
    .select(
      `
        id,
        title,
        slug,
        is_published,
        whatsapp_number,
        created_at,
        wholesale_collection_images (
          id,
          reference_number,
          storage_path,
          sort_order,
          is_available,
          created_at
        )
      `,
    )
    .eq("id", id)
    .single();

  if (error || !collection) {
    notFound();
  }

  const images = [...(collection.wholesale_collection_images ?? [])].sort(
    (a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order;
      }

      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    },
  );

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5">
        <Link
          href="/admin/wholesale-collections"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Collections
        </Link>
      </div>

      <PageHeader
        eyebrow="Wholesale Collection"
        title={collection.title}
        description={`Manage photos and sharing for /collection/${collection.slug}`}
      />

      {messages.success && (
        <div
          role="status"
          className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
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

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span
          className={
            collection.is_published
              ? "rounded-full bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700"
              : "rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600"
          }
        >
          {collection.is_published ? "Published" : "Draft"}
        </span>

        <WholesaleCollectionPublishButton
          collectionId={collection.id}
          isPublished={collection.is_published}
        />

        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm text-gray-600 shadow-sm ring-1 ring-gray-200">
          <ImageIcon className="h-4 w-4" />
          {images.length} photo{images.length === 1 ? "" : "s"}
        </span>

        {collection.is_published && (
          <Link
            href={`/collection/${collection.slug}`}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <ExternalLink className="h-4 w-4" />
            View Public Collection
          </Link>
        )}
      </div>
      <div className="mt-8">
        <WholesaleCollectionWhatsAppSettings
          collectionId={collection.id}
          whatsappNumber={collection.whatsapp_number}
        />
      </div>
      <div className="mt-8">
        <WholesaleCollectionUploader collectionId={collection.id} />
      </div>
      <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-950">
          Collection Photos
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Select individual photos or use Select All to manage multiple photos
          together.
        </p>

        {images.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-gray-300 px-6 py-14 text-center">
            <ImageIcon className="mx-auto h-10 w-10 text-gray-400" />

            <h3 className="mt-4 font-semibold text-gray-900">
              No photos uploaded yet
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Your product photos will appear here with automatic reference
              numbers.
            </p>
          </div>
        ) : (
          <div className="mt-6">
            <WholesaleCollectionGallery
              collectionId={collection.id}
              supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
              images={images.map((image) => ({
                id: image.id,
                referenceNumber: image.reference_number,
                storagePath: image.storage_path,
                isAvailable: image.is_available,
              }))}
            />
          </div>
        )}
      </section>
    </div>
  );
}

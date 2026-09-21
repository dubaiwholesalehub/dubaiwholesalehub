import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import WholesaleCollectionPublicGallery from "@/components/WholesaleCollectionPublicGallery";

interface CollectionPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: collection, error } = await supabase
    .from("wholesale_collections")
    .select(
      `
        id,
        title,
        slug,
        whatsapp_number,
        wholesale_collection_images (
          id,
          reference_number,
          storage_path,
          sort_order,
          created_at
        )
      `,
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .eq("wholesale_collection_images.is_available", true)
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
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:py-8">
        <div className="border-b border-gray-200 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-950 text-xs font-black text-white sm:h-11 sm:w-11 sm:text-sm">
              DWH
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
                Dubai Wholesale Hub
              </p>

              <p className="mt-0.5 text-xs text-gray-500">
                Wholesale • Export • Sourcing from Dubai
              </p>
            </div>
          </div>

          <div className="mt-4 sm:mt-5">
            <h1 className="text-xl font-bold tracking-tight text-gray-950 sm:text-3xl">
              {collection.title}
            </h1>

            <p className="mt-1.5 max-w-2xl text-sm leading-5 text-gray-600 sm:mt-2 sm:leading-6">
              Select the designs you like and send your selection directly to us
              on WhatsApp for wholesale price and availability.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-gray-700">
            {images.length} available design
            {images.length === 1 ? "" : "s"}
          </p>

          <p className="text-xs text-gray-500">Tap a photo to enlarge</p>
        </div>

        <div className="mt-4 pb-32 sm:pb-28">
          <WholesaleCollectionPublicGallery
            collectionTitle={collection.title}
            whatsappNumber={collection.whatsapp_number}
            supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
            images={images.map((image) => ({
              id: image.id,
              referenceNumber: image.reference_number,
              storagePath: image.storage_path,
            }))}
          />
        </div>
      </div>
    </main>
  );
}

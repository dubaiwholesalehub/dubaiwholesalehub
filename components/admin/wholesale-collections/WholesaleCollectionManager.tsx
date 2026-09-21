import Link from "next/link";
import {
  ExternalLink,
  FolderOpen,
  ImageIcon,
  Plus,
} from "lucide-react";

import { createWholesaleCollection } from "@/app/admin/(protected)/wholesale-collections/actions";

interface Collection {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  createdAt: string;
  imageCount: number;
}

interface WholesaleCollectionManagerProps {
  collections: Collection[];
}

export default function WholesaleCollectionManager({
  collections,
}: WholesaleCollectionManagerProps) {
  return (
    <div className="mt-8 space-y-8">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-950">
            Create Collection
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Create a gallery first, then bulk upload your
            product photos.
          </p>
        </div>

        <form
          action={createWholesaleCollection}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <input
            type="text"
            name="title"
            required
            placeholder="e.g. Kids Jeans & Denim Shorts"
            className="min-h-11 flex-1 rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-950 outline-none transition focus:border-gray-500"
          />

          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            Create Collection
          </button>
        </form>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-950">
              Your Collections
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {collections.length} collection
              {collections.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {collections.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
            <FolderOpen className="mx-auto h-10 w-10 text-gray-400" />

            <h3 className="mt-4 font-semibold text-gray-900">
              No wholesale collections yet
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Create your first collection above.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {collections.map((collection) => (
              <div
                key={collection.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-gray-950">
                      {collection.title}
                    </h3>

                    <p className="mt-1 truncate text-xs text-gray-500">
                      /collection/{collection.slug}
                    </p>
                  </div>

                  <span
                    className={
                      collection.isPublished
                        ? "rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700"
                        : "rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
                    }
                  >
                    {collection.isPublished
                      ? "Published"
                      : "Draft"}
                  </span>
                </div>

                <div className="mt-5 flex items-center gap-2 text-sm text-gray-600">
                  <ImageIcon className="h-4 w-4" />
                  {collection.imageCount} photo
                  {collection.imageCount === 1 ? "" : "s"}
                </div>

                <div className="mt-5 flex gap-2">
                  <Link
                    href={`/admin/wholesale-collections/${collection.id}`}
                    className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-gray-950 px-4 text-sm font-semibold text-white hover:bg-gray-800"
                  >
                    Manage
                  </Link>

                  {collection.isPublished && (
                    <Link
                      href={`/collection/${collection.slug}`}
                      target="_blank"
                      className="inline-flex min-h-10 items-center justify-center rounded-xl border border-gray-300 px-3 text-gray-700 hover:bg-gray-50"
                      title="Open public collection"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
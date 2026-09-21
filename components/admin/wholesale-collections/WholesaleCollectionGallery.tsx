"use client";

import { CheckSquare, Loader2, Square, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  deleteWholesaleCollectionImages,
  setWholesaleCollectionImageAvailability,
} from "@/app/admin/(protected)/wholesale-collections/[id]/image-actions";

interface CollectionImage {
  id: string;
  referenceNumber: number;
  storagePath: string;
  isAvailable: boolean;
}

interface WholesaleCollectionGalleryProps {
  collectionId: string;
  images: CollectionImage[];
  supabaseUrl: string;
}

export default function WholesaleCollectionGallery({
  collectionId,
  images,
  supabaseUrl,
}: WholesaleCollectionGalleryProps) {
  const router = useRouter();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();

  const allSelected = images.length > 0 && selectedIds.size === images.length;

  const selectedCount = selectedIds.size;

  const selectedReferences = useMemo(
    () =>
      images
        .filter((image) => selectedIds.has(image.id))
        .map((image) => image.referenceNumber),
    [images, selectedIds],
  );

  function toggleImage(imageId: string) {
    if (isPending) {
      return;
    }

    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(imageId)) {
        next.delete(imageId);
      } else {
        next.add(imageId);
      }

      return next;
    });

    setError("");
    setSuccess("");
  }

  function toggleAll() {
    if (isPending) {
      return;
    }

    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(images.map((image) => image.id)));
    }

    setError("");
    setSuccess("");
  }

  function toggleAvailability(imageId: string, currentAvailability: boolean) {
    if (isPending) {
      return;
    }

    setError("");
    setSuccess("");

    startTransition(async () => {
      const result = await setWholesaleCollectionImageAvailability(
        collectionId,
        imageId,
        !currentAvailability,
      );

      if (!result.success) {
        setError(result.message);
        return;
      }

      setSuccess(result.message);
      router.refresh();
    });
  }

  function deleteSelected() {
    if (selectedCount === 0 || isPending) {
      return;
    }

    const preview = selectedReferences
      .slice(0, 5)
      .map((reference) => `#${String(reference).padStart(4, "0")}`)
      .join(", ");

    const extraCount = selectedReferences.length - 5;

    const confirmed = window.confirm(
      `Delete ${selectedCount} selected photo${
        selectedCount === 1 ? "" : "s"
      }?\n\n${
        preview
          ? `Selected: ${preview}${
              extraCount > 0 ? ` and ${extraCount} more` : ""
            }\n\n`
          : ""
      }This will permanently remove the actual files from storage too.`,
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    startTransition(async () => {
      const result = await deleteWholesaleCollectionImages(
        collectionId,
        Array.from(selectedIds),
      );

      if (!result.success) {
        setError(result.message);
        return;
      }

      setSelectedIds(new Set());
      setSuccess(result.message);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-gray-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={toggleAll}
          disabled={isPending}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-950 disabled:opacity-50"
        >
          {allSelected ? (
            <CheckSquare className="h-5 w-5" />
          ) : (
            <Square className="h-5 w-5" />
          )}

          {allSelected ? "Deselect All" : "Select All"}
        </button>

        <div className="flex flex-wrap items-center gap-3">
          {selectedCount > 0 && (
            <span className="text-sm font-medium text-gray-600">
              {selectedCount} selected
            </span>
          )}

          <button
            type="button"
            onClick={deleteSelected}
            disabled={selectedCount === 0 || isPending}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}

            {isPending ? "Deleting..." : "Delete Selected"}
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          {success}
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
        {images.map((image) => {
          const selected = selectedIds.has(image.id);

          const reference = `#${String(image.referenceNumber).padStart(
            4,
            "0",
          )}`;

          const imageUrl =
            `${supabaseUrl}/storage/v1/object/public/` +
            `wholesale-collections/${image.storagePath}`;

          return (
            <div
              key={image.id}
              role="button"
              tabIndex={isPending ? -1 : 0}
              onClick={() => {
                if (!isPending) {
                  toggleImage(image.id);
                }
              }}
              onKeyDown={(event) => {
                if (isPending) {
                  return;
                }

                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  toggleImage(image.id);
                }
              }}
              className={`relative cursor-pointer overflow-hidden rounded-xl border bg-white p-2 text-left transition ${
                isPending ? "cursor-not-allowed opacity-60" : ""
              } ${
                selected
                  ? "border-gray-950 ring-2 ring-gray-950"
                  : "border-gray-200 hover:border-gray-400"
              }`}
            >
              <div className="relative">
                <img
                  src={imageUrl}
                  alt={`Collection photo ${reference}`}
                  loading="lazy"
                  className="aspect-square w-full rounded-lg bg-gray-100 object-cover"
                />

                <span
                  className={`absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg border shadow-sm ${
                    selected
                      ? "border-gray-950 bg-gray-950 text-white"
                      : "border-gray-300 bg-white text-gray-500"
                  }`}
                >
                  {selected ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2 px-1">
                <span className="text-sm font-semibold text-gray-950">
                  {reference}
                </span>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={(event) => {
                    event.stopPropagation();

                    toggleAvailability(image.id, image.isAvailable);
                  }}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50 ${
                    image.isAvailable
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {image.isAvailable ? "Available" : "Unavailable"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

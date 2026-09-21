"use client";

import { Check, Maximize2, X } from "lucide-react";
import { useEffect, useState } from "react";

interface CollectionImage {
  id: string;
  referenceNumber: number;
  storagePath: string;
}

interface WholesaleCollectionPublicGalleryProps {
  images: CollectionImage[];
  supabaseUrl: string;
  collectionTitle: string;
  whatsappNumber: string | null;
}

export default function WholesaleCollectionPublicGallery({
  images,
  supabaseUrl,
  collectionTitle,
  whatsappNumber,
}: WholesaleCollectionPublicGalleryProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [previewImage, setPreviewImage] = useState<CollectionImage | null>(
    null,
  );

  function toggleSelection(imageId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(imageId)) {
        next.delete(imageId);
      } else {
        next.add(imageId);
      }

      return next;
    });
  }

  function imageUrl(image: CollectionImage) {
    return (
      `${supabaseUrl}/storage/v1/object/public/` +
      `wholesale-collections/${image.storagePath}`
    );
  }

  useEffect(() => {
    if (!previewImage) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPreviewImage(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);

      document.body.style.overflow = "";
    };
  }, [previewImage]);

  function sendOnWhatsApp() {
    if (selectedIds.size === 0) {
      return;
    }

    if (!whatsappNumber) {
      window.alert(
        "WhatsApp enquiry number is not configured for this collection.",
      );
      return;
    }

    const selectedReferences = images
      .filter((image) => selectedIds.has(image.id))
      .map((image) => `#${String(image.referenceNumber).padStart(4, "0")}`);

    const message = [
      "Hello 👋",
      "",
      `I am interested in ${collectionTitle}.`,
      "",
      "Selected designs:",
      selectedReferences.join(", "),
      "",
      "Please send me the wholesale price and availability.",
    ].join("\n");

    const cleanedNumber = whatsappNumber.replace(/\D/g, "");

    const whatsappUrl =
      `https://wa.me/${cleanedNumber}` + `?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {images.map((image) => {
          const selected = selectedIds.has(image.id);

          const reference = `#${String(image.referenceNumber).padStart(
            4,
            "0",
          )}`;

          return (
            <article
              key={image.id}
              className={`overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-200 ${
                selected
                  ? "border border-orange-500 ring-2 ring-orange-100"
                  : "border border-gray-200 hover:border-gray-300 hover:shadow-md"
              }`}
            >
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPreviewImage(image)}
                  className="block w-full"
                  aria-label={`View ${reference}`}
                >
                  <img
                    src={imageUrl(image)}
                    alt={`Wholesale design ${reference}`}
                    loading="lazy"
                    className="aspect-square w-full bg-gray-100 object-cover"
                  />
                </button>

                <button
                  type="button"
                  onClick={() => toggleSelection(image.id)}
                  aria-label={
                    selected ? `Deselect ${reference}` : `Select ${reference}`
                  }
                  className={`absolute left-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-lg border shadow-md backdrop-blur transition ${
                    selected
                      ? "border-orange-500 bg-orange-500 text-white"
                      : "border-gray-200 bg-white/95 text-gray-400 hover:border-orange-400"
                  }`}
                >
                  {selected && <Check className="h-5 w-5" />}
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewImage(image)}
                  aria-label={`Open ${reference} fullscreen`}
                  className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-white"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => toggleSelection(image.id)}
                className={`flex min-h-12 w-full items-center justify-between gap-2 border-t px-3 py-2.5 text-left transition ${
                  selected
                    ? "border-orange-100 bg-orange-50/70"
                    : "border-gray-100 bg-white"
                }`}
              >
                <span className="text-base font-extrabold tracking-tight text-gray-950">
                  {reference}
                </span>

                <span
                  className={`text-xs font-semibold ${
                    selected ? "text-orange-600" : "text-gray-500"
                  }`}
                >
                  {selected ? "Selected" : "Select"}
                </span>
              </button>
            </article>
          );
        })}
      </div>

      {selectedIds.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-3 py-2.5 shadow-[0_-8px_30px_rgba(0,0,0,0.10)] backdrop-blur-md sm:px-4 sm:py-3">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight text-gray-950 sm:text-base">
                {selectedIds.size} design
                {selectedIds.size === 1 ? "" : "s"} selected
              </p>

              <p className="mt-0.5 hidden truncate text-xs text-gray-500 sm:block">
                Send your selection for wholesale price & availability
              </p>
            </div>

            <button
              type="button"
              onClick={sendOnWhatsApp}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-green-700 active:scale-[0.98] sm:min-h-12 sm:px-6"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-5 w-5 fill-current"
              >
                <path d="M12.04 2a9.84 9.84 0 0 0-8.43 14.91L2 22l5.23-1.55A9.98 9.98 0 1 0 12.04 2Zm0 17.98a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.1.92.94-3.02-.2-.31a8.05 8.05 0 1 1 6.79 3.72Zm4.44-6.05c-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.03-.38-1.96-1.21-.72-.65-1.21-1.44-1.35-1.68-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z" />
              </svg>

              <span className="hidden sm:inline">Send on WhatsApp</span>

              <span className="sm:hidden">WhatsApp</span>
            </button>
          </div>
        </div>
      )}

      {previewImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            aria-label="Close image"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-950 shadow-lg"
          >
            <X className="h-6 w-6" />
          </button>

          <div
            className="max-h-full max-w-4xl"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={imageUrl(previewImage)}
              alt={`Wholesale design #${String(
                previewImage.referenceNumber,
              ).padStart(4, "0")}`}
              className="max-h-[82vh] max-w-full rounded-xl object-contain"
            />

            <div className="mt-4 flex items-center justify-between gap-4">
              <span className="text-lg font-bold text-white">
                #{String(previewImage.referenceNumber).padStart(4, "0")}
              </span>

              <button
                type="button"
                onClick={() => toggleSelection(previewImage.id)}
                className={`rounded-xl px-5 py-3 text-sm font-bold ${
                  selectedIds.has(previewImage.id)
                    ? "bg-orange-500 text-white"
                    : "bg-white text-gray-950"
                }`}
              >
                {selectedIds.has(previewImage.id)
                  ? "✓ Selected"
                  : "Select Design"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

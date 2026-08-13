"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";

type GalleryImage = {
  id: string;
  url: string;
  alt: string;
};

interface ProductImageGalleryProps {
  images: GalleryImage[];
  productName: string;
}

export default function ProductImageGallery({
  images,
  productName,
}: ProductImageGalleryProps) {
  const [selectedId, setSelectedId] = useState(
    images[0]?.id ?? "",
  );

  const selectedImage =
    images.find(
      (image) =>
        image.id === selectedId,
    ) ?? images[0];

  return (
    <div>
      <div className="relative flex min-h-[480px] items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-white">
        {selectedImage ? (
          <Image
            src={selectedImage.url}
            alt={
              selectedImage.alt ||
              productName
            }
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-contain p-6"
          />
        ) : (
          <div className="flex flex-col items-center text-slate-400">
            <ImageIcon className="h-16 w-16" />

            <p className="mt-4">
              Product image coming soon
            </p>
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
          {images.map((image) => {
            const active =
              image.id ===
              selectedImage?.id;

            return (
              <button
                key={image.id}
                type="button"
                onClick={() =>
                  setSelectedId(
                    image.id,
                  )
                }
                aria-label={`View ${image.alt || productName}`}
                aria-pressed={active}
                className={[
                  "relative aspect-square overflow-hidden rounded-xl border bg-white transition",
                  active
                    ? "border-amber-500 ring-2 ring-amber-200"
                    : "border-slate-200 hover:border-amber-300",
                ].join(" ")}
              >
                <Image
                  src={image.url}
                  alt={
                    image.alt ||
                    productName
                  }
                  fill
                  sizes="140px"
                  className="object-contain p-2"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
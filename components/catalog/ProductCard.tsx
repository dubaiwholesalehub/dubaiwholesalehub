import Image from "next/image";
import Link from "next/link";
import {
  ImageIcon,
  MessageCircle,
} from "lucide-react";

import { getProductImageUrl } from "@/lib/supabase/storage";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    sku: string | null;
    moq: number | null;
    short_description: string | null;

    category:
      | {
          id: string;
          name: string;
          slug: string;
        }
      | null;

    brand:
      | {
          id: string;
          name: string;
          slug: string;
        }
      | null;

    country:
      | {
          id: string;
          name: string;
          iso2: string | null;
        }
      | null;

    unit:
      | {
          id: string;
          name: string;
          short_name: string;
        }
      | null;

    product_images: Array<{
      id: string;
      storage_path: string;
      alt_text: string | null;
      sort_order: number | null;
      is_primary: boolean | null;
    }>;
  };
}

function getPrimaryImage(
  images: ProductCardProps["product"]["product_images"],
) {
  return (
    images.find(
      (image) => image.is_primary,
    ) ??
    [...images].sort(
      (a, b) =>
        (a.sort_order ?? 0) -
        (b.sort_order ?? 0),
    )[0] ??
    null
  );
}

export default function ProductCard({
  product,
}: ProductCardProps) {
  const primaryImage =
    getPrimaryImage(
      product.product_images,
    );

  const imageUrl =
    getProductImageUrl(
      primaryImage?.storage_path,
    );

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-amber-400 hover:shadow-xl">
      <Link
        href={`/products/${product.slug}`}
        className="relative flex h-64 items-center justify-center overflow-hidden bg-slate-100"
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={
              primaryImage?.alt_text ??
              product.name
            }
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center text-slate-400">
            <ImageIcon className="h-10 w-10" />

            <span className="mt-2 text-sm">
              Product image coming soon
            </span>
          </div>
        )}
      </Link>

      <div className="p-5">
        <div className="flex flex-wrap gap-2">
          {product.category?.name && (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
              {product.category.name}
            </span>
          )}

          {product.brand?.name && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {product.brand.name}
            </span>
          )}
        </div>

        <Link
          href={`/products/${product.slug}`}
        >
          <h2 className="mt-4 line-clamp-2 text-lg font-semibold text-slate-900 transition group-hover:text-amber-700">
            {product.name}
          </h2>
        </Link>

        {product.short_description && (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
            {product.short_description}
          </p>
        )}

        <div className="mt-4 space-y-1 text-sm text-slate-600">
          {product.sku && (
            <p>
              <span className="font-medium text-slate-900">
                SKU:
              </span>{" "}
              {product.sku}
            </p>
          )}

          <p>
            <span className="font-medium text-slate-900">
              MOQ:
            </span>{" "}
            {product.moq ?? 1}{" "}
            {product.unit?.short_name ??
              "PCS"}
          </p>

          {product.country?.name && (
            <p>
              <span className="font-medium text-slate-900">
                Origin:
              </span>{" "}
              {product.country.name}
            </p>
          )}
        </div>

        <Link
          href={`/products/${product.slug}`}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-amber-600"
        >
          <MessageCircle size={17} />
          View & Request Quote
        </Link>
      </div>
    </article>
  );
}
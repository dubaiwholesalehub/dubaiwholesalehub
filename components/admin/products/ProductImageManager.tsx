"use client";

import {
  ImageIcon,
  Star,
  Trash2,
  Upload,
} from "lucide-react";

import type {
  Product,
  ProductImage,
} from "@/components/admin/products/product-types";
import { getProductImageUrl } from "@/lib/supabase/storage";

import {
  deleteProductImage,
  setPrimaryProductImage,
  uploadProductImages,
} from "@/app/admin/(protected)/products/image-actions";

interface ProductImageManagerProps {
  product: Product;
}

export default function ProductImageManager({
  product,
}: ProductImageManagerProps) {
  const sortedImages = [...product.product_images].sort(
    (first, second) =>
      (first.sort_order ?? 0) -
      (second.sort_order ?? 0),
  );

  return (
    <section className="rounded-2xl border border-slate-200 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
          <ImageIcon className="h-5 w-5 text-amber-700" />
        </div>

        <div>
          <h3 className="font-semibold text-slate-950">
            Product images
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Upload up to 10 images at once. Each image must
            be 5 MB or smaller.
          </p>
        </div>
      </div>

      <form action={uploadProductImages} className="mt-6 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-5"
      >
        <input
          type="hidden"
          name="productId"
          value={product.id}
        />

        <label
          htmlFor={`product-images-${product.id}`}
          className="block cursor-pointer text-center"
        >
          <Upload className="mx-auto h-8 w-8 text-slate-400" />

          <span className="mt-3 block text-sm font-semibold text-slate-800">
            Select product images
          </span>

          <span className="mt-1 block text-xs text-slate-500">
            JPG, PNG, WebP or GIF
          </span>
        </label>

        <input
          id={`product-images-${product.id}`}
          name="images"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          required
          className="mt-4 block w-full rounded-xl border border-slate-300 bg-white p-2 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-amber-500 hover:file:text-slate-950"
        />

        <button
          type="submit"
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
        >
          <Upload className="h-4 w-4" />
          Upload images
        </button>
      </form>

      {sortedImages.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center">
          <ImageIcon className="mx-auto h-8 w-8 text-slate-400" />

          <p className="mt-3 text-sm font-medium text-slate-700">
            No product images uploaded
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {sortedImages.map((image) => (
            <ProductImageCard
              key={image.id}
              productId={product.id}
              productName={product.name}
              image={image}
            />
          ))}
        </div>
      )}
    </section>
  );
}

interface ProductImageCardProps {
  productId: string;
  productName: string;
  image: ProductImage;
}

function ProductImageCard({
  productId,
  productName,
  image,
}: ProductImageCardProps) {
  const imageUrl = getProductImageUrl(
    image.storage_path,
  );

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="relative aspect-square bg-slate-100">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={image.alt_text || productName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageIcon className="h-9 w-9 text-slate-400" />
          </div>
        )}

        {image.is_primary && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-slate-950 shadow">
            <Star className="h-3.5 w-3.5" />
            Primary
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 p-3">
        {!image.is_primary ? (
          <form action={setPrimaryProductImage}>
            <input
              type="hidden"
              name="productId"
              value={productId}
            />

            <input
              type="hidden"
              name="imageId"
              value={image.id}
            />

            <button
              type="submit"
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-amber-200 text-xs font-semibold text-amber-700 transition hover:bg-amber-50"
            >
              <Star className="h-4 w-4" />
              Make primary
            </button>
          </form>
        ) : (
          <div className="flex h-10 items-center justify-center rounded-xl bg-amber-50 text-xs font-semibold text-amber-700">
            Current primary
          </div>
        )}

        <form action={deleteProductImage}>
          <input
            type="hidden"
            name="productId"
            value={productId}
          />

          <input
            type="hidden"
            name="imageId"
            value={image.id}
          />

          <button
            type="submit"
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-red-200 text-xs font-semibold text-red-700 transition hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </form>
      </div>
    </article>
  );
}
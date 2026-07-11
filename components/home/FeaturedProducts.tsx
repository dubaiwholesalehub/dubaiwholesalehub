import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ImageIcon, MessageCircle } from "lucide-react";

import Container from "@/components/layout/container";
import { getProductImageUrl } from "@/lib/supabase/storage";

type ProductImage = {
  id: string;
  storage_path: string;
  alt_text: string | null;
  sort_order: number | null;
  is_primary: boolean | null;
};

type FeaturedProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  moq: number | null;
  lead_time: string | null;
  packaging: string | null;
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
  product_images: ProductImage[];
};

interface FeaturedProductsProps {
  products: FeaturedProduct[];
}

function getPrimaryImage(images: ProductImage[]) {
  return (
    images.find((image) => image.is_primary) ??
    [...images].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    )[0] ??
    null
  );
}

export default function FeaturedProducts({
  products,
}: FeaturedProductsProps) {
  return (
    <section className="bg-white py-24">
      <Container>
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-amber-600">
              Product Catalog
            </p>

            <h2 className="mt-3 text-4xl font-bold text-slate-900">
              Featured Wholesale Products
            </h2>

            <p className="mt-4 max-w-2xl text-slate-600">
              Explore selected products available for wholesale, export and
              international sourcing.
            </p>
          </div>

          <Link
            href="/products"
            className="flex items-center gap-2 font-semibold text-amber-600 transition hover:text-amber-700"
          >
            View All Products
            <ArrowRight size={18} />
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="mt-14 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
            <ImageIcon className="mx-auto h-10 w-10 text-slate-400" />

            <h3 className="mt-4 text-xl font-semibold text-slate-900">
              Featured products are coming soon
            </h3>

            <p className="mx-auto mt-2 max-w-xl text-slate-600">
              Products marked as published and featured in the admin system
              will automatically appear here.
            </p>
          </div>
        ) : (
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => {
              const primaryImage = getPrimaryImage(product.product_images);
              const imageUrl = getProductImageUrl(
                primaryImage?.storage_path,
              );

              return (
                <article
                  key={product.id}
                  className="group overflow-hidden rounded-2xl border bg-white shadow-sm transition duration-300 hover:-translate-y-2 hover:border-amber-400 hover:shadow-xl"
                >
                  <Link
                    href={`/products/${product.slug}`}
                    className="relative flex h-56 items-center justify-center overflow-hidden bg-slate-100"
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

                  <div className="p-6">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {product.category?.name && (
                        <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">
                          {product.category.name}
                        </span>
                      )}

                      {product.brand?.name && (
                        <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                          {product.brand.name}
                        </span>
                      )}
                    </div>

                    <Link href={`/products/${product.slug}`}>
                      <h3 className="mt-4 line-clamp-2 text-lg font-semibold text-slate-900 transition group-hover:text-amber-700">
                        {product.name}
                      </h3>
                    </Link>

                    {product.short_description && (
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
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
                        {product.unit?.short_name ?? "PCS"}
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
                      href={`/products/${product.slug}#request-quote`}
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-amber-600"
                    >
                      <MessageCircle size={18} />
                      Request Quote
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Container>
    </section>
  );
}
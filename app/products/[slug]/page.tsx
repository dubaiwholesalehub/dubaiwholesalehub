import type { Metadata } from "next";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Globe2,
  ImageIcon,
  MessageCircle,
  Package,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { notFound } from "next/navigation";

import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import Container from "@/components/layout/container";

import { getPublicProductBySlug } from "@/lib/services/product.service";

import { getProductImageUrl } from "@/lib/supabase/storage";

import { getWhatsAppUrl } from "@/lib/config/site";
import ProductImageGallery from "@/components/catalog/ProductImageGallery";

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;

  const product = await getPublicProductBySlug(slug);

  if (!product) {
    return {
      title: "Product Not Found",
    };
  }

  return {
    title: product.meta_title || product.name,

    description:
      product.meta_description ||
      product.short_description ||
      `Request wholesale pricing for ${product.name} from Dubai Wholesale Hub.`,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  const product = await getPublicProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const images = [...product.product_images].sort(
    (a, b) =>
      Number(b.is_primary) - Number(a.is_primary) ||
      (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );

  const galleryImages = images.flatMap((image) => {
    const url = getProductImageUrl(image.storage_path);

    if (!url) {
      return [];
    }

    return [
      {
        id: image.id,
        url,
        alt: image.alt_text ?? product.name,
      },
    ];
  });

  const whatsappUrl = getWhatsAppUrl(
    `Hello Dubai Wholesale Hub, I am interested in ${product.name}${
      product.sku ? ` (SKU: ${product.sku})` : ""
    }. Please send me your wholesale price and availability.`,
  );

  return (
    <>
      <Header />

      <main className="bg-slate-50">
        <Container className="py-8">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <Link
              href="/products"
              className="inline-flex items-center gap-1 transition hover:text-amber-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Products
            </Link>

            {product.category && (
              <>
                <span>/</span>
                <span>{product.category.name}</span>
              </>
            )}

            <span>/</span>

            <span className="text-slate-900">{product.name}</span>
          </div>
        </Container>

        <section className="pb-16">
          <Container>
            <div className="grid gap-10 lg:grid-cols-2">
              <div>
                <ProductImageGallery
                  images={galleryImages}
                  productName={product.name}
                />
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm md:p-9">
                <div className="flex flex-wrap gap-2">
                  {product.category && (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      {product.category.name}
                    </span>
                  )}

                  {product.brand && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {product.brand.name}
                    </span>
                  )}

                  {product.is_new && (
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      New Arrival
                    </span>
                  )}
                </div>

                <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
                  {product.name}
                </h1>

                {product.short_description && (
                  <p className="mt-4 text-lg leading-8 text-slate-600">
                    {product.short_description}
                  </p>
                )}

                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  <InfoItem label="SKU" value={product.sku} />

                  <InfoItem label="Model" value={product.model_number} />

                  <InfoItem
                    label="MOQ"
                    value={`${product.moq ?? 1} ${
                      product.unit?.short_name ?? "PCS"
                    }`}
                  />

                  <InfoItem label="Origin" value={product.country?.name} />
                </div>

                <div className="mt-7 rounded-2xl bg-slate-950 p-6 text-white">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-400">
                    Wholesale Enquiry
                  </p>

                  <h2 className="mt-2 text-2xl font-bold">
                    Request Current Wholesale Price
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    Pricing may vary by quantity, destination, packaging and
                    current availability.
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <Link
                      href="#request-quote"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
                    >
                      <MessageCircle className="h-5 w-5" />
                      Request Quote
                    </Link>

                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold transition hover:border-white hover:bg-white hover:text-slate-950"
                    >
                      <MessageCircle className="h-5 w-5" />
                      WhatsApp Enquiry
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>

        <section className="border-y bg-white py-16">
          <Container>
            <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
              <div>
                <h2 className="text-3xl font-bold text-slate-950">
                  Product Details
                </h2>

                {product.description ? (
                  <div className="mt-5 whitespace-pre-line text-base leading-8 text-slate-600">
                    {product.description}
                  </div>
                ) : (
                  <p className="mt-5 text-slate-500">
                    Contact us for full product specifications.
                  </p>
                )}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-xl font-bold text-slate-900">
                  Wholesale Information
                </h3>

                <div className="mt-5 space-y-4">
                  <SpecRow
                    icon={Package}
                    label="Packaging"
                    value={product.packaging}
                  />

                  <SpecRow
                    icon={Package}
                    label="Carton Quantity"
                    value={
                      product.carton_quantity
                        ? `${product.carton_quantity} ${
                            product.unit?.short_name ?? "PCS"
                          }`
                        : null
                    }
                  />

                  <SpecRow
                    icon={Truck}
                    label="Lead Time"
                    value={product.lead_time}
                  />

                  <SpecRow
                    icon={ShieldCheck}
                    label="Warranty"
                    value={product.warranty}
                  />

                  <SpecRow
                    icon={Globe2}
                    label="HS Code"
                    value={product.hs_code}
                  />
                </div>
              </div>
            </div>
          </Container>
        </section>

        <section id="request-quote" className="bg-slate-950 py-20 text-white">
          <Container>
            <div className="mx-auto max-w-3xl text-center">
              <CheckCircle2 className="mx-auto h-11 w-11 text-amber-400" />

              <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">
                Wholesale • Export • Sourcing
              </p>

              <h2 className="mt-4 text-3xl font-bold md:text-4xl">
                Interested in {product.name}?
              </h2>

              <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-300">
                Contact Dubai Wholesale Hub for current pricing, MOQ, stock
                availability, export support and bulk quantities.
              </p>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/contact"
                  className="rounded-xl bg-amber-500 px-7 py-3.5 font-semibold text-slate-950 transition hover:bg-amber-400"
                >
                  Request Wholesale Quote
                </Link>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-slate-700 px-7 py-3.5 font-semibold transition hover:border-white hover:bg-white hover:text-slate-950"
                >
                  WhatsApp Us
                </a>
              </div>
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SpecRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{
    className?: string;
  }>;

  label: string;

  value: string | null | undefined;
}) {
  if (!value) {
    return null;
  }

  return (
    <div className="flex gap-3 border-b border-slate-200 pb-4 last:border-0 last:pb-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-amber-600">
        <Icon className="h-4 w-4" />
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>

        <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

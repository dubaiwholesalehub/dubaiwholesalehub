import type { Metadata } from "next";

import Link from "next/link";

import { ArrowLeft, Layers3 } from "lucide-react";

import { notFound } from "next/navigation";

import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import Container from "@/components/layout/container";
import ProductCard from "@/components/catalog/ProductCard";

import { getCatalogCategoryBySlug } from "@/lib/services/category.service";

interface CategoryPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;

  const data = await getCatalogCategoryBySlug(slug);

  if (!data) {
    return {
      title: "Category Not Found",
    };
  }

  return {
    title:
      data.category.seo_title || `${data.category.name} Wholesale Products`,

    description:
      data.category.seo_description ||
      data.category.description ||
      `Browse ${data.category.name} wholesale products available for sourcing and export from Dubai.`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;

  const data = await getCatalogCategoryBySlug(slug);

  if (!data) {
    notFound();
  }

  const { category, subcategories, products } = data;

  return (
    <>
      <Header />

      <main>
        <section className="bg-slate-950 py-16 text-white">
          <Container>
            <Link
              href="/categories"
              className="inline-flex items-center gap-2 text-sm text-slate-300 transition hover:text-amber-400"
            >
              <ArrowLeft className="h-4 w-4" />
              All Categories
            </Link>

            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">
              Wholesale Category
            </p>

            <h1 className="mt-3 text-4xl font-bold md:text-5xl">
              {category.name}
            </h1>

            {category.description && (
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
                {category.description}
              </p>
            )}
          </Container>
        </section>

        {subcategories.length > 0 && (
          <section className="border-b bg-white py-10">
            <Container>
              <div className="flex items-center gap-2">
                <Layers3 className="h-5 w-5 text-amber-600" />

                <h2 className="text-xl font-bold text-slate-900">
                  Subcategories
                </h2>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {subcategories.map((subcategory) => (
                  <span
                    key={subcategory.id}
                    className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700"
                  >
                    {subcategory.name}
                  </span>
                ))}
              </div>
            </Container>
          </section>
        )}

        <section className="bg-slate-50 py-16">
          <Container>
            <div>
              <h2 className="text-3xl font-bold text-slate-900">
                {category.name} Products
              </h2>

              <p className="mt-2 text-slate-600">
                {products.length}{" "}
                {products.length === 1
                  ? "published product"
                  : "published products"}
              </p>
            </div>

            {products.length === 0 ? (
              <div className="mt-10 rounded-3xl border border-dashed bg-white p-12 text-center">
                <h3 className="text-xl font-semibold text-slate-900">
                  Products coming soon
                </h3>

                <p className="mt-2 text-slate-500">
                  Published products assigned to this category will
                  automatically appear here.
                </p>
              </div>
            ) : (
              <div className="mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </Container>
        </section>
      </main>

      <Footer />
    </>
  );
}

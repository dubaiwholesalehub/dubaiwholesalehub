import type {
  Metadata,
} from "next";

import Link from "next/link";

import {
  ArrowRight,
  Boxes,
  PackageSearch,
} from "lucide-react";

import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import Container from "@/components/layout/container";

import {
  getCatalogCategories,
} from "@/lib/services/category.service";

export const metadata: Metadata = {
  title: "Wholesale Categories",
  description:
    "Browse wholesale product categories available for sourcing and export from Dubai, UAE.",
};

export default async function CategoriesPage() {
  const categories =
    await getCatalogCategories();

  return (
    <>
      <Header />

      <main>
        <section className="bg-slate-950 py-20 text-white">
          <Container>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">
              Product Categories
            </p>

            <h1 className="mt-4 max-w-4xl text-4xl font-bold md:text-5xl">
              Wholesale Products
              Across Multiple
              Categories
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
              Explore products sourced
              from Dubai for wholesale,
              export and international
              distribution.
            </p>
          </Container>
        </section>

        <section className="bg-slate-50 py-16">
          <Container>
            {categories.length ===
            0 ? (
              <div className="rounded-3xl border border-dashed bg-white p-14 text-center">
                <Boxes className="mx-auto h-12 w-12 text-slate-400" />

                <h2 className="mt-4 text-xl font-semibold text-slate-900">
                  Categories are
                  coming soon
                </h2>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {categories.map(
                  (category) => (
                    <Link
                      key={
                        category.id
                      }
                      href={`/categories/${category.slug}`}
                      className="group flex min-h-64 flex-col rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-amber-400 hover:shadow-xl"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                        <PackageSearch className="h-6 w-6" />
                      </div>

                      <h2 className="mt-6 text-xl font-bold text-slate-900 transition group-hover:text-amber-700">
                        {
                          category.name
                        }
                      </h2>

                      {category.description && (
                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">
                          {
                            category.description
                          }
                        </p>
                      )}

                      <div className="mt-auto flex items-center justify-between pt-6">
                        <span className="text-sm text-slate-500">
                          {
                            category.product_count
                          }{" "}
                          {category.product_count ===
                          1
                            ? "product"
                            : "products"}
                        </span>

                        <ArrowRight className="h-5 w-5 text-amber-600 transition group-hover:translate-x-1" />
                      </div>
                    </Link>
                  ),
                )}
              </div>
            )}
          </Container>
        </section>
      </main>

      <Footer />
    </>
  );
}
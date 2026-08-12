import type { Metadata } from "next";

import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import Container from "@/components/layout/container";
import ProductCard from "@/components/catalog/ProductCard";

import { getPublicProducts } from "@/lib/services/product.service";

export const metadata: Metadata = {
  title: "Wholesale Products",

  description:
    "Browse wholesale products available for sourcing and export from Dubai, UAE.",
};

export default async function ProductsPage() {
  const products = await getPublicProducts();

  return (
    <>
      <Header />

      <main>
        <section className="bg-slate-950 py-20 text-white">
          <Container>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">
              Wholesale Catalog
            </p>

            <h1 className="mt-4 max-w-4xl text-4xl font-bold md:text-5xl">
              Products for Wholesale, Export & International Sourcing
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
              Explore products sourced from Dubai for retailers, wholesalers and
              international buyers.
            </p>
          </Container>
        </section>

        <section className="bg-slate-50 py-16">
          <Container>
            <div className="flex items-end justify-between gap-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">
                  Product Catalog
                </h2>

                <p className="mt-2 text-slate-600">
                  {products.length}{" "}
                  {products.length === 1 ? "product" : "products"} currently
                  available.
                </p>
              </div>
            </div>

            {products.length === 0 ? (
              <div className="mt-10 rounded-2xl border border-dashed bg-white p-12 text-center">
                <h3 className="text-xl font-semibold text-slate-900">
                  Products are coming soon
                </h3>

                <p className="mt-2 text-slate-500">
                  Published products will automatically appear here.
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

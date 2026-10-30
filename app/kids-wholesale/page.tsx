import type { Metadata } from "next";
import Link from "next/link";
import { WhatsAppButton } from "./whatsapp-button";

export const metadata: Metadata = {
  title: "Kids Products Wholesale from Dubai | Dubai Wholesale Hub",
  description:
    "Source kids clothes, shoes, accessories and toys wholesale from Dubai. Contact Dubai Wholesale Hub for available products, quantities and prices.",
};

const categories = [
  {
    name: "Kids' Clothes",
    emoji: "Clothing",
    description: "Boys' and girls' clothing, sets and fashion",
  },
  {
    name: "Kids' Shoes",
    emoji: "Footwear",
    description: "Footwear, sandals and casual shoes",
  },
  {
    name: "Kids' Accessories",
    emoji: "Accessories",
    description: "Bags, fashion accessories and essentials",
  },
  {
    name: "Toys & Games",
    emoji: "Toys",
    description: "Fun, educational and trending toys",
  },
];

export default function KidsWholesalePage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Dubai<span className="text-orange-600">Wholesale</span>Hub
          </Link>
          <span className="text-xs font-semibold text-slate-500">
            DUBAI, UAE
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 pb-12 pt-12 text-center sm:pt-20">
        <div className="mb-5 inline-flex rounded-full bg-orange-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-orange-700">
          Wholesale Sourcing & Export
        </div>

        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
          Kids Clothes, Shoes, Toys & Accessories
          <span className="block text-orange-600">
            Wholesale from Dubai
          </span>
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
          Looking for kids&apos; clothes, shoes, accessories or toys for your
          business? Tell us what you need and we&apos;ll help you source
          available products from Dubai.
        </p>

        <div className="mt-8">
          <WhatsAppButton placement="hero" />
        </div>

        <p className="mt-3 text-sm text-slate-500">
          Ask for available designs, wholesale prices and quantities.
        </p>
      </section>

      <section className="bg-slate-50 py-12">
        <div className="mx-auto max-w-5xl px-5">
          <h2 className="mb-8 text-center text-2xl font-bold sm:text-3xl">
            What are you looking for?
          </h2>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {categories.map((category) => (
              <div
                key={category.name}
                className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm"
              >
                <div className="mb-4 text-sm font-semibold uppercase tracking-wide text-orange-600">
                  {category.emoji}
                </div>
                <h3 className="text-base font-bold">{category.name}</h3>
                <p className="mt-2 text-sm leading-5 text-slate-500">
                  {category.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-14 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">
          Send us your product requirements
        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-slate-600">
          Share product photos, preferred designs, quantities or your
          requirements directly on WhatsApp. Our team will check
          availability and provide a quotation.
        </p>

        <div className="mt-8">
          <WhatsAppButton placement="bottom" />
        </div>
      </section>

      <footer className="border-t border-slate-100 px-5 py-6 text-center text-sm text-slate-500">
        Dubai Wholesale Hub · Dubai, United Arab Emirates
      </footer>
    </main>
  );
}

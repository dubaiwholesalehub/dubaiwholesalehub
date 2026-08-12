import type {
  Metadata,
} from "next";

import Link from "next/link";

import {
  BadgeCheck,
  Boxes,
  Globe2,
  MessageCircle,
  Search,
  ShieldCheck,
  Truck,
} from "lucide-react";

import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import Container from "@/components/layout/container";

export const metadata: Metadata = {
  title: "Product Sourcing from Dubai",
  description:
    "Dubai Wholesale Hub helps international buyers source products from trusted suppliers in Dubai with wholesale pricing and export support.",
};

const steps = [
  {
    title:
      "Tell Us What You Need",
    description:
      "Send product photos, specifications, quantity and destination.",
    icon: MessageCircle,
  },
  {
    title:
      "We Source Suppliers",
    description:
      "We search suitable Dubai suppliers and compare available options.",
    icon: Search,
  },
  {
    title:
      "Receive Our Quote",
    description:
      "Get wholesale pricing, MOQ, lead time and commercial terms.",
    icon: BadgeCheck,
  },
  {
    title:
      "Order & Export",
    description:
      "We coordinate purchasing, consolidation and delivery for your order.",
    icon: Truck,
  },
];

export default function SourcingPage() {
  return (
    <>
      <Header />

      <main>
        <section className="bg-slate-950 py-20 text-white">
          <Container>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">
              Dubai Product Sourcing
            </p>

            <h1 className="mt-4 max-w-4xl text-4xl font-bold md:text-6xl">
              Can&apos;t Find the Product?
              We&apos;ll Source It for You.
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
              Send us your product requirement and our team will source suitable
              options from Dubai suppliers for wholesale and export.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/contact"
                className="rounded-xl bg-amber-500 px-7 py-3.5 text-center font-semibold text-slate-950 transition hover:bg-amber-400"
              >
                Send Your Requirement
              </Link>

              <Link
                href="/products"
                className="rounded-xl border border-slate-700 px-7 py-3.5 text-center font-semibold transition hover:border-white hover:bg-white hover:text-slate-950"
              >
                Browse Products
              </Link>
            </div>
          </Container>
        </section>

        <section className="bg-white py-20">
          <Container>
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">
                How It Works
              </p>

              <h2 className="mt-3 text-3xl font-bold text-slate-950 md:text-4xl">
                Simple Sourcing Process
              </h2>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {steps.map(
                (step, index) => {
                  const Icon =
                    step.icon;

                  return (
                    <div
                      key={
                        step.title
                      }
                      className="rounded-3xl border border-slate-200 p-6"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                        <Icon className="h-6 w-6" />
                      </div>

                      <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-slate-400">
                        Step{" "}
                        {index + 1}
                      </p>

                      <h3 className="mt-2 text-xl font-bold text-slate-900">
                        {step.title}
                      </h3>

                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {
                          step.description
                        }
                      </p>
                    </div>
                  );
                },
              )}
            </div>
          </Container>
        </section>

        <section className="bg-slate-50 py-20">
          <Container>
            <div className="grid gap-8 lg:grid-cols-3">
              <Feature
                icon={Boxes}
                title="Wide Product Range"
                text="Household products, electronics, gadgets, tools, toys, baby items, beauty products and more."
              />

              <Feature
                icon={ShieldCheck}
                title="Supplier Comparison"
                text="We can compare supplier availability, pricing, MOQ and lead times before preparing your offer."
              />

              <Feature
                icon={Globe2}
                title="Export Support"
                text="Suitable for international wholesalers, retailers and importers buying from Dubai."
              />
            </div>
          </Container>
        </section>

        <section className="bg-amber-500 py-16">
          <Container>
            <div className="flex flex-col items-center justify-between gap-6 text-center lg:flex-row lg:text-left">
              <div>
                <h2 className="text-3xl font-bold text-slate-950">
                  Have a product requirement?
                </h2>

                <p className="mt-2 text-slate-800">
                  Send us the product photo, quantity and destination.
                </p>
              </div>

              <Link
                href="/contact"
                className="rounded-xl bg-slate-950 px-7 py-3.5 font-semibold text-white transition hover:bg-slate-800"
              >
                Request Sourcing Quote
              </Link>
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </>
  );
}

function Feature({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{
    className?: string;
  }>;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-7 shadow-sm">
      <Icon className="h-8 w-8 text-amber-600" />

      <h3 className="mt-5 text-xl font-bold text-slate-900">
        {title}
      </h3>

      <p className="mt-3 leading-7 text-slate-600">
        {text}
      </p>
    </div>
  );
}
import type {
  Metadata,
} from "next";

import Link from "next/link";

import {
  Container as ContainerIcon,
  Globe2,
  PackageCheck,
  Ship,
  Truck,
} from "lucide-react";

import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import Container from "@/components/layout/container";

export const metadata: Metadata = {
  title: "Wholesale Export from Dubai",
  description:
    "Wholesale and export support from Dubai for international buyers, including product sourcing, consolidation and shipping coordination.",
};

export default function ExportPage() {
  return (
    <>
      <Header />

      <main>
        <section className="bg-slate-950 py-20 text-white">
          <Container>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">
              Wholesale Export
            </p>

            <h1 className="mt-4 max-w-4xl text-4xl font-bold md:text-6xl">
              Source in Dubai.
              Ship Worldwide.
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
              We help international buyers source wholesale products from Dubai
              and coordinate orders for export.
            </p>

            <Link
              href="/contact"
              className="mt-8 inline-block rounded-xl bg-amber-500 px-7 py-3.5 font-semibold text-slate-950 transition hover:bg-amber-400"
            >
              Request Export Quote
            </Link>
          </Container>
        </section>

        <section className="bg-white py-20">
          <Container>
            <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-4">
              <ExportFeature
                icon={Globe2}
                title="International Buyers"
                text="Support for wholesalers, retailers and importers sourcing products from Dubai."
              />

              <ExportFeature
                icon={PackageCheck}
                title="Order Consolidation"
                text="Combine different products and suppliers into organized wholesale shipments."
              />

              <ExportFeature
                icon={ContainerIcon}
                title="Bulk Shipments"
                text="Suitable for cartons, pallets, LCL and larger wholesale orders."
              />

              <ExportFeature
                icon={Ship}
                title="Shipping Coordination"
                text="Coordinate shipment requirements with your preferred freight or logistics partner."
              />
            </div>
          </Container>
        </section>

        <section className="bg-slate-50 py-20">
          <Container>
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">
                  Export Workflow
                </p>

                <h2 className="mt-3 text-3xl font-bold text-slate-950 md:text-4xl">
                  From Dubai Supplier to Your Market
                </h2>

                <p className="mt-5 leading-8 text-slate-600">
                  Share your requirement and destination. We can prepare product
                  offers, coordinate purchasing and help organize goods for
                  export.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  "Send product requirement",
                  "Confirm wholesale quotation",
                  "Purchase and consolidate goods",
                  "Prepare order for shipment",
                  "Coordinate delivery or freight handover",
                ].map(
                  (
                    item,
                    index,
                  ) => (
                    <div
                      key={item}
                      className="flex gap-4 rounded-2xl border bg-white p-5"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 font-bold text-slate-950">
                        {index + 1}
                      </div>

                      <p className="font-medium text-slate-800">
                        {item}
                      </p>
                    </div>
                  ),
                )}
              </div>
            </div>
          </Container>
        </section>

        <section className="bg-slate-950 py-16 text-white">
          <Container>
            <div className="flex flex-col items-center justify-between gap-6 text-center lg:flex-row lg:text-left">
              <div>
                <Truck className="h-8 w-8 text-amber-400" />

                <h2 className="mt-3 text-3xl font-bold">
                  Planning an export order from Dubai?
                </h2>

                <p className="mt-2 text-slate-300">
                  Tell us the products, quantity and destination.
                </p>
              </div>

              <Link
                href="/contact"
                className="rounded-xl bg-amber-500 px-7 py-3.5 font-semibold text-slate-950 transition hover:bg-amber-400"
              >
                Contact Our Team
              </Link>
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </>
  );
}

function ExportFeature({
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
    <div className="rounded-3xl border border-slate-200 p-7">
      <Icon className="h-8 w-8 text-amber-600" />

      <h2 className="mt-5 text-xl font-bold text-slate-900">
        {title}
      </h2>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        {text}
      </p>
    </div>
  );
}
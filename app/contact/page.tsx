import type {
  Metadata,
} from "next";

import {
  Building2,
  Mail,
  MessageCircle,
  PackageSearch,
} from "lucide-react";

import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import Container from "@/components/layout/container";
import {
  getWhatsAppUrl,
  siteConfig,
} from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Contact & Request Quote",
  description:
    "Contact Dubai Wholesale Hub for wholesale pricing, product sourcing and export enquiries from Dubai.",
};

export default function ContactPage() {
  return (
    <>
      <Header />

      <main>
        <section className="bg-slate-950 py-20 text-white">
          <Container>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">
              Contact Us
            </p>

            <h1 className="mt-4 text-4xl font-bold md:text-5xl">
              Request a Wholesale Quote
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
              Send us the product name or photo, required quantity and delivery
              destination.
            </p>
          </Container>
        </section>

        <section className="bg-slate-50 py-16">
          <Container>
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.3fr]">
              <div className="space-y-5">
                <ContactCard
                  icon={Building2}
                  title="Dubai Wholesale Hub"
                  text="Wholesale • Export • Sourcing"
                />

                <ContactCard
                  icon={PackageSearch}
                  title="Product Requirement"
                  text="Share product photos, specifications, quantity and destination."
                />

                <ContactCard
                  icon={MessageCircle}
                  title="WhatsApp"
                  text="Fastest way to send your product enquiry."
                />

                <ContactCard
                  icon={Mail}
                  title="Email"
                  text="Suitable for detailed RFQs and wholesale requirements."
                />
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm md:p-9">
                <h2 className="text-2xl font-bold text-slate-950">
                  What to Include in Your Enquiry
                </h2>

                <div className="mt-6 space-y-4 text-slate-600">
                  <p>• Product name or product photo</p>
                  <p>• Required quantity</p>
                  <p>• Destination country</p>
                  <p>• Preferred packaging, if any</p>
                  <p>• Any specific brand or specification</p>
                </div>

                <div className="mt-8 rounded-2xl bg-amber-50 p-6">
                  <p className="font-semibold text-slate-900">
                    Fastest response
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Send your requirement through WhatsApp so the product photo
                    and quantity can be reviewed quickly.
                  </p>
                </div>

                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  <a
                    href={getWhatsAppUrl()}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl bg-slate-950 px-6 py-3.5 text-center font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
                  >
                    WhatsApp Us
                  </a>

                  <a
                    href={`mailto:${siteConfig.email}`}
                    className="rounded-xl border border-slate-300 px-6 py-3.5 text-center font-semibold text-slate-900 transition hover:border-amber-500"
                  >
                    Send Email
                  </a>
                </div>
              </div>
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </>
  );
}

function ContactCard({
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <h2 className="font-bold text-slate-900">
            {title}
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-600">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}
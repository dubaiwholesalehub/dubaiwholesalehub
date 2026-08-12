import Link from "next/link";

import {
  Mail,
  MapPin,
  MessageCircle,
} from "lucide-react";

import Container from "./container";

import {
  getWhatsAppUrl,
  siteConfig,
} from "@/lib/config/site";

const companyLinks = [
  {
    label: "Home",
    href: "/",
  },
  {
    label: "Products",
    href: "/products",
  },
  {
    label: "Categories",
    href: "/categories",
  },
  {
    label: "Sourcing",
    href: "/sourcing",
  },
  {
    label: "Export",
    href: "/export",
  },
  {
    label: "Contact",
    href: "/contact",
  },
];

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-white">
      <Container className="py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold">
              {
                siteConfig.name
              }
            </h2>

            <p className="mt-2 text-sm font-semibold text-amber-400">
              {
                siteConfig.companyName
              }
            </p>

            <p className="mt-5 max-w-xl leading-7 text-slate-400">
              {
                siteConfig.description
              }
            </p>

            <div className="mt-6 flex flex-col gap-3 text-sm text-slate-300">
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-amber-400" />

                <span>
                  {
                    siteConfig.location
                  }
                </span>
              </div>

              <a
                href={`mailto:${siteConfig.email}`}
                className="flex items-center gap-3 transition hover:text-amber-400"
              >
                <Mail className="h-4 w-4 text-amber-400" />

                {
                  siteConfig.email
                }
              </a>

              <a
                href={
                  getWhatsAppUrl()
                }
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 transition hover:text-amber-400"
              >
                <MessageCircle className="h-4 w-4 text-amber-400" />

                WhatsApp Enquiry
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-white">
              Quick Links
            </h3>

            <div className="mt-5 flex flex-col gap-3">
              {companyLinks.map(
                (item) => (
                  <Link
                    key={
                      item.href
                    }
                    href={
                      item.href
                    }
                    className="text-sm text-slate-400 transition hover:text-amber-400"
                  >
                    {
                      item.label
                    }
                  </Link>
                ),
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-white">
              Business Services
            </h3>

            <div className="mt-5 space-y-3 text-sm text-slate-400">
              <p>
                Wholesale Supply
              </p>

              <p>
                Product Sourcing
              </p>

              <p>
                Export Orders
              </p>

              <p>
                Supplier Coordination
              </p>

              <p>
                Order Consolidation
              </p>
            </div>

            <Link
              href="/contact"
              className="mt-6 inline-flex rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
            >
              Request Quote
            </Link>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-slate-800 pt-8 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>
            ©{" "}
            {new Date().getFullYear()}{" "}
            Dubai Wholesale Hub. All
            rights reserved.
          </p>

          <p>
            Wholesale • Export •
            Sourcing from Dubai
          </p>
        </div>
      </Container>
    </footer>
  );
}
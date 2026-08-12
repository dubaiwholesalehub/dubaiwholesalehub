import Link from "next/link";

import Logo from "../common/logo";
import Container from "./container";
import MobileNav from "./mobile-nav";

const links = [
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

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <Container className="flex h-20 items-center justify-between gap-4">
        <Logo />

        <nav className="hidden items-center gap-7 lg:flex">
          {links.map(
            (item) => (
              <Link
                key={
                  item.href
                }
                href={
                  item.href
                }
                className="text-sm font-medium text-slate-700 transition hover:text-amber-600"
              >
                {
                  item.label
                }
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/contact"
            className="hidden rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600 sm:inline-flex"
          >
            Request Quote
          </Link>

          <MobileNav />
        </div>
      </Container>
    </header>
  );
}
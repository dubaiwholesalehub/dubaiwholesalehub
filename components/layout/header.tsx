import Logo from "../common/logo";
import Container from "./container";
import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-white">
      <Container className="flex h-20 items-center justify-between">
        <Logo />

        <nav className="hidden gap-8 lg:flex">
          <Link href="/">Home</Link>

  <Link href="/products">Products</Link>

  <Link href="/categories">Categories</Link>

  <Link href="/sourcing">Sourcing</Link>

  <Link href="/export">Export</Link>

  <Link href="/contact">Contact</Link>
        </nav>

        <button className="rounded-xl bg-slate-900 px-5 py-3 text-white transition hover:bg-amber-600">
          Request Quote
        </button>
      </Container>
    </header>
  );
}
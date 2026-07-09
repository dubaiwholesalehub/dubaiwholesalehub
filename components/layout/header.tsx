import Logo from "../common/logo";
import Container from "./container";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-white">
      <Container className="flex h-20 items-center justify-between">
        <Logo />

        <nav className="hidden gap-8 lg:flex">
          <a href="/">Home</a>

          <a href="#">Products</a>

          <a href="#">Categories</a>

          <a href="#">Sourcing</a>

          <a href="#">Export</a>

          <a href="#">Contact</a>
        </nav>

        <button className="rounded-xl bg-slate-900 px-5 py-3 text-white transition hover:bg-amber-600">
          Request Quote
        </button>
      </Container>
    </header>
  );
}
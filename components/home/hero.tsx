import Container from "../layout/container";

export default function Hero() {
  return (
    <section className="bg-slate-50 py-24">
      <Container>
        <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-700">
          Wholesale • Export • Product Sourcing
        </span>

        <h1 className="mt-8 max-w-4xl text-6xl font-bold leading-tight text-slate-900">
          Dubai&apos;s Trusted Wholesale &
          <span className="text-amber-600"> Export Partner</span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-slate-600">
          Source quality products from Dubai with confidence. We help importers,
          wholesalers and distributors connect with trusted suppliers.
        </p>

        <div className="mt-10 flex gap-4">
          <button className="rounded-xl bg-slate-900 px-6 py-4 text-white hover:bg-amber-600">
            Browse Products
          </button>

          <button className="rounded-xl border px-6 py-4">
            Contact Us
          </button>
        </div>
      </Container>
    </section>
  );
}
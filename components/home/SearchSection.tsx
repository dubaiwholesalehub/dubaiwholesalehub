import { Search } from "lucide-react";
import Container from "../layout/container";

export default function SearchSection() {
  return (
    <section className="bg-white py-12">
      <Container>
        <div className="mx-auto max-w-5xl rounded-3xl border bg-white p-8 shadow-lg">
          <h2 className="text-center text-3xl font-bold text-slate-900">
            Search Dubai Wholesale Products
          </h2>

          <p className="mt-3 text-center text-slate-500">
            Search products, brands or categories.
          </p>

          <div className="mt-8 flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-4 h-5 w-5 text-slate-400" />

              <input
                type="text"
                placeholder="Search 10,000+ Products..."
                className="w-full rounded-xl border py-4 pl-12 pr-4 outline-none transition focus:border-amber-500"
              />
            </div>

            <button className="rounded-xl bg-amber-500 px-8 py-4 font-semibold text-white hover:bg-amber-600">
              Search
            </button>
          </div>
        </div>
      </Container>
    </section>
  );
}
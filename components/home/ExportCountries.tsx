import Container from "../layout/container";
import { exportCountries } from "@/constants/countries";

export default function ExportMarkets() {
  return (
    <section className="bg-slate-50 py-24">
      <Container>
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-600">
            Global Reach
          </p>

          <h2 className="mt-3 text-4xl font-bold text-slate-900">
            Export Markets
          </h2>

          <p className="mx-auto mt-4 max-w-3xl text-slate-600">
            We proudly supply wholesale products to businesses across the GCC,
            Africa, Asia and international markets.
          </p>
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-4">
          {exportCountries.map((country) => (
            <span
              key={country}
              className="rounded-full border border-amber-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-amber-500 hover:bg-amber-50"
            >
              {country}
            </span>
          ))}
        </div>
      </Container>
    </section>
  );
}
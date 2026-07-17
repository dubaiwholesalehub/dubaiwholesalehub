import Container from "../layout/container";
import { ArrowRight, MessageCircle } from "lucide-react";

export default function RequestQuoteCTA() {
  return (
    <section className="bg-slate-900 py-24">
      <Container>
        <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-12 text-center text-white">

          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-400">
            REQUEST FOR QUOTATION
          </p>

          <h2 className="mt-5 text-4xl font-bold lg:text-5xl">
            Can&apos;t Find the Product You&apos;re Looking For?
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-lg text-slate-300">
            Our sourcing specialists can find products from trusted Dubai
            suppliers and provide competitive wholesale pricing for your
            business.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-5 sm:flex-row">

            <button className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-8 py-4 font-semibold text-white transition hover:bg-amber-600">
              Request a Quote
              <ArrowRight size={20} />
            </button>

            <button className="flex items-center justify-center gap-2 rounded-xl border border-white px-8 py-4 font-semibold text-white transition hover:bg-white hover:text-slate-900">
              <MessageCircle size={20} />
              WhatsApp Us
            </button>

          </div>

        </div>
      </Container>
    </section>
  );
}
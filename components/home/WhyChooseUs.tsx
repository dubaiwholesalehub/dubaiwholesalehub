import {
  Globe,
  Package,
  ShieldCheck,
  Truck,
  Users,
  Clock3,
} from "lucide-react";
import Container from "../layout/container";

const features = [
  {
    title: "Dubai-Based Trading Company",
    description:
      "Strategically located in Dubai to connect global buyers with trusted suppliers.",
    icon: Globe,
  },
  {
    title: "Wholesale & Bulk Supply",
    description:
      "Competitive pricing with flexible MOQ for retailers, distributors and importers.",
    icon: Package,
  },
  {
    title: "Trusted Supplier Network",
    description:
      "Products sourced from reliable manufacturers and verified suppliers.",
    icon: ShieldCheck,
  },
  {
    title: "Export Support",
    description:
      "Documentation, logistics coordination and international shipping assistance.",
    icon: Truck,
  },
  {
    title: "Dedicated Sourcing Team",
    description:
      "Can't find a product? Our team will source it for you from Dubai.",
    icon: Users,
  },
  {
    title: "Fast Response",
    description:
      "Quick quotation turnaround and responsive customer support.",
    icon: Clock3,
  },
];

export default function WhyChooseUs() {
  return (
    <section className="bg-white py-24">
      <Container>
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-600">
            Why Choose Us
          </p>

          <h2 className="mt-3 text-4xl font-bold text-slate-900">
            Your Trusted Wholesale & Export Partner
          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-slate-600">
            We help wholesalers, distributors, retailers and importers source
            quality products from Dubai with confidence.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {features.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="rounded-2xl border bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-amber-500 hover:shadow-xl"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-100">
                  <Icon className="h-7 w-7 text-amber-600" />
                </div>

                <h3 className="mt-6 text-xl font-semibold text-slate-900">
                  {item.title}
                </h3>

                <p className="mt-3 leading-7 text-slate-600">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
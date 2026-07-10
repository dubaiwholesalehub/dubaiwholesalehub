import {
  Hammer,
  Smartphone,
  CookingPot,
  Home,
  Baby,
  ToyBrick,
  Sparkles,
  Wrench,
} from "lucide-react";
import Container from "../layout/container";

const categories = [
  {
    title: "Household",
    icon: Home,
  },
  {
    title: "Kitchen Appliances",
    icon: CookingPot,
  },
  {
    title: "Electronics",
    icon: Smartphone,
  },
  {
    title: "Tools & Hardware",
    icon: Hammer,
  },
  {
    title: "Beauty & Cosmetics",
    icon: Sparkles,
  },
  {
    title: "Baby & Kids",
    icon: Baby,
  },
  {
    title: "Toys & Games",
    icon: ToyBrick,
  },
  {
    title: "Home Improvement",
    icon: Wrench,
  },
];

export default function CategoryGrid() {
  return (
    <section className="bg-slate-50 py-20">
      <Container>
        <div className="text-center">
          <h2 className="text-4xl font-bold text-slate-900">
            Browse Product Categories
          </h2>

          <p className="mt-4 text-slate-600">
            Explore thousands of wholesale products sourced from trusted Dubai suppliers.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => {
            const Icon = category.icon;

            return (
              <div
                key={category.title}
                className="group rounded-2xl border bg-white p-8 text-center shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-amber-500 hover:shadow-xl"
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 transition group-hover:bg-amber-500">
                  <Icon className="h-8 w-8 text-amber-600 group-hover:text-white" />
                </div>

                <h3 className="mt-6 text-lg font-semibold text-slate-900">
                  {category.title}
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Premium wholesale products from Dubai.
                </p>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
import Container from "@/components/layout/container";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

interface Props {
  categories: Category[];
}

export default function CategoryGrid({ categories }: Props) {
  return (
    <section className="bg-slate-50 py-20">
      <Container>
        <div className="text-center">
          <h2 className="text-4xl font-bold text-slate-900">
            Browse Product Categories
          </h2>

          <p className="mt-4 text-slate-600">
            Explore our wholesale catalog.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <div
              key={category.id}
              className="rounded-2xl border bg-white p-8 shadow-sm transition hover:-translate-y-2 hover:border-amber-500 hover:shadow-xl"
            >
              <h3 className="text-xl font-semibold text-slate-900">
                {category.name}
              </h3>

              <p className="mt-3 text-slate-500">
                {category.description ?? "Wholesale products"}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
import Container from "../layout/container";

const stats = [
  { value: "10,000+", label: "Products" },
  { value: "200+", label: "Trusted Suppliers" },
  { value: "40+", label: "Export Markets" },
  { value: "24/7", label: "Business Support" },
];

export default function Stats() {
  return (
    <section className="bg-slate-900 py-20 text-white">
      <Container>
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <h3 className="text-5xl font-bold text-amber-400">
                {stat.value}
              </h3>

              <p className="mt-3 text-lg text-slate-300">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
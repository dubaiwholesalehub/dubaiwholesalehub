import {
  Boxes,
  Building2,
  FileQuestion,
  PackageSearch,
} from "lucide-react";

const dashboardStats = [
  {
    label: "Products",
    value: "0",
    description: "Published catalog items",
    icon: PackageSearch,
  },
  {
    label: "Categories",
    value: "8",
    description: "Active product groups",
    icon: Boxes,
  },
  {
    label: "Suppliers",
    value: "0",
    description: "Registered sourcing partners",
    icon: Building2,
  },
  {
    label: "Open RFQs",
    value: "0",
    description: "Inquiries needing attention",
    icon: FileQuestion,
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">
          Business Overview
        </p>

        <h1 className="mt-3 text-3xl font-bold text-slate-950 lg:text-4xl">
          Dashboard
        </h1>

        <p className="mt-3 text-slate-600">
          Manage your wholesale catalog, suppliers and customer inquiries.
        </p>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((stat) => {
          const Icon = stat.icon;

          return (
            <article
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {stat.label}
                  </p>

                  <p className="mt-2 text-3xl font-bold text-slate-950">
                    {stat.value}
                  </p>
                </div>

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                  <Icon className="h-6 w-6 text-amber-700" />
                </div>
              </div>

              <p className="mt-4 text-sm text-slate-500">
                {stat.description}
              </p>
            </article>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">
            Recent activity
          </h2>

          <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
            <p className="font-medium text-slate-700">
              No activity recorded yet
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Product updates, RFQs and supplier changes will appear here.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">
            Quick actions
          </h2>

          <div className="mt-5 space-y-3">
            {[
              "Add a new product",
              "Create a category",
              "Register a supplier",
              "Review open RFQs",
            ].map((action) => (
              <button
                key={action}
                type="button"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-amber-400 hover:bg-amber-50 hover:text-amber-800"
              >
                {action}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
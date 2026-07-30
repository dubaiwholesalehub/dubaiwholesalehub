interface InventoryTransferSummaryCardsProps {
  total: number;
  draft: number;
  inTransit: number;
  completed: number;
}

export function InventoryTransferSummaryCards({
  total,
  draft,
  inTransit,
  completed,
}: InventoryTransferSummaryCardsProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        label="Total Transfers"
        value={total}
        description="Matching warehouse transfers"
      />

      <SummaryCard
        label="Draft"
        value={draft}
        description="Transfers being prepared"
      />

      <SummaryCard
        label="In Transit"
        value={inTransit}
        description="Stock moving between warehouses"
      />

      <SummaryCard
        label="Completed"
        value={completed}
        description="Successfully completed transfers"
      />
    </section>
  );
}

interface SummaryCardProps {
  label: string;
  value: number;
  description: string;
}

function SummaryCard({
  label,
  value,
  description,
}: SummaryCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
        {value.toLocaleString("en-US")}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {description}
      </p>
    </article>
  );
}
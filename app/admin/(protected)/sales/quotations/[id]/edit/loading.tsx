export default function EditSalesQuotationLoading() {
  return <SalesQuotationFormSkeleton />;
}

function SalesQuotationFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="h-4 w-36 animate-pulse rounded bg-muted" />

        <div className="flex items-center gap-3">
          <div className="size-11 animate-pulse rounded-xl bg-muted" />

          <div className="space-y-2">
            <div className="h-7 w-64 animate-pulse rounded bg-muted" />

            <div className="h-4 w-96 max-w-full animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>

      <div className="space-y-8 rounded-xl border bg-card p-6">
        {Array.from({
          length: 4,
        }).map((_, sectionIndex) => (
          <section
            key={sectionIndex}
            className="space-y-4"
          >
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />

            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({
                length:
                  sectionIndex === 3
                    ? 2
                    : 4,
              }).map((__, fieldIndex) => (
                <div
                  key={fieldIndex}
                  className="space-y-2"
                >
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />

                  <div className="h-8 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
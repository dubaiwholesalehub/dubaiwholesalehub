import { FileSearch } from "lucide-react";

export function ComparisonEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-14 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <FileSearch className="size-5 text-muted-foreground" />
      </div>

      <h3 className="mt-4 font-semibold">
        No quotations available
      </h3>

      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Supplier quotations will appear here once suppliers submit their
        pricing.
      </p>
    </div>
  );
}
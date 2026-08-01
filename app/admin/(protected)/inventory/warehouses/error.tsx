"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">
        Unable to load warehouses
      </h2>

      <p className="text-muted-foreground">
        {error.message}
      </p>

      <button
        onClick={reset}
        className="rounded-md border px-4 py-2"
      >
        Try Again
      </button>
    </div>
  );
}
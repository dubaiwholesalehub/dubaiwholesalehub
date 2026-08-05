"use client";

import { Button } from "@/components/ui/button";

interface SalesQuotationsErrorProps {
  error: Error;
  reset: () => void;
}

export default function SalesQuotationsError({
  error,
  reset,
}: SalesQuotationsErrorProps) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6">
      <h2 className="font-semibold text-destructive">
        Unable to load sales quotations
      </h2>

      <p className="mt-2 text-sm text-destructive">
        {error.message}
      </p>

      <Button
        type="button"
        variant="outline"
        className="mt-4"
        onClick={reset}
      >
        Try Again
      </Button>
    </div>
  );
}
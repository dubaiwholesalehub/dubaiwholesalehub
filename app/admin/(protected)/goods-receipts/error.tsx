"use client";

import { AlertCircle, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

interface GoodsReceiptsErrorProps {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
}

export default function GoodsReceiptsError({
  error,
  reset,
}: GoodsReceiptsErrorProps) {
  return (
    <div className="flex min-h-96 flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="size-6 text-destructive" />
      </div>

      <h2 className="mt-4 text-lg font-semibold">
        Could not load goods receipts
      </h2>

      <p className="mt-2 max-w-lg text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred while loading the page."}
      </p>

      <Button
        type="button"
        variant="outline"
        className="mt-5"
        onClick={reset}
      >
        <RefreshCcw className="size-4" />
        Try again
      </Button>
    </div>
  );
}
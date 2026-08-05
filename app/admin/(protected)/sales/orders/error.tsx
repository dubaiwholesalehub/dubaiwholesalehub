"use client";

import {
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";

interface SalesOrdersErrorProps {
  error: Error & {
    digest?: string;
  };

  reset: () => void;
}

export default function SalesOrdersError({
  error,
  reset,
}: SalesOrdersErrorProps) {
  return (
    <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" />
      </div>

      <h2 className="mt-4 text-lg font-semibold">
        Unable to load sales orders
      </h2>

      <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
        {error.message ||
          "An unexpected error occurred while loading the sales orders."}
      </p>

      <Button
        type="button"
        variant="outline"
        className="mt-5"
        onClick={reset}
      >
        <RotateCcw className="size-4" />

        Try Again
      </Button>
    </section>
  );
}
"use client";

import {
  AlertTriangle,
  RefreshCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";

interface DeliveryOrdersErrorProps {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
}

export default function DeliveryOrdersError({
  error,
  reset,
}: DeliveryOrdersErrorProps) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
      <div className="flex items-start gap-4">
        <div className="rounded-full bg-destructive/10 p-3 text-destructive">
          <AlertTriangle className="size-5" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">
            Unable to load delivery orders
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            {error.message ||
              "An unexpected error occurred while loading delivery orders."}
          </p>

          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={reset}
          >
            <RefreshCcw className="size-4" />
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}
"use client";

import { useState } from "react";
import {
  ArrowRight,
  Loader2,
} from "lucide-react";

import {
  convertQuotationToSalesOrderAction,
} from "@/app/admin/(protected)/sales/quotations/actions";
import { Button } from "@/components/ui/button";

interface ConvertToSalesOrderButtonProps {
  quotationId: string;
}

export default function ConvertToSalesOrderButton({
  quotationId,
}: ConvertToSalesOrderButtonProps) {
  const [isConverting, setIsConverting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function handleConvert() {
    const confirmed = window.confirm(
      "Convert this accepted quotation into a sales order? All quotation items and commercial details will be copied.",
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setIsConverting(true);

    try {
      await convertQuotationToSalesOrderAction(
        quotationId,
      );
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to convert the quotation.",
      );

      setIsConverting(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        disabled={isConverting}
        onClick={handleConvert}
      >
        {isConverting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ArrowRight className="size-4" />
        )}

        {isConverting
          ? "Converting..."
          : "Convert to Sales Order"}
      </Button>

      {error ? (
        <p
          role="alert"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
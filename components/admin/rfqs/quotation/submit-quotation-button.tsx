"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { submitSupplierQuotationAction } from "@/app/admin/actions/rfq/submit-supplier-quotation";
import { Button } from "@/components/ui/button";

interface SubmitQuotationButtonProps {
  rfqId: string;
  quotationId: string;
}

export function SubmitQuotationButton({
  rfqId,
  quotationId,
}: SubmitQuotationButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    const confirmed = window.confirm(
      "Submit this supplier quotation?\n\nAfter submission, it will become eligible for review and award.",
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await submitSupplierQuotationAction(
        rfqId,
        quotationId,
      );

      if (!result.success) {
        window.alert(result.message);
        return;
      }

      window.alert(result.message);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      onClick={handleSubmit}
      disabled={isPending}
    >
      {isPending ? "Submitting..." : "Submit Quotation"}
    </Button>
  );
}
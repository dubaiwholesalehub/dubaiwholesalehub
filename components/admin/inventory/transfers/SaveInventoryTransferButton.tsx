"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle, Save } from "lucide-react";

interface SaveInventoryTransferButtonProps {
  disabled?: boolean;
}

export function SaveInventoryTransferButton({
  disabled = false,
}: SaveInventoryTransferButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-amber-600 px-5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
    >
      {pending ? (
        <>
          <LoaderCircle className="size-4 animate-spin" />
          Saving Draft...
        </>
      ) : (
        <>
          <Save className="size-4" />
          Save Draft
        </>
      )}
    </button>
  );
}
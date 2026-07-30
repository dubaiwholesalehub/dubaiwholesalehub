"use client";

import { Printer } from "lucide-react";

interface PrintButtonProps {
  label?: string;
}

export function PrintButton({ label = "Print" }: PrintButtonProps) {
  function handlePrint() {
    window.print();
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="no-print inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
    >
      <Printer className="size-4" />
      <span>{label}</span>
    </button>
  );
}
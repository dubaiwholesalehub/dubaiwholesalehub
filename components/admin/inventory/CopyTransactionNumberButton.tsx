"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

interface CopyTransactionNumberButtonProps {
  transactionNumber: string;
}

export function CopyTransactionNumberButton({
  transactionNumber,
}: CopyTransactionNumberButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(
        transactionNumber,
      );

      setCopied(true);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
    }
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copy transaction number ${transactionNumber}`}
      title={
        copied
          ? "Transaction number copied"
          : "Copy transaction number"
      }
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
    >
      {copied ? (
        <>
          <Check className="size-4 text-emerald-600" />
          <span>Copied</span>
        </>
      ) : (
        <>
          <Copy className="size-4" />
          <span className="hidden sm:inline">
            Copy number
          </span>
        </>
      )}
    </button>
  );
}
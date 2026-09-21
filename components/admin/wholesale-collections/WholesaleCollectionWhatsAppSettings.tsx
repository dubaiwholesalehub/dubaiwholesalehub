"use client";

import {
  CheckCircle2,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useState,
  useTransition,
} from "react";

import { updateWholesaleCollectionWhatsApp } from "@/app/admin/(protected)/wholesale-collections/actions";

interface WholesaleCollectionWhatsAppSettingsProps {
  collectionId: string;
  whatsappNumber: string | null;
}

export default function WholesaleCollectionWhatsAppSettings({
  collectionId,
  whatsappNumber,
}: WholesaleCollectionWhatsAppSettingsProps) {
  const router = useRouter();

  const [number, setNumber] = useState(
    whatsappNumber ?? "",
  );

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] =
    useTransition();

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isPending) {
      return;
    }

    setError("");
    setSuccess("");

    startTransition(async () => {
      const result =
        await updateWholesaleCollectionWhatsApp(
          collectionId,
          number,
        );

      if (!result.success) {
        setError(result.message);
        return;
      }

      setSuccess(result.message);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
          <MessageCircle className="h-5 w-5" />
        </div>

        <div>
          <h2 className="font-semibold text-gray-950">
            WhatsApp Enquiry Number
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Customer selections from this collection
            will be sent to this WhatsApp number.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-5"
      >
        <label
          htmlFor="whatsapp-number"
          className="text-sm font-medium text-gray-700"
        >
          WhatsApp number with country code
        </label>

        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input
            id="whatsapp-number"
            type="tel"
            value={number}
            onChange={(event) => {
              setNumber(event.target.value);
              setError("");
              setSuccess("");
            }}
            placeholder="971501234567"
            disabled={isPending}
            className="min-h-11 flex-1 rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-950 outline-none transition focus:border-gray-950 focus:ring-1 focus:ring-gray-950 disabled:bg-gray-100"
          />

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}

            {isPending
              ? "Saving..."
              : "Save Number"}
          </button>
        </div>

        <p className="mt-2 text-xs text-gray-500">
          Example: +971 50 123 4567. Spaces,
          brackets and + will be cleaned automatically.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mt-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            {success}
          </div>
        )}
      </form>
    </div>
  );
}
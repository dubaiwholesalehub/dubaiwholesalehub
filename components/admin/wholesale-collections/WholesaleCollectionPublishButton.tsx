"use client";

import {
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setWholesaleCollectionPublished } from "@/app/admin/(protected)/wholesale-collections/actions";

interface WholesaleCollectionPublishButtonProps {
  collectionId: string;
  isPublished: boolean;
}

export default function WholesaleCollectionPublishButton({
  collectionId,
  isPublished,
}: WholesaleCollectionPublishButtonProps) {
  const router = useRouter();

  const [isPending, startTransition] =
    useTransition();

  const [error, setError] = useState("");

  function handleClick() {
    if (isPending) {
      return;
    }

    if (isPublished) {
      const confirmed = window.confirm(
        "Unpublish this collection?\n\nCustomers will no longer be able to view the collection page. Your photos and reference numbers will remain unchanged.",
      );

      if (!confirmed) {
        return;
      }
    }

    setError("");

    startTransition(async () => {
      const result =
        await setWholesaleCollectionPublished(
          collectionId,
          !isPublished,
        );

      if (!result.success) {
        setError(result.message);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
          isPublished
            ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            : "bg-gray-950 text-white hover:bg-gray-800"
        }`}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isPublished ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}

        {isPending
          ? isPublished
            ? "Unpublishing..."
            : "Publishing..."
          : isPublished
            ? "Unpublish Collection"
            : "Publish Collection"}
      </button>

      {error && (
        <p className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
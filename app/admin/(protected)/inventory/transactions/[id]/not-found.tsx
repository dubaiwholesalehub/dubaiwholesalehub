import Link from "next/link";
import {
  ArrowLeft,
  FileQuestion,
} from "lucide-react";

export default function InventoryTransactionNotFound() {
  return (
    <div className="flex min-h-[500px] items-center justify-center">
      <div className="max-w-md text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-muted">
          <FileQuestion className="size-7 text-muted-foreground" />
        </div>

        <h1 className="mt-5 text-xl font-semibold">
          Transaction not found
        </h1>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The inventory transaction may have been removed,
          or the supplied transaction ID is invalid.
        </p>

        <Link
          href="/admin/inventory/transactions"
          className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <ArrowLeft className="size-4" />
          Back to transactions
        </Link>
      </div>
    </div>
  );
}
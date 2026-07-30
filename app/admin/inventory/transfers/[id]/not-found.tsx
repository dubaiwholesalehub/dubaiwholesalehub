import Link from "next/link";
import {
  ArrowLeft,
  SearchX,
} from "lucide-react";

export default function InventoryTransferNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <SearchX className="size-6" />
        </div>

        <h1 className="mt-5 text-xl font-semibold text-slate-950">
          Inventory transfer not found
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          The requested transfer may have been removed or the
          address may be incorrect.
        </p>

        <Link
          href="/admin/inventory/transfers"
          className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-700"
        >
          <ArrowLeft className="size-4" />
          Back to Transfers
        </Link>
      </div>
    </div>
  );
}
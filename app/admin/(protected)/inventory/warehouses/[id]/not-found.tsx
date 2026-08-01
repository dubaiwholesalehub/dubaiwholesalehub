import Link from "next/link";
import {
  ArrowLeft,
  WarehouseIcon,
} from "lucide-react";

import {
  buttonVariants,
} from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function WarehouseNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <WarehouseIcon className="size-6" />
        </div>

        <h1 className="mt-5 text-xl font-semibold">
          Warehouse not found
        </h1>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The requested warehouse may have been removed
          or the address may be incorrect.
        </p>

        <Link
          href="/admin/inventory/warehouses"
          className={cn(
            buttonVariants({
              variant: "default",
              size: "default",
            }),
            "mt-6",
          )}
        >
          <ArrowLeft className="size-4" />
          Back to Warehouses
        </Link>
      </div>
    </div>
  );
}
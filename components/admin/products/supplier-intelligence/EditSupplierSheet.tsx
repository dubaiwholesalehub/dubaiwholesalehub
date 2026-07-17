"use client";

import { useState } from "react";
import { Building2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type {
  ProductSupplierMapping,
  ProductSupplierOption,
} from "@/lib/repositories/product-supplier.repository";

import SupplierForm from "./SupplierForm";

type EditSupplierSheetProps = {
  productId: string;
  productName: string;
  mapping: ProductSupplierMapping;
  suppliers: ProductSupplierOption[];
};

export default function EditSupplierSheet({
  productId,
  productName,
  mapping,
  suppliers,
}: EditSupplierSheetProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function handleSuccess() {
    setOpen(false);
    router.refresh();
  }

  const supplierName =
    mapping.supplier?.company_name ??
    "Product supplier";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-amber-400 hover:bg-amber-50 hover:text-amber-800"
>
  <Pencil className="h-4 w-4" />
  Edit
</SheetTrigger>

      <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-2xl">
        <SheetHeader className="border-b border-slate-200 px-6 py-5 text-left">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-slate-950 p-2.5">
              <Building2 className="h-5 w-5 text-white" />
            </div>

            <div className="min-w-0">
              <SheetTitle>
                Edit Product Supplier
              </SheetTitle>

              <SheetDescription className="mt-1">
                Update pricing and commercial terms for{" "}
                <span className="font-medium text-slate-700">
                  {supplierName}
                </span>{" "}
                on {productName}.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="px-6 py-6">
          {open ? (
            <SupplierForm
              key={mapping.updated_at}
              productId={productId}
              suppliers={suppliers}
              mode="edit"
              mapping={mapping}
              onSuccess={handleSuccess}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
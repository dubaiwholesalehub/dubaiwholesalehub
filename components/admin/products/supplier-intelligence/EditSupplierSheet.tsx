"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  Building2,
  Pencil,
} from "lucide-react";
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
import UnsavedChangesDialog from "./UnsavedChangesDialog";

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
  const [isDirty, setIsDirty] = useState(false);
  const [
    showDiscardDialog,
    setShowDiscardDialog,
  ] = useState(false);

  const router = useRouter();

  const supplierName =
    mapping.supplier?.company_name ??
    "Product supplier";

  useEffect(() => {
    if (!open || !isDirty) {
      return;
    }

    function handleBeforeUnload(
      event: BeforeUnloadEvent,
    ) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload,
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload,
      );
    };
  }, [open, isDirty]);

  function handleOpenChange(
    nextOpen: boolean,
  ) {
    if (nextOpen) {
      setOpen(true);
      return;
    }

    if (isDirty) {
      setShowDiscardDialog(true);
      return;
    }

    setOpen(false);
  }

  function handleDiscard() {
    setIsDirty(false);
    setShowDiscardDialog(false);
    setOpen(false);
  }

  function handleSuccess() {
    setIsDirty(false);
    setShowDiscardDialog(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={handleOpenChange}
      >
        <SheetTrigger className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-amber-400 hover:bg-amber-50 hover:text-amber-800">
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
                  Update pricing and commercial
                  terms for{" "}
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
                onDirtyChange={setIsDirty}
                onSuccess={handleSuccess}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <UnsavedChangesDialog
        open={showDiscardDialog}
        onOpenChange={setShowDiscardDialog}
        onDiscard={handleDiscard}
      />
    </>
  );
}
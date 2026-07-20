"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  Building2,
  Plus,
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
  ProductSupplierOption,
} from "@/lib/repositories/product-supplier.repository";

import SupplierForm from "./SupplierForm";
import UnsavedChangesDialog from "./UnsavedChangesDialog";

type SupplierSheetProps = {
  productId: string;
  productName: string;
  suppliers: ProductSupplierOption[];
};

export default function SupplierSheet({
  productId,
  productName,
  suppliers,
}: SupplierSheetProps) {
  const [open, setOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [
    showDiscardDialog,
    setShowDiscardDialog,
  ] = useState(false);

  const router = useRouter();

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
        <SheetTrigger className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 font-semibold text-white transition hover:bg-amber-600">
          <Plus className="h-5 w-5" />
          Add Supplier
        </SheetTrigger>

        <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-2xl">
          <SheetHeader className="border-b border-slate-200 px-6 py-5 text-left">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-slate-950 p-2.5">
                <Building2 className="h-5 w-5 text-white" />
              </div>

              <div>
                <SheetTitle>
                  Add Product Supplier
                </SheetTitle>

                <SheetDescription className="mt-1">
                  Connect a supplier to{" "}
                  {productName} and record its
                  pricing and commercial terms.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="px-6 py-6">
            {open ? (
              <SupplierForm
                productId={productId}
                suppliers={suppliers}
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
        onContinueEditing={() => setShowDiscardDialog(false)}
      />
    </>
  );
}
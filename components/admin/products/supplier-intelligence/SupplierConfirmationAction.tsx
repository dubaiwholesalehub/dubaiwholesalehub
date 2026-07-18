"use client";

import {
  useState,
  useTransition,
} from "react";
import {
  Archive,
  Check,
  Loader2,
  RotateCcw,
  Star,
  TriangleAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type {
  SupplierActionResult,
} from "@/components/admin/products/supplier-intelligence/types";

type SupplierConfirmationVariant =
  | "preferred"
  | "archive"
  | "restore";

type SupplierConfirmationActionProps = {
  productId: string;
  mappingId: string;
  supplierName: string;
  variant: SupplierConfirmationVariant;
  action: (
    formData: FormData,
  ) => Promise<SupplierActionResult>;
};

const config = {
  preferred: {
    triggerLabel: "Set Preferred",
    title: "Set preferred supplier?",
    description: (supplierName: string) =>
      `${supplierName} will become the default supplier for this product. Any currently preferred supplier will be replaced.`,
    confirmLabel: "Set Preferred",
    pendingLabel: "Updating...",
    triggerIcon: Star,
    dialogIcon: Star,
    triggerClassName:
      "border-amber-300 text-amber-800 hover:bg-amber-50",
    confirmClassName:
      "bg-amber-600 text-white hover:bg-amber-700",
    mediaClassName:
      "bg-amber-100 text-amber-700",
  },

  archive: {
    triggerLabel: "Archive",
    title: "Archive supplier mapping?",
    description: (supplierName: string) =>
      `${supplierName} will no longer be available as an active purchasing source until the mapping is restored.`,
    confirmLabel: "Archive",
    pendingLabel: "Archiving...",
    triggerIcon: Archive,
    dialogIcon: TriangleAlert,
    triggerClassName:
      "border-red-300 text-red-700 hover:bg-red-50",
    confirmClassName:
      "bg-red-600 text-white hover:bg-red-700",
    mediaClassName:
      "bg-red-100 text-red-700",
  },

  restore: {
    triggerLabel: "Restore",
    title: "Restore supplier mapping?",
    description: (supplierName: string) =>
      `${supplierName} will become available again as an active purchasing source for this product.`,
    confirmLabel: "Restore",
    pendingLabel: "Restoring...",
    triggerIcon: RotateCcw,
    dialogIcon: Check,
    triggerClassName:
      "border-emerald-300 text-emerald-700 hover:bg-emerald-50",
    confirmClassName:
      "bg-emerald-600 text-white hover:bg-emerald-700",
    mediaClassName:
      "bg-emerald-100 text-emerald-700",
  },
} satisfies Record<
  SupplierConfirmationVariant,
  {
    triggerLabel: string;
    title: string;
    description: (
      supplierName: string,
    ) => string;
    confirmLabel: string;
    pendingLabel: string;
    triggerIcon: React.ElementType;
    dialogIcon: React.ElementType;
    triggerClassName: string;
    confirmClassName: string;
    mediaClassName: string;
  }
>;

export default function SupplierConfirmationAction({
  productId,
  mappingId,
  supplierName,
  variant,
  action,
}: SupplierConfirmationActionProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] =
    useTransition();
  const router = useRouter();

  const selectedConfig = config[variant];
  const TriggerIcon =
    selectedConfig.triggerIcon;
  const DialogIcon =
    selectedConfig.dialogIcon;

  function handleConfirm() {
    const formData = new FormData();

    formData.set("productId", productId);
    formData.set("mappingId", mappingId);

    startTransition(async () => {
      try {
        const response = await action(formData);

        if (!response.success) {
          toast.error(
            response.message ||
              "Unable to complete the action.",
          );

          return;
        }

        toast.success(response.message);
        setOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
        );
      }
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isPending) {
          setOpen(nextOpen);
        }
      }}
    >
      <AlertDialogTrigger
        disabled={isPending}
        className={[
          "inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
          selectedConfig.triggerClassName,
        ].join(" ")}
      >
        <TriggerIcon className="h-4 w-4" />
        {selectedConfig.triggerLabel}
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia
            className={
              selectedConfig.mediaClassName
            }
          >
            <DialogIcon className="h-5 w-5" />
          </AlertDialogMedia>

          <AlertDialogTitle>
            {selectedConfig.title}
          </AlertDialogTitle>

          <AlertDialogDescription>
            {selectedConfig.description(
              supplierName,
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isPending}
          >
            Cancel
          </AlertDialogCancel>

            <AlertDialogAction
                type="button"
                aria-busy={isPending}
                disabled={isPending}
                onClick={handleConfirm}
                className={
                  selectedConfig.confirmClassName
                }
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {selectedConfig.pendingLabel}
                  </>
                ) : (
                  <>
                    <TriggerIcon className="h-4 w-4" />
                    {selectedConfig.confirmLabel}
                  </>
                )}
              </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
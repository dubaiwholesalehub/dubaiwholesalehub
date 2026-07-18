"use client";

import {
  FileWarning,
  Trash2,
} from "lucide-react";

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
} from "@/components/ui/alert-dialog";

type UnsavedChangesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinueEditing: () => void;
  onDiscard: () => void;
};

export default function UnsavedChangesDialog({
  open,
  onOpenChange,
  onContinueEditing,
  onDiscard,
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-amber-100 text-amber-700">
            <FileWarning className="h-5 w-5" />
          </AlertDialogMedia>

          <AlertDialogTitle>
            Discard unsaved changes?
          </AlertDialogTitle>

          <AlertDialogDescription>
            You have unsaved supplier information.
            Closing this sheet will permanently discard
            those changes.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel
            type="button"
            onClick={onContinueEditing}
          >
            Continue Editing
          </AlertDialogCancel>

          <AlertDialogAction
            type="button"
            onClick={onDiscard}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            <Trash2 className="h-4 w-4" />
            Discard Changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

type UseUnsavedChangesOptions = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export default function useUnsavedChanges({
  open,
  setOpen,
}: UseUnsavedChangesOptions) {
  const [isDirty, setIsDirty] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] =
    useState(false);

  const markDirty = useCallback(
    (dirty: boolean) => {
      setIsDirty(dirty);
    },
    [],
  );

  const markClean = useCallback(() => {
    setIsDirty(false);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setOpen(true);
        return;
      }

      if (isDirty) {
        setShowDiscardDialog(true);
        return;
      }

      setOpen(false);
    },
    [isDirty, setOpen],
  );

  const continueEditing = useCallback(() => {
    setShowDiscardDialog(false);
  }, []);

  const discardChanges = useCallback(() => {
    setIsDirty(false);
    setShowDiscardDialog(false);
    setOpen(false);
  }, [setOpen]);

  const closeAfterSuccess = useCallback(() => {
    setIsDirty(false);
    setShowDiscardDialog(false);
    setOpen(false);
  }, [setOpen]);

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

  return {
    isDirty,
    showDiscardDialog,
    setShowDiscardDialog,
    markDirty,
    markClean,
    handleOpenChange,
    continueEditing,
    discardChanges,
    closeAfterSuccess,
  };
}
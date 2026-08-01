"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  Loader2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ConfirmDialogVariant =
  | "default"
  | "destructive";

interface ConfirmDialogProps {
  trigger: ReactNode;

  title: string;
  description?: string;

  confirmLabel?: string;
  cancelLabel?: string;

  variant?: ConfirmDialogVariant;

  onConfirm: () => Promise<void> | void;

  disabled?: boolean;
}

export default function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  disabled = false,
}: ConfirmDialogProps) {
  const [isOpen, setIsOpen] =
    useState(false);

  const [isPending, setIsPending] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const confirmButtonRef =
    useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    confirmButtonRef.current?.focus();

    function handleEscape(
      event: KeyboardEvent,
    ) {
      if (
        event.key === "Escape" &&
        !isPending
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    const originalOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape,
      );

      document.body.style.overflow =
        originalOverflow;
    };
  }, [isOpen, isPending]);

  function openDialog() {
    if (disabled) {
      return;
    }

    setErrorMessage(null);
    setIsOpen(true);
  }

  function closeDialog() {
    if (isPending) {
      return;
    }

    setIsOpen(false);
    setErrorMessage(null);
  }

  async function handleConfirm() {
    setIsPending(true);
    setErrorMessage(null);

    try {
      await onConfirm();
      setIsOpen(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to complete the action.",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <span
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={openDialog}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" ||
            event.key === " "
          ) {
            event.preventDefault();
            openDialog();
          }
        }}
        className={cn(
          "inline-flex",
          disabled &&
            "pointer-events-none opacity-50",
        )}
      >
        {trigger}
      </span>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
        >
          <button
            type="button"
            aria-label="Close confirmation dialog"
            className="absolute inset-0 bg-black/50"
            disabled={isPending}
            onClick={closeDialog}
          />

          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby={
              description
                ? "confirm-dialog-description"
                : undefined
            }
            className="relative z-10 w-full max-w-md rounded-xl border bg-background p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full",
                  variant === "destructive"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-amber-100 text-amber-700",
                )}
              >
                <AlertTriangle className="size-5" />
              </div>

              <button
                type="button"
                aria-label="Close"
                disabled={isPending}
                onClick={closeDialog}
                className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4">
              <h2
                id="confirm-dialog-title"
                className="text-lg font-semibold"
              >
                {title}
              </h2>

              {description ? (
                <p
                  id="confirm-dialog-description"
                  className="mt-2 text-sm leading-6 text-muted-foreground"
                >
                  {description}
                </p>
              ) : null}
            </div>

            {errorMessage ? (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {errorMessage}
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={closeDialog}
              >
                {cancelLabel}
              </Button>

              <Button
                ref={confirmButtonRef}
                type="button"
                variant={
                  variant === "destructive"
                    ? "destructive"
                    : "default"
                }
                disabled={isPending}
                onClick={handleConfirm}
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  confirmLabel
                )}
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
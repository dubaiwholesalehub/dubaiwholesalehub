import Link from "next/link";
import type { ReactNode } from "react";

import {
  buttonVariants,
} from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FormToolbarProps {
  children?: ReactNode;

  cancelHref?: string;
  cancelLabel?: string;

  className?: string;
}

export default function FormToolbar({
  children,
  cancelHref,
  cancelLabel = "Cancel",
  className,
}: FormToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-end",
        className,
      )}
    >
      {cancelHref ? (
        <Link
          href={cancelHref}
          className={cn(
            buttonVariants({
              variant: "outline",
              size: "default",
            }),
          )}
        >
          {cancelLabel}
        </Link>
      ) : null}

      {children}
    </div>
  );
}
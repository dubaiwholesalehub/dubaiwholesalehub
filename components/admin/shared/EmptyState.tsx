import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import {
  buttonVariants,
} from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface EmptyStateAction {
  href: string;
  label: string;
  icon?: LucideIcon;
  variant?:
    | "default"
    | "outline"
    | "secondary"
    | "ghost"
    | "destructive"
    | "link";
}

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
  compact?: boolean;
}

export default function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  secondaryAction,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 text-center",
        compact
          ? "min-h-40 py-8"
          : "min-h-56 py-12",
        className,
      )}
    >
      {Icon ? (
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-5" />
        </div>
      ) : null}

      <h3
        className={cn(
          "font-semibold text-foreground",
          Icon ? "mt-4" : "",
        )}
      >
        {title}
      </h3>

      {description ? (
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      ) : null}

      {action || secondaryAction ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {secondaryAction ? (
            <EmptyStateLink
              action={secondaryAction}
            />
          ) : null}

          {action ? (
            <EmptyStateLink
              action={action}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

interface EmptyStateLinkProps {
  action: EmptyStateAction;
}

function EmptyStateLink({
  action,
}: EmptyStateLinkProps) {
  const Icon = action.icon;

  return (
    <Link
      href={action.href}
      className={cn(
        buttonVariants({
          variant:
            action.variant ?? "default",
          size: "default",
        }),
      )}
    >
      {Icon ? (
        <Icon className="size-4" />
      ) : null}

      {action.label}
    </Link>
  );
}
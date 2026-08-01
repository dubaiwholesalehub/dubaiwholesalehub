import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import {
  buttonVariants,
} from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PageHeaderAction {
  href: string;
  label: string;
  icon?: LucideIcon;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: PageHeaderAction;
  backLink?: {
    href: string;
    label: string;
    icon?: LucideIcon;
  };
  children?: React.ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  description,
  icon: Icon,
  action,
  backLink,
  children,
  className,
}: PageHeaderProps) {
  const ActionIcon = action?.icon;
  const BackIcon = backLink?.icon;

  return (
    <header
      className={cn(
        "space-y-4",
        className,
      )}
    >
      {backLink && (
        <Link
          href={backLink.href}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {BackIcon && (
            <BackIcon className="size-4" />
          )}

          {backLink.label}
        </Link>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" />
            </div>
          )}

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {title}
            </h1>

            {description && (
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {children}

          {action && (
            <Link
              href={action.href}
              className={cn(
                buttonVariants({
                  variant: "default",
                  size: "default",
                }),
              )}
            >
              {ActionIcon && (
                <ActionIcon className="size-4" />
              )}

              {action.label}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
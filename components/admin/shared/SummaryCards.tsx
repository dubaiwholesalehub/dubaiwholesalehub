import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface SummaryCardItem {
  key: string;
  label: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  className?: string;
  iconClassName?: string;
}

interface SummaryCardsProps {
  cards: SummaryCardItem[];
  className?: string;
}

export default function SummaryCards({
  cards,
  className,
}: SummaryCardsProps) {
  return (
    <section
      className={cn(
        "grid gap-4 sm:grid-cols-2 xl:grid-cols-4",
        className,
      )}
    >
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <article
            key={card.key}
            className={cn(
              "rounded-xl border bg-card p-5 shadow-sm",
              card.className,
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </p>

                <p className="mt-2 truncate text-2xl font-semibold tracking-tight">
                  {card.value}
                </p>

                {card.description ? (
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {card.description}
                  </p>
                ) : null}
              </div>

              {Icon ? (
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary",
                    card.iconClassName,
                  )}
                >
                  <Icon className="size-5" />
                </div>
              ) : null}
            </div>
          </article>
        );
      })}
    </section>
  );
}
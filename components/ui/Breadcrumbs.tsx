import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({
  items,
}: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-2 text-sm text-slate-500"
    >
      {items.map((item, index) => {
        const last = index === items.length - 1;

        return (
          <div
            key={`${item.label}-${index}`}
            className="flex items-center gap-2"
          >
            {last || !item.href ? (
              <span className="font-medium text-slate-900">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="transition-colors hover:text-amber-700"
              >
                {item.label}
              </Link>
            )}

            {!last && (
              <ChevronRight className="size-4 text-slate-400" />
            )}
          </div>
        );
      })}
    </nav>
  );
}
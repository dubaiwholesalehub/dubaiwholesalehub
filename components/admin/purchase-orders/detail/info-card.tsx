interface InfoCardProps {
  label: string;
  value: string | number;
  description?: string;
}

export function InfoCard({
  label,
  value,
  description,
}: InfoCardProps) {
  return (
    <article className="rounded-lg border bg-background p-5">
      <p className="text-sm font-medium text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold tracking-tight">
        {value}
      </p>

      {description ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}
    </article>
  );
}
interface InfoCardProps {
  label: string;
  value: React.ReactNode;
}

export function InfoCard({
  label,
  value,
}: InfoCardProps) {
  return (
    <div className="rounded-lg border bg-background p-5">
      <p className="text-sm text-muted-foreground">
        {label}
      </p>

      <div className="mt-2 text-3xl font-semibold tracking-tight">
        {value}
      </div>
    </div>
  );
}
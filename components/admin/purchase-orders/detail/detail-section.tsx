interface DetailSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function DetailSection({
  title,
  description,
  children,
}: DetailSectionProps) {
  return (
    <section className="rounded-lg border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold">
          {title}
        </h2>

        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      <div className="p-6">
        {children}
      </div>
    </section>
  );
}
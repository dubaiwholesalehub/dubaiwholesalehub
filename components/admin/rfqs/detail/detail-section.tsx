interface DetailSectionProps {
  title: string;
  children: React.ReactNode;
}

export function DetailSection({
  title,
  children,
}: DetailSectionProps) {
  return (
    <section className="rounded-lg border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold">
          {title}
        </h2>
      </div>

      <div className="p-6">
        {children}
      </div>
    </section>
  );
}
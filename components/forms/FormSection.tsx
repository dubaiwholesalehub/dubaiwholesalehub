import { ReactNode } from "react";

interface FormSectionProps {
  title?: string;
  children: ReactNode;
}

export default function FormSection({
  title,
  children,
}: FormSectionProps) {
  return (
    <section className="space-y-4">
      {title && (
        <h3 className="text-lg font-semibold">
          {title}
        </h3>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {children}
      </div>
    </section>
  );
}
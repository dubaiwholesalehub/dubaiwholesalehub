import { ReactNode } from "react";

interface FormActionsProps {
  children: ReactNode;
}

export default function FormActions({
  children,
}: FormActionsProps) {
  return (
    <div className="flex justify-end gap-3 border-t pt-6">
      {children}
    </div>
  );
}
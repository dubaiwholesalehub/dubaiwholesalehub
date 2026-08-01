import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReactNode } from "react";

interface FormCardProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export default function FormCard({
  title,
  description,
  children,
}: FormCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>

        {description && (
          <CardDescription>
            {description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {children}
      </CardContent>
    </Card>
  );
}
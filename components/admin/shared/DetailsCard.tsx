import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface DetailsCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function DetailsCard({
  title,
  description,
  children,
  footer,
}: DetailsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {title}
        </CardTitle>

        {description ? (
          <CardDescription>
            {description}
          </CardDescription>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-5">
        {children}
      </CardContent>

      {footer ? (
        <div className="border-t px-6 py-4">
          {footer}
        </div>
      ) : null}
    </Card>
  );
}
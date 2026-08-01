"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

interface CancelButtonProps {
  href: string;
}

export default function CancelButton({
  href,
}: CancelButtonProps) {
  return (
    <Link href={href}>
      <Button type="button" variant="outline">
        Cancel
      </Button>
    </Link>
  );
}
"use client";

import { Button } from "@/components/ui/button";

interface SaveButtonProps {
  children?: React.ReactNode;
  disabled?: boolean;
}

export default function SaveButton({
  children = "Save",
  disabled,
}: SaveButtonProps) {
  return (
    <Button
      type="submit"
      disabled={disabled}
    >
      {children}
    </Button>
  );
}
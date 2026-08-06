"use client";

import { Printer } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";

/** Prints the current page. `@media print` in globals.css hides the chrome. */
export function PrintButton({
  label,
  ...props
}: { label: string } & Omit<ButtonProps, "onClick">) {
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={() => window.print()}
      {...props}
    >
      <Printer aria-hidden />
      {label}
    </Button>
  );
}

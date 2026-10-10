import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "outline" | "success" | "warning" | "brand" | "destructive";

const variants: Record<Variant, string> = {
  default: "text-foreground",
  secondary: "text-muted-foreground",
  outline: "text-foreground/55",
  success: "text-success",
  warning: "text-warning",
  brand: "rounded-full bg-brand/15 px-2.5 py-0.5 text-brand-foreground",
  destructive: "text-destructive",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-xs font-medium leading-6 whitespace-nowrap",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
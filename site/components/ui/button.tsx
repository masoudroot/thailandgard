import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "outline" | "ghost" | "brand" | "destructive";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-control active:shadow-press",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border-line border-border shadow-control active:shadow-press",
  outline: "border-line border-input bg-transparent hover:bg-accent hover:text-accent-foreground shadow-control active:shadow-press",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  brand: "bg-brand text-brand-foreground hover:bg-brand/90 shadow-control active:shadow-press",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-control active:shadow-press",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2.5",
  icon: "size-10",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

export function Button({ asChild, className, variant = "default", size = "md", type = "button", children, ...props }: ButtonProps) {
  const classes = cn(
    // Shape, depth, press and motion come from the design-system tokens.
    "inline-flex items-center justify-center whitespace-nowrap rounded-control font-semibold transition-all duration-(--motion) ease-motion",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50 hover:-translate-y-px active:[transform:var(--press)]",
    "motion-reduce:hover:translate-none",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    variants[variant],
    sizes[size],
    className,
  );
  // asChild: render the single child (usually an <a> or <Link>) with the button
  // classes merged in, instead of nesting a <button> inside an <a> (invalid HTML).
  if (asChild && React.isValidElement(children)) {
    const child = React.Children.only(children) as React.ReactElement<{ className?: string }>;
    return React.cloneElement(child, { ...props, className: cn(classes, child.props.className) });
  }
  return (
    <button
      type={type}
      className={classes}
      {...props}
    >
      {children}
    </button>
  );
}
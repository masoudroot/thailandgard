"use client";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { NavLink } from "@/components/blocks/navbar";

/**
 * کشوی منوی موبایل (F4). از `Navbar` جدا شد تا فقط با اولین کلیک روی «منو»
 * دانلود شود؛ کاربر دسکتاپ و کاربری که منو را باز نمی‌کند، هیچ بایتی از
 * کشو (پرتال، تلهٔ فوکوس، انیمیشن پنل) دریافت نمی‌کند.
 */
export function MobileMenuSheet({
  open,
  onOpenChange,
  title,
  links,
  primary,
  secondary,
  isCurrent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  links: NavLink[];
  primary: { label: string; href?: string };
  secondary: { label: string; href?: string };
  isCurrent: (href: string) => boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title}>
      <ul className="flex flex-col p-2">
        {links.map((l) => {
          const active = l.active ?? isCurrent(l.href);
          return (
            <li key={l.label}>
              <a
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-md px-3 py-3 text-sm hover:bg-accent focus-visible:bg-accent",
                  active ? "text-foreground font-semibold" : "text-muted-foreground",
                )}
                onClick={() => onOpenChange(false)}
              >
                {l.label}
              </a>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto flex flex-col gap-2 border-t border-border p-4">
        {primary.href ? (
          <Button asChild variant="brand" className="w-full">
            <a href={primary.href} onClick={() => onOpenChange(false)}>{primary.label}</a>
          </Button>
        ) : (
          <Button variant="brand">{primary.label}</Button>
        )}
        {secondary.href ? (
          <Button asChild variant="outline" className="w-full">
            <a href={secondary.href} onClick={() => onOpenChange(false)}>{secondary.label}</a>
          </Button>
        ) : (
          <Button variant="outline">{secondary.label}</Button>
        )}
      </div>
    </Sheet>
  );
}

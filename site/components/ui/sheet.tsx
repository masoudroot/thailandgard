"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  /** "start" slides in from the right in RTL (the natural side for Persian). */
  side?: "start" | "end" | "bottom";
  children: React.ReactNode;
  className?: string;
}

/**
 * Panel spring ≈ Animate UI `{ type: "spring", stiffness: 150, damping: 22 }`.
 * Overlay fade ≈ Animate UI `{ duration: 0.2, ease: "easeInOut" }`.
 */
const PANEL_MS = 480;
const PANEL_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const OVERLAY_MS = 200;

function panelHidden(side: NonNullable<SheetProps["side"]>) {
  if (side === "bottom") return "translate-y-full opacity-0";
  if (side === "start") return "ltr:-translate-x-full rtl:translate-x-full opacity-0";
  return "ltr:translate-x-full rtl:-translate-x-full opacity-0";
}

/** کشو. A side panel for filters, carts and mobile navigation. */
export function Sheet({
  open,
  onOpenChange,
  title,
  side = "start",
  children,
  className,
}: SheetProps) {
  const titleId = React.useId();
  const [mounted, setMounted] = React.useState(false);
  const [present, setPresent] = React.useState(open);
  const [shown, setShown] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const restoreFocusRef = React.useRef<Element | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (open) {
      // Record the trigger so focus can be restored when the sheet closes.
      restoreFocusRef.current = document.activeElement;
      setPresent(true);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setShown(true));
      });
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
    const t = window.setTimeout(() => setPresent(false), PANEL_MS);
    return () => window.clearTimeout(t);
  }, [open]);

  // Move focus into the panel when it opens (screen-reader announcement).
  React.useEffect(() => {
    if (!present) return;
    const t = window.setTimeout(() => panelRef.current?.focus({ preventScroll: true }), 60);
    return () => window.clearTimeout(t);
  }, [present]);

  // Restore focus to the trigger when the sheet is gone.
  React.useEffect(() => {
    if (present) return;
    const el = restoreFocusRef.current;
    restoreFocusRef.current = null;
    if (el instanceof HTMLElement) el.focus({ preventScroll: true });
  }, [present]);

  React.useEffect(() => {
    if (!present) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [present, onOpenChange]);

  /** Focus trap: keep Tab cycling inside the panel while it is shown. */
  const onPanelKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = panel.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const active = document.activeElement;
    if (focusables.length === 0) {
      // Panel itself is the only stop: swallow Tab so focus cannot escape.
      e.preventDefault();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    // `active === panel` covers the moment right after open, when focus sits
    // on the panel itself and neither branch below would catch a Shift+Tab.
    if (e.shiftKey && (active === first || active === panel)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!mounted || !present) return null;

  return createPortal(
    <div className="fixed inset-0 z-50" role="presentation">
      <div
        aria-hidden
        onClick={() => onOpenChange(false)}
        className={cn(
          "absolute inset-0 bg-foreground/50 transition-[opacity,filter] ease-in-out",
          shown ? "opacity-100 blur-0" : "opacity-0 blur-sm",
        )}
        style={{ transitionDuration: `${OVERLAY_MS}ms` }}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        onKeyDown={onPanelKeyDown}
        className={cn(
          "absolute flex flex-col bg-popover text-popover-foreground shadow-overlay will-change-transform",
          "transition-[transform,opacity]",
          side === "start" && "inset-y-0 start-0 w-full max-w-sm border-e border-border",
          side === "end" && "inset-y-0 end-0 w-full max-w-sm border-s border-border",
          side === "bottom" && "inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl border-t border-border",
          shown ? "translate-x-0 translate-y-0 opacity-100" : panelHidden(side),
          className,
        )}
        style={{
          transitionDuration: `${PANEL_MS}ms`,
          transitionTimingFunction: PANEL_EASE,
        }}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          {title && (
            <h2 id={titleId} className="text-balance text-sm font-semibold">
              {title}
            </h2>
          )}
          <button
            type="button"
            aria-label="بستن"
            onClick={() => onOpenChange(false)}
            className="relative ms-auto flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground before:absolute before:-inset-1.5 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" /* D-506: حلقهٔ focus-visible کهربایی استاندارد (قرارداد D-012/button.tsx) */
            title="بستن"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
        <div className="flex flex-1 flex-col overflow-auto p-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** ظهور هنگام اسکرول. Fades and rises when it enters the viewport; once only.
 * `durationMs` مدت ترنزیشن است (پیش‌فرض ۷۰۰؛ برای هیرو ۲۰۰ پاس بده). */
export function Reveal({ children, delay = 0, durationMs = 700, className }: { children: React.ReactNode; delay?: number; durationMs?: number; className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setShown(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { rootMargin: "0px 0px -10% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={cn("transition-[opacity,transform] ease-[cubic-bezier(0.16,1,0.3,1)]", shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0", className)}
      style={{ transitionDelay: `${delay}ms`, transitionDuration: `${durationMs}ms` }}
    >
      {children}
    </div>
  );
}
import { cn } from "@/lib/utils";

/**
 * بارش شهاب (کپی رجیستری animations/meteors از MCP زندهٔ وایب‌فارسی).
 * رگه‌های نوری از بالا-راست به پایین-چپ؛ داخل جعبهٔ `relative overflow-hidden`
 * قرار می‌گیرد. کی‌فریم `meteor` در globals.css است.
 */
export function Meteors({ count = 12, once = false, className }: { count?: number; once?: boolean; className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {Array.from({ length: count }, (_, i) => {
        const left = ((i * 53) % 100) + "%";
        const delay = ((i * 37) % 60) / 10;
        const duration = 3 + ((i * 17) % 40) / 10;
        return (
          <span
            key={i}
            className="absolute top-[-10%] h-px w-24 bg-gradient-to-r from-transparent via-foreground/60 to-foreground"
            style={{ left, animation: `meteor ${duration}s linear ${delay}s ${once ? 1 : "infinite"}` }}
          >
            <span className="absolute -end-0.5 -top-0.5 size-1 rounded-full bg-foreground shadow-[0_0_8px_2px_oklch(from_var(--foreground)_l_c_h/40%)]" />
          </span>
        );
      })}
    </div>
  );
}

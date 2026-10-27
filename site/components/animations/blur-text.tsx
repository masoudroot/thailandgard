import { cn } from "@/lib/utils";

/** ظهور تار. Each word fades in from a blur, right to left. Needs the `blur-in` keyframes.
 * ریشه کلاس `blur-text` دارد تا قانون reduced-motion در globals.css واقعاً اعمال شود. */
export function BlurText({ text, delay = 120, durationMs = 900, className }: { text: string; delay?: number; durationMs?: number; className?: string }) {
  return (
    <span className={cn("blur-text inline", className)}>
      {/* Q3-06: aria-label روی span بی‌نقش مجاز نیست (خطای axe aria-prohibited-attr).
          متن کامل در یک گرهٔ sr-only می‌آید و کلمه‌های متحرک از درخت دسترس‌پذیری
          بیرون می‌مانند؛ صفحه‌خوان یک‌بار و کامل متن تیتر را می‌خواند. */}
      <span className="sr-only">{text}</span>
      {text.split(" ").map((w, i) => (
        <span key={i} aria-hidden className="inline-block" style={{ animation: `blur-in ${durationMs}ms cubic-bezier(0.16,1,0.3,1) ${i * delay}ms both` }}>
          {w}&nbsp;
        </span>
      ))}
    </span>
  );
}
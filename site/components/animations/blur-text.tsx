import { cn } from "@/lib/utils";

/** ظهور تار. Each word fades in from a blur, right to left. Needs the `blur-in` keyframes.
 * ریشه کلاس `blur-text` دارد تا قانون reduced-motion در globals.css واقعاً اعمال شود. */
export function BlurText({ text, delay = 120, durationMs = 900, className }: { text: string; delay?: number; durationMs?: number; className?: string }) {
  return (
    <span className={cn("blur-text inline", className)} aria-label={text}>
      {text.split(" ").map((w, i) => (
        <span key={i} aria-hidden className="inline-block" style={{ animation: `blur-in ${durationMs}ms cubic-bezier(0.16,1,0.3,1) ${i * delay}ms both` }}>
          {w}&nbsp;
        </span>
      ))}
    </span>
  );
}
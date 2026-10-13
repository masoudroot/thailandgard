import { Headset, MessagesSquare, ReceiptText } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * نوار اعتماد «چرا تایلندگرد» (اسپک `agents/design/SPECS/trust-strip-exec-2026-10-13-12.md` §۲).
 * نزدیک‌ترین آیتم رجیستری: `blocks/features` (فایل `site/components/blocks/features.tsx`
 * بایت‌به‌بایت از رجیستری می‌ماند). تنها انحراف واقعی (DEVIATIONS.md بستهٔ ۱۲):
 * حذف کاشی آیکون آیتم ← آیکون خطی سادهٔ مونوکروم (`size-5`، `strokeWidth={1}`).
 * سه قلم دیگر اسپک انحراف نیستند (قانون‌های ۶ و ۸ و «تنظیم تراکم پدینگ»): حذف
 * سربرگ (فیلد اختیاری)، فشردگی عمودی، گزاره در جای title.
 * حکم ۵۷ design-ir: هر سه گزارهٔ زیر موقت‌اند (جهت‌های design-ir)؛ بازنویسی نهایی
 * با تیم برند. حکم ۵۸: تیم برند در بازنویسی، هم‌پوشانی عبارتی با سکشن موجود
 * «چرا تایلندگرد» را چک کند.
 */
const ITEMS = [
  { icon: ReceiptText, text: "قیمت روراست؛ بدون خرج اضافه" },
  { icon: MessagesSquare, text: "اول حرف می‌زنیم، بعد می‌فروشیم" },
  { icon: Headset, text: "توی سفر تنها نیستید؛ هم‌زبان کنارتان هست." },
];

export function TrustStrip({ className }: { className?: string }) {
  return (
    <section aria-label="چرا تایلندگرد" className={cn("border-y border-border bg-card", className)}>
      <ul className="mx-auto grid max-w-6xl grid-cols-1 gap-px bg-border sm:grid-cols-3">
        {ITEMS.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-3 bg-card px-6 py-5">
            <Icon className="size-5 shrink-0 text-foreground" strokeWidth={1} aria-hidden />
            <span className="text-sm font-medium text-foreground">{text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

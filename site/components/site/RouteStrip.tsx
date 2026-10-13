import { ArrowLeft } from "lucide-react";
import { cn, fa } from "@/lib/utils";

/**
 * نوار افقی مسیر تور ترکیبی (§۶ اسپک s002-s095-bodyimg-exec-2026-10-13-06؛
 * هندآف design اجرای ۰۸، ۲۱ مهر ۱۴۰۵).
 *
 * حکم artdir (ruling-route-strip-horizontal-2026-10-13-08): افقی، راست‌به‌چپ،
 * در هر دو برک‌پوینت؛ موبایل همان نوار با اسکرول افقی و snap (نه چیدمان
 * عمودی جایگزین).
 *
 * حکم ۳۴ design-ir (لازم‌الاجرا، تکمیلی حکم ۲۹):
 * ۱. ترتیب DOM = ترتیب خوانش: گرهٔ اول «تهران؛ آغاز سفر»، آخر «تهران؛ بازگشت»؛
 *    کانتینر dir="rtl"؛ چیدمان فقط با CSS برعکس نشده.
 * ۲. جهت پیش‌رو به سمت چپ: پیکان اتصال بین ایستگاه‌ها رو به چپ (←).
 * ۳. پرشدن نشانگر پیشرفت از راست به چپ (خواص منطقی inline-start، نه left).
 * ۴. مبدأ اسکرول موبایل روی راست‌ترین ایستگاه قفل است (snap-start روی
 *    ایستگاه اول = inline-start در RTL).
 *
 * مبنا: نزدیک‌ترین آیتم رجیستری components/timeline با انحراف ثبت‌شده
 * (عمودی ← افقی)؛ نقطه‌ها ۸px کهربایی (bg-brand)، خط مویی ۱px پیوسته،
 * الگوی activeIndex (ایستگاه مبدأ = فعال).
 *
 * ایستگاه‌ها کلیک‌پذیرند و با اسکرول نرم به روز متناظر بخش «برنامهٔ
 * روزبه‌روز» (#acc-day-N؛ آکاردئون id را با پیشوند acc- می‌سازد) می‌روند؛ تا وقتی tour_days برای این تور در DB نیست،
 * ایستگاه لینک نمی‌شود (span) تا کنترل مرده ساخته نشود؛ با نشستن داده،
 * لینک‌ها خودکار فعال می‌شوند.
 */
export interface RouteStation {
  /** برچسب ایستگاه؛ فقط نام مقصد + شب با ارقام فارسی، بدون صفت (قید برند) */
  label: string;
  /** شمارهٔ روزی که ایستگاه به آن می‌پرد (۱-based) */
  day: number;
}

const STATIONS: RouteStation[] = [
  { label: "تهران؛ آغاز سفر", day: 1 },
  { label: "بانکوک، ۳ شب", day: 1 },
  { label: "پوکت، ۴ شب", day: 4 },
  { label: "تهران؛ بازگشت", day: 8 },
];

export function RouteStrip({ dayCount = 0 }: { dayCount?: number }) {
  // الگوی activeIndex آیتم رجیستری: ایستگاه مبدأ (آغاز سفر) فعال است؛
  // بقیه پیش‌رو. پرشدن خط از inline-start (راست در RTL) تا ایستگاه فعال.
  const activeIndex = 0;
  return (
    <div dir="rtl" className="snap-x overflow-x-auto pb-2 md:overflow-visible">
      <div className="relative min-w-max px-2 md:min-w-0 md:px-14">
        {/* خط مویی ۱px پیوسته (توکن border، هرگز کهربایی) */}
        <div aria-hidden className="absolute inset-x-2 top-1 h-px bg-border md:inset-x-14" />
        {/* پرشدن پیشرفت از راست به چپ: مبدأ inline-start، منطقی نه فیزیکی */}
        <div
          aria-hidden
          className="absolute top-1 h-px bg-brand/60"
          style={{ insetInlineStart: "0.5rem", width: "12%" }}
        />
        <ol className="relative flex items-start md:justify-between">
          {STATIONS.map((st, i) => {
            const isActive = i <= activeIndex;
            const hasTarget = st.day >= 1 && st.day <= dayCount;
            const station = (
              <span className="flex flex-col items-center">
                <span
                  aria-hidden
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    isActive ? "bg-brand" : "bg-muted-foreground/40",
                  )}
                />
                <span className="mt-3 whitespace-nowrap text-sm font-semibold tabular-nums">
                  {st.label}
                </span>
              </span>
            );
            return (
              <li key={st.label} className="flex snap-start items-start">
                {hasTarget ? (
                  <a
                    href={`#acc-day-${st.day}`}
                    className="rounded-control px-1 py-1 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand"
                    aria-label={`${st.label}؛ پرش به روز ${fa(st.day)} برنامهٔ سفر`}
                  >
                    {station}
                  </a>
                ) : (
                  <span className="cursor-default px-1 py-1">{station}</span>
                )}
                {/* پیکان اتصال رو به چپ (جهت پیش‌رو در RTL)؛ بعد از آخرین ایستگاه نیست.
                    در فلکس RTL، عنصر دوم سمت چپ می‌نشیند؛ پس پیکان بین این ایستگاه
                    و بعدی است و به سمت چپ (ایستگاه بعد) اشاره می‌کند. */}
                {i < STATIONS.length - 1 && (
                  <ArrowLeft
                    aria-hidden
                    className="size-4 shrink-0 self-start text-muted-foreground/60"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

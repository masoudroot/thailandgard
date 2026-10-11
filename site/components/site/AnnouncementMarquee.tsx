import { Marquee } from "@/components/animations/marquee";
import { fa } from "@/lib/utils";

/**
 * نوار اعلان سراسری بالای نوبار (بریف ۱ artdir، ساعت ۱۴).
 * ایمپورت واقعی آیتم animations/marquee؛ پیام‌ها اطلاع‌اند (رجیستر خنثی، بدون «شما»).
 * متن نهایی پیام‌ها و تاریخ‌مصرفشان با تیم محتواست (ورودی باز هندآف).
 */
const MESSAGES: string[] = [
  `جشنوارهٔ گیاه‌خواران پوکت؛ رژهٔ بزرگ ${fa(16)} اکتبر، مراسم وداع ${fa(18)} اکتبر`,
  "پوکت در نیمهٔ دوم اکتبر؛ پایان باران",
  `مالیات ${fa(450)} بات ورود؛ پیشنهاد است، هنوز اجرا نشده`,
];

export function AnnouncementMarquee() {
  return (
    <div
      data-marquee-track
      className="max-h-9 overflow-hidden border-b border-border bg-background text-xs text-muted-foreground"
    >
      <Marquee duration={36}>
        {MESSAGES.map((m) => (
          <span key={m} className="inline-flex items-center gap-4">
            <span>{m}</span>
            <span aria-hidden="true">·</span>
          </span>
        ))}
      </Marquee>
    </div>
  );
}

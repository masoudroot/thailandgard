import { Marquee } from "@/components/animations/marquee";
import { fa } from "@/lib/utils";

/**
 * نوار اعلان سراسری بالای نوبار (بریف ۱ artdir، ساعت ۱۴).
 * ایمپورت واقعی آیتم animations/marquee؛ پیام‌ها اطلاع‌اند (رجیستر خنثی، بدون «شما»).
 * متن نهایی پیام‌ها و تاریخ‌مصرفشان با تیم محتواست (ورودی باز هندآف).
 */
const MESSAGES: string[] = [
  // تاریخ‌مصرف: پایان مهر
  "نیمهٔ دوم مهر در پوکت؛ پایان فصل بارانی",
  // بدون تاریخ‌مصرف ثابت؛ هر وقت وضعیتش عوض شد همان نوبت به‌روز می‌شود
  `مالیات ورود ${fa(450)} بات تایلند؛ فعلاً فقط پیشنهاد است، اجرا نشده`,
];

export function AnnouncementMarquee() {
  return (
    <div
      data-marquee-track
      className="min-h-9 overflow-hidden border-b border-border bg-background text-sm text-muted-foreground"
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

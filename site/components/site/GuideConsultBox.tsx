import { BadgeCheck, HeartHandshake, Info } from "lucide-react";
import { CallbackForm } from "@/components/site/CallbackForm";

/**
 * باکس مشاورهٔ میانی راهنما (سکشن ۴ وایرفریم).
 * بعد از بخش اصلی بدنه می‌آید، نه اول متن. فرم کوتاه همان CallbackForm
 * ثبت‌شده است (نام + موبایل + زمان ترجیحی تماس).
 */
export function GuideConsultBox({
  contactName,
  phoneDisplay,
  phoneHref,
}: {
  /** نام کارشناس مقصد؛ از تنظیمات سایت (پایگاه داده) می‌آید */
  contactName: string;
  /** شمارهٔ نمایشی تماس؛ از تنظیمات سایت */
  phoneDisplay: string;
  /** لینک tel: همان شماره؛ از تنظیمات سایت */
  phoneHref: string;
}) {
  return (
    <section
      id="consult"
      aria-labelledby="guide-consult-title"
      className="mt-10 scroll-mt-24 rounded-surface border-2 border-brand/50 bg-card p-6 sm:p-8"
    >
      <h2 id="guide-consult-title" className="text-balance text-2xl sm:text-3xl">
        درخواست مشاورهٔ رایگان
      </h2>
      <p className="text-pretty mt-3 leading-[1.9] text-foreground/85">
        اگر جواب سؤالتان را در همین بخش پیدا نکردید، نام و شماره‌تان را بگذارید؛
        کارشناس مقصد زنگ می‌زند و دقیقاً برای سفر خودتان راهنمایی‌تان می‌کند.
      </p>
      {/* قول برند (وایرفریم): اطلاعات کاربردی + مشاورهٔ انسانی + قیمت شفاف */}
      <ul className="mt-4 flex flex-wrap gap-2 text-sm">
        {[
          { icon: Info, label: "اطلاعات کاربردی" },
          { icon: HeartHandshake, label: "مشاورهٔ انسانی" },
          { icon: BadgeCheck, label: "قیمت شفاف" },
        ].map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-accent-foreground"
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <CallbackForm contactName={contactName} />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        ترجیح می‌دهید خودتان زنگ بزنید؟{" "}
        <a
          href={phoneHref}
          dir="ltr"
          className="rounded-sm underline decoration-brand/60 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-brand focus-visible:bg-accent"
        >
          {phoneDisplay}
        </a>
      </p>
    </section>
  );
}

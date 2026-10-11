#!/usr/bin/env python3
"""ادامهٔ دیف‌های ۱۸:۳۵ از نقطهٔ توقف (MobileOctoberBar) به بعد."""
import sys

SITE = "/home/hatch/workspace/thailandgard/site"

EDITS = [
    ("components/site/MobileOctoberBar.tsx",
     """          <a href={phoneHref}>
            <Phone />
            تماس فوری
          </a>""",
     """          <a href={phoneHref}>
            <Phone />
            تماس با کارشناس
          </a>""", 1),
    ("components/site/MobileOctoberBar.tsx",
     ' * «تومان» و «هر نفر»، هرگز حذف نمی‌شوند) + دو CTA («تماس فوری» فیل اول،',
     ' * «تومان» و «هر نفر»، هرگز حذف نمی‌شوند) + دو CTA («تماس با کارشناس» فیل اول،', 1),
    ("components/blocks/pillar-hero.tsx",
     '<a href="#callback">درخواست مشاوره</a>',
     '<a href="#callback">درخواست تماس</a>', 1),
    ("app/tours/[slug]/page.tsx",
     """<a href={s.PHONE_MOBILE_LINK}>
              <Phone />
              تماس با کارشناس
            </a>""",
     """<a href={s.PHONE_MOBILE_LINK}>
              <Phone />
              تماس با کارشناس فروش
            </a>""", 1),
    ("app/tours/[slug]/page.tsx",
     """<a href={s.PHONE_MOBILE_LINK}>
              <Phone />
              تماس
            </a>""",
     """<a href={s.PHONE_MOBILE_LINK}>
              <Phone />
              تماس با کارشناس فروش
            </a>""", 1),
    ("components/site/TourBanner.tsx",
     "تماس با کارشناس",
     "تماس با کارشناس فروش", 1),
    ("components/blocks/pillar-hero.tsx",
     "تماس با کارشناس",
     "تماس با کارشناس فروش", 1),
    ("components/site/CallButtons.tsx",
     "تماس با {CONTACT_NAME}",
     "تماس با کارشناس فروش", 1),
    ("components/blocks/cta.tsx",
     'action = "شروع کنید"',
     'action = "تماس با کارشناس فروش"', 1),
    ("app/tours/[slug]/page.tsx",
     "<CardDescription>شماره‌تان را بگذارید؛ در بازه‌ای که می‌گویید با شما تماس می‌گیریم.</CardDescription>",
     "<CardDescription>شماره‌تان را وارد کنید؛ در بازه‌ای که می‌گویید با شما تماس می‌گیریم.</CardDescription>", 1),
    ("app/layout.tsx",
     'primary={{ label: `تماس با ${s.CONTACT_NAME}`, href: s.PHONE_MOBILE_LINK }}',
     'primary={{ label: "تماس با کارشناس فروش", href: s.PHONE_MOBILE_LINK }}', 1),
    ("components/blocks/navbar.tsx",
     'primary = { label: "شروع رایگان" }, secondary = { label: "ورود" }',
     'primary = { label: "تماس با کارشناس فروش" }, secondary = { label: "درخواست تماس" }', 1),
    ("components/blocks/hero.tsx",
     'primary = { label: "اقدام اصلی" }, secondary = { label: "مشاهدهٔ بیشتر" }',
     'primary = { label: "تماس با کارشناس فروش" }, secondary = { label: "مشاهدهٔ جزئیات تور" }', 1),
    ("components/blocks/contact.tsx",
     '{sent ? "پیام ثبت شد" : busy ? "در حال ارسال…" : "ارسال پیام"}',
     '{sent ? "درخواستتان ثبت شد" : busy ? "در حال ارسال…" : "ثبت درخواست تماس"}', 1),
    ("components/site/CallbackForm.tsx",
     "در حال ثبت…",
     "در حال ارسال…", 1),
    ("lib/lead-alert.ts",
     """ * سه مرحلهٔ UI (فقط برای وضعیت new):
 * - تازه: سن زیر ۳۰ دقیقه (اولویت زیر ۱۵ دقیقه)
 * - در مسیر: از ۳ ساعت تا سررسید ۶ ساعته؛ در ۴٫۵ ساعت فقط ساعت باقی‌مانده به‌روز می‌شود
 * - گذشته: سن بیش از ۶ ساعت""",
     """ * سه مرحلهٔ UI (فقط برای وضعیت new):
 * - تازه: سن زیر ۳۰ دقیقه (اولویت زیر ۱۵ دقیقه)
 * - در مسیر: از ۳۰ دقیقه تا سررسید ۶ ساعته؛ در ۴٫۵ ساعت فقط ساعت باقی‌مانده به‌روز می‌شود
 * - گذشته: سن بیش از ۶ ساعت
 *
 * تغییر ۱۹ مهر ۱۴۰۵ (یافتهٔ تیم lead، دستور هماهنگ‌کننده): بازهٔ ۳۰ دقیقه تا ۳ ساعت
 * دیگر از فهرست نمی‌افتد؛ «در مسیر» همان متن طراحی (تا ساعت سررسید فرصت دارید) را
 * برای کل بازه نشان می‌دهد. انحراف آگاهانه از حکم چیدمان ۱۷ design (ظهور از ۳ ساعت).""", 1),
    ("lib/lead-alert.ts",
     """/** شروع مرحلهٔ «در مسیر»: ۳ ساعت (۵۰٪ مسیر SLA) */
export const LEAD_ENROUTE_FROM_MS = 3 * 3600_000;
""",
     "", 1),
    ("lib/lead-alert.ts",
     """/** مرحلهٔ هشدار از روی سن لید؛ برای پنجرهٔ ۳۰ دقیقه تا ۳ ساعت null (ردیفی نیست). */
export function stageForAge(ageMs: number): LeadAlertStage | null {
  if (!Number.isFinite(ageMs) || ageMs < 0) return null;
  if (ageMs < LEAD_FRESH_MS) return "fresh";
  if (ageMs < LEAD_ENROUTE_FROM_MS) return null;
  if (ageMs <= LEAD_SLA_MS) return "enroute";
  return "past";
}""",
     """/** مرحلهٔ هشدار از روی سن لید؛ فقط برای سن نامعتبر null (ردیفی نیست). */
export function stageForAge(ageMs: number): LeadAlertStage | null {
  if (!Number.isFinite(ageMs) || ageMs < 0) return null;
  if (ageMs < LEAD_FRESH_MS) return "fresh";
  if (ageMs <= LEAD_SLA_MS) return "enroute";
  return "past";
}""", 1),
]

failures = []
for rel, old, new, expected in EDITS:
    path = f"{SITE}/{rel}"
    with open(path, encoding="utf-8") as f:
        src = f.read()
    n = src.count(old)
    if n != expected:
        failures.append(f"{rel}: یافت شد {n} بار، انتظار {expected}")
        continue
    src = src.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(src)

if failures:
    print("خطاها:")
    for f in failures:
        print(" -", f)
    sys.exit(1)
print("باقی‌ماندهٔ دیف‌ها اعمال شد.")

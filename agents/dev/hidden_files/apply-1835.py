#!/usr/bin/env python3
"""اعمال دیف‌های اجرای ۱۸:۳۵ توسط تیم dev — ۱۹ مهر ۱۴۰۵.
هر جایگزینی باید دقیقاً به تعداد موردانتظار پیدا شود، وگرنه خطا و توقف.
"""
import sys

SITE = "/home/hatch/workspace/thailandgard/site"

EDITS = [
    # ---------- ۱) F-003: text-success -> text-success-text ----------
    ("app/tours/[slug]/page.tsx",
     '<Check className="mt-1 size-5 shrink-0 text-success" />',
     '<Check className="mt-1 size-5 shrink-0 text-success-text" />', 1),
    ("app/tours/[slug]/page.tsx",
     '<Check className="mt-0.5 size-5 shrink-0 text-success" />',
     '<Check className="mt-0.5 size-5 shrink-0 text-success-text" />', 1),
    ("components/ui/phone-input.tsx",
     '{valid && <Check className="size-4 text-success" />}',
     '{valid && <Check className="size-4 text-success-text" />}', 1),

    # ---------- ۲) دیف B تایپو — الف ----------
    ("app/phuket-october/page.tsx",
     '<h1 className="mt-5 font-display text-4xl font-bold leading-tight">',
     '<h1 className="mt-5 font-display text-4xl">', 1),
    ("components/site/OctoberBanner.tsx",
     '<h1 className="mt-3 font-display text-4xl font-bold leading-tight sm:text-5xl">',
     '<h1 className="mt-3 font-display text-4xl sm:text-5xl">', 1),

    # ---------- ب: leading-8 بدنه ----------
    ("app/guide/[slug]/page.tsx",
     '<p key={i} className="leading-8 text-foreground/90">',
     '<p key={i} className="leading-[1.9] text-foreground/90">', 1),
    ("app/guide/[slug]/page.tsx",
     '<p className="mt-3 leading-8 text-foreground/90">',
     '<p className="mt-3 leading-[1.9] text-foreground/90">', 1),
    ("app/guide/page.tsx",
     '<p className="mt-4 text-base leading-8 text-muted-foreground">',
     '<p className="mt-4 text-base leading-[1.8] text-muted-foreground">', 1),
    ("app/contact/page.tsx",
     '<p className="mt-4 text-base leading-8 text-muted-foreground">',
     '<p className="mt-4 text-base leading-[1.8] text-muted-foreground">', 1),
    ("app/tours/[slug]/page.tsx",
     '<p className="leading-8 text-foreground/90">',
     '<p className="leading-[1.8] text-foreground/90">', 1),
    ("app/tours/page.tsx",
     '<p className="leading-8 text-muted-foreground">',
     '<p className="leading-[1.8] text-muted-foreground">', 1),
    ("app/phuket-october/page.tsx",
     '<p className="mx-auto mt-5 max-w-xl leading-8 text-muted-foreground">',
     '<p className="mx-auto mt-5 max-w-xl leading-[1.8] text-muted-foreground">', 1),
    ("components/site/TourBanner.tsx",
     '<p className="max-w-2xl text-base leading-8">{tour.summary}</p>',
     '<p className="max-w-2xl text-base leading-[1.8]">{tour.summary}</p>', 1),
    ("components/site/OctoberBanner.tsx",
     '<p className="mx-auto mt-4 max-w-xl leading-8 text-muted-foreground">',
     '<p className="mx-auto mt-4 max-w-xl leading-[1.8] text-muted-foreground">', 1),

    # ---------- ج: leading-8 روی تیتر (حذف) ----------
    ("app/guide/page.tsx",
     '<CardTitle className="mt-2 text-xl leading-8">{guide.title}</CardTitle>',
     '<CardTitle className="mt-2 text-xl">{guide.title}</CardTitle>', 1),
    ("app/page.tsx",
     '<CardTitle className="mt-3 text-xl leading-8">',
     '<CardTitle className="mt-3 text-xl">', 1),
    ("components/site/TourCard.tsx",
     '<CardTitle className="mt-3 text-xl leading-8">{tour.title}</CardTitle>',
     '<CardTitle className="mt-3 text-xl">{tour.title}</CardTitle>', 1),
    ("app/phuket-october/page.tsx",
     '<h3 className="text-lg font-bold leading-8">{c.title}</h3>',
     '<h3 className="text-lg">{c.title}</h3>', 1),

    # ---------- د: error.tsx ----------
    ("app/error.tsx",
     '<p className="font-display text-7xl font-bold tabular-nums text-foreground/15 sm:text-8xl">۵۰۰</p>',
     '<p className="font-display text-7xl tabular-nums text-foreground/15 sm:text-8xl">۵۰۰</p>', 1),

    # ---------- تیترهای جاافتاده از grep (معیار پذیرش: grep خالی) ----------
    ("app/guide/[slug]/page.tsx",
     '<h1 className="mt-4 text-4xl leading-snug">{guide.title}</h1>',
     '<h1 className="mt-4 text-4xl">{guide.title}</h1>', 1),
    ("app/guide/page.tsx",
     '<h1 className="mt-3 text-4xl leading-tight">راهنمای سفر تایلند</h1>',
     '<h1 className="mt-3 text-4xl">راهنمای سفر تایلند</h1>', 1),
    ("app/contact/page.tsx",
     '<h1 className="mt-3 text-4xl leading-tight">تماس با تایلندگرد</h1>',
     '<h1 className="mt-3 text-4xl">تماس با تایلندگرد</h1>', 1),
    ("app/tours/[slug]/page.tsx",
     '<h1 className="text-4xl leading-tight">{tour.title}</h1>',
     '<h1 className="text-4xl">{tour.title}</h1>', 1),
    ("app/tours/page.tsx",
     '<h1 className="text-3xl md:text-4xl leading-tight">تورهای تایلند</h1>',
     '<h1 className="text-3xl md:text-4xl">تورهای تایلند</h1>', 1),
    ("components/blocks/hero.tsx",
     '<h1 className="mt-5 text-4xl leading-tight sm:text-5xl">{title}</h1>',
     '<h1 className="mt-5 text-4xl sm:text-5xl">{title}</h1>', 1),
    ("components/blocks/pillar-hero.tsx",
     '<h1 className="mt-5 text-4xl leading-tight sm:text-5xl">{title}</h1>',
     '<h1 className="mt-5 text-4xl sm:text-5xl">{title}</h1>', 1),
    ("components/site/TourBanner.tsx",
     'className="font-display text-3xl font-bold leading-snug sm:text-4xl"',
     'className="font-display text-3xl sm:text-4xl"', 1),
    # stat.tsx: عدد کلیدی نمایشی؛ نزدیک‌ترین نقش «تیتر» (۱٫۳۵) — قضاوت dev، ثبت در گزارش
    ("components/ui/stat.tsx",
     '<p className={cn("min-w-0 font-bold leading-tight wrap-break-word"',
     '<p className={cn("min-w-0 font-bold leading-[1.35] wrap-break-word"', 1),

    # ---------- P8: حذف font-bold دستی از تیترها (الگوی سراسری روی h2ها) ----------
    # (۱۴ رخداد، همه روی h2 — با grep راستی‌آزمایی شد)
    # ---------- P8 تکی ----------
    ("components/blocks/steps-block.tsx",
     '{title && <h2 className="mt-2 text-3xl font-bold">{title}</h2>}',
     '{title && <h2 className="mt-2 text-3xl">{title}</h2>}', 1),
    ("components/blocks/contact.tsx",
     '<h2 className="text-3xl font-bold">{title}</h2>',
     '<h2 className="text-3xl">{title}</h2>', 1),
    ("components/blocks/cta.tsx",
     '<h2 className="text-3xl font-bold sm:text-4xl">{title}</h2>',
     '<h2 className="text-3xl sm:text-4xl">{title}</h2>', 1),
    ("app/not-found.tsx",
     '<p className="font-display text-7xl font-bold tabular-nums text-foreground/15 sm:text-8xl">۴۰۴</p>',
     '<p className="font-display text-7xl tabular-nums text-foreground/15 sm:text-8xl">۴۰۴</p>', 1),
    # (site/app/page.tsx:106 با الگوی سراسری پایین پوشش داده می‌شود)

    # ---------- ۳) پولیش تم: P1 و P2 ----------
    ("app/globals.css",
     "  --ring: oklch(0.72 0.15 65);",
     "  --ring: oklch(0.72 0.15 62);", 1),
    ("app/globals.css",
     "  --accent: oklch(0.925 0.012 80);",
     "  --accent: oklch(0.925 0.012 90);", 1),

    # ---------- P3: حذف هالهٔ رادیال cta ----------
    ("components/blocks/cta.tsx",
     '        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(60% 80% at 50% 0%, oklch(from var(--brand) l c h / 22%), transparent 70%)" }} />\n',
     '', 1),
    ("components/blocks/cta.tsx",
     " * فراخوان پایانی. A warm banner with one action; gradient comes from the brand token.",
     " * فراخوان پایانی. A warm banner with one action; flat per حکم ۳ artdir (no radial halo, no pattern).", 1),

    # ---------- P4: حذف پترن نقطه‌ای error و ۴۰۴ ----------
    ("app/error.tsx",
     '      <div\n        aria-hidden\n        className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_65%)]"\n        style={{ backgroundImage: "repeating-radial-gradient(circle at 50% 50%, oklch(from var(--foreground) l c h / 14%) 0 1px, transparent 1px 26px)" }}\n      />\n',
     '', 1),
    ("app/not-found.tsx",
     '      <div\n        aria-hidden\n        className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_65%)]"\n        style={{ backgroundImage: "repeating-radial-gradient(circle at 50% 50%, oklch(from var(--foreground) l c h / 14%) 0 1px, transparent 1px 26px)" }}\n      />\n',
     '', 1),

    # ---------- P5: شبکهٔ گرادیانی contact -> سطح تخت + لبهٔ مویی ----------
    ("components/blocks/contact.tsx",
     '{map ?? <div aria-hidden className="size-full" style={{ backgroundImage: "linear-gradient(to right, oklch(from var(--foreground) l c h / 8%) 1px, transparent 1px), linear-gradient(to bottom, oklch(from var(--foreground) l c h / 8%) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />}',
     '{map ?? <div aria-hidden className="size-full border-b border-border" />}', 1),

    # ---------- P6: روتیتر steps-block -> پل مصوب ----------
    ("components/blocks/steps-block.tsx",
     '{eyebrow && <p className="text-sm font-semibold text-brand">{eyebrow}</p>}',
     '{eyebrow && <p className="inline-flex items-center gap-2 rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-brand-foreground">{eyebrow}</p>}', 1),

    # ---------- P7: حذف shadow-sm دایرهٔ مراحل ----------
    ("components/blocks/steps-block.tsx",
     'className="flex size-12 items-center justify-center rounded-full border border-border bg-card text-lg font-bold tabular-nums shadow-sm"',
     'className="flex size-12 items-center justify-center rounded-full border border-border bg-card text-lg font-bold tabular-nums"', 1),

    # ---------- ۵) CTA ممیزی: A1 ----------
    ("components/site/MobileOctoberBar.tsx",
     "تماس فوری",
     "تماس با کارشناس", 1),
    ("components/site/MobileOctoberBar.tsx",
     " * env(safe-area-inset-bottom)؛ فقط سه چیز: قیمت «شروع از» (ارقام فارسی +\n * «تومان» و «هر نفر»، هرگز حذف نمی‌شوند) + دو CTA («تماس فوری» فیل اول،",
     " * env(safe-area-inset-bottom)؛ فقط سه چیز: قیمت «شروع از» (ارقام فارسی +\n * «تومان» و «هر نفر»، هرگز حذف نمی‌شوند) + دو CTA («تماس با کارشناس» فیل اول،", 1),

    # ---------- A2 ----------
    ("components/blocks/pillar-hero.tsx",
     '<a href="#callback">درخواست مشاوره</a>',
     '<a href="#callback">درخواست تماس</a>', 1),

    # ---------- A3: یکدست‌سازی «تماس با کارشناس فروش» ----------
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

    # ---------- A4 ----------
    ("components/blocks/cta.tsx",
     'action = "شروع کنید"',
     'action = "تماس با کارشناس فروش"', 1),

    # ---------- B1 ----------
    ("app/tours/[slug]/page.tsx",
     "<CardDescription>شماره‌تان را بگذارید؛ در بازه‌ای که می‌گویید با شما تماس می‌گیریم.</CardDescription>",
     "<CardDescription>شماره‌تان را وارد کنید؛ در بازه‌ای که می‌گویید با شما تماس می‌گیریم.</CardDescription>", 1),

    # ---------- D1 (ناوبری؛ وتوی مستندی از artdir/design ثبت نشده) ----------
    ("app/layout.tsx",
     'primary={{ label: `تماس با ${s.CONTACT_NAME}`, href: s.PHONE_MOBILE_LINK }}',
     'primary={{ label: "تماس با کارشناس فروش", href: s.PHONE_MOBILE_LINK }}', 1),

    # ---------- D2 ----------
    ("components/blocks/navbar.tsx",
     'primary = { label: "شروع رایگان" }, secondary = { label: "ورود" }',
     'primary = { label: "تماس با کارشناس فروش" }, secondary = { label: "درخواست تماس" }', 1),

    # ---------- D3 ----------
    ("components/blocks/hero.tsx",
     'primary = { label: "اقدام اصلی" }, secondary = { label: "مشاهدهٔ بیشتر" }',
     'primary = { label: "تماس با کارشناس فروش" }, secondary = { label: "مشاهدهٔ جزئیات تور" }', 1),

    # ---------- D4 ----------
    ("components/blocks/contact.tsx",
     '{sent ? "پیام ثبت شد" : busy ? "در حال ارسال…" : "ارسال پیام"}',
     '{sent ? "درخواستتان ثبت شد" : busy ? "در حال ارسال…" : "ثبت درخواست تماس"}', 1),

    # ---------- D5 ----------
    ("components/site/CallbackForm.tsx",
     "در حال ثبت…",
     "در حال ارسال…", 1),

    # ---------- ۷) یافتهٔ lead: حذف بازهٔ ۳۰دقیقه–۳ساعت ----------
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

# جایگزینی سراسری font-bold روی h2ها (الگوی یکسان، ۱۴ رخداد — همه h2)
GLOBAL_EDITS = [
    ("text-2xl font-bold sm:text-3xl", "text-2xl sm:text-3xl", 14),
]

failures = []
for rel, old, new, expected in EDITS:
    path = f"{SITE}/{rel}"
    with open(path, encoding="utf-8") as f:
        src = f.read()
    n = src.count(old)
    if n != expected:
        failures.append(f"{rel}: «{old[:60]}…» یافت شد {n} بار، انتظار {expected}")
        continue
    src = src.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(src)

# فایل‌های دارای الگوی سراسری
import glob as _glob
for old, new, expected_total in GLOBAL_EDITS:
    total = 0
    for path in _glob.glob(f"{SITE}/app/**/*.tsx", recursive=True) + _glob.glob(f"{SITE}/components/**/*.tsx", recursive=True):
        with open(path, encoding="utf-8") as f:
            src = f.read()
        n = src.count(old)
        if n:
            total += n
            src = src.replace(old, new)
            with open(path, "w", encoding="utf-8") as f:
                f.write(src)
    if total != expected_total:
        failures.append(f"global «{old}»: یافت شد {total} بار، انتظار {expected_total}")

if failures:
    print("خطاها:")
    for f in failures:
        print(" -", f)
    sys.exit(1)
print("همهٔ دیف‌ها اعمال شد.")

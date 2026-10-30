import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Clock, PenLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { ShareButtons } from "@/components/site/ShareButtons";
import { GuideToc, type GuideTocItem } from "@/components/site/GuideToc";
import { GuideConsultBox } from "@/components/site/GuideConsultBox";
import { PillarHero } from "@/components/blocks/pillar-hero";
import { FaqBlock } from "@/components/blocks/faq";
import { StepsBlock, type Step } from "@/components/blocks/steps-block";
import { getGuide, getGuides, getTour, getRelatedLinks, getSiteSettings } from "@/lib/db-content";
import {
  getContentReadMode,
  isVersionedReadSlug,
  compareGuideRenders,
  recordShadowCompare,
} from "@/lib/guide-versioned-read";
import { getVersionedGuideCached } from "@/lib/guide-versioned-read-cached";
import { pageSeo, brandTitle, displayTitle } from "@/lib/og";
import { resolveH1 } from "@/lib/seo-h1";
import { ogImageForSlug } from "@/lib/og-slugs";
import { GUIDE_COVERS } from "@/lib/guide-covers";
import { CoverImage } from "@/components/site/CoverImage";
import { fa } from "@/lib/utils";
import { renderInlineLinks, stripInlineLinkMarkers } from "@/lib/inline-links";
import { renderGuideBlocks } from "@/lib/guide-tables";
import { updatedFaToIso } from "@/lib/jalali";
import type { Guide, GuideSection } from "@/lib/guides";

type PageProps = { params: Promise<{ slug: string }> };

/**
 * R2-B: حالت خواندن، متغیر محیطی زمان بیلد است، نه زمان درخواست: ریشهٔ
 * layout این پروژه ensureStatic = "navigation" دارد (همهٔ مسیرها استاتیک)
 * و هر رندر درخواستی بیلد را قرمز می‌کند، پس خواندن نسخه‌ای فقط از راه
 * پیش‌رندر با "use cache" ممکن است و جابه‌جایی اشاره‌گر بیلد تازه
 * می‌خواهد. در حالت legacy خروجی دقیقاً همان خروجی قبلی است.
 */

/**
 * قدم‌های ویزا (بریف ۲ artdir، ساعت ۱۴)؛ پیش‌نویس طراحی، متن نهایی با تیم محتواست.
 * به‌صورت prop به StepsBlock داده می‌شود تا مالکیت متن با محتوا بماند.
 * TDAC با ایزولهٔ U+2066/U+2069 رندر می‌شود (قانون رشته‌های مختلط design-rules).
 */
const VISA_STEPS: Step[] = [
  {
    title: "مدارک را آماده کنید",
    description: "گذرنامه، عکس، واچر رزرو هتل، بلیت رفت‌وبرگشت و گردش حساب را آماده و باکیفیت اسکن کنید.",
  },
  {
    title: "درخواست را آنلاین ثبت کنید",
    description: "در سامانهٔ آنلاین ویزا حساب بسازید، فرم را تکمیل کنید و مدارک را بارگذاری کنید؛ گذرنامه پیش خودتان می‌ماند.",
  },
  {
    title: "کارت ورود دیجیتال را ثبت کنید",
    description: `در ${fa(72)} ساعت پیش از ورود، \u2066TDAC\u2069 را از درگاه رسمی ثبت کنید و کد QR را ذخیره کنید.`,
  },
  {
    title: "از مهاجرت عبور کنید",
    description: "در فرودگاه از باجهٔ افسر مهاجرت عبور کنید و به سالن برداشت چمدان بروید.",
  },
];

/** بخش «قدم‌به‌قدم» راهنمای ویزا با StepsBlock رندر می‌شود، نه پاراگرافی. */
function isVisaStepsSection(slug: string, heading: string): boolean {
  return slug === "thailand-visa-guide" && heading.includes("قدم‌به‌قدم");
}

/**
 * زمان مطالعه از طول واقعی متن (وایرفریم، سکشن ۱): ~۲۰۰ کلمه در دقیقه.
 * لید + تیترها + پاراگراف‌ها + سؤال‌های متداول.
 */
function readingMinutesOf(guide: Guide): number {
  const parts = [
    guide.excerpt,
    ...guide.sections.flatMap((s) => [s.heading, ...s.paragraphs]),
    ...guide.faqs.flatMap((f) => [f.question, f.answer]),
  ];
  const words = parts.join(" ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

/** رندر یک بخش بدنه با لنگر TOC (وایرفریم، سکشن ۳: زنجیرهٔ تصمیم). */
function renderGuideSection(slug: string, section: GuideSection, index: number) {
  const anchorId = `guide-sec-${index}`;
  if (isVisaStepsSection(slug, section.heading)) {
    return (
      <div key={section.heading} id={anchorId} className="scroll-mt-24">
        <StepsBlock title={section.heading} steps={VISA_STEPS} />
      </div>
    );
  }
  return (
    <section key={section.heading} id={anchorId} className="mt-10 scroll-mt-24">
      <h2 className="text-balance text-2xl sm:text-3xl">{renderInlineLinks(section.heading)}</h2>
      <div className="mt-4 space-y-4">{renderGuideBlocks(section.paragraphs)}</div>
    </section>
  );
}

export async function generateStaticParams() {
  return (await getGuides()).map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  // R2-B: در حالت versioned، متادیتا از نسخهٔ منتشرشده می‌آید؛ نبودن document
  // یا نسخه، خطای صریح می‌دهد و به legacy برنمی‌گردد. در بقیهٔ حالت‌ها،
  // متادیتا از legacy می‌آید (در shadow_compare هم، چون صفحه legacy رندر می‌شود).
  if (isVersionedReadSlug(slug) && getContentReadMode() === "versioned") {
    const [result, s] = await Promise.all([getVersionedGuideCached(slug), getSiteSettings()]);
    const meta = pageSeo({
      title: brandTitle(result.guide.title),
      description: result.guide.excerpt,
      canonical: `/guide/${result.guide.slug}`,
      type: "article",
    });
    const slugOg = ogImageForSlug(s.SITE_URL, slug);
    if (slugOg) {
      meta.openGraph = { ...meta.openGraph, images: [slugOg] };
      meta.twitter = { ...meta.twitter, images: [slugOg.url] };
    }
    return meta;
  }
  // S-001: دو خوانش مستقل موازی‌اند تا روی رندر سرد یک راندتریپ ذخیره شود
  // (هر دو 'use cache' دارند؛ روی کش گرم فرقی نمی‌کند).
  const [guide, s] = await Promise.all([getGuide(slug), getSiteSettings()]);
  if (!guide) return { title: "راهنما پیدا نشد" };
  // قاعدهٔ og.ts: صفحه‌ای که openGraph خودش را دارد باید pageSeo را صدا بزند
  // (یافتهٔ S2 سئو: url و locale و بلوک twitter در همهٔ صفحه‌ها)
  // + نقشهٔ سراسری og (S-003): مثل صفحهٔ تور، اگر فایل اختصاصی بود همان.
  const meta = pageSeo({
    title: brandTitle(guide.title),
    description: guide.excerpt,
    canonical: `/guide/${guide.slug}`,
    type: "article",
  });
  const slugOg = ogImageForSlug(s.SITE_URL, slug);
  if (slugOg) {
    meta.openGraph = { ...meta.openGraph, images: [slugOg] };
    meta.twitter = { ...meta.twitter, images: [slugOg.url] };
  }
  return meta;
}

/**
 * R2-B: راهنما را بر اساس حالت جاری برگردان. در versioned، نبودن document یا
 * نسخه خطا می‌دهد (نه fallback). در shadow_compare، legacy برمی‌گردد و مقایسه
 * ثبت می‌شود؛ نبودن legacy هم ثبت می‌شود و بعد notFound می‌آید.
 */
async function resolveGuideForPage(slug: string): Promise<Guide | undefined> {
  const mode = getContentReadMode();
  if (!isVersionedReadSlug(slug)) return getGuide(slug);
  if (mode === "versioned") {
    const result = await getVersionedGuideCached(slug);
    return result.guide;
  }
  if (mode === "shadow_compare") {
    const legacy = await getGuide(slug);
    if (!legacy) {
      recordShadowCompare({
        slug,
        mode: "shadow_compare",
        available: false,
        error: `legacy guide not found for slug ${slug}`,
      });
      return undefined;
    }
    try {
      const result = await getVersionedGuideCached(slug);
      recordShadowCompare({
        slug,
        mode: "shadow_compare",
        available: true,
        comparison: compareGuideRenders(slug, legacy, result.guide),
        versionId: result.versionId,
        versionNo: result.versionNo,
        contentHash: result.contentHash,
      });
    } catch (error) {
      recordShadowCompare({
        slug,
        mode: "shadow_compare",
        available: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return legacy;
  }
  return getGuide(slug);
}

export default async function GuideDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const guide = await resolveGuideForPage(slug);
  if (!guide) notFound();

  // کاور قاب قهرمان (اسپک mount §۲): اگر نگاشت نداشت، جای‌نگه‌دار
  // تایپوگرافیکِ هم‌شکل (۱۳ راهنمای بدون کاور؛ عکس ناجور ممنوع).
  const guideCover = GUIDE_COVERS[guide.slug];
  const isPillar = guide.slug === "thailand-tour-complete-guide";

  // لینک‌های داخلی به تورهای مرتبط (مشخصات تیم سئومحتوا، نگاشت ۱۹ مهر ۱۴۰۵)
  // S-049 (مصوبهٔ ۱۸:۲۰): تور غیرفعال در «قدم بعدی» نمی‌آید (حذف، نه ریدایرکت).
  const [{ guideToTours, tourToGuides }, s] = await Promise.all([getRelatedLinks(), getSiteSettings()]);
  const relatedBlock = guideToTours[guide.slug];
  const relatedTours = relatedBlock
    ? (
        await Promise.all(relatedBlock.slugs.map((ts) => getTour(ts)))
      ).filter((t): t is NonNullable<typeof t> => t !== undefined && t.active)
    : [];

  // راهنمای خواهر (سکشن ۸ وایرفریم): راهنمایی که به یکی از همین تورهای مرتبط
  // لینک داده؛ از دادهٔ واقعی related_links، نه حدس.
  const sisterSlug = relatedBlock?.slugs
    .flatMap((ts) => tourToGuides[ts]?.slugs ?? [])
    .find((gs) => gs !== guide.slug);
  const sisterGuide = sisterSlug ? await getGuide(sisterSlug) : undefined;

  // بریف تک‌قانونی h1 (الگوی صفحهٔ تور): ترتیب حل در lib/seo-h1.ts است؛
  // ستون h1 دیتابیس، بعد نگاشت H1_OVERRIDES، بعد مشتق‌سازی از title.
  const h1 = resolveH1(guide.slug, guide.title, guide.h1);
  const minutes = readingMinutesOf(guide);

  // جدول محتوا (سکشن ۲ وایرفریم): تیتر بخش‌ها + سؤال‌های متداول.
  // فقط برای مقاله‌های چندبخشی (۴ بخش به بالا).
  const tocItems: GuideTocItem[] = [
    ...guide.sections.map((sec, i) => ({ id: `guide-sec-${i}`, label: stripInlineLinkMarkers(sec.heading) })),
    ...(guide.faqs.length > 0 ? [{ id: "guide-faq", label: "سؤال‌های رایج این راهنما" }] : []),
  ];
  const showToc = guide.sections.length >= 4;

  // باکس مشاورهٔ میانی (سکشن ۴ وایرفریم): بعد از بخش اصلی بدنه، نه اول متن.
  const midPoint = Math.max(1, Math.ceil(guide.sections.length / 2));

  // قانون ۳۷ اسکیما: dateModified از همان رشته‌ای می‌آید که صفحه نمایش می‌دهد
  // (خط «به‌روزرسانی: {guide.updatedFa}»).
  const dateModified = updatedFaToIso(guide.updatedFa);
  // کلاس S-015/S-031: datePublished وقتی ستون guides.published_at آمد خودکار
  // در اسکیما می‌نشیند (سیم‌کشی مدل در db-content.ts)؛ تا آن موقع غایب است.
  // S-045 (کلاس؛ ۲۰ مهر ۱۴۰۵): بلاک FAQPage خالی نویز ساخت‌یافته است؛
  // فقط وقتی راهنما سؤال واقعی دارد در گراف می‌آید.
  const faqBlock =
    guide.faqs.length > 0
      ? [
          {
            "@type": "FAQPage",
            mainEntity: guide.faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: { "@type": "Answer", text: stripInlineLinkMarkers(faq.answer) },
            })),
          },
        ]
      : [];
  // S-113 (حسابرس، ۲۱ مهر ۱۴۰۵): کلید image در اسکیمای Article برای rich result
  // مقاله الزامی است؛ از همان کاور قاب قهرمان (URL مطلق) می‌آید.
  const articleImage = guideCover ? `${s.SITE_URL}${guideCover.src}` : undefined;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: h1,
        description: guide.excerpt,
        inLanguage: "fa",
        url: `${s.SITE_URL}/guide/${guide.slug}`,
        mainEntityOfPage: `${s.SITE_URL}/guide/${guide.slug}`,
        ...(dateModified ? { dateModified } : {}),
        // S-085 (ب): datePublished از ستون guides.published_at می‌آید؛
        // تا وقتی ستون نیست، کلید صادر نمی‌شود.
        ...(guide.publishedAt ? { datePublished: guide.publishedAt } : {}),
        ...(articleImage ? { image: articleImage } : {}),
        author: { "@type": "Organization", name: s.SITE_NAME, url: s.SITE_URL },
        publisher: {
          "@type": "Organization",
          name: `${s.SITE_NAME} (${s.SITE_LATIN})`,
          url: s.SITE_URL,
          telephone: s.PHONE_MOBILE_LINK.replace("tel:", ""),
        },
      },
      ...faqBlock,
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "خانه", item: s.SITE_URL.replace(/\/+$/, "") /* S-005: بدون اسلش انتهایی، هم‌خوان با کنونیکال */ },
          { "@type": "ListItem", position: 2, name: "راهنمای سفر", item: `${s.SITE_URL}/guide` },
          { "@type": "ListItem", position: 3, name: guide.title, item: `${s.SITE_URL}/guide/${guide.slug}` },
        ],
      },
    ],
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* سکشن ۱ وایرفریم: هیروی مقاله */}
      <div className="mx-auto max-w-3xl">
        <Breadcrumb
          items={[
            { label: "خانه", href: "/" },
            { label: "راهنمای سفر", href: "/guide" },
            { label: displayTitle(guide.title) },
          ]}
        />

        {/* قاب قهرمان راهنما (اسپک mount §۲، ۲۰ مهر ۱۴۰۵): یک قاب ۱۶:۱۰ زیر
            Breadcrumb، بالای هدر متنی. بج دسته + h1 روی ماسک؛ متای خوانش و
            excerpt زیر قاب می‌مانند. سئو: فقط یک h1. مورد خاص ستون:
            چون PillarHero خودش h1 دارد، روی قابِ جای‌نگه‌دارش متنی روی
            ماسک نمی‌آید. */}
        <div className="relative mt-6 aspect-[16/10] overflow-hidden rounded-surface border border-border">
          {guideCover ? (
            <CoverImage
              src={guideCover.src}
              alt={guideCover.alt}
              width={guideCover.w}
              height={guideCover.h}
              sizes="(max-width: 768px) 100vw, 768px"
              eager
            />
          ) : (
            // جای‌نگه‌دار هم‌شکل تایپوگرافیک (راهنمای بدون کاور)
            <div className="flex size-full items-center justify-center bg-secondary/50 p-6 text-center">
              <span className="font-display text-2xl text-foreground/70">{displayTitle(guide.title)}</span>
            </div>
          )}
          <div aria-hidden className="absolute inset-0 bg-frame-mask-card" />
          {!isPillar && (
            <div className="absolute inset-x-0 bottom-0 space-y-2 p-5 sm:p-6">
              {/* یافتهٔ ۲ ممیزی وایب‌فارسی: فیل کهربایی + متن brand-foreground روی ماسک */}
              <Badge variant="brand" className="bg-brand text-brand-ink">{guide.category}</Badge>
              <h1 className="font-display text-balance text-2xl text-foreground md:text-4xl">{h1}</h1>
            </div>
          )}
        </div>

        {isPillar ? (
          <PillarHero
            badge="راهنمای کامل"
            title={h1}
            description={guide.excerpt}
            readingMinutes={minutes}
            updatedFa={guide.updatedFa}
            share={<ShareButtons title={brandTitle(guide.title)} path={`/guide/${guide.slug}`} siteUrl={s.SITE_URL} centered />}
          />
        ) : (
          <header className="mt-6">
            {/* ردیف متا (وایرفریم): تاریخ به‌روزرسانی شمسی | زمان مطالعه | نام تیم نویسنده */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-4" aria-hidden="true" />
                {fa(minutes)} دقیقه مطالعه
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden="true" />
                به‌روزرسانی: <time dateTime={updatedFaToIso(guide.updatedFa) ?? undefined}>{guide.updatedFa}</time>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <PenLine className="size-4" aria-hidden="true" />
                نویسنده: تیم {s.SITE_NAME}
              </span>
            </div>
            {/* لید مقاله (وایرفریم): سؤال + جواب خلاصه + قول */}
            <p className="text-pretty mt-4 text-lg leading-[1.9]">{guide.excerpt}</p>
            <ShareButtons title={brandTitle(guide.title)} path={`/guide/${guide.slug}`} siteUrl={s.SITE_URL} className="mt-4" />
          </header>
        )}
      </div>

      {/* سکشن ۲ + ۳ وایرفریم: جدول محتوا کنار بدنه (دسکتاپ چسبان، موبایل بالای بدنه) */}
      <div className="mx-auto mt-6 grid max-w-3xl gap-10 lg:max-w-none lg:grid-cols-[260px_minmax(0,1fr)] lg:justify-center">
        {showToc && <GuideToc items={tocItems} />}
        <div className="min-w-0 lg:mx-auto lg:w-full lg:max-w-3xl">
          {guide.sections.slice(0, midPoint).map((section, i) => renderGuideSection(guide.slug, section, i))}

          {/* سکشن ۴ وایرفریم: باکس مشاورهٔ میانی، بعد از بخش اصلی بدنه */}
          <GuideConsultBox
            contactName={s.CONTACT_NAME}
            phoneDisplay={s.PHONE_MOBILE}
            phoneHref={s.PHONE_MOBILE_LINK}
          />

          {guide.sections.slice(midPoint).map((section, k) => renderGuideSection(guide.slug, section, midPoint + k))}
        </div>
      </div>

      <div className="mx-auto max-w-3xl">
        {/* سکشن ۶ وایرفریم: جمع‌بندی + قدم بعدی */}
        <section aria-labelledby="guide-next-title" className="mt-12 rounded-surface border border-border bg-card p-6 sm:p-8">
          <h2 id="guide-next-title" className="text-balance text-2xl sm:text-3xl">
            جمع‌بندی و قدم بعدی
          </h2>
          {relatedBlock && relatedTours.length > 0 ? (
            <>
              <p className="text-pretty mt-3 leading-[1.9] text-foreground/90">
                حالا که این‌ها را می‌دانی، {relatedBlock.lead}{" "}
                {relatedTours.map((t, i) => (
                  <span key={t.slug}>
                    {i > 0 && " و "}
                    <Link href={`/tours/${t.slug}`} className="underline decoration-brand/60 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-brand">
                      {t.title}
                    </Link>
                  </span>
                ))}{" "}
                {relatedBlock.trail}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                {relatedTours.map((t) => (
                  <Button key={t.slug} asChild variant="brand">
                    <Link href={`/tours/${t.slug}`}>{t.title}</Link>
                  </Button>
                ))}
                <Button asChild variant="outline">
                  <a href="#consult">فرم مشاوره</a>
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-pretty mt-3 leading-[1.9] text-foreground/90">
                حالا که این‌ها را می‌دانی، قدم بعدی با توست: تورها را ببین و هر
                سؤالی داشتی، از کارشناس مقصد بپرس.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button asChild variant="brand">
                  <Link href="/tours">دیدن تورها</Link>
                </Button>
                <Button asChild variant="outline">
                  <a href="#consult">فرم مشاوره</a>
                </Button>
              </div>
            </>
          )}
        </section>

        {/* سکشن ۷ وایرفریم: سؤال‌های متداول (+ اسکیمای FAQPage در JSON-LD بالا) */}
        <div id="guide-faq" className="-mx-6 scroll-mt-24">
          <FaqBlock
            title="سؤال‌های رایج این راهنما"
            items={guide.faqs.map((faq, i) => ({
              id: `${guide.slug}-faq-${i}`,
              title: faq.question,
              content: renderInlineLinks(faq.answer),
            }))}
          />
        </div>

        {/* سکشن ۸ وایرفریم: امضای برند + لینک‌های داخلی */}
        <footer className="mt-10 border-t border-border pt-6">
          <p className="text-pretty leading-[1.9] text-foreground/85">
            تایلندگرد؛ تایلند را می‌شناسیم و انتخاب سفر را روشن‌تر می‌کنیم.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            {sisterGuide && (
              <Link
                href={`/guide/${sisterGuide.slug}`}
                className="rounded-sm underline decoration-brand/60 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-brand focus-visible:bg-accent"
              >
                راهنمای مرتبط: {displayTitle(sisterGuide.title)}
              </Link>
            )}
            <Link
              href="/guide"
              className="rounded-sm underline decoration-brand/60 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-brand focus-visible:bg-accent"
            >
              همهٔ راهنماهای سفر
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}

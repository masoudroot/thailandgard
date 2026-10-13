import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { CallButtons } from "@/components/site/CallButtons";
import { ShareButtons } from "@/components/site/ShareButtons";
import { PillarHero } from "@/components/blocks/pillar-hero";
import { FaqBlock } from "@/components/blocks/faq";
import { StepsBlock, type Step } from "@/components/blocks/steps-block";
import { getGuide, getGuides, getTour, getRelatedLinks, getSiteSettings } from "@/lib/db-content";
import { pageSeo, brandTitle, displayTitle } from "@/lib/og";
import { resolveH1 } from "@/lib/seo-h1";
import { ogImageForSlug } from "@/lib/og-slugs";
import { GUIDE_COVERS } from "@/lib/guide-covers";
import { CoverImage } from "@/components/site/CoverImage";
import { fa } from "@/lib/utils";
import { renderInlineLinks, stripInlineLinkMarkers } from "@/lib/inline-links";
import { renderGuideBlocks } from "@/lib/guide-tables";
import { updatedFaToIso } from "@/lib/jalali";

type PageProps = { params: Promise<{ slug: string }> };

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

export async function generateStaticParams() {
  return (await getGuides()).map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
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

export default async function GuideDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const guide = await getGuide(slug);
  if (!guide) notFound();

  // کاور قاب قهرمان (اسپک mount §۲): اگر نگاشت نداشت، جای‌نگه‌دار
  // تایپوگرافیکِ هم‌شکل (۱۳ راهنمای بدون کاور؛ عکس ناجور ممنوع).
  const guideCover = GUIDE_COVERS[guide.slug];
  const isPillar = guide.slug === "thailand-tour-complete-guide";

  // لینک‌های داخلی به تورهای مرتبط (مشخصات تیم سئومحتوا، نگاشت ۱۹ مهر ۱۴۰۵)
  // S-049 (مصوبهٔ ۱۸:۲۰): تور غیرفعال در «قدم بعدی» نمی‌آید (حذف، نه ریدایرکت).
  const [{ guideToTours }, s] = await Promise.all([getRelatedLinks(), getSiteSettings()]);
  const relatedBlock = guideToTours[guide.slug];
  const relatedTours = relatedBlock
    ? (
        await Promise.all(relatedBlock.slugs.map((ts) => getTour(ts)))
      ).filter((t): t is NonNullable<typeof t> => t !== undefined && t.active)
    : [];

  // بریف تک‌قانونی h1 (الگوی صفحهٔ تور): ترتیب حل در lib/seo-h1.ts است؛
  // ستون h1 دیتابیس، بعد نگاشت H1_OVERRIDES، بعد مشتق‌سازی از title.
  const h1 = resolveH1(guide.slug, guide.title, guide.h1);

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
    <main className="mx-auto max-w-3xl px-6 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

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
            <Badge variant="brand" className="bg-brand text-brand-foreground">{guide.category}</Badge>
            <h1 className="font-display text-balance text-2xl text-foreground md:text-4xl">{h1}</h1>
          </div>
        )}
      </div>

      {isPillar ? (
        <PillarHero
          badge="راهنمای کامل"
          title={h1}
          description={guide.excerpt}
          readingMinutes={guide.readingMinutes}
          updatedFa={guide.updatedFa}
          share={<ShareButtons title={brandTitle(guide.title)} path={`/guide/${guide.slug}`} siteUrl={s.SITE_URL} centered />}
        />
      ) : (
        <header className="mt-6">
          {/* دیف A5 ممیزی design: gap-y-3 برای ریتم عمودی هم‌خانواده با افقی
              در شکست دوخطی موبایل */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" />
              {fa(guide.readingMinutes)} دقیقه مطالعه
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" />
              به‌روزرسانی: {guide.updatedFa}
            </span>
          </div>
          {/* دیف A1 ممیزی design: leading خوانش بلند فارسی ۱٫۹ */}
          <p className="mt-4 text-lg leading-[1.9]">{guide.excerpt}</p>
          <ShareButtons title={brandTitle(guide.title)} path={`/guide/${guide.slug}`} siteUrl={s.SITE_URL} className="mt-4" />
        </header>
      )}

      {guide.sections.map((section) =>
        isVisaStepsSection(guide.slug, section.heading) ? (
          <StepsBlock key={section.heading} title={section.heading} steps={VISA_STEPS} />
        ) : (
          <section key={section.heading} className="mt-8">
            <h2 className="text-balance text-2xl sm:text-3xl">{section.heading}</h2>
            <div className="mt-4 space-y-4">{renderGuideBlocks(section.paragraphs)}</div>
          </section>
        )
      )}

      {relatedTours.length > 0 && relatedBlock && (
        <section className="mt-8 rounded-surface border border-border bg-card p-6">
          <h2 className="text-balance text-2xl sm:text-3xl">قدم بعدی</h2>
          <p className="mt-3 leading-[1.9] text-foreground/90">
            {relatedBlock.lead}{" "}
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
        </section>
      )}

      <div className="-mx-6">
        <FaqBlock
          title="سؤال‌های رایج این راهنما"
          items={guide.faqs.map((faq, i) => ({
            id: `${guide.slug}-faq-${i}`,
            title: faq.question,
            content: renderInlineLinks(faq.answer),
          }))}
        />
      </div>

      <section id="callback" className="mt-4 scroll-mt-24 rounded-surface border border-border bg-card p-6 sm:p-8">
        <h2 className="text-balance text-2xl sm:text-3xl">سؤالی دارید؟</h2>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          راهنما همه‌چیز را نگفت؟ کارشناس مقصد ما خودش تایلند رفته و برمی‌گردد؛ زنگ بزن و
          دقیقاً برای سفر خودت مشاوره بگیر.
        </p>
        <div className="mt-5">
          <CallButtons compact />
        </div>
      </section>
    </main>
  );
}

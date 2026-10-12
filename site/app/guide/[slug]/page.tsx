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
import { pageSeo, brandTitle } from "@/lib/og";
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
  const guide = await getGuide(slug);
  if (!guide) return { title: "راهنما پیدا نشد" };
  // قاعدهٔ og.ts: صفحه‌ای که openGraph خودش را دارد باید pageSeo را صدا بزند
  // (یافتهٔ S2 سئو: url و locale و بلوک twitter در همهٔ صفحه‌ها)
  return pageSeo({
    title: brandTitle(guide.title),
    description: guide.excerpt,
    canonical: `/guide/${guide.slug}`,
    type: "article",
  });
}

export default async function GuideDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const guide = await getGuide(slug);
  if (!guide) notFound();

  // لینک‌های داخلی به تورهای مرتبط (مشخصات تیم سئومحتوا، نگاشت ۱۹ مهر ۱۴۰۵)
  const [{ guideToTours }, s] = await Promise.all([getRelatedLinks(), getSiteSettings()]);
  const relatedBlock = guideToTours[guide.slug];
  const relatedTours = relatedBlock
    ? (
        await Promise.all(relatedBlock.slugs.map((ts) => getTour(ts)))
      ).filter((t): t is NonNullable<typeof t> => t !== undefined)
    : [];

  // قانون ۳۷ اسکیما: dateModified از همان رشته‌ای می‌آید که صفحه نمایش می‌دهد
  // (خط «به‌روزرسانی: {guide.updatedFa}»)؛ datePublished داده نداریم پس عمداً نیست.
  const dateModified = updatedFaToIso(guide.updatedFa);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: guide.title,
        description: guide.excerpt,
        inLanguage: "fa",
        url: `${s.SITE_URL}/guide/${guide.slug}`,
        mainEntityOfPage: `${s.SITE_URL}/guide/${guide.slug}`,
        ...(dateModified ? { dateModified } : {}),
        author: { "@type": "Organization", name: s.SITE_NAME, url: s.SITE_URL },
        publisher: {
          "@type": "Organization",
          name: `${s.SITE_NAME} (${s.SITE_LATIN})`,
          url: s.SITE_URL,
          telephone: s.PHONE_MOBILE_LINK.replace("tel:", ""),
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: guide.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: stripInlineLinkMarkers(faq.answer) },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "خانه", item: `${s.SITE_URL}/` },
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
          { label: guide.title },
        ]}
      />

      {guide.slug === "thailand-tour-complete-guide" ? (
        <PillarHero
          badge="راهنمای کامل"
          title={guide.title}
          description={guide.excerpt}
          readingMinutes={guide.readingMinutes}
          updatedFa={guide.updatedFa}
          share={<ShareButtons title={brandTitle(guide.title)} path={`/guide/${guide.slug}`} siteUrl={s.SITE_URL} centered />}
        />
      ) : (
        <header className="mt-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <Badge variant="brand">{guide.category}</Badge>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" />
              {fa(guide.readingMinutes)} دقیقه مطالعه
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" />
              به‌روزرسانی: {guide.updatedFa}
            </span>
          </div>
          <h1 className="mt-4 text-3xl md:text-4xl">{guide.title}</h1>
          <p className="mt-4 text-lg leading-9">{guide.excerpt}</p>
          <ShareButtons title={brandTitle(guide.title)} path={`/guide/${guide.slug}`} siteUrl={s.SITE_URL} className="mt-4" />
        </header>
      )}

      {guide.sections.map((section) =>
        isVisaStepsSection(guide.slug, section.heading) ? (
          <StepsBlock key={section.heading} title={section.heading} steps={VISA_STEPS} />
        ) : (
          <section key={section.heading} className="mt-8">
            <h2 className="text-2xl sm:text-3xl">{section.heading}</h2>
            <div className="mt-4 space-y-4">{renderGuideBlocks(section.paragraphs)}</div>
          </section>
        )
      )}

      {relatedTours.length > 0 && relatedBlock && (
        <section className="mt-8 rounded-surface border border-border bg-card p-6">
          <h2 className="text-2xl sm:text-3xl">قدم بعدی</h2>
          <p className="mt-3 leading-[1.9] text-foreground/90">
            {relatedBlock.lead}{" "}
            {relatedTours.map((t, i) => (
              <span key={t.slug}>
                {i > 0 && " و "}
                <Link href={`/tours/${t.slug}`} className="font-semibold underline underline-offset-4">
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

      <section id="callback" className="mt-4 rounded-surface border border-border bg-card p-6 sm:p-8">
        <h2 className="text-2xl sm:text-3xl">سؤالی داری؟</h2>
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

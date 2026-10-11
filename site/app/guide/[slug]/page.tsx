import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { CallButtons } from "@/components/site/CallButtons";
import { FaqBlock } from "@/components/blocks/faq";
import { GUIDES, getGuide } from "@/lib/guides";
import { getTour } from "@/lib/tours";
import { GUIDE_TO_TOURS } from "@/lib/related";
import { SITE_URL } from "@/lib/site";
import { fa } from "@/lib/utils";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return { title: "راهنما پیدا نشد" };
  return {
    title: guide.title,
    description: guide.excerpt,
    alternates: { canonical: `/guide/${guide.slug}` },
    openGraph:
      guide.slug === "thailand-visa-guide"
        ? {
            title: `${guide.title}؛ تایلندگرد`,
            description: guide.excerpt,
          }
        : undefined,
  };
}

export default async function GuideDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  // لینک‌های داخلی به تورهای مرتبط (مشخصات تیم سئومحتوا، نگاشت ۱۹ مهر ۱۴۰۵)
  const relatedBlock = GUIDE_TO_TOURS[guide.slug];
  const relatedTours = relatedBlock
    ? relatedBlock.slugs
        .map((s) => getTour(s))
        .filter((t): t is NonNullable<typeof t> => t !== undefined)
    : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: guide.title,
        description: guide.excerpt,
        inLanguage: "fa",
        url: `${SITE_URL}/guide/${guide.slug}`,
        mainEntityOfPage: `${SITE_URL}/guide/${guide.slug}`,
      },
      {
        "@type": "FAQPage",
        mainEntity: guide.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
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
        <h1 className="mt-4 text-4xl font-extrabold leading-snug">{guide.title}</h1>
        <p className="mt-4 text-lg leading-9 text-muted-foreground">{guide.excerpt}</p>
      </header>

      {guide.sections.map((section) => (
        <section key={section.heading} className="mt-10">
          <h2 className="text-2xl font-bold">{section.heading}</h2>
          <div className="mt-4 space-y-4">
            {section.paragraphs.map((paragraph, i) => (
              <p key={i} className="leading-8 text-foreground/90">
                {paragraph}
              </p>
            ))}
          </div>
        </section>
      ))}

      {relatedTours.length > 0 && relatedBlock && (
        <section className="mt-10 rounded-surface border border-border bg-card p-6">
          <h2 className="text-xl font-bold">قدم بعدی</h2>
          <p className="mt-3 leading-8 text-foreground/90">
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
            content: faq.answer,
          }))}
        />
      </div>

      <section className="mt-4 rounded-surface border border-border bg-card p-6 sm:p-8">
        <h2 className="text-xl font-bold">سؤالی داری؟</h2>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          راهنما همه‌چیز را نگفت؟ کارشناس فروش ما خودش تایلند رفته و برمی‌گردد؛ زنگ بزن و
          دقیقاً برای سفر خودت مشاوره بگیر.
        </p>
        <div className="mt-5">
          <CallButtons compact />
        </div>
      </section>
    </main>
  );
}

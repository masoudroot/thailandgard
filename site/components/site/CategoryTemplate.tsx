/**
 * تمپلیت صفحهٔ دسته‌بندی تورها (۸ سکشن). سرورکامپوننت؛ از روت
 * `app/tours/[slug]/page.tsx` وقتی اسلاگ یکی از دسته‌هاست فراخوانی می‌شود.
 */
import Link from "next/link";
import { BadgeCheck, PhoneCall, Users } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { FaqBlock } from "@/components/blocks/faq";
import { CallbackForm } from "@/components/site/CallbackForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Price } from "@/components/ui/price";
import { fa } from "@/lib/utils";
import { CategoryFilter } from "./CategoryFilter";
import type { Tour } from "@/lib/tours";
import type { TourCategory } from "@/lib/tour-categories";

export interface CategoryTemplateProps {
  category: TourCategory;
  tours: Tour[];
  siteUrl: string;
  allCategories: { slug: string; name: string }[];
  guides: { slug: string; title: string }[];
  phoneHref: string;
  phoneDisplay: string;
  /** نام کارشناس مقصد؛ CallbackForm به آن نیاز دارد (از تنظیمات سایت می‌آید). */
  contactName: string;
}

/** مسیر روت صفحات دسته‌بندی هنوز نهایی نشده؛ هنگام وصل کردن روت تأیید شود. */
const CATEGORY_PATH = "/tours"; // دسته‌ها روی همان روت [slug] دیسپچ می‌شوند

const TRUST_ITEMS = [
  { icon: BadgeCheck, label: "قیمت شفاف", note: "قیمت نهایی را همین‌جا می‌بینید" },
  { icon: PhoneCall, label: "مشاوره تلفنی", note: "قبل از خرید، تلفنی راهنمایی می‌گیرید" },
  { icon: Users, label: "لیدر فارسی‌زبان", note: "در سفر تنها نمی‌مانید" },
] as const;

function jsonLd(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}

export function CategoryTemplate({
  category,
  tours,
  siteUrl,
  allCategories,
  guides,
  phoneHref,
  phoneDisplay,
  contactName,
}: CategoryTemplateProps) {
  const base = siteUrl.replace(/\/+$/, "");
  const shownTours = tours.slice(0, 4);
  const siblingCategories = allCategories.filter(
    (c) => c.slug !== category.slug && category.relatedSlugs.includes(c.slug),
  );
  const relatedGuides = guides.filter((g) => category.guideSlugs.includes(g.slug));
  const hasRelated = siblingCategories.length > 0 || relatedGuides.length > 0;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "خانه", item: base },
      { "@type": "ListItem", position: 2, name: "تورها", item: `${base}/tours` },
      { "@type": "ListItem", position: 3, name: category.name },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: category.h1,
    itemListElement: tours.slice(0, 8).map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.title,
      url: `${base}/tours/${t.slug}`,
    })),
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: category.faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <>
      {/* ۱. هیرو */}
      <section className="px-6 pb-10 pt-8 sm:pt-12">
        <div className="mx-auto max-w-5xl">
          <Breadcrumb
            items={[
              { label: "خانه", href: "/" },
              { label: "تورها", href: "/tours" },
              { label: category.name },
            ]}
          />
          <h1 className="mt-4 text-balance text-3xl font-bold sm:text-4xl">{category.h1}</h1>
          <p className="mt-4 max-w-3xl text-pretty leading-8 text-muted-foreground sm:text-lg sm:leading-9">
            {category.promise}
          </p>
          <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-4">
            {TRUST_ITEMS.map(({ icon: Icon, label, note }) => (
              <li key={label} className="flex items-center gap-2.5">
                <Icon className="size-6 shrink-0 text-brand" aria-hidden />
                <div>
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-xs text-muted-foreground">{note}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ۲. فیلتر سریع */}
      <section className="px-6 py-8" aria-label={`تورهای ${category.name}`}>
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold">تورهای {category.name}</h2>
          <div className="mt-4">
            <CategoryFilter tours={tours} />
          </div>
        </div>
      </section>

      {/* ۳. جدول مقایسه */}
      {tours.length >= 2 && (
        <section className="px-6 py-8" aria-label="مقایسهٔ تورها">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-bold">مقایسهٔ تورها</h2>
            <div className="mt-4 overflow-x-auto rounded-surface border border-border">
              <table className="w-full min-w-[680px] border-collapse text-sm">
                <thead>
                  <tr className="bg-secondary/60">
                    <th scope="col" className="px-4 py-3 text-start font-semibold">
                      تور
                    </th>
                    <th scope="col" className="px-4 py-3 text-start font-semibold">
                      مدت
                    </th>
                    <th scope="col" className="px-4 py-3 text-start font-semibold">
                      مسیر
                    </th>
                    <th scope="col" className="px-4 py-3 text-start font-semibold">
                      قیمت پایه
                    </th>
                    <th scope="col" className="px-4 py-3 text-start font-semibold">
                      مناسب چه کسی
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shownTours.map((t) => (
                    <tr key={t.slug} className="border-t border-border">
                      <th scope="row" className="px-4 py-3 text-start font-medium">
                        <Link
                          href={`/tours/${t.slug}`}
                          className="rounded-sm underline decoration-brand/60 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-brand focus-visible:bg-accent"
                        >
                          {t.shortTitle}
                        </Link>
                      </th>
                      <td className="whitespace-nowrap px-4 py-3">
                        {fa(t.days)} روز و {fa(t.nights)} شب
                      </td>
                      <td className="px-4 py-3">{t.route}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Price amount={t.priceFrom} size="sm" />
                      </td>
                      <td className="px-4 py-3">{t.touristType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ۴. راهنمای متنی */}
      {category.guideSections.length > 0 && (
        <section className="px-6 py-8">
          <div className="mx-auto max-w-3xl space-y-10">
            {category.guideSections.map((section, i) => (
              <div key={i}>
                <h2 className="text-2xl font-bold">{section.heading}</h2>
                <div className="mt-4 space-y-4">
                  {section.body.map((paragraph, j) => (
                    <p key={j} className="text-pretty leading-[1.9] text-foreground/90">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ۵. سوالات متداول */}
      {category.faqs.length > 0 && (
        <FaqBlock
          items={category.faqs.map((f, i) => ({
            id: `faq-${i}`,
            title: f.question,
            content: <p className="leading-8">{f.answer}</p>,
          }))}
        />
      )}

      {/* ۶. فرم مشاوره */}
      <section className="px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">هنوز مطمئن نیستی کدام تور؟</CardTitle>
              <p className="text-sm leading-7 text-muted-foreground">
                شماره‌تان را بگذارید؛ کارشناس مقصد زنگ می‌زند و با هم بهترین گزینه را پیدا
                می‌کنید. یا خودتان زنگ بزنید:{" "}
                <a
                  href={phoneHref}
                  className="rounded-sm font-medium text-foreground underline decoration-brand/60 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-brand focus-visible:bg-accent"
                >
                  {phoneDisplay}
                </a>
              </p>
            </CardHeader>
            <CardContent>
              <CallbackForm contactName={contactName} />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ۷. لینک‌های مرتبط */}
      {hasRelated && (
        <section className="px-6 py-8" aria-label="لینک‌های مرتبط">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-bold">لینک‌های مرتبط</h2>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              {siblingCategories.length > 0 && (
                <div>
                  <h3 className="font-semibold">دسته‌های مرتبط</h3>
                  <ul className="mt-2 space-y-1.5">
                    {siblingCategories.map((c) => (
                      <li key={c.slug}>
                        <Link
                          href={`${CATEGORY_PATH}/${c.slug}`}
                          className="rounded-sm text-sm underline decoration-muted-foreground/40 underline-offset-4 transition-colors duration-(--motion) hover:text-foreground hover:decoration-brand focus-visible:bg-accent"
                        >
                          {c.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {relatedGuides.length > 0 && (
                <div>
                  <h3 className="font-semibold">راهنماهای سفر</h3>
                  <ul className="mt-2 space-y-1.5">
                    {relatedGuides.map((g) => (
                      <li key={g.slug}>
                        <Link
                          href={`/guide/${g.slug}`}
                          className="rounded-sm text-sm underline decoration-muted-foreground/40 underline-offset-4 transition-colors duration-(--motion) hover:text-foreground hover:decoration-brand focus-visible:bg-accent"
                        >
                          {g.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <p className="mt-6">
              <Link
                href="/tours"
                className="rounded-sm text-sm font-medium underline decoration-brand/60 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-brand focus-visible:bg-accent"
              >
                مشاهدهٔ همهٔ تورهای تایلند
              </Link>
            </p>
          </div>
        </section>
      )}

      {/* ۸. اسکیماها */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbJsonLd) }}
      />
      {tours.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(itemListJsonLd) }}
        />
      )}
      {category.faqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(faqJsonLd) }}
        />
      )}
    </>
  );
}

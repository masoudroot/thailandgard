import type { Metadata } from "next";
import { Compass, FileCheck, Heart, Languages, Phone, Receipt } from "lucide-react";
import { StepsBlock } from "@/components/blocks/steps-block";
import { AboutHero } from "@/components/site/AboutHero";
import { AboutConcerns, AboutPromises, AboutWhyThailand, AboutWhoWeAre } from "@/components/site/AboutSections";
import { AboutCta } from "@/components/site/AboutCta";
import { getSiteSettings, getSitemapRows } from "@/lib/db-content";
import { GUIDES } from "@/lib/guides";
import { SITE_URL } from "@/lib/site";
import { defaultOgImages } from "@/lib/og";

/**
 * صفحهٔ «دربارهٔ ما» (فاز ۴، وایرفریم: your_files/thailandgard-wireframes/about.html).
 * یک کار: اعتماد. روایت از نگاه مسافر نگران، نه معرفی شرکت.
 *
 * تصمیم‌های دیتایی (فقط واقعیت؛ هر چه واقعی نیست حذف شده):
 * - سکشن ۱: عکس واقعی تیم در دسترس نیست؛ قاب تایپوگرافیک بدون عکس استوک.
 * - سکشن ۴: شاهد «مشاورانمان هر سال N بار سفر می‌کنند» دیتا نداشت؛ حذف شد.
 *   شاهد مانده: تعداد واقعی راهنماهای منتشرشدهٔ تایلند (خوانش زنده از DB).
 * - سکشن ۶: کارت «لیدر فارسی‌زبان» شاهد قابل‌کلیک (عکس و نام لیدرها) نداشت؛ حذف شد.
 * - سکشن ۷ (تیم و چهره‌ها): عکس واقعی در دسترس نیست؛ کامل حذف شد.
 */
export const metadata: Metadata = {
  title: "درباره تایلندگرد؛ مشاور تخصصی تور تایلند",
  description:
    "تایلندگرد فقط تور تایلند برگزار می‌کند. با غزل عینی، متخصص و مشاور تورهای تایلند، مشاورهٔ تلفنی رایگان بگیرید؛ قیمت شفاف و لیدر فارسی‌زبان.",
  openGraph: {
    title: "درباره تایلندگرد؛ مشاور تخصصی تور تایلند",
    description:
      "تایلندگرد فقط تور تایلند برگزار می‌کند. با غزل عینی، متخصص و مشاور تورهای تایلند، مشاورهٔ تلفنی رایگان بگیرید؛ قیمت شفاف و لیدر فارسی‌زبان.",
    url: "/about",
    type: "website",
    locale: "fa_IR",
    images: defaultOgImages(SITE_URL),
  },
  twitter: {
    card: "summary_large_image",
    title: "درباره تایلندگرد؛ مشاور تخصصی تور تایلند",
    description:
      "تایلندگرد فقط تور تایلند برگزار می‌کند. با غزل عینی، متخصص و مشاور تورهای تایلند، مشاورهٔ تلفنی رایگان بگیرید؛ قیمت شفاف و لیدر فارسی‌زبان.",
    images: defaultOgImages(SITE_URL),
  },
  alternates: { canonical: "/about" },
};

const JOURNEY_STEPS = [
  {
    title: "مشاورهٔ رایگان تلفنی",
    description: "زنگ می‌زنید و با مشاور حرف می‌زنید؛ بدون هزینه و بدون تعهد.",
    icon: Phone,
  },
  {
    title: "پیشنهاد بر اساس شما",
    description: "بودجه، سلیقه و زمان‌تان را می‌سنجیم؛ نه یک پکیج آماده برای همه.",
    icon: Compass,
  },
  {
    title: "قیمت شفاف روی میز",
    description: "قیمت را قلم‌به‌قلم می‌بینید؛ بدون هزینهٔ پنهان.",
    icon: Receipt,
  },
  {
    title: "رزرو و مدارک",
    description: "بلیت، هتل و کارهای سفر را قدم‌به‌قدم با شما پیش می‌بریم.",
    icon: FileCheck,
  },
  {
    title: "سفر با لیدر فارسی‌زبان",
    description: "در تایلند تنها نمی‌مانید؛ کسی هست که فارسی جوابتان را بدهد.",
    icon: Languages,
  },
  {
    title: "بعد از سفر",
    description: "نظرتان را می‌شنویم تا سفر بعدی را بهتر بچینیم.",
    icon: Heart,
  },
];

export default async function AboutPage() {
  const s = await getSiteSettings();
  // تعداد واقعی راهنماها (شاهد سکشن ۴): خوانش زنده از DB؛ اگر DB در دسترس
  // نبود، همان فالبک کامیت‌شدهٔ lib/guides (همه یا هیچ، الگوی db-content).
  const { guides } = await getSitemapRows();
  const guideCount = guides.length > 0 ? guides.length : GUIDES.length;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "خانه", item: SITE_URL.replace(/\/+$/, "") },
      { "@type": "ListItem", position: 2, name: "درباره تایلندگرد", item: `${SITE_URL}/about` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <main>
        <AboutHero />
        <AboutConcerns />
        <AboutWhoWeAre />
        <AboutWhyThailand guideCount={guideCount} />
        <StepsBlock
          eyebrow="مسیر سفر"
          title="از مشاوره تا سفر"
          steps={JOURNEY_STEPS}
          gridClassName="md:grid-cols-2 lg:grid-cols-3"
          connectorClassName="hidden md:block"
        />
        <AboutPromises />
        <AboutCta
          contactName={s.CONTACT_NAME}
          mobileDisplay={s.PHONE_MOBILE_DISPLAY}
          mobileLink={s.PHONE_MOBILE_LINK}
          landlineDisplay={s.PHONE_LANDLINE_DISPLAY}
          landlineLink={s.PHONE_LANDLINE_LINK}
        />
      </main>
    </>
  );
}

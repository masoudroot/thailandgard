"use client";

/**
 * SiteChrome: پوستهٔ سایت (هدر/فوتر/اسکریپت‌ها) با خاموش‌شدن شرطی.
 *
 * دستور مسعود: /dashboard و /login باید کاملاً جدا از قالب سایت بالا بیایند؛
 * هیچ هدر، فوتر، مارکی، ترکِر تماس، اسکیمای JSON-LD یا اسکریپت Clarity
 * نباید روی آن‌ها رندر شود. داشبورد لی‌اوت و تم خودش را دارد.
 *
 * ریشهٔ فیکس بیلد استاتیک (۱۴۰۵/۰۷/۲۵): usePathname() هیچ‌وقت در مسیر
 * SSR/پرریرندر صدا زده نمی‌شود. ChromelessGate با ssr:false فقط روی
 * کلاینت مسیر را چک می‌کند و در صورت chromeless بودن، پوسته را با
 * CSS مخفی می‌کند (display:none روی [data-site-chrome]).
 */

import dynamic from "next/dynamic";
import Script from "next/script";
import { Phone } from "lucide-react";
import { Navbar } from "@/components/blocks/navbar";
import { AnnouncementMarquee } from "@/components/site/AnnouncementMarquee";
import { FooterBlock } from "@/components/blocks/footer";
import { LogoMark } from "@/components/site/LogoMark";
import { CallTracker } from "@/components/call-tracker";
import type { SiteSettings } from "@/lib/db-content";
import type { Tour } from "@/lib/tours";

/** مسیرهایی که پوستهٔ سایت را نمی‌گیرند. */
export function isChromelessPath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/dashboard");
}

interface SiteChromeProps {
  settings: SiteSettings;
  tours: Tour[];
  children: React.ReactNode;
}

// گیت chromeless: فقط کلاینت، در SSR رندر نمی‌شود
const ChromelessGate = dynamic(() => import("./ChromelessGate"), { ssr: false });

export function SiteChrome({ settings: s, tours, children }: SiteChromeProps) {
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: `${s.SITE_NAME} (${s.SITE_LATIN})`,
    slogan: s.SITE_SLOGAN,
    url: s.SITE_URL,
    telephone: s.PHONE_MOBILE_LINK.replace("tel:", ""),
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+989120643112",
      contactType: "sales",
      areaServed: "IR",
      availableLanguage: "fa",
    },
  };

  return (
    <>
      <ChromelessGate />
      <div data-site-chrome>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <Script
          id="clarity"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","yvwkh0ui5u");`,
          }}
        />
        {/* D-013: اسکیپ‌لینک؛ اولین عنصر صفحه، فقط برای کیبورد/صفحه‌خوان */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[100] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:font-semibold focus:text-brand-foreground"
        >
          پرش به محتوای اصلی
        </a>
        <CallTracker />
        <AnnouncementMarquee />
        <Navbar
          logo={
            <span className="flex items-center gap-2">
              <LogoMark size={32} />
              <span className="font-display text-lg">{s.SITE_NAME}</span>
              <span className="rounded-full bg-brand/15 px-2.5 py-0.5 text-xs font-semibold text-brand-foreground">
                {s.SITE_SLOGAN}
              </span>
            </span>
          }
          links={s.NAV_LINKS}
          primary={{ label: "تماس با مشاور سفر", href: s.PHONE_MOBILE_LINK }}
          callHref={s.PHONE_MOBILE_LINK}
        />
        {/* D-250: هدف اسکیپ‌لینک؛ scroll-mt-24 تا با «پرش به محتوا» سر صفحه زیر نوبار چسبان نرود (قرارداد سکشن‌های سایت) */}
        {/* D-359: div است نه main؛ صفحه‌ها خودشان یک main دارند و دو لندمارک main پشت‌سرهم برای صفحه‌خوان ممنوع است */}
        <div id="main-content" tabIndex={-1} className="flex-1 scroll-mt-24">{children}</div>
        <FooterBlock
          logo={
            <span className="flex items-center gap-2">
              <LogoMark size={28} />
              <span className="font-display">{s.SITE_NAME} | {s.SITE_LATIN}</span>
            </span>
          }
          description={`${s.SITE_TAGLINE}. فروش ما فقط تلفنی است؛ هیچ پرداخت آنلاینی نداریم.`}
          columns={[
            {
              title: "تورها",
              links: tours.map((t) => ({ label: t.title, href: `/tours/${t.slug}` })),
            },
            {
              title: "دسترسی سریع",
              links: [
                { label: "فهرست تورها", href: "/tours" },
                { label: "راهنمای سفر تایلند", href: "/guide" },
                { label: "تماس با مشاور سفر", href: "/contact" },
              ],
            },
            {
              title: "تماس",
              links: [
                { label: (<>{s.CONTACT_NAME}: <span dir="ltr">{s.PHONE_MOBILE_DISPLAY}</span></>), href: s.PHONE_MOBILE_LINK, ariaLabel: "تماس با مشاور سفر تایلندگرد" },
                { label: (<><Phone aria-hidden />تلفن ثابت: <span dir="ltr">{s.PHONE_LANDLINE_DISPLAY}</span></>), href: s.PHONE_LANDLINE_LINK, ariaLabel: "تماس با تلفن ثابت تایلندگرد", button: true },
              ],
            },
          ]}
        />
      </div>
    </>
  );
}

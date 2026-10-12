import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import { Navbar } from "@/components/blocks/navbar";
import { AnnouncementMarquee } from "@/components/site/AnnouncementMarquee";
import { FooterBlock } from "@/components/blocks/footer";
import { getSiteSettings, getTours } from "@/lib/db-content";
import { defaultOgImages } from "@/lib/og";

/** همهٔ مسیرها استاتیک‌اند؛ هر رندر درخواستیِ آینده بیلد را قرمز می‌کند. */
export const ensureStatic = "navigation";

const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const pinar = localFont({
  variable: "--font-pinar",
  display: "swap",
  src: [
    { path: "./fonts/Pinar-FD-Regular.woff2", weight: "400" },
    { path: "./fonts/Pinar-FD-Medium.woff2", weight: "500" },
    { path: "./fonts/Pinar-FD-SemiBold.woff2", weight: "600" },
    { path: "./fonts/Pinar-FD-Bold.woff2", weight: "700" },
  ],
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  return {
    metadataBase: new URL(s.SITE_URL),
    title: {
      default: `${s.SITE_NAME}؛ ${s.SITE_SLOGAN}`,
      template: `%s؛ ${s.SITE_NAME}`,
    },
    description:
      "تایلندگرد فقط تور تایلند برگزار می‌کند: پوکت، بانکوک، پاتایا، سامویی و کرابی. مشاوره و رزرو فقط با تماس تلفنی.",
    keywords: ["تور تایلند", "تور پوکت", "تور بانکوک", "تور پاتایا", "تور سامویی", "تور کرابی", "قیمت تور تایلند"],
    openGraph: {
      type: "website",
      locale: "fa_IR",
      siteName: s.SITE_NAME,
      title: `${s.SITE_NAME}؛ ${s.SITE_SLOGAN}`,
      description: s.SITE_TAGLINE,
      // دستور سئو ۱۲:۰۵؛ پیش‌فرض سراسری og:image (عکس موجود هیروی خانه، ۲۴۰۰×۱۶۰۰)
      images: defaultOgImages(s.SITE_URL),
    },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSiteSettings();
  const tours = await getTours();

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
    <html lang="fa" dir="rtl" className={`${vazirmatn.variable} ${pinar.variable}`}>
      <head>
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
      </head>
      <body className="flex min-h-screen flex-col">
        <AnnouncementMarquee />
        <Navbar
          logo={
            <span className="flex items-center gap-2">
              <span className="font-display text-lg">{s.SITE_NAME}</span>
              <span className="rounded-full bg-brand/15 px-2.5 py-0.5 text-xs font-semibold text-brand-foreground">
                {s.SITE_SLOGAN}
              </span>
            </span>
          }
          links={s.NAV_LINKS}
          primary={{ label: "تماس با کارشناس فروش", href: s.PHONE_MOBILE_LINK }}
          secondary={{ label: "درخواست تماس", href: "/contact" }}
          callHref={s.PHONE_MOBILE_LINK}
        />
        <main className="flex-1">{children}</main>
        <FooterBlock
          logo={<span className="font-display">{s.SITE_NAME} | {s.SITE_LATIN}</span>}
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
                { label: "تماس و درخواست تماس", href: "/contact" },
              ],
            },
            {
              title: "تماس",
              links: [
                { label: (<>{s.CONTACT_NAME}: <span dir="ltr">{s.PHONE_MOBILE_DISPLAY}</span></>), href: s.PHONE_MOBILE_LINK, ariaLabel: "تماس با کارشناس فروش تایلندگرد" },
                { label: (<>تلفن ثابت: <span dir="ltr">{s.PHONE_LANDLINE_DISPLAY}</span></>), href: s.PHONE_LANDLINE_LINK, ariaLabel: "تماس با تلفن ثابت تایلندگرد" },
              ],
            },
          ]}
        />
      </body>
    </html>
  );
}

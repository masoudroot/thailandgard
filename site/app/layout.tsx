import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Navbar } from "@/components/blocks/navbar";
import { FooterBlock } from "@/components/blocks/footer";
import {
  CONTACT_NAME,
  NAV_LINKS,
  PHONE_LANDLINE_DISPLAY,
  PHONE_LANDLINE_LINK,
  PHONE_MOBILE_DISPLAY,
  PHONE_MOBILE_LINK,
  SITE_LATIN,
  SITE_NAME,
  SITE_SLOGAN,
  SITE_TAGLINE,
  SITE_URL,
} from "@/lib/site";
import { TOURS } from "@/lib/tours";

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
    { path: "./fonts/Pinar-FD-Regular.ttf", weight: "400" },
    { path: "./fonts/Pinar-FD-Medium.ttf", weight: "500" },
    { path: "./fonts/Pinar-FD-SemiBold.ttf", weight: "600" },
    { path: "./fonts/Pinar-FD-Bold.ttf", weight: "700" },
  ],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | ${SITE_SLOGAN}`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "تایلندگرد فقط تور تایلند برگزار می‌کند: پوکت، بانکوک، پاتایا، سامویی و کرابی. مشاوره و رزرو فقط با تماس تلفنی.",
  keywords: ["تور تایلند", "تور پوکت", "تور بانکوک", "تور پاتایا", "تور سامویی", "تور کرابی", "قیمت تور تایلند"],
  openGraph: {
    type: "website",
    locale: "fa_IR",
    siteName: SITE_NAME,
    title: `${SITE_NAME} | ${SITE_SLOGAN}`,
    description: SITE_TAGLINE,
  },
  robots: { index: true, follow: true },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "TravelAgency",
  name: `${SITE_NAME} (${SITE_LATIN})`,
  slogan: SITE_SLOGAN,
  url: SITE_URL,
  telephone: PHONE_MOBILE_LINK.replace("tel:", "+"),
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+989120643112",
    contactType: "sales",
    areaServed: "IR",
    availableLanguage: "fa",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={`${vazirmatn.variable} ${pinar.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <Navbar
          logo={
            <span className="flex items-center gap-2">
              <span className="font-display text-lg font-bold">{SITE_NAME}</span>
              <span className="rounded-full bg-brand/15 px-2.5 py-0.5 text-xs font-semibold text-brand-foreground">
                {SITE_SLOGAN}
              </span>
            </span>
          }
          links={NAV_LINKS}
          primary={{ label: `تماس با ${CONTACT_NAME}`, href: PHONE_MOBILE_LINK }}
          secondary={{ label: "درخواست تماس", href: "/contact" }}
        />
        <main className="flex-1">{children}</main>
        <FooterBlock
          logo={<span className="font-display">{SITE_NAME} | {SITE_LATIN}</span>}
          description={`${SITE_TAGLINE}. فروش ما فقط تلفنی است؛ هیچ پرداخت آنلاینی نداریم.`}
          columns={[
            {
              title: "تورها",
              links: TOURS.map((t) => ({ label: t.title, href: `/tours/${t.slug}` })),
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
                { label: `${CONTACT_NAME}: ${PHONE_MOBILE_DISPLAY}`, href: PHONE_MOBILE_LINK },
                { label: `تلفن ثابت: ${PHONE_LANDLINE_DISPLAY}`, href: PHONE_LANDLINE_LINK },
              ],
            },
          ]}
        />
      </body>
    </html>
  );
}

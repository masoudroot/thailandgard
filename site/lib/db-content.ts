/**
 * خواندن محتوای سایت از دیتابیس سوپابیس، موقع بیلد.
 *
 * منبع اصلی: جدول‌های محتوایی سوپابیس (tours، tour_days، tour_faqs، guides،
 * guide_sections، guide_faqs، site_settings، related_links) با کلید anon.
 * فالبک: اگر متغیرهای محیطی نباشند، یا خواندن از دیتابیس خطا بدهد، یا جدولی
 * خالی برگردد، بی‌صدا (فقط با console.warn) از دادهٔ فایل‌های TS استفاده می‌شود
 * تا بیلد هرگز نخوابد. دادهٔ هر تابع «همه یا هیچ» است: اگر حتی یکی از
 * جدول‌های لازمش ناقص باشد، کل خروجی همان تابع از فالبک می‌آید.
 *
 * ترتیب: tour_days بر اساس day، faqها و sectionها بر اساس position (از ۱) مرتب
 * می‌شوند؛ ترتیب تورها و راهنماها با ترتیب فایل‌های مبدأ یکی است.
 */

import {
  TOURS as TOURS_FALLBACK,
  type Tour,
} from "./tours";
import {
  GUIDES as GUIDES_FALLBACK,
  type Guide,
} from "./guides";
import {
  SITE_NAME as SITE_NAME_FALLBACK,
  SITE_LATIN as SITE_LATIN_FALLBACK,
  SITE_SLOGAN as SITE_SLOGAN_FALLBACK,
  SITE_TAGLINE as SITE_TAGLINE_FALLBACK,
  CONTACT_NAME as CONTACT_NAME_FALLBACK,
  CONTACT_TITLE as CONTACT_TITLE_FALLBACK,
  PHONE_MOBILE as PHONE_MOBILE_FALLBACK,
  PHONE_MOBILE_DISPLAY as PHONE_MOBILE_DISPLAY_FALLBACK,
  PHONE_MOBILE_LINK as PHONE_MOBILE_LINK_FALLBACK,
  WHATSAPP_LINK as WHATSAPP_LINK_FALLBACK,
  PHONE_LANDLINE as PHONE_LANDLINE_FALLBACK,
  PHONE_LANDLINE_DISPLAY as PHONE_LANDLINE_DISPLAY_FALLBACK,
  PHONE_LANDLINE_LINK as PHONE_LANDLINE_LINK_FALLBACK,
  PHONE_CHANNELS_NOTE as PHONE_CHANNELS_NOTE_FALLBACK,
  SITE_URL as SITE_URL_FALLBACK,
  NAV_LINKS as NAV_LINKS_FALLBACK,
} from "./site";
import {
  GUIDE_TO_TOURS as GUIDE_TO_TOURS_FALLBACK,
  TOUR_TO_GUIDES as TOUR_TO_GUIDES_FALLBACK,
  type InlineLinkBlock,
} from "./related";

/* ---------- شکل سطرهای دیتابیس (ستون‌ها snake_case) ---------- */

interface TourRow {
  slug: string;
  title: string;
  short_title: string;
  days: number;
  nights: number;
  route: string;
  price_from: number;
  tourist_type: string;
  active: boolean;
  summary: string;
  description: string[];
  highlights: string[];
  includes: string[];
  excludes: string[];
}

interface TourDayRow {
  tour_slug: string;
  day: number;
  title: string;
  description: string;
}

interface TourFaqRow {
  tour_slug: string;
  position: number;
  question: string;
  answer: string;
}

interface GuideRow {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  reading_minutes: number;
  updated_fa: string;
}

interface GuideSectionRow {
  guide_slug: string;
  position: number;
  heading: string;
  paragraphs: string[];
}

interface GuideFaqRow {
  guide_slug: string;
  position: number;
  question: string;
  answer: string;
}

interface SettingRow {
  key: string;
  value: unknown;
}

interface RelatedRow {
  source_kind: "tour" | "guide";
  source_slug: string;
  target_kind: "tour" | "guide";
  target_slugs: string[];
  lead: string;
  trail: string;
}

/* ---------- شکل خروجی توابع ---------- */

/** همان ۱۶ ثابت site.ts، به شکل یک آبجکت */
export interface SiteSettings {
  SITE_NAME: string;
  SITE_LATIN: string;
  SITE_SLOGAN: string;
  SITE_TAGLINE: string;
  CONTACT_NAME: string;
  CONTACT_TITLE: string;
  PHONE_MOBILE: string;
  PHONE_MOBILE_DISPLAY: string;
  PHONE_MOBILE_LINK: string;
  WHATSAPP_LINK: string;
  PHONE_LANDLINE: string;
  PHONE_LANDLINE_DISPLAY: string;
  PHONE_LANDLINE_LINK: string;
  PHONE_CHANNELS_NOTE: string;
  SITE_URL: string;
  NAV_LINKS: { label: string; href: string }[];
}

export interface RelatedLinks {
  guideToTours: Record<string, InlineLinkBlock>;
  tourToGuides: Record<string, InlineLinkBlock>;
}

const SITE_SETTINGS_FALLBACK: SiteSettings = {
  SITE_NAME: SITE_NAME_FALLBACK,
  SITE_LATIN: SITE_LATIN_FALLBACK,
  SITE_SLOGAN: SITE_SLOGAN_FALLBACK,
  SITE_TAGLINE: SITE_TAGLINE_FALLBACK,
  CONTACT_NAME: CONTACT_NAME_FALLBACK,
  CONTACT_TITLE: CONTACT_TITLE_FALLBACK,
  PHONE_MOBILE: PHONE_MOBILE_FALLBACK,
  PHONE_MOBILE_DISPLAY: PHONE_MOBILE_DISPLAY_FALLBACK,
  PHONE_MOBILE_LINK: PHONE_MOBILE_LINK_FALLBACK,
  WHATSAPP_LINK: WHATSAPP_LINK_FALLBACK,
  PHONE_LANDLINE: PHONE_LANDLINE_FALLBACK,
  PHONE_LANDLINE_DISPLAY: PHONE_LANDLINE_DISPLAY_FALLBACK,
  PHONE_LANDLINE_LINK: PHONE_LANDLINE_LINK_FALLBACK,
  PHONE_CHANNELS_NOTE: PHONE_CHANNELS_NOTE_FALLBACK,
  SITE_URL: SITE_URL_FALLBACK,
  NAV_LINKS: NAV_LINKS_FALLBACK,
};

/* ---------- خواندن خام از PostgREST ---------- */

/**
 * یک جدول را کامل می‌خواند. در هر حالت خرابی (نبودن env، خطای شبکه، پاسخ
 * غیرموفق، بدنهٔ نامعتبر یا جدول خالی) null برمی‌گرداند تا صداکننده فالبک بگیرد.
 */
async function fetchTable<T>(tableName: string): Promise<T[] | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  let res: Response;
  try {
    res = await fetch(`${url}/rest/v1/${tableName}?select=*`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const data: unknown = await res.json().catch(() => null);
  if (!Array.isArray(data) || data.length === 0) return null;
  return data as T[];
}

/* ---------- نگاشت سطرها به اینترفیس‌های TS ---------- */

function mapTour(row: TourRow, dayRows: TourDayRow[], faqRows: TourFaqRow[]): Tour {
  return {
    slug: row.slug,
    title: row.title,
    shortTitle: row.short_title,
    days: row.days,
    nights: row.nights,
    route: row.route,
    priceFrom: row.price_from,
    touristType: row.tourist_type,
    active: row.active,
    summary: row.summary,
    description: row.description,
    highlights: row.highlights,
    includes: row.includes,
    excludes: row.excludes,
    itinerary: dayRows
      .filter((d) => d.tour_slug === row.slug)
      .sort((a, b) => a.day - b.day)
      .map((d) => ({ day: d.day, title: d.title, description: d.description })),
    faqs: faqRows
      .filter((f) => f.tour_slug === row.slug)
      .sort((a, b) => a.position - b.position)
      .map((f) => ({ question: f.question, answer: f.answer })),
  };
}

function mapGuide(
  row: GuideRow,
  sectionRows: GuideSectionRow[],
  faqRows: GuideFaqRow[],
): Guide {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    category: row.category,
    readingMinutes: row.reading_minutes,
    updatedFa: row.updated_fa,
    sections: sectionRows
      .filter((s) => s.guide_slug === row.slug)
      .sort((a, b) => a.position - b.position)
      .map((s) => ({ heading: s.heading, paragraphs: s.paragraphs })),
    faqs: faqRows
      .filter((f) => f.guide_slug === row.slug)
      .sort((a, b) => a.position - b.position)
      .map((f) => ({ question: f.question, answer: f.answer })),
  };
}

/**
 * ترتیب تورها/راهنماها با ترتیب فایل مبدأ یکی می‌ماند؛ اسلاگ تازه‌ای که در
 * فایل مبدأ نباشد، آخر فهرست می‌نشیند و ترتیب نسبی خودش را نگه می‌دارد.
 */
function inFileOrder<T extends { slug: string }>(rows: T[], fileOrder: string[]): T[] {
  const rank = new Map(fileOrder.map((slug, i) => [slug, i]));
  return [...rows].sort(
    (a, b) => (rank.get(a.slug) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.slug) ?? Number.MAX_SAFE_INTEGER),
  );
}

/* ---------- توابع عمومی ---------- */

export async function getTours(): Promise<Tour[]> {
  const [rows, dayRows, faqRows] = await Promise.all([
    fetchTable<TourRow>("tours"),
    fetchTable<TourDayRow>("tour_days"),
    fetchTable<TourFaqRow>("tour_faqs"),
  ]);
  if (!rows || !dayRows || !faqRows) {
    console.warn("[db-content] getTours: دیتابیس در دسترس نیست؛ فالبک tours.ts");
    return TOURS_FALLBACK;
  }
  const ordered = inFileOrder(rows, TOURS_FALLBACK.map((t) => t.slug));
  return ordered.map((row) => mapTour(row, dayRows, faqRows));
}

export async function getTour(slug: string): Promise<Tour | undefined> {
  return (await getTours()).find((t) => t.slug === slug);
}

export async function getGuides(): Promise<Guide[]> {
  const [rows, sectionRows, faqRows] = await Promise.all([
    fetchTable<GuideRow>("guides"),
    fetchTable<GuideSectionRow>("guide_sections"),
    fetchTable<GuideFaqRow>("guide_faqs"),
  ]);
  if (!rows || !sectionRows || !faqRows) {
    console.warn("[db-content] getGuides: دیتابیس در دسترس نیست؛ فالبک guides.ts");
    return GUIDES_FALLBACK;
  }
  const ordered = inFileOrder(rows, GUIDES_FALLBACK.map((g) => g.slug));
  return ordered.map((row) => mapGuide(row, sectionRows, faqRows));
}

export async function getGuide(slug: string): Promise<Guide | undefined> {
  return (await getGuides()).find((g) => g.slug === slug);
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const rows = await fetchTable<SettingRow>("site_settings");
  if (!rows) {
    console.warn("[db-content] getSiteSettings: دیتابیس در دسترس نیست؛ فالبک site.ts");
    return SITE_SETTINGS_FALLBACK;
  }
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const pick = <K extends keyof SiteSettings>(key: K): SiteSettings[K] =>
    byKey.has(key) ? (byKey.get(key) as SiteSettings[K]) : SITE_SETTINGS_FALLBACK[key];
  return {
    SITE_NAME: pick("SITE_NAME"),
    SITE_LATIN: pick("SITE_LATIN"),
    SITE_SLOGAN: pick("SITE_SLOGAN"),
    SITE_TAGLINE: pick("SITE_TAGLINE"),
    CONTACT_NAME: pick("CONTACT_NAME"),
    CONTACT_TITLE: pick("CONTACT_TITLE"),
    PHONE_MOBILE: pick("PHONE_MOBILE"),
    PHONE_MOBILE_DISPLAY: pick("PHONE_MOBILE_DISPLAY"),
    PHONE_MOBILE_LINK: pick("PHONE_MOBILE_LINK"),
    WHATSAPP_LINK: pick("WHATSAPP_LINK"),
    PHONE_LANDLINE: pick("PHONE_LANDLINE"),
    PHONE_LANDLINE_DISPLAY: pick("PHONE_LANDLINE_DISPLAY"),
    PHONE_LANDLINE_LINK: pick("PHONE_LANDLINE_LINK"),
    PHONE_CHANNELS_NOTE: pick("PHONE_CHANNELS_NOTE"),
    SITE_URL: pick("SITE_URL"),
    NAV_LINKS: pick("NAV_LINKS"),
  };
}

export async function getRelatedLinks(): Promise<RelatedLinks> {
  const rows = await fetchTable<RelatedRow>("related_links");
  if (!rows) {
    console.warn("[db-content] getRelatedLinks: دیتابیس در دسترس نیست؛ فالبک related.ts");
    return { guideToTours: GUIDE_TO_TOURS_FALLBACK, tourToGuides: TOUR_TO_GUIDES_FALLBACK };
  }
  const guideToTours: Record<string, InlineLinkBlock> = {};
  const tourToGuides: Record<string, InlineLinkBlock> = {};
  for (const r of rows) {
    const block: InlineLinkBlock = { lead: r.lead, slugs: r.target_slugs, trail: r.trail };
    if (r.source_kind === "guide" && r.target_kind === "tour") guideToTours[r.source_slug] = block;
    else if (r.source_kind === "tour" && r.target_kind === "guide") tourToGuides[r.source_slug] = block;
  }
  return { guideToTours, tourToGuides };
}

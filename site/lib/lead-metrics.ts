/**
 * سنجهٔ هفتگی قیف «تماس و لید» (Q3-09).
 *
 * فقط شمارش و تجمیع: هیچ فیلد شخصی (نام، شماره، پیام) در ورودی این ماژول خوانده
 * نمی‌شود، پس خروجی و گزارش هم بدون PII است.
 *
 * تعریف‌های ثابت:
 * - پنجرهٔ هفته: ۷ روز غلتان از لحظهٔ اجرا، بازهٔ نیمه‌باز `[start, end)`.
 * - مرز روزها: وقت تهران. ایران از ۱۴۰۱ ساعت تابستانی ندارد، پس آفست ثابت
 *   +۰۳:۳۰ کافی است و به کتابخانهٔ تاریخ نیاز نداریم.
 * - ستون `source` قالب «کانال|صفحه|کمپین» دارد (SOURCE-TRACKING.md)؛ مقدار بی‌قالب
 *   در unknown می‌رود تا شمارش هرگز رشتهٔ نامعتبر نشان ندهد.
 */

import { faDigits } from './dashboard/format';

export const DAY_MS = 86_400_000;
export const WEEK_MS = 7 * DAY_MS;
/** آفست ثابت تهران به دقیقه (بدون ساعت تابستانی). */
export const TEHRAN_OFFSET_MINUTES = 210;

/** فقط همان ستون‌هایی که برای شمارش لازم است. */
export interface LeadRow {
  created_at: string;
  source: string | null;
  tour_slug: string | null;
  status: string | null;
}

export interface CallClickRow {
  created_at: string;
  page: string;
  source: string | null;
}

export interface SourceParts {
  channel: string;
  page: string;
  campaign: string;
}

export interface WeekWindow {
  startMs: number;
  endMs: number;
}

export interface CountedPair {
  clicks: number;
  leads: number;
}

export interface DailyCount extends CountedPair {
  date: string;
}

export interface WeekMetrics {
  window: WeekWindow;
  clicks: number;
  leads: number;
  byChannel: Record<string, CountedPair>;
  clicksByPage: Array<{ page: string; count: number }>;
  leadsByTour: Array<{ tour: string; count: number }>;
  leadsByStatus: Record<string, number>;
  daily: DailyCount[];
}

export interface MetricChange {
  current: number;
  previous: number;
  /** درصد تغییر؛ وقتی هفتهٔ قبل صفر بوده، null است چون تقسیم بر صفر معنا ندارد. */
  deltaPct: number | null;
}

/** تجزیهٔ ستون `source` به سه بخش؛ مقدار بی‌قالب یا خالی → unknown|unknown|none. */
export function parseSource(source: string | null | undefined): SourceParts {
  const parts = (source ?? '').split('|');
  if (parts.length === 3 && parts.every((part) => part.length > 0)) {
    return { channel: parts[0], page: parts[1], campaign: parts[2] };
  }
  return { channel: 'unknown', page: 'unknown', campaign: 'none' };
}

/** پنجرهٔ هفت‌روزه؛ `weeksAgo = 1` یعنی هفتهٔ قبل. */
export function weekWindow(nowMs: number, weeksAgo = 0): WeekWindow {
  const endMs = nowMs - weeksAgo * WEEK_MS;
  return { startMs: endMs - WEEK_MS, endMs };
}

export function inWindow(iso: string, window: WeekWindow): boolean {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return false;
  return ms >= window.startMs && ms < window.endMs;
}

/** کلید روز تهران به شکل `YYYY-MM-DD`. */
export function dayKeyTehran(iso: string, offsetMinutes = TEHRAN_OFFSET_MINUTES): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '';
  return new Date(ms + offsetMinutes * 60_000).toISOString().slice(0, 10);
}

function topEntries(map: Map<string, number>, limit: number): Array<{ key: string; count: number }> {
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, limit);
}

/** شمارش یک پنجره: کلیک تماس، لید، تفکیک کانال، صفحه، تور، وضعیت و روز. */
export function tallyWeek(
  leads: LeadRow[],
  clicks: CallClickRow[],
  window: WeekWindow,
): WeekMetrics {
  const byChannel: Record<string, CountedPair> = {};
  const clicksByPageMap = new Map<string, number>();
  const leadsByTourMap = new Map<string, number>();
  const leadsByStatus: Record<string, number> = {};
  const dailyMap = new Map<string, DailyCount>();

  const dayBucket = (date: string): DailyCount => {
    const existing = dailyMap.get(date);
    if (existing) return existing;
    const created: DailyCount = { date, clicks: 0, leads: 0 };
    dailyMap.set(date, created);
    return created;
  };

  let totalClicks = 0;
  for (const click of clicks) {
    if (!inWindow(click.created_at, window)) continue;
    totalClicks += 1;
    const parts = parseSource(click.source);
    const pair = (byChannel[parts.channel] ??= { clicks: 0, leads: 0 });
    pair.clicks += 1;
    const pageKey = parts.page !== 'unknown' ? parts.page : click.page;
    clicksByPageMap.set(pageKey, (clicksByPageMap.get(pageKey) ?? 0) + 1);
    const date = dayKeyTehran(click.created_at);
    if (date) dayBucket(date).clicks += 1;
  }

  let totalLeads = 0;
  for (const lead of leads) {
    if (!inWindow(lead.created_at, window)) continue;
    totalLeads += 1;
    const parts = parseSource(lead.source);
    const pair = (byChannel[parts.channel] ??= { clicks: 0, leads: 0 });
    pair.leads += 1;
    const tourKey = lead.tour_slug ?? 'بدون تور';
    leadsByTourMap.set(tourKey, (leadsByTourMap.get(tourKey) ?? 0) + 1);
    const status = lead.status ?? 'unknown';
    leadsByStatus[status] = (leadsByStatus[status] ?? 0) + 1;
    const date = dayKeyTehran(lead.created_at);
    if (date) dayBucket(date).leads += 1;
  }

  return {
    window,
    clicks: totalClicks,
    leads: totalLeads,
    byChannel,
    clicksByPage: topEntries(clicksByPageMap, 8).map(({ key, count }) => ({ page: key, count })),
    leadsByTour: topEntries(leadsByTourMap, 8).map(({ key, count }) => ({ tour: key, count })),
    leadsByStatus,
    daily: [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
  };
}

/** مقایسهٔ دو عدد با یک رقم اعشار؛ مبنای صفر → null. */
export function change(current: number, previous: number): MetricChange {
  if (previous === 0) return { current, previous, deltaPct: null };
  return {
    current,
    previous,
    deltaPct: Math.round(((current - previous) / previous) * 1000) / 10,
  };
}

function signedPct(value: number): string {
  const rounded = Math.abs(value).toFixed(1).replace(/\.0$/, '');
  return `${value > 0 ? '+' : '−'}${faDigits(rounded)}٪`;
}

function deltaLabel(m: MetricChange): string {
  if (m.deltaPct === null) {
    return m.previous === 0 && m.current === 0
      ? 'هر دو هفته صفر'
      : 'هفتهٔ قبل صفر بود؛ درصد معنا ندارد';
  }
  if (m.deltaPct === 0) return 'بی‌تغییر';
  return signedPct(m.deltaPct);
}

/** تاریخ خوانا به تقویم شمسی، وقت تهران. */
export function jalaliDateTime(ms: number): string {
  return new Intl.DateTimeFormat('fa-IR', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(ms));
}

export interface WeeklyReportInput {
  current: WeekMetrics;
  previous: WeekMetrics;
  /** K2 از Clarity می‌آید و تا اتصال توکن API اندازه‌گیری نشده است. */
  formCompletion: null;
  generatedAtMs: number;
}

/** گزارش هفتگی فارسی؛ آمادهٔ چسباندن در Telegram یا سند مخزن. */
export function renderWeeklyReport(input: WeeklyReportInput): string {
  const { current, previous, generatedAtMs } = input;
  const k1 = change(current.clicks, previous.clicks);
  const k3 = change(current.leads, previous.leads);
  const lines: string[] = [];

  lines.push('# گزارش هفتگی قیف تماس و لید');
  lines.push('');
  lines.push(
    `بازهٔ این هفته: ${jalaliDateTime(current.window.startMs)} تا ${jalaliDateTime(current.window.endMs)} (هفت روز، وقت تهران)`,
  );
  lines.push(
    `هفتهٔ قبل: ${jalaliDateTime(previous.window.startMs)} تا ${jalaliDateTime(previous.window.endMs)}`,
  );
  lines.push('');
  lines.push('## سرخط');
  lines.push('');
  lines.push(`- کلیک تماس (K1): ${faDigits(current.clicks)} — هفتهٔ قبل ${faDigits(previous.clicks)}؛ ${deltaLabel(k1)}`);
  lines.push(`- لید ثبت‌شده (K3): ${faDigits(current.leads)} — هفتهٔ قبل ${faDigits(previous.leads)}؛ ${deltaLabel(k3)}`);
  lines.push(
    '- نرخ تکمیل فرم (K2): اندازه‌گیری نشده. این عدد از رویدادهای Clarity می‌آید و خواندنشان به توکن API کلریتی نیاز دارد که هنوز وصل نیست.',
  );
  lines.push('');

  lines.push('## روز به روز');
  lines.push('');
  if (current.daily.length === 0) {
    lines.push('در این هفته هیچ کلیک تماس و هیچ لیدی ثبت نشده است.');
  } else {
    lines.push('| روز | کلیک تماس | لید |');
    lines.push('|---|---|---|');
    for (const day of current.daily) {
      lines.push(`| ${faDigits(day.date)} | ${faDigits(day.clicks)} | ${faDigits(day.leads)} |`);
    }
  }
  lines.push('');

  lines.push('## کانال');
  lines.push('');
  const channels = Object.keys(current.byChannel).sort((a, b) => {
    const ac = current.byChannel[a].clicks + current.byChannel[a].leads;
    const bc = current.byChannel[b].clicks + current.byChannel[b].leads;
    return bc - ac || a.localeCompare(b);
  });
  if (channels.length === 0) {
    lines.push('داده‌ای برای تفکیک کانال نیست.');
  } else {
    lines.push('| کانال | کلیک تماس | لید |');
    lines.push('|---|---|---|');
    for (const channel of channels) {
      const pair = current.byChannel[channel];
      lines.push(`| ${channel} | ${faDigits(pair.clicks)} | ${faDigits(pair.leads)} |`);
    }
  }
  lines.push('');

  lines.push('## صفحه‌هایی که بیشترین تماس را ساختند');
  lines.push('');
  if (current.clicksByPage.length === 0) {
    lines.push('هیچ کلیکی ثبت نشده.');
  } else {
    lines.push('| صفحه | کلیک تماس |');
    lines.push('|---|---|');
    for (const row of current.clicksByPage) {
      lines.push(`| /${row.page.replace(/^\//, '')} | ${faDigits(row.count)} |`);
    }
  }
  lines.push('');

  lines.push('## تورهای لیددار');
  lines.push('');
  if (current.leadsByTour.length === 0) {
    lines.push('هیچ لیدی ثبت نشده.');
  } else {
    lines.push('| تور | لید |');
    lines.push('|---|---|');
    for (const row of current.leadsByTour) {
      lines.push(`| ${row.tour} | ${faDigits(row.count)} |`);
    }
  }
  lines.push('');

  lines.push('## روش شمارش');
  lines.push('');
  lines.push('- هفت روز غلتان تا لحظهٔ اجرای گزارش؛ مرز روزها به وقت تهران (+۰۳:۳۰).');
  lines.push('- منبع از ستون `source` با قالب «کانال|صفحه|کمپین» خوانده می‌شود؛ مقدار بی‌قالب در unknown می‌رود، نه در یک کانال ساختگی.');
  lines.push('- این گزارش هیچ دادهٔ شخصی ندارد: نه نام، نه شماره، نه متن پیام. فقط شمارش.');
  lines.push(`- زمان ساخت گزارش: ${jalaliDateTime(generatedAtMs)}`);
  lines.push('');

  return lines.join('\n');
}

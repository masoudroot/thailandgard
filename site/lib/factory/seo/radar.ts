import { createHash } from 'node:crypto';
import { z } from 'zod';
import { fetchSupabaseRows, readSupabaseRestConfig } from '../supabase-rest';

export const SeoSignalSchema = z.object({
  dedupeKey: z.string().min(1),
  type: z.enum([
    'query_opportunity',
    'striking_distance',
    'page_decay',
    'news',
    'serp',
  ]),
  priority: z.number().int().min(0).max(100),
  title: z.string().min(1),
  detail: z.string().min(1),
  subject: z.string().min(1),
  metrics: z.record(z.string(), z.number()),
  source: z.enum(['gsc', 'page_analytics', 'intel_feed', 'serp']),
  observedAt: z.string().datetime(),
});

export type SeoSignal = z.infer<typeof SeoSignalSchema>;

export const GscQueryRowSchema = z.object({
  query: z.string().min(1),
  clicks: z.number().int().nonnegative(),
  impressions: z.number().int().nonnegative(),
  ctr: z.number().nullable().optional(),
  avg_position: z.number().nullable().optional(),
  date: z.string(),
});

export const PageAnalyticsRowSchema = z.object({
  page_path: z.string().min(1),
  views: z.number().int().nonnegative(),
  clicks: z.number().int().nonnegative(),
  impressions: z.number().int().nonnegative(),
  avg_position: z.number().nullable().optional(),
  date: z.string(),
});

export const IntelFeedRowSchema = z.object({
  title: z.string().min(1),
  summary: z.string().nullable().optional(),
  source_url: z.string().url(),
  source_name: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  blog_angle: z.string().nullable().optional(),
  created_at: z.string(),
});

export const SerpRowSchema = z.object({
  query: z.string().min(1),
  position: z.number().positive(),
  previousPosition: z.number().positive(),
  url: z.string().url(),
  date: z.string(),
});

export const SeoRadarInputSchema = z.object({
  gscQueries: z.array(GscQueryRowSchema).default([]),
  pageAnalytics: z.array(PageAnalyticsRowSchema).default([]),
  intelFeed: z.array(IntelFeedRowSchema).default([]),
  serp: z.array(SerpRowSchema).default([]),
});

export type SeoRadarInput = z.infer<typeof SeoRadarInputSchema>;

export interface SeoRadarResult {
  signals: SeoSignal[];
  generatedAt: string;
  source: 'fixture' | 'supabase';
}

interface QueryAggregate {
  query: string;
  clicks: number;
  impressions: number;
  positionSum: number;
  positionWeight: number;
  lastDate: string;
}

function day(value: string): number {
  const parsed = Date.parse(`${value.slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isoFromDate(value: string): string {
  const parsed = Date.parse(`${value.slice(0, 10)}T00:00:00.000Z`);
  return new Date(Number.isNaN(parsed) ? Date.now() : parsed).toISOString();
}

function stableKey(prefix: string, value: string): string {
  const digest = createHash('sha256')
    .update(value.toLowerCase().trim())
    .digest('hex')
    .slice(0, 20);
  return `${prefix}:${digest}`;
}

function priority(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function aggregateQueries(rows: SeoRadarInput['gscQueries']): QueryAggregate[] {
  const byQuery = new Map<string, QueryAggregate>();
  for (const row of rows) {
    const current = byQuery.get(row.query) ?? {
      query: row.query,
      clicks: 0,
      impressions: 0,
      positionSum: 0,
      positionWeight: 0,
      lastDate: row.date,
    };
    current.clicks += row.clicks;
    current.impressions += row.impressions;
    if (row.avg_position !== null && row.avg_position !== undefined) {
      current.positionSum += row.avg_position * Math.max(row.impressions, 1);
      current.positionWeight += Math.max(row.impressions, 1);
    }
    if (day(row.date) > day(current.lastDate)) current.lastDate = row.date;
    byQuery.set(row.query, current);
  }
  return [...byQuery.values()];
}

function querySignals(rows: SeoRadarInput['gscQueries']): SeoSignal[] {
  const signals = new Map<string, SeoSignal>();
  for (const aggregate of aggregateQueries(rows)) {
    if (aggregate.impressions < 50) continue;
    const position =
      aggregate.positionWeight > 0
        ? aggregate.positionSum / aggregate.positionWeight
        : null;
    if (position === null) continue;
    const ctr =
      aggregate.impressions > 0
        ? aggregate.clicks / aggregate.impressions
        : 0;
    const observedAt = isoFromDate(aggregate.lastDate);
    const common = {
      subject: aggregate.query,
      metrics: {
        clicks: aggregate.clicks,
        impressions: aggregate.impressions,
        ctr,
        position,
      },
      source: 'gsc' as const,
      observedAt,
    };

    if (
      aggregate.impressions >= 100 &&
      position >= 8 &&
      position <= 30 &&
      ctr < 0.03
    ) {
      signals.set(aggregate.query, {
        ...common,
        dedupeKey: stableKey('gsc:opportunity', aggregate.query),
        type: 'query_opportunity',
        priority: priority(
          45 + Math.log10(aggregate.impressions) * 10 + (30 - position),
        ),
        title: `فرصت محتوایی: ${aggregate.query}`,
        detail: `نمایش ${aggregate.impressions}، کلیک ${aggregate.clicks}، CTR ${(ctr * 100).toFixed(1)}٪، رتبه ${position.toFixed(1)}`,
      });
      continue;
    }

    if (position >= 4 && position <= 10 && aggregate.impressions >= 50) {
      signals.set(aggregate.query, {
        ...common,
        dedupeKey: stableKey('gsc:striking', aggregate.query),
        type: 'striking_distance',
        priority: priority(70 + (10 - position)),
        title: `فاصلهٔ کم تا صفحهٔ اول: ${aggregate.query}`,
        detail: `رتبه ${position.toFixed(1)} با ${aggregate.impressions} نمایش؛ بهبود عنوان و لینک‌سازی داخلی`,
      });
    }
  }
  return [...signals.values()];
}

function pageSignals(
  rows: SeoRadarInput['pageAnalytics'],
  now: Date,
): SeoSignal[] {
  const recentStart = now.getTime() - 7 * 86_400_000;
  const previousStart = now.getTime() - 14 * 86_400_000;
  const byPage = new Map<
    string,
    { recent: number; previous: number; lastDate: string }
  >();

  for (const row of rows) {
    const timestamp = day(row.date);
    if (timestamp < previousStart) continue;
    const current = byPage.get(row.page_path) ?? {
      recent: 0,
      previous: 0,
      lastDate: row.date,
    };
    if (timestamp >= recentStart) current.recent += row.clicks;
    else current.previous += row.clicks;
    if (timestamp > day(current.lastDate)) current.lastDate = row.date;
    byPage.set(row.page_path, current);
  }

  const signals: SeoSignal[] = [];
  for (const [page, value] of byPage) {
    if (value.previous < 20 || value.recent >= value.previous * 0.7) continue;
    const drop = 1 - value.recent / value.previous;
    signals.push({
      dedupeKey: stableKey('page:decay', page),
      type: 'page_decay',
      priority: priority(50 + drop * 40),
      title: `افت ترافیک: ${page}`,
      detail: `کلیک ۷ روز اخیر ${value.recent} در برابر ${value.previous} هفتهٔ قبل (${(drop * 100).toFixed(0)}٪ افت)`,
      subject: page,
      metrics: {
        recentClicks: value.recent,
        previousClicks: value.previous,
        drop,
      },
      source: 'page_analytics',
      observedAt: isoFromDate(value.lastDate),
    });
  }
  return signals;
}

function newsSignals(
  rows: SeoRadarInput['intelFeed'],
  now: Date,
): SeoSignal[] {
  const since = now.getTime() - 14 * 86_400_000;
  const travelTags = new Set([
    'تایلند',
    'گردشگری',
    'سفر',
    'پوکت',
    'بانکوک',
    'سامویی',
    'کرابی',
    'پاتایا',
    'توریسم',
  ]);
  const signals: SeoSignal[] = [];

  for (const row of rows) {
    const created = Date.parse(row.created_at);
    if (Number.isNaN(created) || created < since) continue;
    const tags = row.tags ?? [];
    const relevant =
      tags.some((tag) => travelTags.has(tag)) ||
      /تایلند|پوکت|بانکوک|سامویی|کرابی|پاتایا|گردشگری|سفر/.test(
        `${row.title} ${row.summary ?? ''}`,
      );
    if (!relevant) continue;
    const ageDays = Math.max(
      0,
      Math.floor((now.getTime() - created) / 86_400_000),
    );
    signals.push({
      dedupeKey: stableKey('news', row.source_url),
      type: 'news',
      priority: priority(35 + Math.max(0, 20 - ageDays * 2)),
      title: `خبر تازه: ${row.title}`,
      detail: row.blog_angle ?? row.summary ?? row.source_name ?? row.source_url,
      subject: row.source_url,
      metrics: { ageDays, tagCount: tags.length },
      source: 'intel_feed',
      observedAt: new Date(created).toISOString(),
    });
  }
  return signals;
}

function serpSignals(rows: SeoRadarInput['serp']): SeoSignal[] {
  return rows
    .filter(
      (row) =>
        row.previousPosition <= 10 && row.position > row.previousPosition + 3,
    )
    .map((row) => ({
      dedupeKey: stableKey('serp:drop', row.query),
      type: 'serp' as const,
      priority: priority(60 + (row.position - row.previousPosition)),
      title: `افت رتبهٔ SERP: ${row.query}`,
      detail: `از ${row.previousPosition} به ${row.position} در ${row.url}`,
      subject: row.query,
      metrics: {
        position: row.position,
        previousPosition: row.previousPosition,
        delta: row.position - row.previousPosition,
      },
      source: 'serp' as const,
      observedAt: isoFromDate(row.date),
    }));
}

export function buildSeoRadar(
  input: SeoRadarInput,
  options?: { now?: Date; limit?: number; source?: 'fixture' | 'supabase' },
): SeoRadarResult {
  const now = options?.now ?? new Date();
  const parsed = SeoRadarInputSchema.parse(input);
  const signals = [
    ...querySignals(parsed.gscQueries),
    ...pageSignals(parsed.pageAnalytics, now),
    ...newsSignals(parsed.intelFeed, now),
    ...serpSignals(parsed.serp),
  ]
    .sort((a, b) => b.priority - a.priority)
    .slice(0, options?.limit ?? 50)
    .map((signal) => SeoSignalSchema.parse(signal));

  return {
    signals,
    generatedAt: now.toISOString(),
    source: options?.source ?? 'fixture',
  };
}

export interface SeoRadarSourceData extends SeoRadarInput {
  windowStart: string;
}

export async function loadSeoRadarData(options?: {
  now?: Date;
}): Promise<SeoRadarSourceData | null> {
  const config = readSupabaseRestConfig();
  if (!config) return null;
  const now = options?.now ?? new Date();
  const since = new Date(now.getTime() - 28 * 86_400_000);
  const sinceDate = since.toISOString().slice(0, 10);
  const sinceTimestamp = new Date(
    now.getTime() - 14 * 86_400_000,
  ).toISOString();

  const [gscQueries, pageAnalytics, intelFeed] = await Promise.all([
    fetchSupabaseRows<SeoRadarInput['gscQueries'][number]>(
      'gsc_queries',
      new URLSearchParams({
        select: 'query,clicks,impressions,ctr,avg_position,date',
        date: `gte.${sinceDate}`,
        order: 'date.desc',
        limit: '5000',
      }),
      config,
    ),
    fetchSupabaseRows<SeoRadarInput['pageAnalytics'][number]>(
      'page_analytics',
      new URLSearchParams({
        select: 'page_path,views,clicks,impressions,avg_position,date',
        date: `gte.${sinceDate}`,
        order: 'date.desc',
        limit: '5000',
      }),
      config,
    ),
    fetchSupabaseRows<SeoRadarInput['intelFeed'][number]>(
      'intel_feed',
      new URLSearchParams({
        select:
          'title,summary,source_url,source_name,tags,blog_angle,created_at',
        created_at: `gte.${sinceTimestamp}`,
        order: 'created_at.desc',
        limit: '100',
      }),
      config,
    ),
  ]);

  return {
    gscQueries,
    pageAnalytics,
    intelFeed,
    serp: [],
    windowStart: sinceDate,
  };
}

export async function collectSeoRadar(options?: {
  now?: Date;
  limit?: number;
}): Promise<SeoRadarResult> {
  const data = await loadSeoRadarData(options);
  if (!data) throw new Error('SEO_RADAR_SOURCE_UNAVAILABLE');
  return buildSeoRadar(data, {
    now: options?.now,
    limit: options?.limit,
    source: 'supabase',
  });
}

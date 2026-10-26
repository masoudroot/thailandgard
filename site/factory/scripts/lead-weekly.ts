#!/usr/bin/env tsx
/**
 * گزارش هفتگی قیف «تماس و لید» (Q3-09).
 *
 * K1 (کلیک تماس) و K3 (لید ثبت‌شده) را از همان دو جدولی می‌خواند که محصول
 * می‌نویسد (`call_clicks` و `leads` در سوپابیس) و با هفتهٔ قبل مقایسه می‌کند.
 * K2 (نرخ تکمیل فرم) از رویدادهای Clarity می‌آید و تا اتصال توکن API
 * «اندازه‌گیری نشده» گزارش می‌شود؛ عدد ساختگی جایش نمی‌گذاریم.
 *
 * هیچ دادهٔ شخصی خوانده نمی‌شود: از `leads` فقط `created_at`، `source`، `tour_slug`
 * و `status` می‌آید، نه نام، نه شماره، نه پیام.
 *
 * اجرا:
 *   npm run factory:lead-weekly
 *   npm run factory:lead-weekly -- --out docs/ops/lead-weekly-2026-10-26.md
 *   npm run factory:lead-weekly -- --now 2026-10-26T09:00:00Z   (برای بازتولید)
 *
 * متغیرهای محیطی: `SUPABASE_URL` (یا `NEXT_PUBLIC_SUPABASE_URL`) و
 * `SUPABASE_SERVICE_ROLE_KEY`. کلید فقط خوانده می‌شود و هرگز چاپ نمی‌شود.
 *
 * کد خروج: ۰ موفق، ۱ خطای شبکه/داده، ۲ تنظیم ناقص.
 */

import { writeFileSync } from 'node:fs';
import {
  renderWeeklyReport,
  tallyWeek,
  weekWindow,
  type CallClickRow,
  type LeadRow,
} from '../../lib/lead-metrics';

export interface CliArgs {
  out?: string;
  nowMs: number;
}

export function parseArgs(argv: string[], fallbackNowMs: number): CliArgs {
  const args: CliArgs = { nowMs: fallbackNowMs };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') {
      const value = argv[i + 1];
      if (!value) throw new Error('--out نیاز به مسیر دارد');
      args.out = value;
      i += 1;
    } else if (arg === '--now') {
      const value = argv[i + 1];
      const parsed = value ? Date.parse(value) : Number.NaN;
      if (Number.isNaN(parsed)) throw new Error('--now باید تاریخ ISO معتبر باشد');
      args.nowMs = parsed;
      i += 1;
    } else {
      throw new Error(`آرگومان ناشناخته: ${arg}`);
    }
  }
  return args;
}

export interface SupabaseConfig {
  url: string;
  key: string;
}

export function readConfig(env: Record<string, string | undefined> = process.env): SupabaseConfig | null {
  const url = (env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const key = (env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ''), key };
}

async function fetchRows<T>(
  config: SupabaseConfig,
  table: string,
  select: string,
  fromIso: string,
  toIso: string,
  fetchImpl: typeof fetch = fetch,
): Promise<T[]> {
  const query = `select=${select}&created_at=gte.${fromIso}&created_at=lt.${toIso}&order=created_at.asc`;
  const res = await fetchImpl(`${config.url}/rest/v1/${table}?${query}`, {
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
  });
  if (!res.ok) {
    throw new Error(`خواندن ${table} ناموفق بود: HTTP ${res.status}`);
  }
  return (await res.json()) as T[];
}

export async function buildReport(
  config: SupabaseConfig,
  nowMs: number,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const current = weekWindow(nowMs);
  const previous = weekWindow(nowMs, 1);
  const fromIso = new Date(previous.startMs).toISOString();
  const toIso = new Date(current.endMs).toISOString();

  const [leads, clicks] = await Promise.all([
    fetchRows<LeadRow>(config, 'leads', 'created_at,source,tour_slug,status', fromIso, toIso, fetchImpl),
    fetchRows<CallClickRow>(config, 'call_clicks', 'created_at,page,source', fromIso, toIso, fetchImpl),
  ]);

  return renderWeeklyReport({
    current: tallyWeek(leads, clicks, current),
    previous: tallyWeek(leads, clicks, previous),
    formCompletion: null,
    generatedAtMs: nowMs,
  });
}

async function main(): Promise<number> {
  const config = readConfig();
  if (!config) {
    process.stderr.write(
      'تنظیم ناقص: SUPABASE_URL (یا NEXT_PUBLIC_SUPABASE_URL) و SUPABASE_SERVICE_ROLE_KEY لازم است.\n',
    );
    return 2;
  }

  const args = parseArgs(process.argv.slice(2), Date.now());
  const report = await buildReport(config, args.nowMs);
  process.stdout.write(report.endsWith('\n') ? report : `${report}\n`);
  if (args.out) {
    writeFileSync(args.out, report, 'utf8');
    process.stderr.write(`گزارش در ${args.out} نوشته شد.\n`);
  }
  return 0;
}

if (process.argv[1] && /lead-weekly\.(ts|js|mts|mjs)$/.test(process.argv[1])) {
  main()
    .then((code) => process.exit(code))
    .catch((error: unknown) => {
      process.stderr.write(`گزارش ساخته نشد: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    });
}

/**
 * Q4-05: نمونه‌گیری SLO روی مسیرهای بحرانی.
 *
 * چرا جدا از `uptime-probe.mjs`: آن پایش «بالا بودن» است و تصمیم Issue می‌گیرد.
 * این پروب «کیفیت پاسخ» را می‌سنجد: نرخ ۵xx، زمان پاسخ، و سوزاندن بودجهٔ خطا.
 *
 * خروجی: کد ۰ اگر SLO در وضعیت ok بود، کد ۱ اگر `burning` یا `breached`.
 * در محیط CI: یک گزارش JSON آپلود می‌شود و کانال تلگرام هشدار می‌گیرد.
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { sendTelegram } from './uptime-probe.mjs';
import {
  evaluateSlo,
  formatSloLine,
  percentile,
  SLO,
  type SloReport,
} from '../../lib/slo';

/** تعهد سرعت سرویس سلامت، از همان منبع واحد. */
const SLO_HEALTH_P95_MS = SLO.healthP95Ms;

/** همان مسیرهای بحرانی، بدون شرط محتوایی: کد HTTP خودش کافی است. */
export const SLO_PROBE_TARGETS = [
  { name: 'health', label: 'سرویس سلامت', url: 'https://thailandgard.ir/api/health' },
  { name: 'home', label: 'صفحه اصلی', url: 'https://thailandgard.ir/' },
  {
    name: 'tours',
    label: 'صفحهٔ تور شاخص',
    url: 'https://thailandgard.ir/tours/phuket-7-days',
  },
  {
    name: 'guide',
    label: 'راهنما',
    url: 'https://thailandgard.ir/guide/thailand-visa-guide',
  },
];

export const SLO_PROBE_ATTEMPTS = 3;
export const SLO_PROBE_RETRY_DELAY_MS = 5000;
export const SLO_PROBE_TIMEOUT_MS = 15000;

export interface SloSample {
  url: string;
  status: number;
  ms: number;
}

export interface ProbeOptions {
  fetchImpl?: typeof fetch;
  attempts?: number;
  delayMs?: number;
  timeoutMs?: number;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** یک URL را چند بار می‌زند و همهٔ پاسخ‌ها را برمی‌گرداند. */
export async function probeSamples(
  url: string,
  {
    fetchImpl = fetch,
    attempts = SLO_PROBE_ATTEMPTS,
    delayMs = SLO_PROBE_RETRY_DELAY_MS,
    timeoutMs = SLO_PROBE_TIMEOUT_MS,
  }: ProbeOptions = {},
): Promise<SloSample[]> {
  const samples: SloSample[] = [];
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const startedAt = Date.now();
    try {
      // AbortSignal.timeout به‌جای controller + setTimeout دستی: تایمر آن
      // unref است، پس پروسه بعد از پایان کار واقعاً خارج می‌شود. با نسخهٔ
      // دستی، حلقهٔ رویداد زنده می‌ماند و CI تا تایم‌اوت جاب آویزان می‌شد.
      const res = await fetchImpl(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { 'user-agent': 'thailandgard-slo-probe/1' },
      });
      samples.push({ url, status: res.status, ms: Date.now() - startedAt });
    } catch {
      samples.push({ url, status: 0, ms: Date.now() - startedAt });
    }
    if (attempt < attempts && delayMs > 0) await sleep(delayMs);
  }
  return samples;
}

export interface SloProbeResult extends SloReport {
  /** نمونه‌های خام؛ گزارش برای صدک و ردیابی به آن‌ها نیاز دارد. */
  samples: SloSample[];
}

export async function runSloProbe(options: ProbeOptions = {}): Promise<SloProbeResult> {
  const all: SloSample[] = [];
  for (const target of SLO_PROBE_TARGETS) {
    const samples = await probeSamples(target.url, options);
    all.push(...samples);
  }
  return { ...evaluateSlo(all), samples: all };
}

/** صدک زمان پاسخ یک مسیر مشخص؛ برای بررسی تعهد سرعت سرویس سلامت. */
export function latencyP95(result: SloSample[]): number | null {
  return percentile(result.map((sample) => sample.ms), 0.95);
}

/** خروجی انسان‌خوان. */
export function formatSloReport(report: SloReport): string {
  const lines = [formatSloLine(report)];
  lines.push(`نمونه‌ها: ${report.total}، شکست‌ها: ${report.failures}`);
  const healthMs = report.slowest;
  if (healthMs) {
    lines.push(`کندترین نمونه: ${healthMs.ms}ms — ${healthMs.url}`);
  }
  return lines.join('\n');
}

function gh(args: string[], input?: string): string {
  return execFileSync('gh', args, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

export function findOpenSloIssue(): { number: number; updatedAt: number } | null {
  try {
    const out = gh([
      'issue',
      'list',
      '--label',
      'ops',
      '--state',
      'open',
      '--search',
      'slo in:title',
      '--json',
      'number,title,updatedAt',
    ]);
    const list = JSON.parse(out || '[]');
    const hit = list.find(
      (i: { title?: string }) => typeof i.title === 'string' && i.title.includes('slo'),
    );
    return hit ? { number: hit.number, updatedAt: Date.parse(hit.updatedAt) } : null;
  } catch {
    return null;
  }
}

export function createSloIssue(text: string, run: string): string | null {
  try {
    return gh(
      ['issue', 'create', '--title', '🚨 slo: بودجهٔ خطا در خطر است', '--label', 'ops', '--body-file', '-'],
      `${text}\n\nrun: ${run || 'manual'}\n`,
    );
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const runUrl = process.env.GITHUB_RUN_URL || 'manual';
  const now = new Date().toISOString();

  const report = await runSloProbe();
  const line = formatSloReport(report);
  process.stdout.write(`${line}\n`);

  // تعهد سرعت سلامت جدا از نرخ خطا گزارش می‌شود. با سه نمونه، p95 همان کندترین
  // نمونه است، پس عدد برای هشدار زودهنگام قابل اتکا نیست؛ فقط ثبت می‌شود.
  const healthSamples = report.samples.filter((sample) =>
    sample.url.endsWith('/api/health'),
  );
  const healthP95 = latencyP95(healthSamples);
  process.stdout.write(
    `health p95: ${healthP95 === null ? 'ندارد' : `${healthP95}ms (هدف ≤ ${SLO_HEALTH_P95_MS}ms)`}\n`,
  );

  const reportPath = 'slo-report.json';
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        auditedAt: now,
        samples: report.total,
        failures: report.failures,
        errorRate: report.errorRate,
        status: report.status,
        slowest: report.slowest,
        healthP95,
        healthP95Target: SLO_HEALTH_P95_MS,
      },
      null,
      2,
    ),
    'utf8',
  );

  if (report.status === 'ok') {
    process.exitCode = 0;
    return;
  }

  // هشدار: کانال تلگرام اگر فعال باشد، وگرنه Issue همیشه می‌سازیم.
  const text = [
    `SLO ${report.status === 'burning' ? 'در حال سوختن' : 'تمام'} شد`,
    `نمونه: ${report.total}، خطا: ${report.failures}، نرخ: ${(report.errorRate * 100).toFixed(2)}٪`,
    `بودجه: ${(report.budgetSpentFraction * 100).toFixed(0)}٪ مصرف‌شده (سقف ۱۰۰٪)`,
    line,
    '',
    `run: ${runUrl}`,
  ].join('\n');

  const telegramSent = await sendTelegram(text, {
    token: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  });
  process.stdout.write(`telegram=${telegramSent ? 'sent' : 'skipped'}\n`);

  const openIssue = findOpenSloIssue();
  if (openIssue) {
    process.stdout.write(`issue ${openIssue.number} already open: ${openIssue.updatedAt}\n`);
  } else {
    const url = createSloIssue(text, runUrl);
    process.stdout.write(url ? `issue created: ${url}\n` : 'issue create unavailable\n');
  }

  process.exitCode = 1;
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return import.meta.url === pathToFileURL(entry).href;
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  main().catch((error) => {
    const msg = error instanceof Error ? error.message : String(error);
    process.stderr.write(`slo-probe error: ${msg}\n`);
    process.exitCode = 1;
  });
}

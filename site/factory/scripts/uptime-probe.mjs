#!/usr/bin/env node
/**
 * Uptime probe برای سایت تولید (Q4-01).
 *
 * سه نقطه را می‌زند: /api/health، صفحهٔ اصلی، یک صفحهٔ تور.
 * هر نقطه سه بار تلاش می‌کند؛ فقط اگر هر سه تلاش شکست بخورد «خراب» حساب می‌شود
 * تا یک لرزش شبکه‌ای باعث هشدار الکی نشود.
 *
 * وضعیت بین اجراها در خودِ Issue نگه داشته می‌شود (بدون cache و بدون سرویس اضافه):
 *   - خراب شد و Issue باز نیست  -> Issue جدید + هشدار تلگرام
 *   - خراب ماند و ۶ ساعت گذشته  -> یادآوری روی همان Issue
 *   - سالم شد و Issue باز است   -> پیام بهبودی + بستن Issue
 *
 * کانال هشدار: تلگرام اگر TELEGRAM_BOT_TOKEN و TELEGRAM_CHAT_ID تنظیم باشند،
 * وگرنه همان Issue گیت‌هاب (همیشه ساخته می‌شود، پس هشدار هیچ‌وقت گم نمی‌شود).
 *
 * خروجی: کد ۰ اگر همه سالم، کد ۱ اگر حداقل یکی خراب.
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

export const TARGETS = [
  {
    name: 'health',
    label: 'سرویس سلامت',
    url: 'https://thailandgard.ir/api/health',
    ok: (body) => /"status"\s*:\s*"ok"/.test(body),
  },
  {
    name: 'home',
    label: 'صفحه اصلی',
    url: 'https://thailandgard.ir/',
    ok: (body) => body.length > 5000 && body.includes('تایلند'),
  },
  {
    name: 'tour',
    label: 'صفحه تور',
    url: 'https://thailandgard.ir/tours/phuket-7-days',
    ok: (body) => body.length > 5000 && body.includes('پوکت'),
  },
];

export const ATTEMPTS = 3;
export const RETRY_DELAY_MS = 5000;
export const REMINDER_MS = 6 * 60 * 60 * 1000;
export const ISSUE_TITLE = '🚨 uptime: سایت در دسترس نیست';
export const ISSUE_LABEL = 'ops';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** یک نقطه را با تلاش مجدد می‌زند. fetch قابل تزریق است تا تست شود.
 * @param {{ name: string, label: string, url: string, ok: (body: string) => boolean }} target
 * @param {{ fetchImpl?: typeof fetch, attempts?: number, delayMs?: number, timeoutMs?: number }} [options]
 */
export async function probeTarget(target, { fetchImpl = fetch, attempts = ATTEMPTS, delayMs = RETRY_DELAY_MS, timeoutMs = 15000 } = {}) {
  let lastError = 'unknown';
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetchImpl(target.url, { signal: controller.signal, headers: { 'user-agent': 'thailandgard-uptime/1' } });
      clearTimeout(timer);
      if (!res.ok) {
        lastError = `HTTP ${res.status}`;
      } else {
        const body = await res.text();
        if (target.ok(body)) {
          return { name: target.name, label: target.label, url: target.url, ok: true, detail: `HTTP ${res.status}` };
        }
        lastError = 'محتوای صفحه مطابق انتظار نبود';
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    if (attempt < attempts) await sleep(delayMs);
  }
  return { name: target.name, label: target.label, url: target.url, ok: false, detail: lastError };
}

/**
 * تصمیم بر اساس نتیجهٔ probe و Issue باز.
 * @param {Array<{ ok: boolean }>} results
 * @param {{ number: number, updatedAt: number } | null} openIssue
 * @param {number} [now]
 * @param {number} [reminderMs]
 * @returns {'create' | 'remind' | 'recover' | 'none'}
 */
export function decide(results, openIssue, now = Date.now(), reminderMs = REMINDER_MS) {
  const down = results.some((r) => !r.ok);
  if (down) {
    if (!openIssue) return 'create';
    const updated = Number(openIssue.updatedAt) || 0;
    return now - updated >= reminderMs ? 'remind' : 'none';
  }
  return openIssue ? 'recover' : 'none';
}

const PERSIAN_TIME = new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
  timeZone: 'Asia/Tehran',
  dateStyle: 'short',
  timeStyle: 'short',
});

/** متن پیام هشدار یا بهبودی.
 * @param {string} kind
 * @param {Array<{ label: string, ok: boolean, detail: string }>} results
 * @param {number} [now]
 */
export function formatAlert(kind, results, now = Date.now()) {
  const head =
    kind === 'recover' ? '✅ سایت دوباره سالم شد' : kind === 'remind' ? '⏰ یادآوری: سایت هنوز خراب است' : '🚨 سایت در دسترس نیست';
  const lines = [head, `زمان تهران: ${PERSIAN_TIME.format(new Date(now))}`, ''];
  for (const r of results) lines.push(`${r.ok ? '✅' : '❌'} ${r.label} - ${r.detail}`);
  return lines.join('\n');
}

/** ارسال تلگرام. true یعنی API تحویل را پذیرفت.
 * @param {string} text
 * @param {{ token?: string, chatId?: string, fetchImpl?: typeof fetch }} [options]
 */
export async function sendTelegram(text, { token, chatId, fetchImpl = fetch } = {}) {
  if (!token || !chatId) return false;
  try {
    const res = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function gh(args, input) {
  return execFileSync('gh', args, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

/** Issue باز مربوط به uptime، اگر باشد. */
export function findOpenIssue() {
  try {
    const out = gh(['issue', 'list', '--label', ISSUE_LABEL, '--state', 'open', '--search', 'uptime in:title', '--json', 'number,title,updatedAt']);
    const list = JSON.parse(out || '[]');
    const hit = list.find((i) => typeof i.title === 'string' && i.title.includes('uptime'));
    return hit ? { number: hit.number, updatedAt: Date.parse(hit.updatedAt) } : null;
  } catch (error) {
    console.error(`issue lookup failed: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function createIssue(text, run) {
  try {
    return gh(['issue', 'create', '--title', ISSUE_TITLE, '--label', ISSUE_LABEL, '--body-file', '-'], `${text}\n\nrun: ${run || 'manual'}\n`);
  } catch (error) {
    console.error(`issue create failed: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function commentIssue(number, text, run, close) {
  try {
    gh(['issue', 'comment', String(number), '--body-file', '-'], `${text}\n\nrun: ${run || 'manual'}\n`);
    if (close) gh(['issue', 'close', String(number), '--reason', 'completed']);
    return true;
  } catch (error) {
    console.error(`issue comment failed: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function main() {
  const simulate = process.argv.includes('--simulate-failure');
  const runUrl = process.env.GITHUB_RUN_URL || `https://github.com/${process.env.GITHUB_REPOSITORY || ''}/actions/runs/${process.env.GITHUB_RUN_ID || ''}`;

  let results = [];
  for (const target of TARGETS) results.push(await probeTarget(target));
  if (simulate) {
    results = results.map((r) => (r.name === 'health' ? { ...r, ok: false, detail: 'شبیه‌سازی خرابی برای آزمون کانال هشدار' } : r));
  }

  const openIssue = findOpenIssue();
  const action = decide(results, openIssue);
  writeFileSync('uptime-report.json', `${JSON.stringify({ results, openIssue, action }, null, 2)}\n`, 'utf8');

  for (const r of results) console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${r.name} - ${r.detail}`);
  console.log(`action=${action} openIssue=${openIssue ? openIssue.number : 'none'}`);

  const text = action === 'none' ? '' : formatAlert(action, results);
  const telegramSent = text ? await sendTelegram(text, { token: process.env.TELEGRAM_BOT_TOKEN, chatId: process.env.TELEGRAM_CHAT_ID }) : false;
  if (text) console.log(`telegram=${telegramSent ? 'sent' : 'skipped'}`);

  if (action === 'create') {
    const url = createIssue(text, runUrl);
    console.log(url ? `issue created: ${url}` : 'issue create unavailable');
  } else if (action === 'remind') {
    commentIssue(openIssue.number, text, runUrl, false);
    console.log(`issue ${openIssue.number} reminded`);
  } else if (action === 'recover') {
    commentIssue(openIssue.number, text, runUrl, true);
    console.log(`issue ${openIssue.number} closed`);
  }

  const down = results.some((r) => !r.ok);
  process.exit(down ? 1 : 0);
}

const invokedDirectly = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('site/factory/scripts/uptime-probe.mjs');
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

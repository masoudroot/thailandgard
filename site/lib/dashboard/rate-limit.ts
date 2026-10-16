/**
 * lib/dashboard/rate-limit.ts — محدودکننده نرخ ساده برای ورود ادمین.
 *
 * سیاست: ۵ تلاش ناموفق از یک IP ← بلاک ۱۵ دقیقه‌ای.
 * شمارش موفق، شمارنده را صفر می‌کند.
 *
 * نکته معماری: حافظه درون‌حافظه‌ای (in-memory) است و روی یک نمونه
 * سرور Node دائمی (مثل Prisma Compute) درست کار می‌کند. در محیط
 * serverless چندنمونه‌ای، هر نمونه شمارنده خودش را دارد؛ برای
 * سناریوی تک‌ادمین این سامانه کافی است.
 */

const MAX_ATTEMPTS = 5;
const BLOCK_MS = 15 * 60 * 1000; // ۱۵ دقیقه

interface AttemptRecord {
  failures: number;
  blockedUntil: number; // timestamp ms؛ صفر یعنی بلاک نیست
  lastAttempt: number;
}

const attempts = new Map<string, AttemptRecord>();

/** پاک‌سازی دوره‌ای رکوردهای منقضی (هر ۱۰ دقیقه یک‌بار). */
let lastSweep = 0;
function sweep(now: number): void {
  if (now - lastSweep < 10 * 60 * 1000) return;
  lastSweep = now;
  for (const [ip, rec] of attempts) {
    if (rec.blockedUntil < now && now - rec.lastAttempt > BLOCK_MS) {
      attempts.delete(ip);
    }
  }
}

/** آیا این IP الان بلاک است؟ */
export function isBlocked(ip: string): boolean {
  const now = Date.now();
  sweep(now);
  const rec = attempts.get(ip);
  if (!rec) return false;
  if (rec.blockedUntil > now) return true;
  return false;
}

/** چند ثانیه تا پایان بلاک مانده (صفر اگر بلاک نیست). */
export function blockRemainingSeconds(ip: string): number {
  const rec = attempts.get(ip);
  if (!rec) return 0;
  const ms = rec.blockedUntil - Date.now();
  return ms > 0 ? Math.ceil(ms / 1000) : 0;
}

/** ثبت تلاش ناموفق؛ اگر به سقف رسید، بلاک می‌کند. */
export function recordFailure(ip: string): void {
  const now = Date.now();
  const rec = attempts.get(ip) ?? { failures: 0, blockedUntil: 0, lastAttempt: 0 };
  rec.failures += 1;
  rec.lastAttempt = now;
  if (rec.failures >= MAX_ATTEMPTS) {
    rec.blockedUntil = now + BLOCK_MS;
    rec.failures = 0; // بعد از بلاک، شمارش از نو
  }
  attempts.set(ip, rec);
}

/** ثبت ورود موفق؛ شمارنده IP صفر می‌شود. */
export function recordSuccess(ip: string): void {
  attempts.delete(ip);
}

/** استخراج IP کلاینت از هدرها (پشت پراکسی). */
export function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get('x-real-ip')?.trim();
  if (real) return real;
  return 'unknown';
}

/**
 * lib/dashboard/admin-auth.ts — احراز هویت ادمین پنل.
 *
 * مدل جدید (دستور مسعود):
 * - یوزرنیم از متغیر محیطی ADMIN_USERNAME
 * - رمز با bcrypt مقایسه می‌شود در برابر ADMIN_PASSWORD_HASH
 * - رمز plaintext هیچ‌جا (کد، لاگ، کوکی) نوشته نمی‌شود
 *
 * توکن سشن: مقدار قطعیِ SHA-256 از «یوزرنیم:هش‌بکرipt» که فقط از
 * متغیرهای محیطی ساخته می‌شود؛ پس proxy (اج) هم بدون دیتابیس
 * می‌تواند سشن را اعتبارسنجی کند. تغییر هر متغیر، سشن‌ها را باطل می‌کند.
 */

import { compare } from 'bcryptjs';
import { timingSafeEqual } from 'crypto';

/** SHA-256 hex با Web Crypto (سازگار با Edge). */
export async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** یوزرنیم ادمین از env (null اگر ست نشده). */
export function getAdminUsername(): string | null {
  const u = process.env.ADMIN_USERNAME?.trim();
  return u ? u : null;
}

/** هش bcrypt رمز از env (null اگر ست نشده یا قالب bcrypt نباشد). */
export function getAdminPasswordHash(): string | null {
  const h = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (!h) return null;
  // قالب bcrypt: $2a$ / $2b$ / $2y$ + cost + salt+hash
  if (!/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(h)) return null;
  return h;
}

/** آیا احراز هویت یوزرنیم/پسوردی پیکربندی شده است؟ */
export function isAdminAuthConfigured(): boolean {
  return getAdminUsername() !== null && getAdminPasswordHash() !== null;
}

/**
 * راستی‌آزمایی یوزرنیم + رمز.
 * یوزرنیم با مقایسه زمان‌ثابت؛ رمز با bcrypt.compare.
 * هرگز true برنمی‌گرداند اگر پیکربندی ناقص باشد.
 */
export async function verifyAdminCredentials(
  username: string,
  password: string,
): Promise<boolean> {
  const expectedUser = getAdminUsername();
  const expectedHash = getAdminPasswordHash();
  if (!expectedUser || !expectedHash) return false;
  if (!username || !password) return false;

  // مقایسه زمان‌ثابت یوزرنیم (روی بافر هم‌طول‌شده برای جلوگیری از نشت طول)
  const a = Buffer.from(username, 'utf8');
  const b = Buffer.from(expectedUser, 'utf8');
  let userOk = a.length === b.length;
  if (userOk) {
    userOk = timingSafeEqual(a, b);
  } else {
    // حتی اگر طول فرق داشت، باز bcrypt را اجرا کن تا زمان پاسخ لو ندهد
    // که یوزرنیم درست بوده یا نه.
    timingSafeEqual(Buffer.from('x'.repeat(b.length)), b);
  }

  // bcrypt.compare خودش زمان‌ثابت است؛ همیشه اجراش کن.
  const passOk = await compare(password, expectedHash);
  return userOk && passOk;
}

/**
 * مقدار توکن سشن: مشتق قطعی از متغیرهای محیطی.
 * در کوکی ذخیره می‌شود؛ خودِ هش bcrypt هرگز به کلاینت نمی‌رود.
 */
export async function adminSessionValue(): Promise<string | null> {
  const u = getAdminUsername();
  const h = getAdminPasswordHash();
  if (!u || !h) return null;
  return sha256Hex(`${u}:${h}`);
}

/** اعتبارسنجی توکن سشن در برابر مقدار موردانتظار. */
export async function isValidAdminSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const expected = await adminSessionValue();
  if (!expected || token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token, 'utf8'), Buffer.from(expected, 'utf8'));
}

// ---------------------------------------------------------------------------
// سازگاری عقب: مسیر قدیمیِ فقط-رمز (settings یا ADMIN_PASSWORD).
// نگه داشته شده تا proxy و کدهای قدیمی نشکنند؛ مسیر جدید اولویت دارد.
// ---------------------------------------------------------------------------

/** خواندن هش SHA-256 ذخیره‌شده در settings (null اگر نباشد). */
async function readStoredHash(): Promise<string | null> {
  try {
    const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!url || !key) return null;
    const res = await fetch(
      `${url}/rest/v1/settings?key=eq.admin_password_hash&select=value`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ value?: unknown }>;
    const v = rows?.[0]?.value;
    return typeof v === 'string' && /^[0-9a-f]{64}$/.test(v) ? v : null;
  } catch {
    return null;
  }
}

/** هش موردانتظار رمز ادمین (مسیر قدیمی): اول settings، بعد env. */
export async function getExpectedPasswordHash(): Promise<string> {
  const stored = await readStoredHash();
  if (stored) return stored;
  return sha256Hex(process.env.ADMIN_PASSWORD ?? 'changeme');
}

/** آیا رمز از داشبورد (settings) تعیین شده یا از env می‌آید. */
export async function isPasswordFromSettings(): Promise<boolean> {
  return (await readStoredHash()) !== null;
}

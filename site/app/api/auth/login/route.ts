import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/dashboard/auth';
import {
  adminSessionValue,
  isAdminAuthConfigured,
  verifyAdminCredentials,
} from '@/lib/dashboard/admin-auth';
import {
  blockRemainingSeconds,
  clientIp,
  isBlocked,
  recordFailure,
  recordSuccess,
} from '@/lib/dashboard/rate-limit';

/**
 * ورود ادمین: یوزرنیم + پسورد.
 * - یوزرنیم از ADMIN_USERNAME، رمز با bcrypt در برابر ADMIN_PASSWORD_HASH
 * - ۵ تلاش ناموفق از یک IP ← بلاک ۱۵ دقیقه‌ای
 * - هیچ‌وقت رمز (حتی هش) در پاسخ یا لاگ برنمی‌گردد
 */
export async function POST(request: NextRequest) {
  let body: { username?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'درخواست نامعتبر است.' }, { status: 400 });
  }

  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!username || !password) {
    return NextResponse.json(
      { ok: false, error: 'نام کاربری و رمز عبور را وارد کنید.' },
      { status: 400 },
    );
  }

  const ip = clientIp(request);

  if (isBlocked(ip)) {
    const secs = blockRemainingSeconds(ip);
    const mins = Math.max(1, Math.ceil(secs / 60));
    return NextResponse.json(
      {
        ok: false,
        error: `تلاش‌های ناموفق زیاد بود. ${mins} دقیقه دیگر دوباره تلاش کنید.`,
        blocked: true,
      },
      { status: 429 },
    );
  }

  if (!isAdminAuthConfigured()) {
    // پیکربندی ناقص است؛ چیزی لو نده.
    return NextResponse.json(
      { ok: false, error: 'ورود ادمین پیکربندی نشده است.' },
      { status: 503 },
    );
  }

  const ok = await verifyAdminCredentials(username, password);

  if (!ok) {
    recordFailure(ip);
    // تأخیر کوچک برای کند کردن حملات خودکار.
    await new Promise((r) => setTimeout(r, 600));
    // عمداً نمی‌گوییم یوزرنیم اشتباه بود یا رمز.
    return NextResponse.json(
      { ok: false, error: 'نام کاربری یا رمز عبور اشتباه است.' },
      { status: 401 },
    );
  }

  recordSuccess(ip);
  const session = await adminSessionValue();

  const res = NextResponse.json({ ok: true });
  if (session) {
    res.cookies.set(SESSION_COOKIE, session, sessionCookieOptions());
  }
  return res;
}

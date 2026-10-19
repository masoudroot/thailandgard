import { NextRequest, NextResponse } from 'next/server';
import { isValidAdminSession } from './lib/dashboard/admin-auth';

export const SESSION_COOKIE = 'tg-admin';

const PUBLIC_PATHS = new Set(['/api/health', '/api/auth/login', '/login']);

/** خواندن سکرت کرون نرخ‌ها از جدول settings (null اگر نباشد). */
async function readRatesCronSecret(): Promise<string | null> {
  try {
    const url = process.env.SUPABASE_URL?.trim();
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!url || !key) return null;
    const res = await fetch(
      `${url}/rest/v1/settings?key=eq.rates_cron_secret&select=value`,
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
    return typeof v === 'string' && v.length >= 16 ? v : null;
  } catch {
    return null;
  }
}

/** مسیرهایی که کرون زمان‌بندی‌شده با هدر مخفی هم می‌تواند صدا بزند. */
const CRON_PATHS = new Set(['/api/rates/fetch']);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host')?.split(':')[0].toLowerCase();
  const publicHost = host === 'thailandgard.ir' || host === 'www.thailandgard.ir';

  if (publicHost && pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone();
    url.protocol = 'https:';
    url.host = 'admin.thailandgard.ir';
    url.port = '';
    return NextResponse.redirect(url, 308);
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // احراز کرون: هدر مخفیِ ست‌شده در متغیر محیطی RATES_CRON_SECRET
  // یا کلید rates_cron_secret در جدول settings
  if (CRON_PATHS.has(pathname)) {
    const provided = request.headers.get('x-cron-secret');
    if (provided) {
      const envSecret = process.env.RATES_CRON_SECRET;
      if (envSecret && provided.length === envSecret.length && provided === envSecret) {
        return NextResponse.next();
      }
      const storedSecret = await readRatesCronSecret();
      if (storedSecret && provided.length === storedSecret.length && provided === storedSecret) {
        return NextResponse.next();
      }
    }
  }

  const protectedApi = pathname.startsWith('/api/');
  const protectedDashboard = pathname.startsWith('/dashboard');

  // API مدیریتی («مدیر داشبورد»): با Bearer <توکن مدیر> خودش احراز می‌شود، نه کوکی ادمین.
  // روت‌های /api/manager/* خودشان توکن را چک می‌کنند.
  if (pathname.startsWith('/api/manager/') && !pathname.startsWith('/api/manager/keys')) {
    return NextResponse.next();
  }

  if (protectedApi || protectedDashboard) {
    const session = request.cookies.get(SESSION_COOKIE)?.value;
    // مسیر جدید (یوزرنیم + bcrypt) اولویت دارد.
    const authed = await isValidAdminSession(session);

    if (authed) {
      return NextResponse.next();
    }
    if (protectedApi) {
      return NextResponse.json({ ok: false, error: 'احراز هویت لازم است.' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

/**
 * فقط مسیرهای داشبورد را می‌گیرد؛ APIهای عمومی سایت
 * (callback، track-call، internal) دست نخورده می‌مانند.
 */
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/api/auth/:path*',
    '/api/bridge/:path*',
    '/api/cycles/:path*',
    '/api/errors/:path*',
    '/api/github/:path*',
    '/api/health',
    '/api/knowledge/:path*',
    '/api/live/:path*',
    '/api/manager/:path*',
    '/api/memory/:path*',
    '/api/notify/:path*',
    '/api/planning/:path*',
    '/api/queue/:path*',
    '/api/rag/:path*',
    '/api/rates/:path*',
    '/api/settings/:path*',
    '/api/subagents/:path*',
    '/api/tasks/:path*',
    '/api/teams/:path*',
  ],
};

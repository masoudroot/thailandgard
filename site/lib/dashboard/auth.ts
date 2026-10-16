import type { NextRequest } from 'next/server';
import { isValidAdminSession } from './admin-auth';

export const SESSION_COOKIE = 'tg-admin';

/**
 * آیا درخواست، سشن ادمین معتبر دارد؟
 * توکن سشن فقط از متغیرهای محیطی (ADMIN_USERNAME / ADMIN_PASSWORD_HASH)
 * ساخته می‌شود؛ تغییر آن‌ها سشن‌ها را باطل می‌کند.
 */
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  return isValidAdminSession(session);
}

/** Cookie options مشترک login (ست) و logout (پاک). */
export function sessionCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // ۷ روز
  };
}

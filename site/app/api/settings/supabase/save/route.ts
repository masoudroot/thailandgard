/**
 * POST /api/settings/supabase/save: اعتبارسنجی تنظیمات سوپابیس.
 *
 * ورودی: { url, anonKey, serviceKey }
 *
 * در Netlify متغیرهای محیطی از پنل Site configuration > Environment variables
 * مدیریت می‌شوند و تغییر آن‌ها از داخل برنامه انجام نمی‌شود. این روت مقادیر را
 * اعتبارسنجی می‌کند و نام متغیرهای لازم را برمی‌گرداند تا مدیر آن‌ها را در پنل
 * ثبت کند و سایت را دوباره منتشر کند.
 */

import { fail, ok } from '../../../../../lib/dashboard/api';

type SaveBody = {
  url?: unknown;
  anonKey?: unknown;
  serviceKey?: unknown;
};

function isNonEmpty(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

const VAR_NAMES = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

/** POST /api/settings/supabase/save */
export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json().catch(() => ({}))) as SaveBody;
    if (!isNonEmpty(body.url) || !isNonEmpty(body.serviceKey)) {
      return fail('آدرس سوپابیس و کلید service_role لازم است.', 400);
    }

    const url = body.url.trim();

    try {
      new URL(url);
    } catch {
      return fail('آدرس سوپابیس معتبر نیست.', 400);
    }

    return ok({
      saved: false,
      needsManual: true,
      varNames: [...VAR_NAMES],
      message: 'در Netlify متغیرهای محیطی از پنل مدیریت می‌شوند. مقادیر را در پنل ثبت کنید و سایت را دوباره منتشر کنید.',
      steps: [
        'در Netlify به Site configuration > Environment variables بروید.',
        'مقدارهای NEXT_PUBLIC_SUPABASE_URL، NEXT_PUBLIC_SUPABASE_ANON_KEY، SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY را ثبت کنید.',
        'از بخش Deploys دستور Trigger deploy را بزنید تا مقادیر جدید اعمال شوند.',
      ],
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}

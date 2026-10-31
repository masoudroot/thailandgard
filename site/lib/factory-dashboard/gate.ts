/**
 * گیت داشبورد کارخانه (DASH-01): همان سازوکار داشبورد قدیمی.
 * کوکی tg-admin با isValidAdminSession سنجیده می‌شود؛ مقدار توکن از
 * متغیرهای محیطی ADMIN_USERNAME و ADMIN_PASSWORD_HASH ساخته می‌شود.
 * کاربر غیرمجاز «login» می‌گیرد و صفحه هیچ داده‌ای نشان نمی‌دهد.
 */
import { isValidAdminSession } from "@/lib/dashboard/admin-auth";

export async function getDashboardGate(
  cookieValue: string | undefined,
): Promise<"allow" | "login"> {
  const ok = await isValidAdminSession(cookieValue);
  return ok ? "allow" : "login";
}

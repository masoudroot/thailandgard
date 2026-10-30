/**
 * نگهبان سمت سرور برای Gateway مدل.
 *
 * این ماژول را همهٔ ماژول‌های Gateway در اول وارد می‌کنند تا اگر کسی آن‌ها را
 * از مرورگر وارد کرد، همان‌جا با throw بایستد و هیچ فراخوانی از مرورگر
 * انجام نشود.
 *
 * انحراف آگاهانه: بستهٔ `server-only` در package-lock.json نیست و افزودنش
 * وابستگی تازه است که ADR و تأیید صریح می‌خواهد. پس به‌جای import مستقیم
 * آن بسته، این نگهبان زمان اجرا همان مرز را نگه می‌دارد و import صریح
 * `server-only` به بستهٔ بعدی موکول شده است.
 */
if (typeof window !== "undefined") {
  throw new Error(
    "model gateway modules are server-only and must never run in the browser",
  );
}

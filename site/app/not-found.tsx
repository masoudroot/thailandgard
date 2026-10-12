import { ErrorPage } from "@/components/templates/error-pages";

/**
 * صفحهٔ ۴۰۴. ایمپورت واقعی آیتم templates/error-pages رجیستری وایب‌فارسی.
 * باکس جست‌وجو عمداً خاموش است: سایت جست‌وجو ندارد (انحراف ثبت‌شده در اسپک).
 */
export default function NotFound() {
  return <ErrorPage kind="404" search={false} primaryHref="/" secondaryHref="/guide" />;
}

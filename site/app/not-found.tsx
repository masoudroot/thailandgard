import { ErrorPage } from "@/components/templates/error-pages";
import { CallButtons } from "@/components/site/CallButtons";
import { TourCard } from "@/components/site/TourCard";
import { getTours } from "@/lib/db-content";

/**
 * صفحهٔ ۴۰۴. ایمپورت واقعی آیتم templates/error-pages رجیستری وایب‌فارسی.
 * باکس جست‌وجو عمداً خاموش است: سایت جست‌وجو ندارد (انحراف ثبت‌شده در اسپک).
 * نبض دیزاین D-028: ۳ تور پرطرفدار + CTA تماس زیر صفحهٔ ۴۰۴؛ هستهٔ تمپلیت
 * دست‌نخورده می‌ماند، محتوای اضافه در سطح استفاده داده می‌شود.
 */
export default async function NotFound() {
  const tours = (await getTours()).slice(0, 3);
  return (
    <>
      <ErrorPage kind="404" search={false} primaryHref="/" secondaryHref="/guide" />
      <section className="mx-auto w-full max-w-5xl px-6 pb-16">
        <h2 className="text-center text-xl font-bold">شاید دنبال یکی از این‌ها بودید</h2>
        <p className="mt-2 text-center text-sm leading-7 text-muted-foreground">
          تورهای پرطرفدار تایلندگرد:
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {tours.map((tour) => (
            <TourCard key={tour.slug} tour={tour} />
          ))}
        </div>
        <div className="mx-auto mt-8 max-w-md">
          <CallButtons compact />
        </div>
      </section>
    </>
  );
}

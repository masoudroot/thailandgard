import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * هیروی انسانی صفحهٔ دربارهٔ ما (فاز ۴).
 * عکس واقعی تیم در دسترس نیست؛ پس به‌جای عکس استوک، قاب تایپوگرافیک
 * (الگوی bg-frame-typographic صفحهٔ تماس) با تیتر و زیرتیتر وایرفریم.
 */
export function AboutHero() {
  return (
    <section className="px-6 pt-10">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-surface border border-border bg-frame-typographic px-6 py-10 text-center sm:px-12 sm:py-12">
        <p className="inline-flex items-center gap-2 rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-brand-foreground">
          دربارهٔ تایلندگرد
        </p>
        <h1 className="text-balance mx-auto mt-4 max-w-2xl font-display text-3xl leading-[1.4] sm:text-4xl">
          تایلند رو با متخصصش بگرد
        </h1>
        <p className="text-pretty mx-auto mt-4 max-w-xl text-base leading-[1.9] text-muted-foreground">
          تیمی که فقط تایلند کار می‌کند؛ با مشاورهٔ رایگان، قیمت شفاف و لیدر فارسی‌زبان.
        </p>
        <div className="mt-7">
          <Button asChild size="lg" variant="brand" className="w-full rounded-full px-8 sm:w-auto">
            <a href="#callback">
              <Phone aria-hidden />
              مشاورهٔ رایگان
            </a>
          </Button>
        </div>
        <div aria-hidden className="mx-auto mt-8 flex max-w-xs items-center gap-3">
          <span className="h-px flex-1 bg-foreground/10" />
          <span className="text-[10px] leading-none text-brand-foreground">◆</span>
          <span className="h-px flex-1 bg-foreground/10" />
        </div>
      </div>
    </section>
  );
}

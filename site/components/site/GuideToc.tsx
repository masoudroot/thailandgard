import { List } from "lucide-react";

export interface GuideTocItem {
  id: string;
  label: string;
}

/**
 * جدول محتوای راهنما (سکشن ۲ وایرفریم).
 * موبایل: بالای بدنه می‌نشیند؛ دسکتاپ: کنار متن می‌چسبد (sticky).
 * فقط برای مقاله‌های چندبخشی رندر می‌شود (شرطش در page.tsx).
 */
export function GuideToc({ items }: { items: GuideTocItem[] }) {
  if (items.length === 0) return null;
  return (
    <nav
      aria-label="فهرست این راهنما"
      className="h-fit rounded-surface border border-border bg-card p-5 lg:sticky lg:top-24"
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-brand-deep">
        <List className="size-4" aria-hidden="true" />
        در این راهنما
      </p>
      <ul className="mt-3 space-y-1 text-sm leading-7">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="block rounded-md px-2 py-1 text-foreground/75 transition-colors duration-200 hover:bg-accent hover:text-foreground focus-visible:bg-accent"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

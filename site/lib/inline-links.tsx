import type { ReactNode } from "react";
import Link from "next/link";

/**
 * رندرر حداقلی امن لینک درون‌متن.
 *
 * نشانگر داخل رشته: [[انکر|/مسیر]]؛ فقط مسیرهای داخلی (شروع با /) لینک می‌شوند.
 * امن: متن‌ها از فایل‌های lib خودمان می‌آیند، نه ورودی کاربر؛ ری‌اکت متن را
 * escape می‌کند و href فقط مسیر داخلیِ صریحِ داخل رشته است.
 * استایل لینک عین لینک‌های درون‌متنی موجود («قدم بعدی») است: بدون تغییر بصری.
 */
const INLINE_LINK_RE = /\[\[([^|[\]]+)\|(\/[^[\]]*)\]\]/g;

export function renderInlineLinks(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let last = 0;
  let key = 0;
  INLINE_LINK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = INLINE_LINK_RE.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <Link key={key++} href={m[2]} className="font-semibold underline underline-offset-4">
        {m[1]}
      </Link>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

/** برای جاهایی که متن خام لازم است (مثل JSON-LD): نشانگرها را برمی‌دارد، انکر می‌ماند. */
export function stripInlineLinkMarkers(text: string): string {
  return text.replace(/\[\[([^|[\]]+)\|(\/[^[\]]*)\]\]/g, "$1");
}

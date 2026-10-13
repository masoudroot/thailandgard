import type { ReactNode } from "react";
import Link from "next/link";

/**
 * رندرر حداقلی امن لینک درون‌متن.
 *
 * نشانگر داخل رشته: [[انکر|/مسیر]]؛ فقط مسیرهای داخلی (شروع با /) لینک می‌شوند.
 * امن: متن‌ها از فایل‌های lib خودمان می‌آیند، نه ورودی کاربر؛ ری‌اکت متن را
 * escape می‌کند و href فقط مسیر داخلیِ صریحِ داخل رشته است.
 * استایل لینک عین لینک‌های درون‌متنی مصوب D-127 است (مثل «قدم بعدی»):
 * underline + decoration-brand/60 + هاور، بدون font-semibold.
 */
const INLINE_LINK_RE = /\[\[([^|[\]]+)\|(\/[^[\]]*)\]\]/g;

/**
 * ایزولهٔ LTR واژه‌ها و URLهای لاتین در متن فارسی (F-091، ممیزی farsiui).
 *
 * واژهٔ TDAC و دامنه‌ها/URLهای لاتین (مثل tdac.immigration.go.th) را با
 * <bdi dir="ltr"> می‌پیچد تا در خط راست‌چین نشکنند. فقط روی متن‌های نمایشی
 * اعمال می‌شود، نه متن‌های خام (JSON-LD/DB دست نمی‌خورند).
 */
const LTR_TERM_RE = /(TDAC|[A-Za-z0-9][\w.-]*\.[a-zA-Z]{2,})/g;

export function wrapLatinTerms(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let last = 0;
  let key = 0;
  LTR_TERM_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = LTR_TERM_RE.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <bdi dir="ltr" key={key++}>
        {m[0]}
      </bdi>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

export function renderInlineLinks(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let last = 0;
  let key = 0;
  INLINE_LINK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = INLINE_LINK_RE.exec(text)) !== null) {
    if (m.index > last) parts.push(wrapLatinTerms(text.slice(last, m.index)));
    parts.push(
      <Link key={key++} href={m[2]} className="underline decoration-brand/60 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-brand">
        {wrapLatinTerms(m[1])}
      </Link>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(wrapLatinTerms(text.slice(last)));
  return <>{parts}</>;
}

/** برای جاهایی که متن خام لازم است (مثل JSON-LD): نشانگرها را برمی‌دارد، انکر می‌ماند. */
export function stripInlineLinkMarkers(text: string): string {
  return text.replace(/\[\[([^|[\]]+)\|(\/[^[\]]*)\]\]/g, "$1");
}

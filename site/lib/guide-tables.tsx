import type { ReactNode } from "react";
import { Lightbulb, TriangleAlert } from "lucide-react";
import { renderInlineLinks } from "./inline-links";

/**
 * رندرر امن جدول مارک‌داون برای بدنهٔ راهنماها (F-079).
 *
 * علت: جدول‌های مارک‌داونِ داخل متن راهنما (مثل «جدول مقایسهٔ سطوح سفر» در
 * راهنمای هزینهٔ سفر) روی صفحه به‌صورت متن خام با پایپ دیده می‌شدند چون
 * `renderInlineLinks` رندرر جدول نداشت. این ماژول پاراگراف‌های یک بخش را
 * می‌گرداند: اگر پاراگرافی شامل `|` بود و پاراگراف بعدی ردیف جداکنندهٔ
 * مارک‌داون بود، هر دو و ردیف‌های بعدیِ شامل `|` یک بلوک جدول‌اند.
 *
 * امن: متن سلول‌ها از همان متن‌های خودمان می‌آید و ری‌اکت آن‌ها را escape
 * می‌کند؛ فقط نشانگر `[[انکر|مسیر]]` به لینک داخلی تبدیل می‌شود.
 * راست‌چین: ستون اول (برچسب سطر) با `scope="row"` سمت راست می‌نشیند و
 * اسکرول افقی موبایل از راست شروع می‌شود (F-082).
 */

const SEPARATOR_RE = /^\s*\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/;

/**
 * قرارداد باکس‌های بدنه (وایرفریم راهنما، سکشن ۳؛ راستی‌شده با محتوای واقعی دیتابیس):
 * پاراگرافی که با «نکته» شروع می‌شود (نکته‌ای که، نکتهٔ مهم، نکتهٔ کاربردی: …)
 * باکس نکته است و پاراگرافی که با «هشدار» شروع می‌شود باکس هشدار.
 * «---» تنها در یک پاراگراف، خط جداکننده است.
 */
const NOTE_RE = /^\s*نکته/;
const WARNING_RE = /^\s*هشدار/;

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());
}

interface TableBlock {
  type: "table";
  header: string[];
  rows: string[][];
}

interface TextBlock {
  type: "text";
  text: string;
}

export type GuideBlock = TableBlock | TextBlock;

/**
 * هر پاراگراف جداگانه بلوک‌بندی می‌شود (چیدمان قدیمی متن‌ها دست نمی‌خورد).
 * اگر داخل یک پاراگراف ردیف جداکنندهٔ مارک‌داون بود، همان پاراگراف
 * خط‌به‌خط می‌شود: سرستون + جداکننده + ردیف‌های شامل `|` = یک بلوک جدول؛
 * بقیهٔ خط‌ها متن معمولی می‌مانند.
 */
export function splitGuideBlocks(paragraphs: string[]): GuideBlock[] {
  const blocks: GuideBlock[] = [];
  for (const p of paragraphs) {
    const lines = p.split("\n").filter((line) => line.trim() !== "");
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const next = lines[i + 1];
      if (line.includes("|") && next !== undefined && SEPARATOR_RE.test(next)) {
        const header = splitRow(line);
        i += 2; // ردیف جداکننده رد می‌شود
        const rows: string[][] = [];
        while (i < lines.length && lines[i].includes("|")) {
          rows.push(splitRow(lines[i]));
          i += 1;
        }
        blocks.push({ type: "table", header, rows });
      } else {
        blocks.push({ type: "text", text: line });
        i += 1;
      }
    }
  }
  return blocks;
}

/** رندر بدنهٔ یک بخش راهنما: پاراگراف‌ها + جدول‌های مارک‌داون. */
export function renderGuideBlocks(paragraphs: string[]): ReactNode {
  return splitGuideBlocks(paragraphs).map((block, i) => {
    if (block.type === "table") {
      return (
        <div key={i} dir="rtl" className="overflow-x-auto rounded-surface border border-border">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50">
                {block.header.map((cell, j) => (
                  <th key={j} scope="col" className="border-b border-border px-4 py-3 text-start font-semibold">
                    {renderInlineLinks(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, k) => (
                <tr key={k} className={k % 2 === 1 ? "bg-muted/20" : undefined}>
                  {row.map((cell, j) =>
                    j === 0 ? (
                      <th key={j} scope="row" className="border-b border-border px-4 py-3 text-start font-semibold">
                        {renderInlineLinks(cell)}
                      </th>
                    ) : (
                      <td key={j} className="border-b border-border px-4 py-3 text-start tabular-nums">
                        {renderInlineLinks(cell)}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    const text = block.text;
    if (text.trim() === "---") {
      return <hr key={i} className="border-border" />;
    }
    if (NOTE_RE.test(text)) {
      return (
        <div key={i} role="note" className="flex gap-3 rounded-surface border border-brand/40 bg-brand/10 p-4">
          <Lightbulb className="mt-1 size-5 shrink-0 text-brand-deep" aria-hidden="true" />
          <p className="text-pretty leading-[1.9] text-foreground/90">{renderInlineLinks(text)}</p>
        </div>
      );
    }
    if (WARNING_RE.test(text)) {
      return (
        <div key={i} role="note" className="flex gap-3 rounded-surface border border-destructive/40 bg-destructive/10 p-4">
          <TriangleAlert className="mt-1 size-5 shrink-0 text-destructive" aria-hidden="true" />
          <p className="text-pretty leading-[1.9] text-foreground/90">{renderInlineLinks(text)}</p>
        </div>
      );
    }
    return (
      <p key={i} className="text-pretty leading-[1.9] text-foreground/90">
        {renderInlineLinks(text)}
      </p>
    );
  });
}

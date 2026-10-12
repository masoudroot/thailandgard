import type { ReactNode } from "react";
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

export function splitGuideBlocks(paragraphs: string[]): GuideBlock[] {
  const blocks: GuideBlock[] = [];
  let i = 0;
  while (i < paragraphs.length) {
    const p = paragraphs[i];
    const next = paragraphs[i + 1];
    if (p.includes("|") && next !== undefined && SEPARATOR_RE.test(next)) {
      const header = splitRow(p);
      i += 2; // ردیف جداکننده رد می‌شود
      const rows: string[][] = [];
      while (i < paragraphs.length && paragraphs[i].includes("|")) {
        rows.push(splitRow(paragraphs[i]));
        i += 1;
      }
      blocks.push({ type: "table", header, rows });
    } else {
      blocks.push({ type: "text", text: p });
      i += 1;
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
    return (
      <p key={i} className="leading-[1.9] text-foreground/90">
        {renderInlineLinks(block.text)}
      </p>
    );
  });
}

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * گیت‌های کیفیت: این تست‌ها جلوی برگشت بدهی‌های پاک‌شده را می‌گیرند.
 *
 * هر گیت یک سقف عددی دارد که فقط می‌تواند پایین بیاید. اگر تغییری سقف را
 * بالا ببرد، CI قرمز می‌شود و باید یا اصلاح شود یا سقف با توجیه در همین فایل
 * پایین آورده شود (نه بالا).
 */

const SITE_ROOT = fileURLToPath(new URL("../..", import.meta.url));

/** سقف suppressor های eslint. با هر کاهش واقعی این عدد را پایین بیاور. */
const SUPPRESSION_CEILING = 40;

function walk(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
    const full = path.join(dir, entry);
    const info = statSync(full);
    if (info.isDirectory()) {
      out.push(...walk(full, exts));
      continue;
    }
    if (exts.some((ext) => entry.endsWith(ext))) out.push(full);
  }
  return out;
}

function read(file: string): string {
  return readFileSync(file, "utf8");
}

function relative(file: string): string {
  return path.relative(SITE_ROOT, file).split(path.sep).join("/");
}

/** کلاس‌های جهت‌دار فیزیکی که در RTL یا LTR یکی از دو حالت را خراب می‌کنند. */
const PHYSICAL_DIRECTION = new RegExp(
  [
    "(?<![\\w-])(?:m[lr]|p[lr])-\\d",
    "text-(?:left|right)\\b",
    "border-[lr](?:-\\d)?\\b",
    "rounded-[lr]\\b",
    "(?:left|right)-\\d",
    "space-x-\\d",
  ].join("|"),
);

describe("quality gates", () => {
  it("keeps eslint suppressions at or below the ceiling", () => {
    const raw = JSON.parse(read(path.join(SITE_ROOT, "eslint-suppressions.json"))) as Record<
      string,
      Record<string, { count: number }>
    >;
    const total = Object.values(raw).reduce(
      (sum, rules) => sum + Object.values(rules).reduce((s, rule) => s + rule.count, 0),
      0,
    );
    expect(total, `suppressor ها از سقف ${SUPPRESSION_CEILING} بیشتر شدند`).toBeLessThanOrEqual(
      SUPPRESSION_CEILING,
    );
  });

  it("has no physical direction utility classes in app/components", () => {
    const files = [
      ...walk(path.join(SITE_ROOT, "app"), [".tsx"]),
      ...walk(path.join(SITE_ROOT, "components"), [".tsx"]),
    ];
    const offenders: string[] = [];
    for (const file of files) {
      read(file)
        .split(/\r?\n/)
        .forEach((line, index) => {
          const match = PHYSICAL_DIRECTION.exec(line);
          if (match) offenders.push(`${relative(file)}:${index + 1} → ${match[0]}`);
        });
    }
    expect(offenders, `کلاس فیزیکی جهت‌دار پیدا شد:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("has no letter-spacing utilities on Persian UI text", () => {
    const files = [
      ...walk(path.join(SITE_ROOT, "app"), [".tsx"]),
      ...walk(path.join(SITE_ROOT, "components"), [".tsx"]),
    ];
    const offenders: string[] = [];
    for (const file of files) {
      read(file)
        .split(/\r?\n/)
        .forEach((line, index) => {
          if (/(?<![\w-])tracking-(?:tight|tighter|wide|wider|widest|normal)\b/.test(line)) {
            offenders.push(`${relative(file)}:${index + 1}`);
          }
        });
    }
    expect(offenders, `letter-spacing روی متن فارسی پیدا شد:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("has no console calls in API route handlers", () => {
    const files = walk(path.join(SITE_ROOT, "app", "api"), [".ts", ".tsx"]);
    const offenders: string[] = [];
    for (const file of files) {
      read(file)
        .split(/\r?\n/)
        .forEach((line, index) => {
          if (/console\.(?:log|debug|info|warn|error|trace)\s*\(/.test(line)) {
            offenders.push(`${relative(file)}:${index + 1}`);
          }
        });
    }
    expect(
      offenders,
      `console در مسیر درخواست ممنوع است؛ از lib/logger استفاده کن:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});

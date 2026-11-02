/**
 * تست‌های کمک‌های خالص مسیر خودمختار (THG-AUTO-01).
 *
 * - هویت تأیید سیستمی، انسان نیست و دلیلش دستور مدیر پروژه است؛
 * - پیام بازنویسی، slug و عنوان و بار جاری JSON را دارد و بار را
 *   کوتاه نمی‌کند؛
 * - چک sitemap، مسیر متعارف را رشته‌ای می‌سنجد.
 */

import { describe, expect, it } from "vitest";
import {
  AUTO_APPROVAL_REASON,
  SYSTEM_APPROVER_ID,
  buildRewriteUserMessage,
  sitemapContainsSlug,
} from "@/lib/factory/tick/autonomous";

describe("system approval identity", () => {
  it("is a system identity, never a human name", () => {
    expect(SYSTEM_APPROVER_ID).toBe("system:autonomous");
    expect(SYSTEM_APPROVER_ID.startsWith("system:")).toBe(true);
    expect(AUTO_APPROVAL_REASON).toContain("اصلاحیهٔ ۲");
    expect(AUTO_APPROVAL_REASON).toContain("Verify خودکار");
  });
});

describe("rewrite user message", () => {
  it("carries slug, title and the full current payload as JSON", () => {
    const payload = {
      slug: "baht-price-two-month-low",
      title: "قیمت بات",
      sections: [{ position: 1, heading: "بخش یک", paragraphs: ["متن."] }],
      faqs: [],
    };
    const message = buildRewriteUserMessage("baht-price-two-month-low", "قیمت بات", payload);
    expect(message).toContain("baht-price-two-month-low");
    expect(message).toContain("قیمت بات");
    expect(message).toContain("بازنویسی");
    expect(message).toContain(JSON.stringify(payload));
    const jsonPart = message.slice(message.indexOf("{"), message.lastIndexOf("}") + 1);
    expect(JSON.parse(jsonPart)).toEqual(payload);
  });
});

describe("sitemap check", () => {
  it("finds the canonical path in sitemap xml and rejects a missing one", () => {
    const xml = `<?xml version="1.0"?><urlset><url><loc>https://thailandgard.ir/guide/baht-price-two-month-low</loc></url></urlset>`;
    expect(sitemapContainsSlug(xml, "/guide/baht-price-two-month-low")).toBe(true);
    expect(sitemapContainsSlug(xml, "/guide/no-such-guide")).toBe(false);
  });
});

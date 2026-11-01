/**
 * تست‌های گارد مالکیت نوشتن (THG-UNIFY-01).
 *
 * منطق تصمیم، خالص است و از روی عکس لحظه‌ای اسناد نسخه‌ای گرفته
 * می‌شود؛ پس «دو نویسندهٔ هم‌زمان» این‌جا یعنی دو تصمیم‌گیری موازی
 * روی یک عکس: هر دو باید یک جواب بدهند (مالک نسخه‌ای می‌برد، مسیر
 * قدیمی با خطای صریح می‌ایستد). هیچ دیتابیس واقعی و هیچ شبکه‌ای در
 * کار نیست؛ روت خودش در این فایل صدا زده نمی‌شود، چون روت نکست
 * next/server می‌خواهد و تصمیم، همان تابعی است که روت صدا می‌زند.
 */
import { describe, expect, it } from "vitest";
import {
  classifyContentSyncOwnership,
  guideSlugOfOp,
  ownershipErrorForSlug,
  versionedOwnedSlugs,
} from "@/lib/guide-source-resolver";

const VERSIONED_DOC = { slug: "thailand-visa-guide", isTestFixture: false };
const FIXTURE_DOC = { slug: "thailand-visa-guide", isTestFixture: true };

describe("guideSlugOfOp", () => {
  it("guide.insert از slug و بقیهٔ opهای راهنما از guide_slug می‌آیند", () => {
    expect(guideSlugOfOp({ op: "guide.insert", slug: "a" })).toBe("a");
    expect(guideSlugOfOp({ op: "guide.set_title", guide_slug: "b" })).toBe("b");
    expect(guideSlugOfOp({ op: "guide_section.move", guide_slug: "c" })).toBe("c");
    expect(guideSlugOfOp({ op: "guide_faq.insert", guide_slug: "d" })).toBe("d");
  });

  it("opهای تور، تنظیمات و لید هرگز slug راهنما نمی‌دهند", () => {
    expect(guideSlugOfOp({ op: "tour.set_title" })).toBeNull();
    expect(guideSlugOfOp({ op: "setting.set" })).toBeNull();
    expect(guideSlugOfOp({ op: "lead_alert.backfill" })).toBeNull();
    expect(guideSlugOfOp({ op: "guide.set_title" })).toBeNull();
  });
});

describe("مالکیت نسخه‌ای در برابر مسیر legacy", () => {
  it("slug با سند غیرفیکسچر: همهٔ opهای راهنمایش مسدود با خطای صریح‌اند", () => {
    const decisions = classifyContentSyncOwnership(
      [
        { op: "guide.set_title", guide_slug: "thailand-visa-guide" },
        { op: "guide_section.set_title", guide_slug: "thailand-visa-guide" },
        { op: "guide_faq.insert", guide_slug: "thailand-visa-guide" },
        { op: "guide.insert", slug: "thailand-visa-guide" },
      ],
      [VERSIONED_DOC],
      false,
    );
    expect(decisions.every((d) => d.blocked)).toBe(true);
    for (const d of decisions) {
      expect(d.error).toBe(ownershipErrorForSlug("thailand-visa-guide"));
      expect(d.error).toContain("thailand-visa-guide");
      expect(d.error).toContain("مسدود");
    }
  });

  it("slug بدون سند: opهای راهنما آزادند (مسیر قدیمی قطع نشده)", () => {
    const decisions = classifyContentSyncOwnership(
      [{ op: "guide.set_title", guide_slug: "thailand-visa-guide" }],
      [],
      false,
    );
    expect(decisions).toEqual([
      { op: "guide.set_title", slug: "thailand-visa-guide", blocked: false, error: null },
    ]);
  });

  it("سند فیکسچر مالکیت نمی‌سازد", () => {
    const decisions = classifyContentSyncOwnership(
      [{ op: "guide.set_excerpt", guide_slug: "thailand-visa-guide" }],
      [FIXTURE_DOC],
      false,
    );
    expect(decisions[0].blocked).toBe(false);
    expect(versionedOwnedSlugs([FIXTURE_DOC], ["thailand-visa-guide"]).size).toBe(0);
  });

  it("خرابی بررسی مالکیت، همهٔ opهای راهنما را مسدود می‌کند ولی تور را نه", () => {
    const decisions = classifyContentSyncOwnership(
      [
        { op: "guide.set_title", guide_slug: "thailand-visa-guide" },
        { op: "tour.set_title" },
      ],
      [],
      true,
    );
    expect(decisions[0].blocked).toBe(true);
    expect(decisions[0].error).toContain("مالکیت نسخه‌ای");
    expect(decisions[1].blocked).toBe(false);
  });

  it("مسدودشدن فقط همان slug است؛ slug دیگر همان بچ آزاد می‌ماند", () => {
    const decisions = classifyContentSyncOwnership(
      [
        { op: "guide.set_title", guide_slug: "thailand-visa-guide" },
        { op: "guide.set_title", guide_slug: "phuket-vs-samui" },
      ],
      [VERSIONED_DOC],
      false,
    );
    expect(decisions[0].blocked).toBe(true);
    expect(decisions[1].blocked).toBe(false);
  });
});

describe("دو نویسندهٔ هم‌زمان روی یک slug", () => {
  it("هر دو تصمیم موازی، یک جواب می‌دهند: نسخه‌ای می‌برد، قدیمی با خطا می‌ایستد", async () => {
    const ops = [{ op: "guide.set_title", guide_slug: "thailand-visa-guide" }];
    const [first, second] = await Promise.all([
      Promise.resolve(classifyContentSyncOwnership(ops, [VERSIONED_DOC], false)),
      Promise.resolve(classifyContentSyncOwnership(ops, [VERSIONED_DOC], false)),
    ]);
    expect(first).toEqual(second);
    expect(first[0].blocked).toBe(true);
    expect(first[0].error).toBe(ownershipErrorForSlug("thailand-visa-guide"));
  });

  it("تصمیم، بی‌صدا رد نمی‌شود: blocked همیشه error صریح دارد", () => {
    const decisions = classifyContentSyncOwnership(
      [{ op: "guide_section.move", guide_slug: "thailand-visa-guide" }],
      [VERSIONED_DOC],
      false,
    );
    expect(decisions[0].blocked).toBe(true);
    expect(decisions[0].error).not.toBeNull();
    expect(decisions[0].error!.length).toBeGreaterThan(0);
  });
});

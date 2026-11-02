/**
 * تست‌های انتخاب‌های چرخهٔ خودمختار روزانه (THG-AUTO-01).
 */

import { describe, expect, it } from "vitest";
import {
  AUTO_SEED_TOPICS,
  isRewriteQualified,
  parseUpdatedFa,
  pickFreshTopic,
  pickRewriteCandidate,
  type RewriteCandidate,
} from "@/lib/factory/tick/autonomous-cycle";

function candidate(overrides: Partial<RewriteCandidate> & { slug: string }): RewriteCandidate {
  return {
    title: overrides.slug,
    contentId: `doc-${overrides.slug}`,
    versionNo: 1,
    sections: 4,
    faqs: 3,
    updatedFa: "۲۰ مهر ۱۴۰۵",
    ...overrides,
  };
}

describe("pickFreshTopic", () => {
  it("returns the first seed topic whose slug does not exist yet", () => {
    expect(pickFreshTopic(AUTO_SEED_TOPICS, new Set())).toEqual(AUTO_SEED_TOPICS[0]);
    expect(
      pickFreshTopic(AUTO_SEED_TOPICS, new Set(["thailand-food-guide", "thailand-shopping-guide"])),
    ).toEqual(AUTO_SEED_TOPICS[2]);
  });

  it("returns null when every seed topic already exists", () => {
    expect(
      pickFreshTopic(AUTO_SEED_TOPICS, new Set(AUTO_SEED_TOPICS.map((topic) => topic.slug))),
    ).toBeNull();
  });
});

describe("parseUpdatedFa", () => {
  it("parses Jalali day-month-year with Persian digits", () => {
    expect(parseUpdatedFa("۱۹ مهر ۱۴۰۵")).toBe(14050719);
    expect(parseUpdatedFa("۱۱ آبان ۱۴۰۵")).toBe(14050811);
    expect(parseUpdatedFa("۲۱ مهر ۱۴۰۵")).toBe(14050721);
  });

  it("returns null for anything that is not day-month-year", () => {
    expect(parseUpdatedFa(null)).toBeNull();
    expect(parseUpdatedFa("")).toBeNull();
    expect(parseUpdatedFa("مهر ۱۴۰۵")).toBeNull();
    expect(parseUpdatedFa("۴۵ مهر ۱۴۰۵")).toBeNull();
    expect(parseUpdatedFa("۱۹ ماه‌نما ۱۴۰۵")).toBeNull();
  });
});

describe("pickRewriteCandidate", () => {
  it("qualifies guides with no FAQs or with fewer than 2 sections", () => {
    expect(isRewriteQualified(candidate({ slug: "a", faqs: 0 }))).toBe(true);
    expect(isRewriteQualified(candidate({ slug: "b", sections: 1 }))).toBe(true);
    expect(isRewriteQualified(candidate({ slug: "c", sections: 2, faqs: 1 }))).toBe(false);
  });

  it("picks the oldest updated_fa among qualified guides", () => {
    const picked = pickRewriteCandidate([
      candidate({ slug: "newer", faqs: 0, updatedFa: "۲۰ مهر ۱۴۰۵" }),
      candidate({ slug: "older", faqs: 0, updatedFa: "۱۹ مهر ۱۴۰۵" }),
      candidate({ slug: "not-qualified", sections: 4, faqs: 5, updatedFa: "۱ فروردین ۱۴۰۰" }),
    ]);
    expect(picked?.slug).toBe("older");
  });

  it("sorts unparseable dates last and breaks ties by slug", () => {
    const picked = pickRewriteCandidate([
      candidate({ slug: "zz-unparseable", faqs: 0, updatedFa: "نامشخص" }),
      candidate({ slug: "aa-dated", faqs: 0, updatedFa: "۱۹ مهر ۱۴۰۵" }),
    ]);
    expect(picked?.slug).toBe("aa-dated");
    const tied = pickRewriteCandidate([
      candidate({ slug: "zz", faqs: 0, updatedFa: "۱۹ مهر ۱۴۰۵" }),
      candidate({ slug: "aa", faqs: 0, updatedFa: "۱۹ مهر ۱۴۰۵" }),
    ]);
    expect(tied?.slug).toBe("aa");
  });

  it("returns null when nothing qualifies", () => {
    expect(
      pickRewriteCandidate([candidate({ slug: "fine", sections: 4, faqs: 3 })]),
    ).toBeNull();
  });
});

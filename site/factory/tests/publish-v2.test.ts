/**
 * تست‌های خالص M5 (publish-v2): کلید Idempotency، سقف روزانه، Timeout،
 * اعتبارسنجی پیش‌نیازها و قواعد زنجیرهٔ superseded_by. این تست‌ها بدون
 * دیتابیس اجرا می‌شوند؛ مسیر PostgREST سرویس، در تست سرویس جداگانه با
 * fetch ساختگی پوشیده شده است.
 */
import { describe, expect, it } from "vitest";
import {
  DAILY_PUBLISH_LIMIT,
  firstParagraphOfPayload,
  isDailyPublishLimitReached,
  publishV2IdempotencyKey,
  PUBLISH_TIMEOUT_MS,
  supersededByTransition,
  validatePublishV2Input,
} from "@/lib/factory/publish-v2";

const baseInput = {
  workItemStatus: "approved",
  workItemArtifactId: "art-1",
  approvalArtifactId: "art-1",
  approvalArtifactHash: "a".repeat(64),
  artifactHash: "a".repeat(64),
  approvalDecision: "approved" as const,
  contentType: "guide",
  schemaVersion: "publish_payload_v1",
};

describe("publishV2IdempotencyKey", () => {
  it("derives a namespaced key from the work key", () => {
    expect(publishV2IdempotencyKey("update-content-1")).toBe("publish-v2-update-content-1");
  });

  it("never collides with the v1 key namespace", () => {
    expect(publishV2IdempotencyKey("update-content-1")).not.toBe("mvp01-m4-publish-update-content-1");
  });

  it("rejects an empty work key", () => {
    expect(() => publishV2IdempotencyKey("")).toThrow();
  });
});

describe("daily publish limit", () => {
  it("is 70 publishes per day", () => {
    expect(DAILY_PUBLISH_LIMIT).toBe(70);
  });

  it("allows 69 and blocks at 70", () => {
    expect(isDailyPublishLimitReached(69)).toBe(false);
    expect(isDailyPublishLimitReached(70)).toBe(true);
    expect(isDailyPublishLimitReached(71)).toBe(true);
  });
});

describe("publish timeout", () => {
  it("is 60 seconds", () => {
    expect(PUBLISH_TIMEOUT_MS).toBe(60_000);
  });
});

describe("validatePublishV2Input", () => {
  it("accepts a fully valid input", () => {
    expect(validatePublishV2Input(baseInput)).toBeNull();
  });

  it("rejects a non-approved work item", () => {
    expect(validatePublishV2Input({ ...baseInput, workItemStatus: "awaiting_approval" })).toMatch(
      /approved or publishing/,
    );
  });

  it("accepts a publishing work item (after create_version)", () => {
    expect(validatePublishV2Input({ ...baseInput, workItemStatus: "publishing" })).toBeNull();
  });

  it("rejects an approval on a different artifact", () => {
    expect(validatePublishV2Input({ ...baseInput, approvalArtifactId: "art-2" })).toMatch(
      /artifact/,
    );
  });

  it("rejects a hash mismatch", () => {
    expect(validatePublishV2Input({ ...baseInput, approvalArtifactHash: "b".repeat(64) })).toMatch(
      /hash/,
    );
  });

  it("rejects a rejected decision", () => {
    expect(validatePublishV2Input({ ...baseInput, approvalDecision: "rejected" })).toMatch(
      /approved/,
    );
  });

  it("rejects a non-guide document", () => {
    expect(validatePublishV2Input({ ...baseInput, contentType: "tour" })).toMatch(/guide/);
  });

  it("rejects a wrong schema version", () => {
    expect(validatePublishV2Input({ ...baseInput, schemaVersion: "other" })).toMatch(/schema/);
  });
});

describe("supersededByTransition", () => {
  it("links the previous version to the new one on forward publish", () => {
    const t = supersededByTransition({ kind: "publish", previousVersionId: "v-old", newVersionId: "v-new" });
    expect(t.pointerVersionId).toBe("v-new");
    expect(t.previousSupersededBy).toBe("v-new");
    expect(t.newSupersededBy).toBeNull();
  });

  it("handles the first publish without a previous version", () => {
    const t = supersededByTransition({ kind: "publish", previousVersionId: null, newVersionId: "v-new" });
    expect(t.pointerVersionId).toBe("v-new");
    expect(t.previousSupersededBy).toBeNull();
    expect(t.newSupersededBy).toBeNull();
  });

  it("restores only superseded_by to null on rollback", () => {
    const t = supersededByTransition({ kind: "rollback", previousVersionId: "v-current", newVersionId: "v-target" });
    expect(t.pointerVersionId).toBe("v-target");
    expect(t.previousSupersededBy).toBeNull();
    expect(t.newSupersededBy).toBeNull();
  });
});

describe("firstParagraphOfPayload", () => {
  it("returns the first paragraph of the first section", () => {
    expect(
      firstParagraphOfPayload({ sections: [{ paragraphs: ["first", "second"] }] } as never),
    ).toBe("first");
  });

  it("returns empty when there is no section", () => {
    expect(firstParagraphOfPayload({ sections: [] } as never)).toBe("");
  });
});

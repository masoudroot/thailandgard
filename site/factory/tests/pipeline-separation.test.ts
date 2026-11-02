/**
 * تست‌های جدایی Data Pipeline و Code Pipeline (PIPELINE-INTEGRATION-AGENT).
 *
 * این فایل فقط شکاف‌هایی را می‌پوشاند که تست‌های موجود ندارند و با تست
 * خالص (بدون شبکه و بدون دیتابیس) قابل اثبات‌اند:
 * - کلید Idempotency مربوط به Rollback نسخهٔ دوم (در هیچ تستی نبود)؛
 * - ثابت‌های Lease و تلاش Outbox و Verification و Redispatch (مستقیم
 *   در هیچ تستی پین نشده بودند)؛
 * - رفتار Fencing با مالک یا توکن تهی (فقط حالت‌های غیرتهی پوشیده بود)؛
 * - فهرست دقیق Stepهای هر Workflow و نبود Stepهای مسیر کد در آن‌ها؛
 * - نبود عملیات مسیر کد (Merge و Deploy و PR و Push) در مسیر Tick،
 *   و نبود نوشتن روی جدول‌های محتوا و نبود دستور Merge و Deploy در
 *   گردش‌کار CI، و سیم‌کشی Dispatch در مسیر process-outbox.
 *
 * رفتارهای Lease و Fencing که داخل Function اتمیک دیتابیس‌اند (انقضای
 * Lease و بازپس‌گیری آن، افزایش fencing_token) با تست واحد قابل اثبات
 * نیستند و این‌جا جعل نشده‌اند؛ آن‌ها نیازمند راستی زنده روی Staging‌اند.
 * تست‌های ایستا (خواندن متن فایل) فقط سیم‌کشی فعلی را پین می‌کنند، نه
 * رفتار زمان اجرا را.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  GATEWAY_TICK_STEP_KEYS,
  GATEWAY_WORKFLOW_VERSION,
  TICK_STEP_KEYS,
  isStepKeyOfWorkflow,
  isValidWorkflowStepKey,
} from "@/lib/factory/tick/factory-tick";
import {
  OUTBOX_LEASE_SECONDS,
  OUTBOX_MAX_ATTEMPTS,
  REDISPATCH_MAX_ATTEMPTS,
  VERIFICATION_MAX_ATTEMPTS,
  VERIFICATION_MAX_READS,
  VERIFICATION_RETRY_INTERVAL_MS,
  isFencingMatch,
} from "@/lib/factory/tick/publish-outbox";
import {
  publishV2IdempotencyKey,
  publishV2RollbackIdempotencyKey,
} from "@/lib/factory/publish-v2";

const SITE_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const REPO_ROOT = path.join(SITE_ROOT, "..");
const TICK_ROUTE = path.join(SITE_ROOT, "app", "api", "factory", "tick", "route.ts");
const PROCESS_OUTBOX_ROUTE = path.join(
  SITE_ROOT,
  "app",
  "api",
  "internal",
  "process-outbox",
  "route.ts",
);
const FACTORY_CI = path.join(REPO_ROOT, ".github", "workflows", "factory-ci.yml");

describe("publish-v2 rollback idempotency key", () => {
  it("derives a rollback namespace from the work key", () => {
    expect(publishV2RollbackIdempotencyKey("m5s2-r2b-update-01")).toBe(
      "publish-v2-rollback-m5s2-r2b-update-01",
    );
  });

  it("differs from the publish key for the same work key", () => {
    const workKey = "m5s2-r2b-update-01";
    expect(publishV2RollbackIdempotencyKey(workKey)).not.toBe(publishV2IdempotencyKey(workKey));
  });

  it("never collides with the v1 key namespace", () => {
    expect(publishV2RollbackIdempotencyKey("m5s2-r2b-update-01").startsWith("mvp01-m4-publish-")).toBe(
      false,
    );
  });

  it("rejects an empty work key", () => {
    expect(() => publishV2RollbackIdempotencyKey("")).toThrow();
  });
});

describe("outbox and verification constants", () => {
  it("pins the outbox lease contract", () => {
    expect(OUTBOX_MAX_ATTEMPTS).toBe(5);
    expect(OUTBOX_LEASE_SECONDS).toBe(300);
  });

  it("pins the verification contract", () => {
    expect(VERIFICATION_MAX_ATTEMPTS).toBe(10);
    expect(VERIFICATION_RETRY_INTERVAL_MS).toBe(2000);
    expect(VERIFICATION_MAX_READS).toBe(50);
  });

  it("pins the redispatch cap", () => {
    expect(REDISPATCH_MAX_ATTEMPTS).toBe(3);
  });
});

describe("fencing null handling", () => {
  it("rejects a null lease owner", () => {
    expect(
      isFencingMatch(
        { lease_owner: null, fencing_token: 7 },
        { lease_owner: "tick-executor-1", fencing_token: 7 },
      ),
    ).toBe(false);
  });

  it("rejects a null fencing token", () => {
    expect(
      isFencingMatch(
        { lease_owner: "tick-executor-1", fencing_token: null },
        { lease_owner: "tick-executor-1", fencing_token: 7 },
      ),
    ).toBe(false);
  });

  it("rejects a null owner and a null token together", () => {
    expect(
      isFencingMatch(
        { lease_owner: null, fencing_token: null },
        { lease_owner: "tick-executor-1", fencing_token: 7 },
      ),
    ).toBe(false);
  });
});

describe("tick step allowlists", () => {
  it("has exactly the eight data steps in the official workflow, in order", () => {
    expect([...TICK_STEP_KEYS]).toEqual([
      "prepare_context",
      "create_artifact",
      "validate_artifact",
      "await_human_approval",
      "create_version",
      "publish_version",
      "process_publication",
      "complete_work",
    ]);
  });

  it("keeps the gateway workflow without any version or publish step", () => {
    expect([...GATEWAY_TICK_STEP_KEYS]).toEqual([
      "prepare_context",
      "generate_draft_mock",
      "validate_artifact",
      "await_human_approval",
    ]);
    expect(GATEWAY_WORKFLOW_VERSION).toBe("guide_content_gateway_v1");
    for (const step of ["create_version", "publish_version", "process_publication", "complete_work"]) {
      expect(isStepKeyOfWorkflow(step, GATEWAY_WORKFLOW_VERSION)).toBe(false);
    }
  });

  it("rejects code-pipeline keys as step keys in every workflow", () => {
    for (const step of [
      "merge",
      "deploy",
      "create_pr",
      "push",
      "publish_direct",
      "merge_code",
      "deploy_preview",
    ]) {
      expect(isValidWorkflowStepKey(step)).toBe(false);
    }
  });
});

describe("data path has no code-pipeline operations (static)", () => {
  it("tick route contains no merge, deploy, pull-request, or push operation", () => {
    const source = readFileSync(TICK_ROUTE, "utf8");
    for (const marker of [
      "octokit",
      "api.github.com",
      "graphql",
      "vercel",
      "git push",
      "gh pr",
      "/pulls",
      "github-script",
    ]) {
      expect(source.includes(marker)).toBe(false);
    }
  });

  it("tick route reaches the database only through PostgREST, never a raw driver", () => {
    const source = readFileSync(TICK_ROUTE, "utf8");
    for (const marker of ["pg.Client", "postgres://", "psql"]) {
      expect(source.includes(marker)).toBe(false);
    }
  });
});

describe("code path has no data writes (static)", () => {
  it("factory CI contains no supabase or content-table reference", () => {
    const workflow = readFileSync(FACTORY_CI, "utf8");
    for (const marker of [
      "supabase",
      "content_documents",
      "content_versions",
      "factory_publications",
      "factory_outbox_events",
      "supabase.co",
    ]) {
      expect(workflow.includes(marker)).toBe(false);
    }
  });

  it("factory CI grants read-only permissions only", () => {
    const workflow = readFileSync(FACTORY_CI, "utf8");
    expect(workflow.includes("contents: read")).toBe(true);
    expect(workflow.includes("deployments: read")).toBe(true);
    expect(workflow.includes(": write")).toBe(false);
  });

  it("factory CI database URLs point only to the local scratch Postgres", () => {
    const workflow = readFileSync(FACTORY_CI, "utf8");
    const urls = workflow.match(/postgres:\/\/[^\s"']+/g) ?? [];
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(url.includes("localhost:5433")).toBe(true);
    }
  });

  it("factory CI contains no merge, deploy, or push command", () => {
    const workflow = readFileSync(FACTORY_CI, "utf8");
    for (const marker of [
      "gh pr merge",
      "git push",
      "vercel deploy",
      "vercel/action",
      "actions/github-script",
    ]) {
      expect(workflow.includes(marker)).toBe(false);
    }
  });
});

describe("outbox dispatch wiring (static)", () => {
  it("process-outbox invalidates both guide tags and the canonical path", () => {
    const source = readFileSync(PROCESS_OUTBOX_ROUTE, "utf8");
    expect(source.includes('revalidateTag("guides"')).toBe(true);
    expect(source.includes('revalidateTag("guide-versions"')).toBe(true);
    expect(source.includes("revalidatePath(payload.canonical_path)")).toBe(true);
  });
});

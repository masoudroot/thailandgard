/**
 * SECURITY-CAP tests (no database, no real secret):
 * - Shape of the cap migration (SQL text assertions, same pattern as
 *   publish-v2-migration.test.ts): same signature, day-keyed advisory
 *   lock, UTC-day count window, >= 70 raise, replay/rollback paths
 *   untouched, service_role-only grant, no destructive statement.
 * - Pure boundary logic already exported by publish-v2.ts.
 * - Kill-switch gate in publishUpdateContent with a mocked fetch:
 *   a fresh publish is blocked when the factory is paused or publishing
 *   is disabled, and a replay is exempt from the gate.
 * - Static guard for the server-only reviewer identity in the internal
 *   approvals route: no body reviewer_id may reach the stored row.
 *
 * What this file does NOT prove (stated, not hidden): the RPC behavior
 * itself (lock serialization, 69/70/71 outcomes) still needs a database
 * test; the coordinator runs the Staging dry-run decision for that.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DAILY_PUBLISH_LIMIT,
  isDailyPublishLimitReached,
  publishUpdateContent,
  PublishV2Error,
} from "@/lib/factory/publish-v2";
import type { DbCfg } from "@/lib/factory/tick/internal-api";

const SITE_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const CAP_MIGRATION = path.join(
  SITE_ROOT,
  "..",
  "supabase",
  "migrations",
  "20261101090000_cap_in_rpc.sql",
);
const APPROVALS_ROUTE = path.join(
  SITE_ROOT,
  "app",
  "api",
  "internal",
  "work-items",
  "[id]",
  "approvals",
  "route.ts",
);

describe("cap migration shape", () => {
  it("redefines publish_v2_content_atomic with the same signature plus a hard cap", () => {
    const sql = readFileSync(CAP_MIGRATION, "utf8");
    for (const needle of [
      "create or replace function public.publish_v2_content_atomic(",
      "p_content_id uuid",
      "p_version_id uuid",
      "p_idempotency_key text",
      "p_expected_marker text",
      "p_previous_unique_text text",
      "p_publication_kind text default 'publish'",
      "p_rollback_of_publication_id uuid default null",
      "p_reason text default null",
      "p_work_item_id uuid default null",
      "p_approval_id uuid default null",
      "pg_advisory_xact_lock",
      "publication_kind = 'publish'",
      "requested_at >=",
      "requested_at <",
      "interval '1 day'",
      "v_daily_count >= 70",
      "daily publish limit reached (70 per UTC day)",
      "revoke execute",
      "grant execute",
      "to service_role",
    ]) {
      expect(sql, `migration must contain ${needle}`).toContain(needle);
    }
  });

  it("keeps the cap after the replay branch and skips it for rollback", () => {
    const sql = readFileSync(CAP_MIGRATION, "utf8");
    // Scope to the function body: the header comment also names the lock.
    const body = sql.slice(sql.indexOf("create or replace function public.publish_v2_content_atomic("));
    const replayAt = body.indexOf("'replayed', true");
    const capAt = body.indexOf("pg_advisory_xact_lock");
    const rollbackGuardAt = body.indexOf("if p_publication_kind = 'publish' then");
    expect(replayAt).toBeGreaterThan(-1);
    expect(capAt).toBeGreaterThan(replayAt);
    expect(rollbackGuardAt).toBeGreaterThan(-1);
    expect(rollbackGuardAt).toBeLessThan(capAt);
  });

  it("has no destructive statement and does not touch the v1 functions", () => {
    const sql = readFileSync(CAP_MIGRATION, "utf8");
    for (const forbidden of [
      "drop table",
      "drop function",
      "delete from",
      "truncate",
      "publish_content_atomic(",
      "create_approved_version(",
    ]) {
      expect(sql, `migration must not contain ${forbidden}`).not.toContain(forbidden);
    }
  });
});

describe("daily cap boundary (pure logic)", () => {
  it("keeps the service-level limit at 70", () => {
    expect(DAILY_PUBLISH_LIMIT).toBe(70);
  });

  it("allows 69, blocks 70 and 71", () => {
    expect(isDailyPublishLimitReached(69)).toBe(false);
    expect(isDailyPublishLimitReached(70)).toBe(true);
    expect(isDailyPublishLimitReached(71)).toBe(true);
  });
});

describe("server-only reviewer identity (static guard)", () => {
  it("derives reviewer identity from server env and never from the body", () => {
    const route = readFileSync(APPROVALS_ROUTE, "utf8");
    expect(route).toContain("process.env.ADMIN_USERNAME");
    expect(route).toContain("serverReviewerIdentity");
    expect(route).not.toContain("input.reviewer_id");
    expect(route).toContain("reviewer_id: reviewerId");
    expect(route).not.toContain("reviewer_id are required");
  });
});

const cfg: DbCfg = { url: "https://supabase.test", serviceKey: "service-key" };

const validation = {
  workItemStatus: "approved",
  workItemArtifactId: "art-1",
  approvalArtifactId: "art-1",
  approvalArtifactHash: "a".repeat(64),
  artifactHash: "a".repeat(64),
  approvalDecision: "approved",
  contentType: "guide",
  schemaVersion: "publish_payload_v1",
};

const baseReq = {
  workItemId: "wi-1",
  workKey: "wk-1",
  contentId: "doc-1",
  versionId: "v-new",
  approvalId: "appr-1",
  expectedMarker: "first paragraph",
  previousUniqueText: "old first paragraph",
  previousVersionId: "v-old",
  validation,
};

interface Call {
  method: string;
  url: string;
  body: unknown;
}

function jsonResponse(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response;
}

function rpcOk(replayed: boolean): Response {
  return jsonResponse({
    publication_id: "pub-1",
    outbox_id: "ob-1",
    previous_version_id: "v-old",
    version_id: "v-new",
    status: "pending",
    replayed,
  });
}

function installFetch(handler: (call: Call) => Response): Call[] {
  const calls: Call[] = [];
  const stub = (async (url: unknown, options: Record<string, unknown> = {}) => {
    const call: Call = {
      method: String(options.method ?? "GET"),
      url: String(url),
      body: options.body ? JSON.parse(String(options.body)) : undefined,
    };
    calls.push(call);
    return handler(call);
  }) as unknown as typeof fetch;
  vi.stubGlobal("fetch", stub);
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("kill-switch gate in publishUpdateContent", () => {
  it("blocks a fresh publish when the factory is paused, without calling the RPC", async () => {
    const calls = installFetch((call) => {
      if (call.url.includes("idempotency_key=eq.")) return jsonResponse([]);
      if (call.url.includes("factory_settings")) {
        return jsonResponse([
          { key: "factory_paused", value: "true" },
          { key: "data_publishing_enabled", value: "true" },
        ]);
      }
      throw new Error(`unexpected call ${call.url}`);
    });
    await expect(publishUpdateContent(cfg, baseReq)).rejects.toMatchObject({
      code: "publishing_disabled",
    });
    expect(calls.some((c) => c.url.includes("/rpc/"))).toBe(false);
  });

  it("blocks a fresh publish when data publishing is disabled, without calling the RPC", async () => {
    const calls = installFetch((call) => {
      if (call.url.includes("idempotency_key=eq.")) return jsonResponse([]);
      if (call.url.includes("factory_settings")) {
        return jsonResponse([
          { key: "factory_paused", value: "false" },
          { key: "data_publishing_enabled", value: "false" },
        ]);
      }
      throw new Error(`unexpected call ${call.url}`);
    });
    await expect(publishUpdateContent(cfg, baseReq)).rejects.toMatchObject({
      code: "publishing_disabled",
    });
    expect(calls.some((c) => c.url.includes("/rpc/"))).toBe(false);
  });

  it("fails closed when the settings rows are missing", async () => {
    const calls = installFetch((call) => {
      if (call.url.includes("idempotency_key=eq.")) return jsonResponse([]);
      if (call.url.includes("factory_settings")) return jsonResponse([]);
      throw new Error(`unexpected call ${call.url}`);
    });
    await expect(publishUpdateContent(cfg, baseReq)).rejects.toMatchObject({
      code: "publishing_disabled",
    });
    expect(calls.some((c) => c.url.includes("/rpc/"))).toBe(false);
  });

  it("lets a fresh publish through when the factory is open, and lets a replay through when paused", async () => {
    const openCalls = installFetch((call) => {
      if (call.url.includes("idempotency_key=eq.")) return jsonResponse([]);
      if (call.url.includes("factory_settings")) {
        return jsonResponse([
          { key: "factory_paused", value: "false" },
          { key: "data_publishing_enabled", value: "true" },
        ]);
      }
      if (call.url.includes("publication_kind=eq.publish")) return jsonResponse([]);
      if (call.url.includes("/rpc/publish_v2_content_atomic")) return rpcOk(false);
      if (call.url.includes("content_versions?id=eq.v-old")) return jsonResponse([{ id: "v-old" }]);
      throw new Error(`unexpected call ${call.url}`);
    });
    const result = await publishUpdateContent(cfg, baseReq);
    expect(result.publicationId).toBe("pub-1");
    expect(result.replayed).toBe(false);
    expect(openCalls.some((c) => c.url.includes("factory_settings"))).toBe(true);
    vi.unstubAllGlobals();

    const replayCalls = installFetch((call) => {
      if (call.url.includes("idempotency_key=eq.")) return jsonResponse([{ id: "pub-0" }]);
      if (call.url.includes("/rpc/publish_v2_content_atomic")) return rpcOk(true);
      if (call.url.includes("content_versions?id=eq.v-old")) return jsonResponse([{ id: "v-old" }]);
      throw new Error(`unexpected call ${call.url}`);
    });
    const replayed = await publishUpdateContent(cfg, baseReq);
    expect(replayed.replayed).toBe(true);
    expect(replayCalls.some((c) => c.url.includes("factory_settings"))).toBe(false);
    expect(replayCalls.some((c) => c.url.includes("/rpc/"))).toBe(true);
  });
});

describe("PublishV2Error carries the gate code", () => {
  it("exposes code on the thrown error", () => {
    const err = new PublishV2Error("publishing_disabled", "publishing is disabled by kill switch");
    expect(err.code).toBe("publishing_disabled");
  });
});

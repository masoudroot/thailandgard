/**
 * تست گارد شکست پیش‌نمایش (R2): سه Build متوالیِ پیش‌نمایش که Fail شده
 * باشند، Pipeline را Hard-Stop می‌کنند؛ تا وقتی Hard-Stop فعال است، هیچ
 * Merge و هیچ Deployای مجاز نیست. خطا و تلاش‌ها، در تصمیم برگشتی (و در
 * CI، در لاگ همان Job) قابل ردیابی‌اند.
 *
 * این تست، اول رفتار ناقص فعلی را آشکار می‌کند (ماژول گارد وجود ندارد)
 * و بعد با حداقل تغییر لازم (همین ماژول خالص + واکش Deployments) سبز
 * می‌شود. تست زنده، فقط وقتی GITHUB_TOKEN هست اجرا می‌شود و خطای API
 * یا نبودن پیش‌نمایش را Unknown می‌داند، نه Hard-Stop؛ فقط سه شکستِ
 * تأییدشده، تست را قرمز می‌کند (همان مکانیزم توقف Merge).
 */
import { describe, expect, it } from "vitest";
import {
  evaluatePreviewBuilds,
  fetchPreviewDeployments,
  PREVIEW_FAILURE_LIMIT,
  type PreviewDeploymentOutcome,
} from "@/lib/factory/release/preview-failure-guard";

function outcome(
  id: number,
  state: PreviewDeploymentOutcome["state"],
  createdAt: string,
): PreviewDeploymentOutcome {
  return { id, environment: "Preview", ref: `feat/x-${id}`, sha: `sha${id}`, state, createdAt };
}

describe("evaluatePreviewBuilds", () => {
  it("hard-stops on three consecutive preview failures", () => {
    const decision = evaluatePreviewBuilds([
      outcome(3, "failure", "2026-11-01T10:00:00Z"),
      outcome(2, "error", "2026-11-01T09:00:00Z"),
      outcome(1, "failure", "2026-11-01T08:00:00Z"),
    ]);
    expect(PREVIEW_FAILURE_LIMIT).toBe(3);
    expect(decision.hardStop).toBe(true);
    expect(decision.canMerge).toBe(false);
    expect(decision.canDeploy).toBe(false);
    expect(decision.consecutiveFailures).toBe(3);
    expect(decision.blockingFailures.map((o) => o.id)).toEqual([3, 2, 1]);
    expect(decision.reason).toMatch(/3/);
  });

  it("resets on the newest success", () => {
    const decision = evaluatePreviewBuilds([
      outcome(4, "success", "2026-11-01T11:00:00Z"),
      outcome(3, "failure", "2026-11-01T10:00:00Z"),
      outcome(2, "failure", "2026-11-01T09:00:00Z"),
      outcome(1, "failure", "2026-11-01T08:00:00Z"),
    ]);
    expect(decision.hardStop).toBe(false);
    expect(decision.canMerge).toBe(true);
    expect(decision.canDeploy).toBe(true);
    expect(decision.consecutiveFailures).toBe(0);
  });

  it("does not hard-stop on non-consecutive failures", () => {
    const decision = evaluatePreviewBuilds([
      outcome(3, "failure", "2026-11-01T10:00:00Z"),
      outcome(2, "success", "2026-11-01T09:00:00Z"),
      outcome(1, "failure", "2026-11-01T08:00:00Z"),
    ]);
    expect(decision.hardStop).toBe(false);
    expect(decision.consecutiveFailures).toBe(1);
  });

  it("skips pending and inactive without breaking the chain", () => {
    const decision = evaluatePreviewBuilds([
      outcome(5, "failure", "2026-11-01T12:00:00Z"),
      outcome(4, "pending", "2026-11-01T11:00:00Z"),
      outcome(3, "inactive", "2026-11-01T10:00:00Z"),
      outcome(2, "failure", "2026-11-01T09:00:00Z"),
      outcome(1, "error", "2026-11-01T08:00:00Z"),
    ]);
    expect(decision.hardStop).toBe(true);
    expect(decision.consecutiveFailures).toBe(3);
  });

  it("does not hard-stop on fewer than three failures", () => {
    const decision = evaluatePreviewBuilds([
      outcome(2, "failure", "2026-11-01T10:00:00Z"),
      outcome(1, "failure", "2026-11-01T09:00:00Z"),
    ]);
    expect(decision.hardStop).toBe(false);
    expect(decision.consecutiveFailures).toBe(2);
  });

  it("does not hard-stop on empty input", () => {
    const decision = evaluatePreviewBuilds([]);
    expect(decision.hardStop).toBe(false);
    expect(decision.canMerge).toBe(true);
  });
});

describe("fetchPreviewDeployments (mocked GitHub API)", () => {
  function mockedFetch(list: unknown[], statuses: Record<number, unknown[]>): typeof fetch {
    return (async (url: unknown) => {
      const u = String(url);
      if (u.includes("/deployments?")) {
        return { ok: true, status: 200, json: async () => list } as Response;
      }
      const m = /\/deployments\/(\d+)\/statuses/.exec(u);
      if (m) {
        return { ok: true, status: 200, json: async () => statuses[Number(m[1])] ?? [] } as Response;
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    }) as unknown as typeof fetch;
  }

  it("keeps only Vercel preview deployments and evaluates them", async () => {
    const list = [
      { id: 30, sha: "s30", ref: "feat/a", environment: "Preview", creator: { login: "vercel[bot]" }, created_at: "2026-11-01T12:00:00Z" },
      { id: 29, sha: "s29", ref: "feat/b", environment: "Preview", creator: { login: "vercel[bot]" }, created_at: "2026-11-01T11:00:00Z" },
      { id: 28, sha: "s28", ref: "main", environment: "Production", creator: { login: "vercel[bot]" }, created_at: "2026-11-01T10:00:00Z" },
      { id: 27, sha: "s27", ref: "feat/c", environment: "Preview", creator: { login: "someone-else" }, created_at: "2026-11-01T09:00:00Z" },
      { id: 26, sha: "s26", ref: "feat/d", environment: "Preview", creator: { login: "vercel[bot]" }, created_at: "2026-11-01T08:00:00Z" },
    ];
    const statuses = {
      30: [{ state: "failure" }],
      29: [{ state: "error" }],
      26: [{ state: "failure" }],
    };
    const { outcomes, unknown } = await fetchPreviewDeployments({
      repo: "masoudroot/thailandgard",
      token: "test-token",
      fetchFn: mockedFetch(list, statuses),
    });
    expect(unknown).toBe(false);
    expect(outcomes.map((o) => o.id)).toEqual([30, 29, 26]);
    const decision = evaluatePreviewBuilds(outcomes);
    expect(decision.hardStop).toBe(true);
    expect(decision.blockingFailures.map((o) => o.id)).toEqual([30, 29, 26]);
  });

  it("reports unknown on API errors instead of a false hard-stop", async () => {
    const failing = (async () => ({ ok: false, status: 403, json: async () => ({}) }) as Response) as unknown as typeof fetch;
    const { unknown } = await fetchPreviewDeployments({
      repo: "masoudroot/thailandgard",
      token: "test-token",
      fetchFn: failing,
    });
    expect(unknown).toBe(true);
  });

  it("reports unknown when no preview deployment exists", async () => {
    const { unknown } = await fetchPreviewDeployments({
      repo: "masoudroot/thailandgard",
      token: "test-token",
      fetchFn: mockedFetch([], {}),
    });
    expect(unknown).toBe(true);
  });
});

describe.skipIf(!process.env.GITHUB_TOKEN)("live preview guard (CI only)", () => {
  it("fails only on three confirmed consecutive preview failures", async () => {
    const repo = process.env.GITHUB_REPOSITORY ?? "masoudroot/thailandgard";
    const { outcomes, unknown } = await fetchPreviewDeployments({
      repo,
      token: process.env.GITHUB_TOKEN as string,
    });
    if (unknown) return;
    const decision = evaluatePreviewBuilds(outcomes);
    expect(
      decision.hardStop,
      decision.hardStop
        ? `preview hard-stop: ${decision.blockingFailures.map((o) => `${o.id}@${o.ref}:${o.state}`).join(", ")}`
        : "no hard-stop",
    ).toBe(false);
  });
});

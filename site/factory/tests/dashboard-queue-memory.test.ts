import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Q2-09: behavioral tests for the two remaining dashboard pages that read data
 * directly through the Supabase client (queue and memory). Each page gets one
 * success path and one failure path. The Supabase builder is mocked, so these
 * run in the node environment with no network and no DOM.
 */

const getSupabase = vi.fn();

vi.mock("@/lib/dashboard/api", () => ({
  getSupabase: () => getSupabase(),
}));

const { getJob } = await import("@/lib/dashboard/queue");
const { readMemory } = await import("@/lib/dashboard/memory");

/** Minimal stand-in for the Supabase query builder used by these readers. */
function builder(result: { data?: unknown; error?: { message: string } | null }) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = self;
  chain.eq = self;
  chain.order = self;
  chain.ilike = self;
  chain.limit = self;
  chain.maybeSingle = async () => result;
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

describe("dashboard queue page data layer", () => {
  beforeEach(() => getSupabase.mockReset());

  it("returns a job when the row exists", async () => {
    getSupabase.mockReturnValue({
      from: () =>
        builder({
          data: {
            agent: "queue:job-1",
            state: {
              id: "job-1",
              type: "deploy",
              payload: null,
              status: "pending",
              attempts: 0,
              maxAttempts: 3,
              timeoutMs: 30000,
              createdAt: "2026-10-27T10:00:00.000Z",
            },
          },
          error: null,
        }),
    });

    const job = await getJob("job-1");

    expect(job).not.toBeNull();
    expect(job?.id).toBe("job-1");
    expect(job?.status).toBe("pending");
  });

  it("returns null for a corrupt stored row instead of throwing", async () => {
    getSupabase.mockReturnValue({
      from: () => builder({ data: { agent: "queue:job-1", state: { id: "job-1" } }, error: null }),
    });

    await expect(getJob("job-1")).resolves.toBeNull();
  });

  it("raises a readable error when the database read fails", async () => {
    getSupabase.mockReturnValue({
      from: () => builder({ data: null, error: { message: "connection refused" } }),
    });

    await expect(getJob("job-1")).rejects.toThrow("queue read failed: connection refused");
  });
});

describe("dashboard memory page data layer", () => {
  beforeEach(() => getSupabase.mockReset());

  it("maps stored rows into memory entries", async () => {
    getSupabase.mockReturnValue({
      from: () =>
        builder({
          data: [
            { team: "seo", key: "learned:1", value: "a", updated_at: "2026-10-27T10:00:00.000Z" },
          ],
          error: null,
        }),
    });

    const entries = await readMemory("seo");

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ team: "seo", key: "learned:1" });
  });

  it("raises a readable error when the database read fails", async () => {
    getSupabase.mockReturnValue({
      from: () => builder({ data: null, error: { message: "permission denied" } }),
    });

    await expect(readMemory("all")).rejects.toThrow("readMemory failed: permission denied");
  });
});

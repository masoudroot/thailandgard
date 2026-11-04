/**
 * Tests for the Leader feed readers (THG-TEAM-ARCHITECTURE-01 Phase 2,
 * step 4, feed side). Fixtures only: no database, no staging, no
 * production, no provider calls, no fabricated source rows.
 * The cutoff in these tests is caller-supplied test data, not a
 * doc-sourced threshold: ARCHITECTURE.md states no numeric
 * staleness threshold for these feeds.
 */
import { describe, expect, it } from "vitest";
import {
  LEADER_FEED_SOURCES,
  classifyFreshness,
  createGscDataUnavailableReader,
  createStaticFeedReader,
  createUnavailableFeedReader,
  emptyFeedResult,
  readLeaderFeeds,
  unavailableFeedResult,
  type GscFeedItem,
  type IntelFeedItem,
  type LeaderFeedReader,
  type PageAnalyticsFeedItem,
} from "@/lib/factory/feeds/leader-feeds";

const NOW = "2026-11-04T12:00:00Z";
const CUTOFF = "2026-11-03T12:00:00Z";

const INTEL: IntelFeedItem = {
  kind: "intel",
  id: "intel-1",
  source: "intel_feed",
  publishedAt: "2026-11-04T09:00:00Z",
  contentRef: "Fresh intel title",
  summary: "A fresh intel summary.",
  sourceName: "example source",
  provenance: {
    sourceTable: "intel_feed",
    sourceRowId: "intel-1",
    observedAt: "2026-11-04T09:00:00Z",
    sourceUrl: null,
  },
};

const GSC: GscFeedItem = {
  kind: "gsc_query",
  id: "gsc-thailand-tour",
  source: "gsc_queries",
  publishedAt: "2026-11-02T00:00:00Z",
  contentRef: "thailand tour",
  clicks: 12,
  impressions: 400,
  ctr: 0.03,
  avgPosition: 8.5,
  provenance: {
    sourceTable: "gsc_queries",
    sourceRowId: "gsc-thailand-tour",
    observedAt: "2026-11-02T00:00:00Z",
    sourceUrl: null,
  },
};

const PAGE: PageAnalyticsFeedItem = {
  kind: "page_analytics",
  id: "page-/tours/phuket",
  source: "page_analytics",
  publishedAt: "2026-11-04T08:00:00Z",
  contentRef: "/tours/phuket",
  views: 90,
  clicks: 5,
  impressions: 300,
  avgPosition: 6.2,
  provenance: {
    sourceTable: "page_analytics",
    sourceRowId: "page-/tours/phuket",
    observedAt: "2026-11-04T08:00:00Z",
    sourceUrl: null,
  },
};

describe("leader feed sources", () => {
  it("names exactly the three feeds from ARCHITECTURE.md section 2", () => {
    expect([...LEADER_FEED_SOURCES]).toEqual([
      "intel_feed",
      "gsc_queries",
      "page_analytics",
    ]);
  });

  it("gives every fixture item an id, source, publishedAt, contentRef and provenance", () => {
    for (const item of [INTEL, GSC, PAGE]) {
      expect(item.id.length).toBeGreaterThan(0);
      expect(item.contentRef.length).toBeGreaterThan(0);
      expect(item.provenance.sourceTable).toBe(item.source);
      expect(item.provenance.sourceRowId.length).toBeGreaterThan(0);
    }
  });
});

describe("freshness classification with a caller-supplied cutoff", () => {
  it("marks an item at the cutoff as fresh and one before it as stale", () => {
    expect(classifyFreshness(CUTOFF, { now: NOW, cutoff: CUTOFF })).toBe("fresh");
    expect(
      classifyFreshness("2026-11-03T11:59:59Z", { now: NOW, cutoff: CUTOFF }),
    ).toBe("stale");
    expect(
      classifyFreshness("2026-11-04T00:00:00Z", { now: NOW, cutoff: CUTOFF }),
    ).toBe("fresh");
  });

  it("marks a missing or unparsable timestamp as unknown, never fresh", () => {
    expect(classifyFreshness(null, { now: NOW, cutoff: CUTOFF })).toBe("unknown");
    expect(classifyFreshness("not-a-date", { now: NOW, cutoff: CUTOFF })).toBe(
      "unknown",
    );
  });
});

describe("empty feeds", () => {
  it("returns status empty with no items, never fabricated items", async () => {
    const snapshot = await readLeaderFeeds(
      [
        createStaticFeedReader("intel_feed", []),
        createStaticFeedReader("gsc_queries", []),
        createStaticFeedReader("page_analytics", []),
      ],
      { now: NOW, cutoff: CUTOFF },
    );
    expect(snapshot.feeds.intel_feed).toEqual(emptyFeedResult("intel_feed"));
    expect(snapshot.feeds.gsc_queries.status).toBe("empty");
    expect(snapshot.feeds.page_analytics.status).toBe("empty");
    expect(snapshot.classified).toEqual([]);
    expect(snapshot.hasFreshData).toBe(false);
    expect(snapshot.unavailableSources).toEqual([]);
  });
});

describe("fresh versus stale snapshots", () => {
  it("reports fresh data when at least one item is at or after the cutoff", async () => {
    const snapshot = await readLeaderFeeds(
      [
        createStaticFeedReader("intel_feed", [INTEL]),
        createStaticFeedReader("gsc_queries", [GSC]),
        createStaticFeedReader("page_analytics", [PAGE]),
      ],
      { now: NOW, cutoff: CUTOFF },
    );
    expect(snapshot.feeds.intel_feed.status).toBe("ok");
    expect(snapshot.freshItems.map((i) => i.id)).toEqual([
      "intel-1",
      "page-/tours/phuket",
    ]);
    expect(snapshot.staleItems.map((i) => i.id)).toEqual(["gsc-thailand-tour"]);
    expect(snapshot.hasFreshData).toBe(true);
  });

  it("reports no fresh data when every item is stale", async () => {
    const staleIntel: IntelFeedItem = { ...INTEL, publishedAt: "2026-11-01T00:00:00Z" };
    const snapshot = await readLeaderFeeds(
      [
        createStaticFeedReader("intel_feed", [staleIntel]),
        createStaticFeedReader("gsc_queries", [GSC]),
        createStaticFeedReader("page_analytics", []),
      ],
      { now: NOW, cutoff: CUTOFF },
    );
    expect(snapshot.hasFreshData).toBe(false);
    expect(snapshot.freshItems).toEqual([]);
    expect(snapshot.staleItems.map((i) => i.id).sort()).toEqual([
      "gsc-thailand-tour",
      "intel-1",
    ]);
  });

  it("keeps unknown-timestamp items out of the fresh set", async () => {
    const unknownIntel: IntelFeedItem = { ...INTEL, publishedAt: null };
    const snapshot = await readLeaderFeeds(
      [createStaticFeedReader("intel_feed", [unknownIntel])],
      { now: NOW, cutoff: CUTOFF },
    );
    expect(snapshot.unknownItems.map((i) => i.id)).toEqual(["intel-1"]);
    expect(snapshot.hasFreshData).toBe(false);
  });
});

describe("data_unavailable, including the missing GSC source", () => {
  it("reports the GSC reader as data_unavailable with its reason and no rows", async () => {
    const reason = "gsc_queries source absent on staging; step 5 repair pending";
    const snapshot = await readLeaderFeeds(
      [
        createStaticFeedReader("intel_feed", [INTEL]),
        createGscDataUnavailableReader(reason),
        createStaticFeedReader("page_analytics", [PAGE]),
      ],
      { now: NOW, cutoff: CUTOFF },
    );
    expect(snapshot.feeds.gsc_queries).toEqual({
      source: "gsc_queries",
      status: "data_unavailable",
      items: [],
      reason,
    });
    expect(snapshot.feeds.gsc_queries.status).not.toBe("empty");
    expect(snapshot.unavailableSources).toEqual(["gsc_queries"]);
    expect(snapshot.hasFreshData).toBe(true);
  });

  it("requires a non-empty reason for data_unavailable", () => {
    expect(() => unavailableFeedResult("gsc_queries", "  ")).toThrow();
    expect(() => unavailableFeedResult("intel_feed", "")).toThrow();
    expect(() =>
      createUnavailableFeedReader("intel_feed", ""),
    ).toThrow();
  });

  it("reports a feed with no registered reader as data_unavailable, not omitted", async () => {
    const snapshot = await readLeaderFeeds(
      [createStaticFeedReader("intel_feed", [INTEL])],
      { now: NOW, cutoff: CUTOFF },
    );
    expect(snapshot.feeds.gsc_queries.status).toBe("data_unavailable");
    expect(snapshot.feeds.page_analytics.status).toBe("data_unavailable");
    expect(snapshot.unavailableSources).toEqual(["gsc_queries", "page_analytics"]);
  });

  it("converts a throwing reader to data_unavailable without hiding the other feeds", async () => {
    const throwing: LeaderFeedReader = {
      source: "page_analytics",
      async read() {
        throw new Error("boom");
      },
    };
    const snapshot = await readLeaderFeeds(
      [
        createStaticFeedReader("intel_feed", [INTEL]),
        createGscDataUnavailableReader("gsc source absent"),
        throwing,
      ],
      { now: NOW, cutoff: CUTOFF },
    );
    expect(snapshot.feeds.page_analytics.status).toBe("data_unavailable");
    expect(snapshot.feeds.page_analytics.reason).toBe("boom");
    expect(snapshot.feeds.intel_feed.status).toBe("ok");
  });

  it("rejects a fixture item registered under the wrong feed source", () => {
    expect(() => createStaticFeedReader("intel_feed", [GSC])).toThrow();
  });
});

describe("leader feed aggregation guards (step-4 close-out)", () => {
  it("marks a future timestamp as unknown, never fresh", () => {
    expect(
      classifyFreshness("2026-11-05T00:00:00Z", { now: NOW, cutoff: CUTOFF }),
    ).toBe("unknown");
  });

  it("drops items carried by a data_unavailable result", async () => {
    const smuggled: LeaderFeedReader = {
      source: "gsc_queries",
      async read() {
        return {
          source: "gsc_queries",
          status: "data_unavailable",
          items: [GSC],
          reason: "reader claims unavailable but carries rows",
        };
      },
    };
    const snapshot = await readLeaderFeeds(
      [createStaticFeedReader("intel_feed", [INTEL]), smuggled],
      { now: NOW, cutoff: CUTOFF },
    );
    expect(snapshot.feeds.gsc_queries.status).toBe("data_unavailable");
    expect(snapshot.feeds.gsc_queries.items).toEqual([]);
    // Nothing from an unavailable feed reaches classification:
    // no classified entry carries a gsc_queries item.
    expect(snapshot.classified.filter((c) => c.item.source === "gsc_queries")).toEqual([]);
    expect(snapshot.freshItems).toEqual([INTEL]);
  });

  it("converts an empty result carrying items to data_unavailable", async () => {
    const lying: LeaderFeedReader = {
      source: "page_analytics",
      async read() {
        return {
          source: "page_analytics",
          status: "empty",
          items: [PAGE],
          reason: null,
        };
      },
    };
    const snapshot = await readLeaderFeeds(
      [createStaticFeedReader("intel_feed", [INTEL]), lying],
      { now: NOW, cutoff: CUTOFF },
    );
    expect(snapshot.feeds.page_analytics.status).toBe("data_unavailable");
    expect(snapshot.feeds.page_analytics.items).toEqual([]);
    expect(snapshot.freshItems).toEqual([INTEL]);
  });

  it("converts a result carrying a wrong-provenance item to data_unavailable", async () => {
    const wrong: LeaderFeedReader = {
      source: "gsc_queries",
      async read() {
        return {
          source: "gsc_queries",
          status: "ok",
          items: [
            { ...GSC, provenance: { ...GSC.provenance, sourceTable: "intel_feed" as const } },
          ],
          reason: null,
        };
      },
    };
    const snapshot = await readLeaderFeeds(
      [createStaticFeedReader("intel_feed", [INTEL]), wrong],
      { now: NOW, cutoff: CUTOFF },
    );
    expect(snapshot.feeds.gsc_queries.status).toBe("data_unavailable");
    expect(snapshot.feeds.gsc_queries.items).toEqual([]);
    expect(snapshot.freshItems).toEqual([INTEL]);
  });

  it("normalizes an ok result with zero items to empty", async () => {
    const snapshot = await readLeaderFeeds(
      [createStaticFeedReader("intel_feed", [INTEL]), createStaticFeedReader("gsc_queries", [])],
      { now: NOW, cutoff: CUTOFF },
    );
    expect(snapshot.feeds.gsc_queries.status).toBe("empty");
    expect(snapshot.feeds.gsc_queries.items).toEqual([]);
  });

  it("reports duplicate reader registrations instead of silently first-winning", async () => {
    const snapshot = await readLeaderFeeds(
      [
        createStaticFeedReader("intel_feed", [INTEL]),
        createStaticFeedReader("intel_feed", []),
      ],
      { now: NOW, cutoff: CUTOFF },
    );
    expect(snapshot.duplicateSources).toEqual(["intel_feed"]);
    expect(snapshot.feeds.intel_feed.items).toEqual([INTEL]);
  });
});

/**
 * Leader adapter tests (THG-TEAM-ARCHITECTURE-01 Phase 2, step 4
 * close-out). Fixture readers only: no database, no provider call,
 * no tick route. These tests are the composition the step-4 critique
 * round found missing: feed-reader output runs into the Leader
 * Runtime through runLeaderFromSnapshot, under one canonical
 * freshness rule, with unavailable feeds propagated and daily rows
 * aggregated before dedupe.
 */
import { describe, expect, it } from "vitest";
import {
  aggregateFeedItems,
  runLeaderFromSnapshot,
} from "@/lib/factory/leader/leader-adapter";
import {
  createGscDataUnavailableReader,
  createStaticFeedReader,
  readLeaderFeeds,
  type GscFeedItem,
  type IntelFeedItem,
  type LeaderFeedReader,
  type LeaderFeedSnapshot,
  type PageAnalyticsFeedItem,
} from "@/lib/factory/feeds/leader-feeds";

const NOW = "2026-11-04T12:00:00Z";
const FRESH = "2026-11-04T09:00:00Z";

function intel(id: string, title: string, publishedAt: string | null = FRESH): IntelFeedItem {
  return {
    kind: "intel",
    id,
    source: "intel_feed",
    publishedAt,
    contentRef: title,
    summary: null,
    sourceName: null,
    provenance: { sourceTable: "intel_feed", sourceRowId: id, observedAt: publishedAt, sourceUrl: null },
  };
}

function gsc(
  id: string,
  query: string,
  publishedAt: string | null,
  clicks = 10,
  impressions = 100,
  avgPosition: number | null = 5,
): GscFeedItem {
  return {
    kind: "gsc_query",
    id,
    source: "gsc_queries",
    publishedAt,
    contentRef: query,
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : null,
    avgPosition,
    provenance: { sourceTable: "gsc_queries", sourceRowId: id, observedAt: publishedAt, sourceUrl: null },
  };
}

function page(id: string, path: string, publishedAt: string | null = FRESH): PageAnalyticsFeedItem {
  return {
    kind: "page_analytics",
    id,
    source: "page_analytics",
    publishedAt,
    contentRef: path,
    views: 90,
    clicks: 5,
    impressions: 300,
    avgPosition: 6,
    provenance: { sourceTable: "page_analytics", sourceRowId: id, observedAt: publishedAt, sourceUrl: null },
  };
}

async function snapshot(
  readers: readonly LeaderFeedReader[],
): Promise<LeaderFeedSnapshot> {
  return readLeaderFeeds(readers, { now: NOW, cutoff: "2026-10-28T12:00:00Z" });
}

describe("leader adapter: snapshot into proposals", () => {
  it("builds one proposal from the same subject across intel and gsc readers", async () => {
    const snap = await snapshot([
      createStaticFeedReader("intel_feed", [intel("intel-1", "thailand tour")]),
      createStaticFeedReader("gsc_queries", [gsc("gsc-1", "thailand tour", FRESH)]),
      createStaticFeedReader("page_analytics", []),
    ]);
    const result = runLeaderFromSnapshot(snap, { now: NOW });
    expect(result.kind).toBe("proposal");
    if (result.kind !== "proposal") throw new Error("expected proposal");
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].evidence_refs).toEqual([
      "intel_feed:intel-1",
      "gsc_queries:thailand tour",
    ]);
    expect(result.proposals[0].priority).toBe("high");
    expect(result.proposals[0].unavailable_sources).toEqual([]);
    expect(result.unavailable_sources).toEqual([]);
    expect(result.dropped).toEqual([]);
  });

  it("records a missing gsc feed and caps partial-feed proposals below high", async () => {
    const snap = await snapshot([
      createStaticFeedReader("intel_feed", [intel("intel-1", "phuket beaches")]),
      createGscDataUnavailableReader("gsc_queries source absent on staging"),
      createStaticFeedReader("page_analytics", [page("page-1", "phuket beaches")]),
    ]);
    const result = runLeaderFromSnapshot(snap, { now: NOW });
    expect(result.kind).toBe("proposal");
    if (result.kind !== "proposal") throw new Error("expected proposal");
    expect(result.proposals).toHaveLength(1);
    // Two available feeds would corroborate to "high"; the missing
    // gsc feed caps it at "medium" (package ARCHITECTURE.md s.12).
    expect(result.proposals[0].priority).toBe("medium");
    expect(result.proposals[0].unavailable_sources).toEqual(["gsc_queries"]);
    expect(result.unavailable_sources).toEqual(["gsc_queries"]);
  });

  it("aggregates daily gsc rows by query so one query counts once", async () => {
    const snap = await snapshot([
      createStaticFeedReader("intel_feed", []),
      createStaticFeedReader("gsc_queries", [
        gsc("day-1", "thailand tour", "2026-11-03T00:00:00Z", 10, 100, 5),
        gsc("day-2", "thailand tour", "2026-11-04T00:00:00Z", 20, 300, 9),
      ]),
      createStaticFeedReader("page_analytics", []),
    ]);
    const result = runLeaderFromSnapshot(snap, { now: NOW });
    expect(result.kind).toBe("proposal");
    if (result.kind !== "proposal") throw new Error("expected proposal");
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].evidence_refs).toHaveLength(1);
    expect(result.proposals[0].priority).toBe("low");
  });

  it("aggregates with impression-weighted position, ignoring null-position rows", () => {
    const rows = [
      gsc("d1", "q", FRESH, 10, 100, null),
      gsc("d2", "q", FRESH, 10, 100, 5),
      gsc("d3", "q", FRESH, 10, 100, 7),
    ];
    const [agg] = aggregateFeedItems(rows);
    if (agg.kind !== "gsc_query") throw new Error("expected gsc item");
    expect(agg.clicks).toBe(30);
    expect(agg.impressions).toBe(300);
    expect(agg.ctr).toBeCloseTo(0.1);
    expect(agg.avgPosition).toBeCloseTo(6);
    expect(agg.id).toBe("q");
  });

  it("drops a future feed item with future_observed_at and builds nothing from it", async () => {
    const snap = await snapshot([
      createStaticFeedReader("intel_feed", [intel("intel-1", "future news", "2026-11-05T00:00:00Z")]),
      createStaticFeedReader("gsc_queries", []),
      createStaticFeedReader("page_analytics", []),
    ]);
    const result = runLeaderFromSnapshot(snap, { now: NOW });
    expect(result.kind).toBe("no_action");
    if (result.kind !== "no_action") throw new Error("expected no_action");
    expect(result.proposals).toEqual([]);
    expect(result.dropped.map((d) => d.reason)).toEqual(["future_observed_at"]);
  });

  it("drops a null-timestamp item with invalid_observed_at and builds nothing from it", async () => {
    const snap = await snapshot([
      createStaticFeedReader("intel_feed", [intel("intel-1", "dateless news", null)]),
      createStaticFeedReader("gsc_queries", []),
      createStaticFeedReader("page_analytics", []),
    ]);
    const result = runLeaderFromSnapshot(snap, { now: NOW });
    expect(result.kind).toBe("no_action");
    if (result.kind !== "no_action") throw new Error("expected no_action");
    expect(result.dropped.map((d) => d.reason)).toEqual(["invalid_observed_at"]);
  });

  it("applies the canonical cutoff once: at the cutoff is fresh, before it is stale", async () => {
    const atCutoff = "2026-10-28T12:00:00Z";
    const snap = await snapshot([
      createStaticFeedReader("intel_feed", [
        intel("at", "at cutoff", atCutoff),
        intel("before", "before cutoff", "2026-10-28T11:59:59Z"),
      ]),
      createStaticFeedReader("gsc_queries", []),
      createStaticFeedReader("page_analytics", []),
    ]);
    const result = runLeaderFromSnapshot(snap, { now: NOW });
    expect(result.kind).toBe("proposal");
    if (result.kind !== "proposal") throw new Error("expected proposal");
    expect(result.proposals.map((p) => p.goal)).toEqual(["Follow up on: at cutoff"]);
    expect(result.dropped.map((d) => d.id)).toEqual(["before"]);
    expect(result.dropped[0].reason).toBe("stale");
  });

  it("converts a wrong-provenance reader to data_unavailable and proposes from the other feeds", async () => {
    const wrong: LeaderFeedReader = {
      source: "gsc_queries",
      async read() {
        const item = gsc("gsc-1", "thailand tour", FRESH);
        return {
          source: "gsc_queries",
          status: "ok",
          items: [{ ...item, provenance: { ...item.provenance, sourceTable: "intel_feed" as const } }],
          reason: null,
        };
      },
    };
    const snap = await snapshot([
      createStaticFeedReader("intel_feed", [intel("intel-1", "thailand tour")]),
      wrong,
      createStaticFeedReader("page_analytics", []),
    ]);
    expect(snap.feeds.gsc_queries.status).toBe("data_unavailable");
    const result = runLeaderFromSnapshot(snap, { now: NOW });
    expect(result.kind).toBe("proposal");
    if (result.kind !== "proposal") throw new Error("expected proposal");
    expect(result.proposals[0].evidence_refs).toEqual(["intel_feed:intel-1"]);
    expect(result.unavailable_sources).toEqual(["gsc_queries"]);
  });

  it("counts a repeated feed row once, so it cannot inflate priority", async () => {
    const snap = await snapshot([
      createStaticFeedReader("intel_feed", [
        intel("dup", "same story"),
        intel("dup", "same story"),
      ]),
      createStaticFeedReader("gsc_queries", []),
      createStaticFeedReader("page_analytics", []),
    ]);
    const result = runLeaderFromSnapshot(snap, { now: NOW });
    expect(result.kind).toBe("proposal");
    if (result.kind !== "proposal") throw new Error("expected proposal");
    expect(result.proposals[0].evidence_refs).toEqual(["intel_feed:dup"]);
    expect(result.proposals[0].priority).toBe("low");
  });

  it("encodes a colon in a row id so evidence refs stay unambiguous", async () => {
    const snap = await snapshot([
      createStaticFeedReader("intel_feed", [intel("a:b", "colon row")]),
      createStaticFeedReader("gsc_queries", []),
      createStaticFeedReader("page_analytics", []),
    ]);
    const result = runLeaderFromSnapshot(snap, { now: NOW });
    expect(result.kind).toBe("proposal");
    if (result.kind !== "proposal") throw new Error("expected proposal");
    expect(result.proposals[0].evidence_refs).toEqual(["intel_feed:a%3Ab"]);
  });

  it("assigns topic-less adapter proposals to product_leader for triage", async () => {
    const snap = await snapshot([
      createStaticFeedReader("intel_feed", [intel("intel-1", "unclassified item")]),
      createStaticFeedReader("gsc_queries", []),
      createStaticFeedReader("page_analytics", []),
    ]);
    const result = runLeaderFromSnapshot(snap, { now: NOW });
    expect(result.kind).toBe("proposal");
    if (result.kind !== "proposal") throw new Error("expected proposal");
    expect(result.proposals[0].owner_team).toBe("product_leader");
  });
});

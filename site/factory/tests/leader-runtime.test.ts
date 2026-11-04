/**
 * Leader Runtime tests (THG-TEAM-ARCHITECTURE-01 Phase 2, step 4).
 * Mocked feeds only: no database, no provider call, no tick route.
 * The clock is pinned so fresh versus stale is exact, not relative.
 *
 * Acceptance legs covered here:
 * - fresh data yields a valid WorkProposal (all registry fields, a
 *   valid owner_team, deduped items, traceable provenance);
 * - stale data yields an explicit no_action, never a proposal;
 * - fabricated data (an unnamed feed, a source mismatch, a future
 *   observation, an empty subject, an unparseable date) yields
 *   nothing: no proposal and no action;
 * - empty feeds yield no_action;
 * - a mix of fresh with stale or fabricated items still builds only
 *   from the fresh named items, and the dropped items are reported.
 */
import { describe, expect, it } from "vitest";
import {
  LEADER_FEED_NAMES,
  buildWorkProposal,
  dedupeLeaderItems,
  runLeader,
  type LeaderFeedItemInput,
} from "@/lib/factory/leader/leader-runtime";
import { TEAM_KEYS } from "@/lib/factory/teams/registry";

const NOW = "2026-11-04T10:00:00Z";
const FRESH = "2026-11-04T09:00:00Z";
const FRESH_LATER = "2026-11-04T09:30:00Z";
const STALE = "2026-10-01T09:00:00Z";

function item(overrides: Partial<LeaderFeedItemInput> & { feed: string }): LeaderFeedItemInput {
  return {
    id: "item-1",
    subject: "Thailand visa guide update",
    observed_at: FRESH,
    ...overrides,
  };
}

describe("leader runtime: fresh data", () => {
  it("builds exactly one proposal from the same subject across two named feeds", () => {
    const result = runLeader(
      [
        item({ feed: "intel_feed", id: "intel-1", topic: "guide" }),
        item({ feed: "gsc_queries", id: "gsc-1", observed_at: FRESH_LATER, topic: "search" }),
      ],
      { now: NOW },
    );
    expect(result.kind).toBe("proposal");
    if (result.kind !== "proposal") return;
    expect(result.proposals).toHaveLength(1);
    const proposal = result.proposals[0];
    expect(proposal.dedupe_key).toBe("leader:thailand visa guide update");
    expect(proposal.evidence_refs).toEqual(["intel_feed:intel-1", "gsc_queries:gsc-1"]);
    expect(proposal.source_items).toHaveLength(2);
    expect(proposal.priority).toBe("high");
    expect(result.dropped).toEqual([]);
  });

  it("carries every required WorkProposal field with a valid owner_team", () => {
    const result = runLeader([item({ feed: "intel_feed", topic: "guide" })], { now: NOW });
    expect(result.kind).toBe("proposal");
    if (result.kind !== "proposal") return;
    const proposal = result.proposals[0];
    expect(typeof proposal.goal).toBe("string");
    expect(proposal.goal).toBe("Follow up on: Thailand visa guide update");
    expect(proposal.evidence_refs.length).toBeGreaterThan(0);
    expect(TEAM_KEYS).toContain(proposal.owner_team);
    expect(proposal.owner_team).toBe("content");
    expect(proposal.risk_class).toBe("medium");
    expect(proposal.acceptance_criteria.length).toBeGreaterThan(0);
    expect(proposal.budget_limit).toBe(0);
    expect(proposal.dependencies).toEqual([]);
    expect(new Date(proposal.expiry).getTime()).toBeGreaterThan(new Date(NOW).getTime());
    expect(proposal.dedupe_key).not.toBe("");
    expect(proposal.priority).toBe("low");
  });

  it("builds one proposal per distinct subject", () => {
    const result = runLeader(
      [
        item({ feed: "intel_feed", id: "a", subject: "Phuket beaches" }),
        item({ feed: "intel_feed", id: "b", subject: "Bangkok street food" }),
      ],
      { now: NOW },
    );
    expect(result.kind).toBe("proposal");
    if (result.kind !== "proposal") return;
    expect(result.proposals).toHaveLength(2);
    expect(result.proposals.map((p) => p.dedupe_key).sort()).toEqual([
      "leader:bangkok street food",
      "leader:phuket beaches",
    ]);
  });

  it("keeps every evidence_ref traceable to a carried source item", () => {
    const result = runLeader(
      [
        item({ feed: "intel_feed", id: "intel-9", topic: "guide" }),
        item({ feed: "page_analytics", id: "page-9", topic: "guide" }),
      ],
      { now: NOW },
    );
    expect(result.kind).toBe("proposal");
    if (result.kind !== "proposal") return;
    const proposal = result.proposals[0];
    for (const ref of proposal.evidence_refs) {
      const [feed, id] = ref.split(":");
      expect(
        proposal.source_items.some((source) => source.feed === feed && source.id === id),
      ).toBe(true);
    }
    expect(proposal.source_items.map((source) => source.feed).sort()).toEqual([
      "intel_feed",
      "page_analytics",
    ]);
  });

  it("assigns tour topics to tour_manager, search topics to seo, unknown topics to product_leader", () => {
    const result = runLeader(
      [
        item({ feed: "intel_feed", id: "t1", subject: "Phuket tour price", topic: "price" }),
        item({ feed: "gsc_queries", id: "s1", subject: "thailand visa query", topic: "search" }),
        item({ feed: "page_analytics", id: "u1", subject: "Some page", topic: "mystery" }),
      ],
      { now: NOW },
    );
    expect(result.kind).toBe("proposal");
    if (result.kind !== "proposal") return;
    const byGoal = new Map(result.proposals.map((p) => [p.goal, p]));
    expect(byGoal.get("Follow up on: Phuket tour price")?.owner_team).toBe("tour_manager");
    expect(byGoal.get("Follow up on: Phuket tour price")?.risk_class).toBe("high");
    expect(byGoal.get("Follow up on: thailand visa query")?.owner_team).toBe("seo");
    expect(byGoal.get("Follow up on: Some page")?.owner_team).toBe("product_leader");
  });

  it("refuses to build a proposal from a group with no feed items", () => {
    expect(() =>
      buildWorkProposal({ dedupe_key: "leader:x", subject: "x", items: [] }, { now: NOW }),
    ).toThrow();
  });

  it("dedupes within one feed and keeps the freshest subject verbatim", () => {
    const groups = dedupeLeaderItems([
      {
        feed: "intel_feed",
        id: "old",
        subject: "  Phuket   Beaches ",
        summary: null,
        topic: null,
        observed_at: FRESH,
        observed_ms: Date.parse(FRESH),
      },
      {
        feed: "intel_feed",
        id: "new",
        subject: "phuket beaches",
        summary: null,
        topic: null,
        observed_at: FRESH_LATER,
        observed_ms: Date.parse(FRESH_LATER),
      },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(2);
    expect(groups[0].subject).toBe("phuket beaches");
  });

  it("names exactly the three feeds from the architecture doc", () => {
    expect([...LEADER_FEED_NAMES].sort()).toEqual([
      "gsc_queries",
      "intel_feed",
      "page_analytics",
    ]);
  });
});

describe("leader runtime: stale data", () => {
  it("yields an explicit no_action with reason stale_data and no proposal", () => {
    const result = runLeader([item({ feed: "intel_feed", observed_at: STALE })], { now: NOW });
    expect(result.kind).toBe("no_action");
    if (result.kind !== "no_action") return;
    expect(result.reason).toBe("stale_data");
    expect(result.proposals).toEqual([]);
    expect(result.dropped).toEqual([
      { feed: "intel_feed", id: "item-1", reason: "stale", observed_at: STALE },
    ]);
  });

  it("builds only from fresh items when stale items are mixed in, and reports the stale drop", () => {
    const result = runLeader(
      [
        item({ feed: "intel_feed", id: "fresh-1" }),
        item({ feed: "gsc_queries", id: "stale-1", observed_at: STALE }),
      ],
      { now: NOW },
    );
    expect(result.kind).toBe("proposal");
    if (result.kind !== "proposal") return;
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].evidence_refs).toEqual(["intel_feed:fresh-1"]);
    expect(result.dropped.map((d) => d.id)).toEqual(["stale-1"]);
    expect(result.dropped[0].reason).toBe("stale");
  });
});

describe("leader runtime: fabricated data", () => {
  it("yields nothing from a feed the PM has not named in full", () => {
    const result = runLeader([item({ feed: "rumor_blog" })], { now: NOW });
    expect(result.kind).toBe("no_action");
    if (result.kind !== "no_action") return;
    expect(result.reason).toBe("untrusted_source");
    expect(result.proposals).toEqual([]);
    expect(result.dropped[0].reason).toBe("untrusted_feed");
  });

  it("yields nothing when an item's declared source disagrees with its feed", () => {
    const result = runLeader(
      [item({ feed: "intel_feed", source: "gsc_queries" })],
      { now: NOW },
    );
    expect(result.kind).toBe("no_action");
    if (result.kind !== "no_action") return;
    expect(result.reason).toBe("untrusted_source");
    expect(result.proposals).toEqual([]);
    expect(result.dropped[0].reason).toBe("source_mismatch");
  });

  it("yields nothing from a future observation, an empty subject, or an unparseable date", () => {
    const future = runLeader(
      [item({ feed: "intel_feed", observed_at: "2026-11-05T10:00:00Z" })],
      { now: NOW },
    );
    expect(future.kind).toBe("no_action");
    if (future.kind === "no_action") {
      expect(future.dropped[0].reason).toBe("future_observed_at");
      expect(future.proposals).toEqual([]);
    }
    const emptySubject = runLeader([item({ feed: "intel_feed", subject: "   " })], { now: NOW });
    expect(emptySubject.kind).toBe("no_action");
    if (emptySubject.kind === "no_action") {
      expect(emptySubject.dropped[0].reason).toBe("empty_subject");
    }
    const badDate = runLeader([item({ feed: "intel_feed", observed_at: "not-a-date" })], {
      now: NOW,
    });
    expect(badDate.kind).toBe("no_action");
    if (badDate.kind === "no_action") {
      expect(badDate.reason).toBe("no_valid_items");
      expect(badDate.dropped[0].reason).toBe("invalid_observed_at");
    }
  });

  it("builds only from named fresh items when fabricated items are mixed in", () => {
    const result = runLeader(
      [
        item({ feed: "intel_feed", id: "good-1" }),
        item({ feed: "unverified_tipster", id: "bad-1" }),
      ],
      { now: NOW },
    );
    expect(result.kind).toBe("proposal");
    if (result.kind !== "proposal") return;
    expect(result.proposals[0].evidence_refs).toEqual(["intel_feed:good-1"]);
    expect(result.dropped.map((d) => d.id)).toEqual(["bad-1"]);
  });
});

describe("leader runtime: empty feeds", () => {
  it("yields no_action with reason empty_feeds for no items at all", () => {
    const result = runLeader([], { now: NOW });
    expect(result.kind).toBe("no_action");
    if (result.kind !== "no_action") return;
    expect(result.reason).toBe("empty_feeds");
    expect(result.proposals).toEqual([]);
  });
});

describe("leader runtime: step-4 close-out boundaries", () => {
  it("assigns a majority topic: two tour votes beat one seo vote on one subject", () => {
    const result = runLeader(
      [
        item({ feed: "intel_feed", id: "t1", topic: "tour" }),
        item({ feed: "gsc_queries", id: "t2", topic: "price" }),
        item({ feed: "page_analytics", id: "s1", topic: "search" }),
      ],
      { now: NOW },
    );
    expect(result.kind).toBe("proposal");
    if (result.kind !== "proposal") return;
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].owner_team).toBe("tour_manager");
  });

  it("assigns a tie to product_leader for triage", () => {
    const result = runLeader(
      [
        item({ feed: "intel_feed", id: "g1", topic: "guide" }),
        item({ feed: "gsc_queries", id: "s1", topic: "search" }),
      ],
      { now: NOW },
    );
    expect(result.kind).toBe("proposal");
    if (result.kind !== "proposal") return;
    expect(result.proposals[0].owner_team).toBe("product_leader");
  });

  it("assigns a missing topic to product_leader for triage", () => {
    const result = runLeader([item({ feed: "intel_feed", topic: undefined })], { now: NOW });
    expect(result.kind).toBe("proposal");
    if (result.kind !== "proposal") return;
    expect(result.proposals[0].owner_team).toBe("product_leader");
  });

  it("normalizes topic labels before lookup: Guide and padded SEARCH map", () => {
    const result = runLeader(
      [
        item({ feed: "intel_feed", id: "g1", subject: "Guide item", topic: "Guide" }),
        item({ feed: "gsc_queries", id: "s1", subject: "Search item", topic: "  SEARCH " }),
      ],
      { now: NOW },
    );
    expect(result.kind).toBe("proposal");
    if (result.kind !== "proposal") return;
    const byGoal = new Map(result.proposals.map((p) => [p.goal, p]));
    expect(byGoal.get("Follow up on: Guide item")?.owner_team).toBe("content");
    expect(byGoal.get("Follow up on: Search item")?.owner_team).toBe("seo");
  });

  it("rates two items from one feed as medium through runLeader", () => {
    const result = runLeader(
      [
        item({ feed: "intel_feed", id: "a1" }),
        item({ feed: "intel_feed", id: "a2", observed_at: FRESH_LATER }),
      ],
      { now: NOW },
    );
    expect(result.kind).toBe("proposal");
    if (result.kind !== "proposal") return;
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].priority).toBe("medium");
  });

  it("sets expiry from the freshest evidence plus the window, including a custom window", () => {
    const result = runLeader(
      [
        item({ feed: "intel_feed", id: "old", observed_at: FRESH }),
        item({ feed: "gsc_queries", id: "new", observed_at: FRESH_LATER }),
      ],
      { now: NOW },
    );
    expect(result.kind).toBe("proposal");
    if (result.kind !== "proposal") return;
    // Freshest is 09:30 plus 168h, not the run time plus 168h.
    expect(result.proposals[0].expiry).toBe("2026-11-11T09:30:00.000Z");
    const custom = runLeader([item({ feed: "intel_feed" })], {
      now: NOW,
      freshnessWindowHours: 24,
    });
    expect(custom.kind).toBe("proposal");
    if (custom.kind !== "proposal") return;
    expect(custom.proposals[0].expiry).toBe("2026-11-05T09:00:00.000Z");
  });

  it("treats just inside the window as fresh and just outside as stale", () => {
    const inside = runLeader(
      [item({ feed: "intel_feed", observed_at: "2026-10-28T10:00:01Z" })],
      { now: NOW },
    );
    expect(inside.kind).toBe("proposal");
    const outside = runLeader(
      [item({ feed: "intel_feed", observed_at: "2026-10-28T09:59:59Z" })],
      { now: NOW },
    );
    expect(outside.kind).toBe("no_action");
    if (outside.kind !== "no_action") return;
    expect(outside.reason).toBe("stale_data");
    expect(outside.dropped[0].reason).toBe("stale");
  });

  it("drops an empty id and an empty subject after sanitization", () => {
    const emptyId = runLeader([item({ feed: "intel_feed", id: "   " })], { now: NOW });
    expect(emptyId.kind).toBe("no_action");
    if (emptyId.kind !== "no_action") return;
    expect(emptyId.dropped[0].reason).toBe("empty_id");
    expect(emptyId.reason).toBe("no_valid_items");
    const emptySubject = runLeader([item({ feed: "intel_feed", subject: "   " })], { now: NOW });
    expect(emptySubject.kind).toBe("no_action");
    if (emptySubject.kind !== "no_action") return;
    expect(emptySubject.dropped[0].reason).toBe("empty_subject");
    expect(emptySubject.reason).toBe("no_valid_items");
  });

  it("drops a null element instead of throwing", () => {
    const result = runLeader(
      [null as unknown as LeaderFeedItemInput],
      { now: NOW },
    );
    expect(result.kind).toBe("no_action");
    if (result.kind !== "no_action") return;
    expect(result.dropped[0].reason).toBe("empty_id");
    expect(result.reason).toBe("no_valid_items");
  });

  it("carries collaborator teams from the losing topics", () => {
    const result = runLeader(
      [
        item({ feed: "intel_feed", id: "g1", topic: "guide" }),
        item({ feed: "gsc_queries", id: "s1", topic: "search" }),
      ],
      { now: NOW },
    );
    expect(result.kind).toBe("proposal");
    if (result.kind !== "proposal") return;
    expect(result.proposals[0].owner_team).toBe("product_leader");
    expect(result.proposals[0].collaborator_teams).toEqual(
      expect.arrayContaining(["content", "seo"]),
    );
  });

  it("keeps the freshest subject verbatim including its capitals", () => {
    const groups = dedupeLeaderItems([
      {
        feed: "intel_feed",
        id: "old",
        subject: "phuket beaches",
        summary: null,
        topic: null,
        observed_at: FRESH,
        observed_ms: Date.parse(FRESH),
      },
      {
        feed: "intel_feed",
        id: "new",
        subject: "Phuket Beaches",
        summary: null,
        topic: null,
        observed_at: FRESH_LATER,
        observed_ms: Date.parse(FRESH_LATER),
      },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].subject).toBe("Phuket Beaches");
  });

  it("builds an exact single-item proposal object", () => {
    const result = runLeader([item({ feed: "intel_feed", topic: "guide" })], { now: NOW });
    expect(result.kind).toBe("proposal");
    if (result.kind !== "proposal") return;
    expect(result.proposals[0]).toEqual({
      goal: "Follow up on: Thailand visa guide update",
      evidence_refs: ["intel_feed:item-1"],
      priority: "low",
      risk_class: "medium",
      owner_team: "content",
      acceptance_criteria: [
        "Every proposal field traces to an item in evidence_refs",
        "Owner team content accepts or escalates the proposal before work starts",
        "No price, content, or code change ships from this proposal without its team's review",
      ],
      budget_limit: 0,
      collaborator_teams: [],
      dependencies: [],
      expiry: "2026-11-11T09:00:00.000Z",
      dedupe_key: "leader:thailand visa guide update",
      source_items: [
        {
          feed: "intel_feed",
          id: "item-1",
          observed_at: FRESH,
          subject: "Thailand visa guide update",
        },
      ],
      unavailable_sources: [],
    });
    expect(result.unavailable_sources).toEqual([]);
  });

  it("names no_valid_items for future and empty-subject runs, not just bad dates", () => {
    const future = runLeader(
      [item({ feed: "intel_feed", observed_at: "2026-11-05T10:00:00Z" })],
      { now: NOW },
    );
    expect(future.kind).toBe("no_action");
    if (future.kind !== "no_action") return;
    expect(future.reason).toBe("no_valid_items");
    expect(future.dropped[0].reason).toBe("future_observed_at");
    const empty = runLeader([item({ feed: "intel_feed", subject: "   " })], { now: NOW });
    expect(empty.kind).toBe("no_action");
    if (empty.kind !== "no_action") return;
    expect(empty.reason).toBe("no_valid_items");
  });

  it("reports untrusted_source when stale and untrusted items are mixed", () => {
    const result = runLeader(
      [
        item({ feed: "intel_feed", id: "stale-1", observed_at: STALE }),
        item({ feed: "rumor_blog", id: "bad-1" }),
      ],
      { now: NOW },
    );
    expect(result.kind).toBe("no_action");
    if (result.kind !== "no_action") return;
    expect(result.reason).toBe("untrusted_source");
    expect(result.dropped.map((d) => d.reason).sort()).toEqual(["stale", "untrusted_feed"]);
  });

  it("sanitizes a hostile subject: no newlines or control characters, capped at 500", () => {
    const hostile = `A\nB<script>alert(1)</script>${"x".repeat(600)}`;
    const result = runLeader([item({ feed: "intel_feed", subject: hostile })], { now: NOW });
    expect(result.kind).toBe("proposal");
    if (result.kind !== "proposal") return;
    const goal = result.proposals[0].goal;
    expect(goal).not.toContain("\n");
    expect(goal).not.toMatch(/[\u0000-\u001f\u007f]/);
    expect(goal.length).toBeLessThanOrEqual("Follow up on: ".length + 500);
    expect(goal.startsWith("Follow up on: A B")).toBe(true);
  });

  it("counts a repeated feed row once through runLeader", () => {
    const result = runLeader(
      [
        item({ feed: "intel_feed", id: "dup" }),
        item({ feed: "intel_feed", id: "dup", observed_at: FRESH_LATER }),
      ],
      { now: NOW },
    );
    expect(result.kind).toBe("proposal");
    if (result.kind !== "proposal") return;
    expect(result.proposals[0].evidence_refs).toEqual(["intel_feed:dup"]);
    expect(result.proposals[0].priority).toBe("low");
  });

  it("caps priority and records unavailable sources through runLeader options", () => {
    const result = runLeader(
      [
        item({ feed: "intel_feed", id: "i1" }),
        item({ feed: "page_analytics", id: "p1" }),
      ],
      { now: NOW, unavailableSources: ["gsc_queries"] },
    );
    expect(result.kind).toBe("proposal");
    if (result.kind !== "proposal") return;
    expect(result.proposals[0].priority).toBe("medium");
    expect(result.proposals[0].unavailable_sources).toEqual(["gsc_queries"]);
    expect(result.unavailable_sources).toEqual(["gsc_queries"]);
  });
});

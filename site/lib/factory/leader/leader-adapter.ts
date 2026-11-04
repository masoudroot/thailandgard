/**
 * Leader adapter (THG-TEAM-ARCHITECTURE-01 Phase 2, step 4 close-out).
 *
 * This module is the composition the step-4 critique round found
 * missing: it runs feed-reader output into the Leader Runtime through
 * one tested path, instead of leaving two unconnected halves. It is
 * pure and unwired: it takes a LeaderFeedSnapshot (fixture readers in
 * tests) and returns Leader inputs plus a Leader result. No database,
 * no provider call, no tick route, no live path.
 *
 * Adapter contract (the mapping table; nothing else is invented):
 * - contentRef -> subject: the intel title, the GSC query string, or
 *   the page path. That is the feed item's own subject, verbatim
 *   modulo the runtime's sanitization.
 * - publishedAt -> observed_at: the source day/timestamp. The
 *   provenance.observedAt field is carried in source provenance for
 *   reviewers but is NOT used for freshness; freshness uses
 *   publishedAt only, so there is exactly one timestamp authority.
 * - provenance.sourceRowId (or the item id when the row id is empty)
 *   -> Leader id, with ":" encoded as "%3A", because evidence refs
 *   are "<feed>:<id>" and ":" is the separator.
 * - topic: always absent. No feed item carries a topic, so the
 *   adapter cannot invent one. Topic classification is owned by the
 *   wiring step (PLAN.md step-4 entry); until then, topic-less
 *   groups fall back to product_leader for owner triage.
 * - source: always the reader's feed, never the row. The adapter is
 *   the trust anchor the runtime's absent-source rule relies on.
 *
 * Canonical freshness authority (step-4 close-out, architecture Q3):
 * the cutoff is now minus the freshness window (168 hours by
 * default, a step-4 runtime choice, not a doc rule) applied exactly
 * once, here. The feed module's own classification is advisory only
 * and is NOT consumed by this adapter: the adapter re-classifies
 * every aggregated item against the canonical cutoff, so feed-side
 * and runtime-side classifications cannot contradict. Future
 * timestamps and null/unparsable timestamps never become inputs.
 *
 * Aggregation (adapted from the dashboard Leader, not copied from
 * its loaders): GSC and page rows are daily rows (UNIQUE on query
 * plus date, and on path plus date, per the dashboard comments), so
 * rows are aggregated before dedupe, or one query would count once
 * per day and corrupt corroboration. GSC groups by query string:
 * clicks and impressions summed, CTR recomputed, average position
 * impression-weighted. Page rows group by path: views, clicks and
 * impressions summed, average position impression-weighted. The
 * aggregated item's timestamp is the latest row day. Intel rows are
 * individual items and pass through. The dashboard loaders themselves
 * are Supabase-bound and are not reused here; only their aggregation
 * math is adapted, which package ARCHITECTURE.md section 10 permits
 * ("useful dashboard code moves behind adapters").
 *
 * Unavailable feeds (package ARCHITECTURE.md section 12): the
 * snapshot's unavailableSources are propagated into the Leader
 * result and onto every proposal, and the runtime caps partial-feed
 * proposals below "high". A proposal built while GSC is missing
 * therefore never looks identical to one built from all three feeds.
 */

import {
  LEADER_FEED_SOURCES,
  type GscFeedItem,
  type LeaderFeedItem,
  type LeaderFeedSource,
  type LeaderFeedSnapshot,
  type PageAnalyticsFeedItem,
} from "@/lib/factory/feeds/leader-feeds";
import {
  LEADER_FRESHNESS_WINDOW_HOURS,
  runLeader,
  type DroppedFeedItem,
  type LeaderFeedItemInput,
  type LeaderRunResult,
} from "@/lib/factory/leader/leader-runtime";

export interface LeaderAdapterOptions {
  /** Pinned clock for tests; defaults to the real current time. */
  now?: Date | string;
  /** Freshness window in hours; defaults to LEADER_FRESHNESS_WINDOW_HOURS. */
  freshnessWindowHours?: number;
}

export interface AdaptedLeaderInput {
  inputs: LeaderFeedItemInput[];
  dropped: DroppedFeedItem[];
  unavailableSources: LeaderFeedSource[];
  cutoff: string;
}

/** Encode ":" in a row id so evidence refs stay unambiguous. */
export function encodeLeaderId(rowId: string): string {
  return rowId.replace(/:/g, "%3A");
}

function canonicalRowId(item: LeaderFeedItem): string {
  const rowId = item.provenance.sourceRowId;
  return rowId !== "" ? rowId : item.id;
}

function maxTimestamp(a: string | null, b: string | null): string | null {
  const ta = a === null ? Number.NaN : Date.parse(a);
  const tb = b === null ? Number.NaN : Date.parse(b);
  if (Number.isNaN(ta)) return b;
  if (Number.isNaN(tb)) return a;
  return ta >= tb ? a : b;
}

function aggregateGsc(items: readonly GscFeedItem[]): GscFeedItem[] {
  // Accumulators keep the impression-weighted position sum apart from
  // the running average, so rows with a null position never skew it.
  const byQuery = new Map<string, { item: GscFeedItem; posW: number; posImp: number }>();
  for (const item of items) {
    const query = item.contentRef.trim();
    if (query === "") continue;
    const acc = byQuery.get(query);
    const posW = item.avgPosition === null ? 0 : item.avgPosition * item.impressions;
    const posImp = item.avgPosition === null ? 0 : item.impressions;
    if (acc === undefined) {
      byQuery.set(query, {
        item: {
          ...item,
          id: query,
          provenance: { ...item.provenance, sourceRowId: query },
        },
        posW,
        posImp,
      });
      continue;
    }
    const clicks = acc.item.clicks + item.clicks;
    const impressions = acc.item.impressions + item.impressions;
    const nextPosW = acc.posW + posW;
    const nextPosImp = acc.posImp + posImp;
    acc.item = {
      ...acc.item,
      clicks,
      impressions,
      ctr: impressions > 0 ? clicks / impressions : null,
      avgPosition: nextPosImp > 0 ? nextPosW / nextPosImp : null,
      publishedAt: maxTimestamp(acc.item.publishedAt, item.publishedAt),
      provenance: {
        ...acc.item.provenance,
        observedAt: maxTimestamp(acc.item.provenance.observedAt, item.provenance.observedAt),
      },
    };
    acc.posW = nextPosW;
    acc.posImp = nextPosImp;
  }
  return [...byQuery.values()].map((acc) => acc.item);
}

function aggregatePages(items: readonly PageAnalyticsFeedItem[]): PageAnalyticsFeedItem[] {
  const byPath = new Map<
    string,
    { item: PageAnalyticsFeedItem; posW: number; posImp: number }
  >();
  for (const item of items) {
    const path = item.contentRef.trim();
    if (path === "") continue;
    const acc = byPath.get(path);
    const posW = item.avgPosition === null ? 0 : item.avgPosition * item.impressions;
    const posImp = item.avgPosition === null ? 0 : item.impressions;
    if (acc === undefined) {
      byPath.set(path, {
        item: {
          ...item,
          id: path,
          provenance: { ...item.provenance, sourceRowId: path },
        },
        posW,
        posImp,
      });
      continue;
    }
    const impressions = acc.item.impressions + item.impressions;
    const nextPosW = acc.posW + posW;
    const nextPosImp = acc.posImp + posImp;
    acc.item = {
      ...acc.item,
      views: acc.item.views + item.views,
      clicks: acc.item.clicks + item.clicks,
      impressions,
      avgPosition: nextPosImp > 0 ? nextPosW / nextPosImp : null,
      publishedAt: maxTimestamp(acc.item.publishedAt, item.publishedAt),
      provenance: {
        ...acc.item.provenance,
        observedAt: maxTimestamp(acc.item.provenance.observedAt, item.provenance.observedAt),
      },
    };
    acc.posW = nextPosW;
    acc.posImp = nextPosImp;
  }
  return [...byPath.values()].map((acc) => acc.item);
}

/**
 * Aggregate daily rows before dedupe. Intel items pass through.
 * Items with an empty contentRef are dropped by adaptSnapshot, not
 * here, so this function never silently loses a row it was given.
 */
export function aggregateFeedItems(items: readonly LeaderFeedItem[]): LeaderFeedItem[] {
  const intel = items.filter((item) => item.kind === "intel");
  const gsc = items.filter((item) => item.kind === "gsc_query") as GscFeedItem[];
  const pages = items.filter(
    (item) => item.kind === "page_analytics",
  ) as PageAnalyticsFeedItem[];
  return [...intel, ...aggregateGsc(gsc), ...aggregatePages(pages)];
}

/**
 * Adapt one feed snapshot into Leader inputs under the canonical
 * freshness rule. Only fresh items become inputs; stale, future,
 * unknown-timestamp, empty-subject, and provenance-mismatched items
 * are reported as drops, never passed through.
 */
export function adaptSnapshot(
  snapshot: LeaderFeedSnapshot,
  options: LeaderAdapterOptions = {},
): AdaptedLeaderInput {
  const nowDate = options.now === undefined ? new Date() : new Date(options.now);
  if (Number.isNaN(nowDate.getTime())) {
    throw new RangeError("Leader adapter requires a parseable now");
  }
  const nowMs = nowDate.getTime();
  const window = options.freshnessWindowHours ?? LEADER_FRESHNESS_WINDOW_HOURS;
  if (!Number.isFinite(window) || window <= 0) {
    throw new RangeError("Leader freshness window must be a positive number of hours");
  }
  const cutoffMs = nowMs - window * 3600 * 1000;
  const cutoff = new Date(cutoffMs).toISOString();

  const inputs: LeaderFeedItemInput[] = [];
  const dropped: DroppedFeedItem[] = [];
  for (const source of LEADER_FEED_SOURCES) {
    const feed = snapshot.feeds[source];
    if (feed === undefined || feed.status === "data_unavailable") continue;
    // Defensive re-check: the adapter never trusts a snapshot it did
    // not build itself. Items whose source or provenance table
    // disagree with their feed are drops, not inputs.
    const trusted = feed.items.filter(
      (item) => item.source === source && item.provenance.sourceTable === source,
    );
    for (const item of feed.items) {
      if (item.source !== source || item.provenance.sourceTable !== source) {
        dropped.push({
          feed: source,
          id: item.id,
          reason: "source_mismatch",
          observed_at: item.publishedAt,
        });
      }
    }
    const emptyRef = trusted.filter((item) => item.contentRef.trim() === "");
    for (const item of emptyRef) {
      dropped.push({
        feed: source,
        id: item.id,
        reason: "empty_subject",
        observed_at: item.publishedAt,
      });
    }
    const aggregated = aggregateFeedItems(
      trusted.filter((item) => item.contentRef.trim() !== ""),
    );
    for (const item of aggregated) {
      const published = item.publishedAt;
      const publishedMs = published === null ? Number.NaN : Date.parse(published);
      if (Number.isNaN(publishedMs)) {
        dropped.push({
          feed: source,
          id: item.id,
          reason: "invalid_observed_at",
          observed_at: published,
        });
      } else if (publishedMs > nowMs) {
        dropped.push({
          feed: source,
          id: item.id,
          reason: "future_observed_at",
          observed_at: published,
        });
      } else if (publishedMs < cutoffMs) {
        dropped.push({
          feed: source,
          id: item.id,
          reason: "stale",
          observed_at: published,
        });
      } else {
        inputs.push({
          feed: source,
          id: encodeLeaderId(canonicalRowId(item)),
          subject: item.contentRef,
          topic: undefined,
          observed_at: published as string,
          source,
        });
      }
    }
  }
  return {
    inputs,
    dropped,
    unavailableSources: [...snapshot.unavailableSources],
    cutoff,
  };
}

/**
 * Run the Leader over one feed snapshot: adapt under the canonical
 * rule, then runLeader with the snapshot's unavailable sources. The
 * returned dropped list is the adapter drops followed by any runtime
 * drops (there should be none: every input was already classified
 * fresh under the same window).
 */
export function runLeaderFromSnapshot(
  snapshot: LeaderFeedSnapshot,
  options: LeaderAdapterOptions = {},
): LeaderRunResult {
  const adapted = adaptSnapshot(snapshot, options);
  const result = runLeader(adapted.inputs, {
    now: options.now,
    freshnessWindowHours: options.freshnessWindowHours,
    unavailableSources: adapted.unavailableSources,
  });
  const dropped = [...adapted.dropped, ...result.dropped];
  if (
    result.kind === "no_action" &&
    adapted.inputs.length === 0 &&
    adapted.dropped.length > 0
  ) {
    // runLeader saw no items at all and answered empty_feeds, but the
    // adapter did drop items: report the real reason, with a trust
    // signal never masked by a freshness signal.
    const reasons = new Set(adapted.dropped.map((item) => item.reason));
    const reason =
      reasons.has("untrusted_feed") || reasons.has("source_mismatch")
        ? "untrusted_source"
        : reasons.has("stale")
          ? "stale_data"
          : "no_valid_items";
    return { ...result, reason, dropped };
  }
  return { ...result, dropped };
}

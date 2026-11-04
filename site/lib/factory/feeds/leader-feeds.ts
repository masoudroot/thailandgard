/**
 * Leader feed readers (THG-TEAM-ARCHITECTURE-01 Phase 2, step 4, feed side).
 *
 * Citation binding (step-4 close-out, evidence Q5): every
 * "ARCHITECTURE.md" citation in this file binds to the phase-1
 * package document at thg-team-architecture-01/ARCHITECTURE.md, not
 * to the repo's docs/factory-v2/ARCHITECTURE.md, which does not name
 * these feeds. The package document governs phase 2 per the mission.
 *
 * The three Leader feeds, as named in package ARCHITECTURE.md
 * section 2 ("feeds: intel_feed and gsc_queries and page_analytics")
 * and in package tool-handlers.md, tool read_signals ("reading
 * intel_feed and gsc_queries and page_analytics"): intel_feed,
 * gsc_queries, page_analytics. Package ARCHITECTURE.md section 6
 * lists the same three tables under Observation, alongside
 * exchange_rates (reference tour data, section 2) and site
 * performance (not a named table or feed); neither of those two is
 * a Leader feed here, and no fourth feed is invented.
 *
 * Scope of this module, deliberately narrow:
 * - Typed feed-item shapes, a reader interface the Leader Runtime
 *   can call, freshness classification, empty-feed handling, and an
 *   honest data_unavailable result.
 * - Interfaces plus fixture adapters plus tests only. There is NO
 *   live database adapter in this module and NO wiring into the tick
 *   route or any live path. A live adapter belongs to the wiring
 *   step (PLAN.md step-4 entry) and, for Search Console, to the
 *   step 5 feed repair.
 * - Nothing here queries staging or production, synthesizes rows,
 *   or fills a missing table. An empty feed returns no items. An
 *   absent source returns data_unavailable, never fabricated items.
 *
 * Freshness rule, stated exactly:
 * Package ARCHITECTURE.md gives NO numeric staleness threshold for
 * these feeds. It gives refresh cadences (section 9: Search Console
 * and Analytics daily; intel is a daily feed by the same section's
 * cadence discussion) and stale-data handling (section 5: SEO
 * records data_unavailable when data is not fresh; section 11
 * step 4: fresh data yields a valid proposal, stale data yields
 * no_action; section 12: SEO and Leader record data_unavailable
 * until the Search Console feed is repaired), but no cutoff such as
 * "older than N days is stale". So freshness here is an explicit
 * caller-supplied cutoff: the caller passes the cutoff instant, and
 * this module only compares publishedAt against it. Any numeric
 * cutoff a caller chooses (for example, the 168-hour window the
 * Leader adapter adopts) is the caller's decision, not a doc-sourced
 * rule, and must be reported as such wherever it is used. The
 * pre-existing dashboard reader (site/lib/dashboard/teams/leader.ts)
 * happens to read a 7 day window; that is existing code behaviour,
 * not a package ARCHITECTURE.md rule, so it is NOT adopted as a
 * default here. The module's own classification is advisory: the
 * Leader adapter re-applies the canonical cutoff once, so the two
 * can never contradict on the same item.
 *
 * Aggregation guard (step-4 close-out, security Q1/Q10): a feed
 * result is only trusted when its status and its items agree
 * (items are non-empty only for status "ok") and every item's
 * source and provenance.sourceTable equal the reader's source.
 * Anything else is converted to data_unavailable with a reason, so
 * a misbehaving reader cannot smuggle items under an "empty" or
 * "data_unavailable" status, and a duplicate reader registration
 * is reported in the snapshot instead of silently first-winning.
 */

export const LEADER_FEED_SOURCES = [
  "intel_feed",
  "gsc_queries",
  "page_analytics",
] as const;

export type LeaderFeedSource = (typeof LEADER_FEED_SOURCES)[number];

/** Where one feed item came from. Never synthesized: every field
 *  comes from the source row, or is null when the source has none. */
export interface FeedProvenance {
  /** Source table name, identical to the item's source. */
  sourceTable: LeaderFeedSource;
  /** Stable identifier of the source row (id, or query/path key). */
  sourceRowId: string;
  /** When the source row was observed/created, ISO string, or null. */
  observedAt: string | null;
  /** Source URL, when the source row carries one, else null. */
  sourceUrl: string | null;
}

/** One intel item. contentRef is the item title. */
export interface IntelFeedItem {
  kind: "intel";
  id: string;
  source: "intel_feed";
  /** ISO timestamp of the item, or null when the source has none. */
  publishedAt: string | null;
  /** Content reference: the intel title (or the id when untitled). */
  contentRef: string;
  summary: string | null;
  sourceName: string | null;
  provenance: FeedProvenance;
}

/** One Search Console query row. contentRef is the query string.
 *  Metrics are carried verbatim from the source row; CTR and
 *  avg_position stay null when the source cannot supply them. */
export interface GscFeedItem {
  kind: "gsc_query";
  id: string;
  source: "gsc_queries";
  /** ISO timestamp (source day) of the row, or null when unknown. */
  publishedAt: string | null;
  /** Content reference: the search query string. */
  contentRef: string;
  clicks: number;
  impressions: number;
  ctr: number | null;
  avgPosition: number | null;
  provenance: FeedProvenance;
}

/** One page-analytics row. contentRef is the page path. */
export interface PageAnalyticsFeedItem {
  kind: "page_analytics";
  id: string;
  source: "page_analytics";
  /** ISO timestamp (source day) of the row, or null when unknown. */
  publishedAt: string | null;
  /** Content reference: the page path. */
  contentRef: string;
  views: number;
  clicks: number;
  impressions: number;
  avgPosition: number | null;
  provenance: FeedProvenance;
}

export type LeaderFeedItem =
  | IntelFeedItem
  | GscFeedItem
  | PageAnalyticsFeedItem;

/**
 * Freshness of one item against a caller-supplied cutoff.
 * - "fresh": publishedAt parses, is not in the future, and is at or
 *   after the cutoff.
 * - "stale": publishedAt parses and is before the cutoff.
 * - "unknown": publishedAt is null, does not parse, or is in the
 *   future. Unknown is never treated as fresh, so a missing or
 *   future timestamp can never justify a proposal on its own.
 */
export type FeedItemFreshness = "fresh" | "stale" | "unknown";

export interface FreshnessOptions {
  /** Instant to compare against, ISO string or Date. */
  now: string | Date;
  /**
   * Caller-supplied cutoff instant. Items at or after it are fresh.
   * Required: there is no doc-sourced default (see module header).
   */
  cutoff: string | Date;
}

function toTime(value: string | Date): number | null {
  const time = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

export function classifyFreshness(
  publishedAt: string | null,
  options: FreshnessOptions,
): FeedItemFreshness {
  const published = publishedAt === null ? null : toTime(publishedAt);
  if (published === null) return "unknown";
  const cutoff = toTime(options.cutoff);
  if (cutoff === null) return "unknown";
  const now = toTime(options.now);
  if (now !== null && published > now) return "unknown";
  return published >= cutoff ? "fresh" : "stale";
}

export interface ClassifiedFeedItem {
  item: LeaderFeedItem;
  freshness: FeedItemFreshness;
}

export function classifyFeedItems(
  items: readonly LeaderFeedItem[],
  options: FreshnessOptions,
): ClassifiedFeedItem[] {
  return items.map((item) => ({
    item,
    freshness: classifyFreshness(item.publishedAt, options),
  }));
}

/**
 * Read status for one feed. The three states are kept distinct on
 * purpose, because conflating them hides failures:
 * - "ok": the source answered and returned at least one item.
 * - "empty": the source answered and returned no items. Empty
 *   means no items, never fabricated items.
 * - "data_unavailable": the source could not be read (missing
 *   table, missing credential, missing reader). Items are empty
 *   and reason is a non-empty explanation. This is the honest
 *   status ARCHITECTURE.md sections 5 and 12 require for SEO and
 *   Leader while the Search Console feed is unrepaired (step 5),
 *   and it must never be reported as "empty" or as success.
 */
export type FeedReadStatus = "ok" | "empty" | "data_unavailable";

export interface LeaderFeedReadResult {
  source: LeaderFeedSource;
  status: FeedReadStatus;
  items: LeaderFeedItem[];
  /** Non-empty exactly when status is data_unavailable. */
  reason: string | null;
}

export function emptyFeedResult(source: LeaderFeedSource): LeaderFeedReadResult {
  return { source, status: "empty", items: [], reason: null };
}

export function unavailableFeedResult(
  source: LeaderFeedSource,
  reason: string,
): LeaderFeedReadResult {
  if (reason.trim() === "") {
    throw new Error(`data_unavailable for ${source} requires a non-empty reason`);
  }
  return { source, status: "data_unavailable", items: [], reason };
}

/**
 * Reader interface the Leader Runtime consumes. A reader answers
 * for exactly one feed source and never throws for a missing
 * source: it returns data_unavailable instead, so the Leader can
 * record that status rather than crash or invent data.
 */
export interface LeaderFeedReader {
  source: LeaderFeedSource;
  read(): Promise<LeaderFeedReadResult>;
}

/**
 * Fixture reader for tests and for the Leader Runtime's mocked
 * runs: returns the given items verbatim. An empty list yields
 * status "empty", not "ok" and not fabricated items. Items for a
 * different source are rejected, so a fixture cannot silently
 * stand in for the wrong feed.
 */
export function createStaticFeedReader(
  source: LeaderFeedSource,
  items: readonly LeaderFeedItem[],
): LeaderFeedReader {
  for (const item of items) {
    if (item.source !== source) {
      throw new Error(
        `fixture item source ${item.source} does not match reader source ${source}`,
      );
    }
    if (item.provenance.sourceTable !== source) {
      throw new Error(
        `fixture item provenance ${item.provenance.sourceTable} does not match reader source ${source}`,
      );
    }
  }
  const snapshot = [...items];
  return {
    source,
    async read(): Promise<LeaderFeedReadResult> {
      if (snapshot.length === 0) return emptyFeedResult(source);
      return { source, status: "ok", items: [...snapshot], reason: null };
    },
  };
}

/**
 * Reader that always reports its feed as unavailable, with an
 * explicit reason. Use for a missing table or credential, and for
 * the Search Console feed until step 5 repairs it.
 */
export function createUnavailableFeedReader(
  source: LeaderFeedSource,
  reason: string,
): LeaderFeedReader {
  const result = unavailableFeedResult(source, reason);
  return {
    source,
    async read(): Promise<LeaderFeedReadResult> {
      return { ...result, items: [] };
    },
  };
}

/**
 * Search Console adapter for the current staging reality: the
 * gsc_queries source is absent, so this reader reports
 * data_unavailable honestly. It never synthesizes gsc_queries
 * rows, never returns "empty" for a missing source, and never
 * claims success. Step 5 (GSC feed repair) replaces this reader
 * with a live one; until then the Leader records
 * data_unavailable, per ARCHITECTURE.md sections 5 and 12 and
 * phase1-plan.md step 5.
 */
export function createGscDataUnavailableReader(reason: string): LeaderFeedReader {
  return createUnavailableFeedReader("gsc_queries", reason);
}

export interface LeaderFeedSnapshot {
  readAt: string;
  cutoff: string;
  feeds: Record<LeaderFeedSource, LeaderFeedReadResult>;
  classified: ClassifiedFeedItem[];
  freshItems: LeaderFeedItem[];
  staleItems: LeaderFeedItem[];
  unknownItems: LeaderFeedItem[];
  /** True when at least one item across all feeds is fresh. The
   *  Leader Runtime owns the no_action decision; this flag only
   *  reports the feed-side fact it decides on. */
  hasFreshData: boolean;
  unavailableSources: LeaderFeedSource[];
  /** Sources for which more than one reader was registered. The
   *  first reader wins, but the duplication is reported, never
   *  silently resolved. */
  duplicateSources: LeaderFeedSource[];
}

/**
 * Read all three Leader feeds through the given readers, classify
 * every item against the caller-supplied cutoff, and summarize.
 * A feed with no registered reader is reported as
 * data_unavailable (reason: no reader registered), never silently
 * omitted, so a missing adapter cannot masquerade as an empty feed.
 * Readers are awaited in source order; a reader that throws is
 * converted to data_unavailable with the error message as reason,
 * so one broken feed cannot hide the other two.
 */
export async function readLeaderFeeds(
  readers: readonly LeaderFeedReader[],
  options: FreshnessOptions,
): Promise<LeaderFeedSnapshot> {
  const bySource = new Map<LeaderFeedSource, LeaderFeedReader>();
  const duplicateSources: LeaderFeedSource[] = [];
  for (const reader of readers) {
    if (bySource.has(reader.source)) {
      if (!duplicateSources.includes(reader.source)) duplicateSources.push(reader.source);
    } else {
      bySource.set(reader.source, reader);
    }
  }

  const feeds = {} as Record<LeaderFeedSource, LeaderFeedReadResult>;
  for (const source of LEADER_FEED_SOURCES) {
    const reader = bySource.get(source);
    if (reader === undefined) {
      feeds[source] = unavailableFeedResult(
        source,
        `no reader registered for ${source}`,
      );
      continue;
    }
    try {
      const result = await reader.read();
      if (result.source !== source) {
        feeds[source] = unavailableFeedResult(
          source,
          `reader returned items for ${result.source} instead of ${source}`,
        );
      } else if (result.status === "data_unavailable") {
        // Items under an unavailable status are smuggled data: drop
        // them and keep the honest status with its reason.
        feeds[source] = { ...result, items: [] };
      } else if (result.status === "empty") {
        feeds[source] =
          result.items.length > 0
            ? unavailableFeedResult(
                source,
                `reader reported empty for ${source} but returned items`,
              )
            : result;
      } else {
        // status "ok": every item must belong to this feed, by both
        // its source and its provenance table, or the whole feed is
        // untrusted. An ok result with no items is an empty feed.
        const bad = result.items.find(
          (item) => item.source !== source || item.provenance.sourceTable !== source,
        );
        feeds[source] =
          bad !== undefined
            ? unavailableFeedResult(
                source,
                `reader returned an item from ${bad.source} under ${source}`,
              )
            : result.items.length === 0
              ? emptyFeedResult(source)
              : result;
      }
    } catch (error) {
      feeds[source] = unavailableFeedResult(
        source,
        error instanceof Error ? error.message : "feed reader failed",
      );
    }
  }

  const allItems = LEADER_FEED_SOURCES.flatMap((source) => feeds[source].items);
  const classified = classifyFeedItems(allItems, options);
  const freshItems = classified
    .filter((c) => c.freshness === "fresh")
    .map((c) => c.item);
  const staleItems = classified
    .filter((c) => c.freshness === "stale")
    .map((c) => c.item);
  const unknownItems = classified
    .filter((c) => c.freshness === "unknown")
    .map((c) => c.item);

  const now = options.now instanceof Date ? options.now.toISOString() : options.now;
  const cutoff =
    options.cutoff instanceof Date ? options.cutoff.toISOString() : options.cutoff;

  return {
    readAt: now,
    cutoff,
    feeds,
    classified,
    freshItems,
    staleItems,
    unknownItems,
    hasFreshData: freshItems.length > 0,
    unavailableSources: LEADER_FEED_SOURCES.filter(
      (source) => feeds[source].status === "data_unavailable",
    ),
    duplicateSources,
  };
}

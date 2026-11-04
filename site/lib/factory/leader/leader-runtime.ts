/**
 * Leader Runtime (THG-TEAM-ARCHITECTURE-01 Phase 2, step 4).
 *
 * The Leader reads three feeds, dedupes across them, builds a WorkProposal
 * per deduped opportunity, and assigns an owner team. This module is pure
 * and unwired: no database, no provider call, no tick route, no side
 * effect. Wiring it into a scheduler or the tick route is a later step's
 * decision, not this step's.
 *
 * Location note (PLAN.md step-3 handlers rule, A-Q5): handlers/ holds one
 * handler per tick-step domain, and the gateway steps stay inside
 * content-runtime because they belong to the same content-step if/else
 * chain. The Leader is not a tick step and is not wired into the tick in
 * this step, so it lives in its own leader/ directory rather than
 * handlers/. The package ARCHITECTURE.md section 5 names
 * teams/runtime/<team>.ts as the per-team runtime home; relocating
 * this runtime there belongs to the wiring step, recorded in the
 * PLAN.md step-4 entry, not to this step.
 *
 * Citation binding (step-4 close-out, evidence Q5): every
 * "ARCHITECTURE.md" citation in this file binds to the phase-1
 * package document at thg-team-architecture-01/ARCHITECTURE.md, not
 * to the repo's docs/factory-v2/ARCHITECTURE.md, which does not name
 * these feeds. The package document governs phase 2 per the mission.
 *
 * The three feeds (do not invent a feed):
 * - intel_feed, gsc_queries, page_analytics.
 * Sources: package ARCHITECTURE.md section 2 lists exactly these
 * three as the feeds, section 6 draws them as the Observation inputs
 * to the Leader, and package tool-handlers.md row read_signals names
 * the same three tables as the Leader's read_signals implementation.
 *
 * Trust and provenance rule (implemented exactly, cited):
 * - Package ARCHITECTURE.md section 5, Leader contract: if no fresh
 *   data arrives, the correct output is no_action. The Leader writes
 *   no content text, changes no price, merges no code, and bypasses
 *   no Policy.
 * - Package ARCHITECTURE.md section 2: model output without a
 *   document is not valid knowledge, and site content is not its own
 *   verification. This runtime therefore never invents a goal, a
 *   price, or a fact: the proposal goal is built only from a feed
 *   item's own subject, verbatim modulo the sanitization below.
 * - Package ARCHITECTURE.md sections 5 and 12: with stale or missing
 *   data the Leader records data_unavailable and never builds a
 *   high-confidence proposal from it. Here, stale items are dropped
 *   with reason "stale" and, when nothing fresh remains, the run
 *   returns no_action with reason "stale_data"; when any feed is
 *   unavailable, proposals carry unavailable_sources and their
 *   priority is capped below "high" (see the priority rule).
 * - Only named sources count: a feed item counts only when its feed
 *   name is exactly one of the three feeds above, named in full. An
 *   item from any other feed name is dropped as untrusted, and an item
 *   whose declared source disagrees with its feed is dropped as a
 *   provenance mismatch. Dropped items are reported, never silently
 *   skipped: the no_action outcome is explicit and recorded.
 *   An item with no declared source is trusted only because the
 *   caller grouping is the trust anchor for direct runLeader calls;
 *   the adapter (the only production path) always sets source from
 *   the reader, never from the row.
 *
 * Freshness window (step-4 runtime choice, NOT a doc rule): 7 days
 * (168 hours) by default, matching the existing dashboard Leader's
 * 7-day feed windows in site/lib/dashboard/teams/leader.ts. The
 * package document gives daily cadences (section 9) but no numeric
 * staleness threshold. An item is fresh when its observed_at is
 * parseable, not in the future, and no older than the window at the
 * run's now. The window is injectable so tests pin it. The adapter
 * applies the cutoff (now minus the window) exactly once; the feed
 * module's own classification is advisory only, so the two can never
 * contradict on the same item.
 *
 * Dedupe rule: items are grouped by normalized subject. Normalization
 * is Persian-aware, adapted from the dashboard Leader's normalizeTitle
 * (site/lib/dashboard/teams/leader.ts): ZWNJ/ZWJ become spaces, Arabic
 * yeh/kaf/teh-marbuta map to Persian letters, diacritics are stripped,
 * Persian digits map to Latin digits, punctuation becomes spaces, then
 * lowercase and whitespace collapse. The representative subject kept
 * verbatim (modulo sanitization) is the freshest item's subject. One
 * group yields one proposal, however many feeds contributed items,
 * and evidence_refs plus source_items carry every contributing item
 * so a reviewer can trace every proposal field back to a feed item.
 * Duplicate (feed, id) pairs count once: the freshest occurrence is
 * kept at the first occurrence position, so a repeated row cannot
 * inflate priority. Evidence refs are "<feed>:<id>"; ids containing
 * ":" are encoded as "%3A" by the adapter, because ":" is the ref
 * separator (direct runLeader callers must not pass ":" in ids).
 *
 * Subject sanitization (step-4 rule): control characters and newlines
 * are stripped (replaced by a space) and subjects longer than 500
 * characters are truncated to 500. Verbatim preservation therefore
 * means verbatim modulo this sanitization. A script tag or other
 * markup in a subject passes through unchanged by this runtime; the
 * persist/render boundary at wiring time MUST escape it before any
 * display or storage that renders markup (recorded in PLAN.md).
 *
 * Team-assignment rule (step-4 rule, stated here because no doc fixes
 * it): the owner team comes from the feed item's own topic label,
 * never from guessing a topic out of free text. Labels are normalized
 * (trimmed, lowercased) before lookup. A group takes the majority
 * topic's team; a tie, an unknown topic, or a missing topic assigns
 * product_leader, which holds the proposal for owner triage (triage
 * happens at wiring time; product_leader proposals are never
 * auto-dispatched). No feed item carries a topic today, so the topic
 * classifier is owned by the wiring step (PLAN.md step-4 entry); the
 * adapter passes topic through only when a caller supplies one. The
 * topic map is TOPIC_TEAM_MAP below. risk_class is the owner team's
 * registry contract risk class, and budget_limit is 0 under the
 * registry ZERO_SPEND_BUDGET_POLICY: a proposal authorizes no spend.
 * dependencies is always empty here because check_dependencies is
 * nominal in tool-handlers.md; inventing a dependency would be
 * inventing a fact. A dependency check at conversion time is a
 * wiring-step rule (PLAN.md): converted WorkItems must not claim
 * "no dependencies" on the strength of this empty list alone.
 * expiry is the freshest evidence timestamp plus the freshness
 * window: once the evidence ages past the window, the proposal no
 * longer stands on fresh data. Expiry is never an approval or
 * publication deadline.
 *
 * Priority rule (step-4 rule): a group corroborated by two or more
 * distinct named feeds is "high"; a group with two or more items from
 * a single feed is "medium"; a single item is "low". Priority describes
 * corroboration only, never a fact from outside the feeds. When any
 * feed is unavailable, priority is capped at "medium": a partial-feed
 * proposal is never "high", per package ARCHITECTURE.md section 12.
 *
 * Guarded entry point: only runLeader applies the trust checks.
 * buildWorkProposal and dedupeLeaderItems are exported for tests and
 * for the adapter, and must only be called on already-classified
 * items; wiring must call runLeader (or runLeaderFromSnapshot), never
 * buildWorkProposal on hand-built groups.
 */

import {
  TEAM_CONTRACT_MAP,
  TEAM_KEYS,
  type TeamKey,
  type WorkProposal,
} from "@/lib/factory/teams/registry";
import type { LeaderFeedSource } from "@/lib/factory/feeds/leader-feeds";

/** The only feeds the Leader reads, named in full. */
export const LEADER_FEED_NAMES = ["intel_feed", "gsc_queries", "page_analytics"] as const;

export type LeaderFeedName = (typeof LEADER_FEED_NAMES)[number];

const NAMED_FEEDS: ReadonlySet<string> = new Set(LEADER_FEED_NAMES);

/** Default freshness window in hours: 7 days, see the header note. */
export const LEADER_FRESHNESS_WINDOW_HOURS = 168;

/**
 * One item as supplied by a feed caller. The caller groups items by
 * feed; this module never fetches. topic is the feed's own label when
 * the feed carries one; the runtime never infers a topic from subject
 * text. source, when present, must equal feed or the item fails its
 * provenance check.
 */
export interface LeaderFeedItemInput {
  feed: string;
  id: string;
  subject: string;
  summary?: string;
  topic?: string;
  observed_at: string;
  source?: string;
}

/** A feed item that passed every provenance and freshness check. */
export interface ValidLeaderFeedItem {
  feed: LeaderFeedName;
  id: string;
  subject: string;
  summary: string | null;
  topic: string | null;
  observed_at: string;
  observed_ms: number;
}

/** Why an item contributed nothing to any proposal. */
export type DroppedReason =
  | "untrusted_feed"
  | "source_mismatch"
  | "empty_id"
  | "empty_subject"
  | "invalid_observed_at"
  | "future_observed_at"
  | "stale";

export interface DroppedFeedItem {
  feed: string;
  id: string;
  reason: DroppedReason;
  observed_at: string | null;
}

/** One feed item carried on a proposal as traceable provenance. */
export interface LeaderSourceItem {
  feed: LeaderFeedName;
  id: string;
  observed_at: string;
  subject: string;
}

/**
 * A WorkProposal plus the source feed items behind it. Every field of
 * the proposal traces to these items: evidence_refs is exactly
 * "<feed>:<id>" per source item, and goal uses the representative
 * subject verbatim. This is an additive runtime shape; the database
 * columns of factory_work_proposals map one to one onto the
 * WorkProposal fields, and source_items is runtime provenance for the
 * reviewer (persisted later as evidence, not as a new invented fact).
 */
export interface LeaderWorkProposal extends WorkProposal {
  source_items: LeaderSourceItem[];
  collaborator_teams: TeamKey[];
  /** Feeds that were unavailable when this proposal was built. */
  unavailable_sources: LeaderFeedSource[];
}

/** One deduped opportunity: all valid items sharing a normalized subject. */
export interface DedupedLeaderGroup {
  dedupe_key: string;
  subject: string;
  items: ValidLeaderFeedItem[];
}

/** Maximum subject length after sanitization (step-4 rule). */
export const LEADER_SUBJECT_MAX_LENGTH = 500;

/**
 * Strip control characters and newlines from a subject and cap its
 * length. Markup itself is NOT neutralized here; the persist/render
 * boundary at wiring time must escape it (see the header note).
 */
export function sanitizeSubject(subject: string): string {
  const stripped = subject
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length > LEADER_SUBJECT_MAX_LENGTH
    ? stripped.slice(0, LEADER_SUBJECT_MAX_LENGTH)
    : stripped;
}

/** Feed topic label to owner team. Unknown labels map to nothing. */
export const TOPIC_TEAM_MAP: Readonly<Record<string, TeamKey>> = {
  tour: "tour_manager",
  tour_fact: "tour_manager",
  price: "tour_manager",
  guide: "content",
  content: "content",
  search: "seo",
  seo: "seo",
  query: "seo",
  design: "design",
  ui: "design",
  ux: "design",
  code: "development",
  development: "development",
};

export interface LeaderRunOptions {
  /** Pinned clock for tests; defaults to the real current time. */
  now?: Date | string;
  /** Freshness window in hours; defaults to LEADER_FRESHNESS_WINDOW_HOURS. */
  freshnessWindowHours?: number;
  /** Feeds reported unavailable by the feed snapshot, if any. */
  unavailableSources?: readonly LeaderFeedSource[];
}

export type LeaderNoActionReason =
  | "empty_feeds"
  | "stale_data"
  | "untrusted_source"
  | "no_valid_items";

export type LeaderRunResult =
  | {
      kind: "proposal";
      proposals: LeaderWorkProposal[];
      dropped: DroppedFeedItem[];
      checked_at: string;
      unavailable_sources: LeaderFeedSource[];
    }
  | {
      kind: "no_action";
      reason: LeaderNoActionReason;
      proposals: [];
      dropped: DroppedFeedItem[];
      checked_at: string;
      unavailable_sources: LeaderFeedSource[];
    };

/**
 * Persian-aware subject normalization, adapted from the dashboard
 * Leader's normalizeTitle (site/lib/dashboard/teams/leader.ts): ZWNJ
 * and ZWJ become spaces, Arabic yeh/kaf/teh-marbuta map to Persian
 * letters, diacritics are stripped, Persian digits map to Latin
 * digits, punctuation becomes spaces, then lowercase and collapse.
 * So "می‌شود", "می شود", "۱۴۰۵" and "1405", "راهنما!" and "راهنما"
 * normalize alike, unlike plain trim/lowercase.
 */
export function normalizeSubject(subject: string): string {
  return subject
    .replace(/[\u200c\u200d]/g, " ")
    .replace(/[\u064a]/g, "ی")
    .replace(/[\u0643]/g, "ک")
    .replace(/[\u0629]/g, "ه")
    .replace(/[\u064b-\u0652\u0670]/g, "")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[«»"'`]/g, " ")
    .replace(/[؟?!:؛،.\-\u2013…/٪٫\u0640•()[\]{}]/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function resolveNow(now: Date | string | undefined): { date: Date; ms: number } {
  const date = now === undefined ? new Date() : new Date(now);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError("Leader run requires a parseable now");
  }
  return { date, ms: date.getTime() };
}

function resolveWindow(freshnessWindowHours: number | undefined): number {
  const window = freshnessWindowHours ?? LEADER_FRESHNESS_WINDOW_HOURS;
  if (!Number.isFinite(window) || window <= 0) {
    throw new RangeError("Leader freshness window must be a positive number of hours");
  }
  return window;
}

function drop(
  item: LeaderFeedItemInput | null | undefined,
  reason: DroppedReason,
  observed_at: string | null,
): DroppedFeedItem {
  return {
    feed: typeof item?.feed === "string" ? item.feed : "",
    id: typeof item?.id === "string" ? item.id : "",
    reason,
    observed_at,
  };
}

/**
 * Classify one feed item. Returns the valid item, or the drop record
 * when it fails a provenance or freshness check. Classification order
 * matters: an unnamed feed is untrusted before anything else about
 * the item is considered, so untrusted data can never surface as
 * merely "stale".
 */
export function classifyFeedItem(
  item: LeaderFeedItemInput | null | undefined,
  nowMs: number,
  freshnessWindowHours: number,
): { valid: ValidLeaderFeedItem } | { dropped: DroppedFeedItem } {
  if (item === null || item === undefined || typeof item !== "object") {
    return { dropped: drop(item, "empty_id", null) };
  }
  if (!NAMED_FEEDS.has(item.feed)) {
    return { dropped: drop(item, "untrusted_feed", item.observed_at ?? null) };
  }
  const feed = item.feed as LeaderFeedName;
  if (typeof item.id !== "string" || item.id.trim() === "") {
    return { dropped: drop(item, "empty_id", item.observed_at ?? null) };
  }
  const subject = typeof item.subject === "string" ? sanitizeSubject(item.subject) : "";
  if (subject === "") {
    return { dropped: drop(item, "empty_subject", item.observed_at ?? null) };
  }
  if (item.source !== undefined && item.source !== item.feed) {
    return { dropped: drop(item, "source_mismatch", item.observed_at ?? null) };
  }
  const observedMs = Date.parse(item.observed_at);
  if (Number.isNaN(observedMs)) {
    return { dropped: drop(item, "invalid_observed_at", item.observed_at ?? null) };
  }
  if (observedMs > nowMs) {
    return { dropped: drop(item, "future_observed_at", item.observed_at) };
  }
  if (nowMs - observedMs > freshnessWindowHours * 3600 * 1000) {
    return { dropped: drop(item, "stale", item.observed_at) };
  }
  const topic =
    typeof item.topic === "string" && item.topic.trim() !== ""
      ? item.topic.trim().toLowerCase()
      : null;
  return {
    valid: {
      feed,
      id: item.id,
      subject,
      summary: typeof item.summary === "string" ? item.summary : null,
      topic,
      observed_at: item.observed_at,
      observed_ms: observedMs,
    },
  };
}

/**
 * Dedupe valid items across feeds by normalized subject. The
 * representative subject is the freshest item's subject, kept verbatim;
 * every contributing item stays in the group for provenance.
 */
export function dedupeLeaderItems(items: readonly ValidLeaderFeedItem[]): DedupedLeaderGroup[] {
  const groups = new Map<string, ValidLeaderFeedItem[]>();
  for (const item of items) {
    const key = normalizeSubject(item.subject);
    const group = groups.get(key);
    if (group) {
      group.push(item);
    } else {
      groups.set(key, [item]);
    }
  }
  return [...groups.entries()].map(([key, groupItems]) => {
    // One (feed, id) pair counts once: keep the freshest occurrence at
    // the first occurrence position, so a repeated row cannot inflate
    // corroboration or duplicate evidence_refs.
    const keptByKey = new Map<string, ValidLeaderFeedItem>();
    const order: string[] = [];
    for (const item of groupItems) {
      const pair = `${item.feed}:${item.id}`;
      const kept = keptByKey.get(pair);
      if (kept === undefined) {
        keptByKey.set(pair, item);
        order.push(pair);
      } else if (item.observed_ms > kept.observed_ms) {
        keptByKey.set(pair, item);
      }
    }
    const unique = order.map((pair) => keptByKey.get(pair) as ValidLeaderFeedItem);
    const sorted = [...unique].sort((a, b) => b.observed_ms - a.observed_ms);
    return {
      dedupe_key: `leader:${key}`,
      subject: sorted[0].subject,
      items: unique,
    };
  });
}

function assignOwnerTeam(group: DedupedLeaderGroup): TeamKey {
  const votes = new Map<TeamKey, number>();
  for (const item of group.items) {
    if (item.topic === null) continue;
    const team = TOPIC_TEAM_MAP[item.topic.trim().toLowerCase()];
    if (team !== undefined) {
      votes.set(team, (votes.get(team) ?? 0) + 1);
    }
  }
  let best: TeamKey | null = null;
  let bestVotes = 0;
  let tied = false;
  for (const [team, count] of votes) {
    if (count > bestVotes) {
      best = team;
      bestVotes = count;
      tied = false;
    } else if (count === bestVotes) {
      tied = true;
    }
  }
  if (best === null || tied) {
    return "product_leader";
  }
  return best;
}

function priorityForGroup(group: DedupedLeaderGroup): WorkProposal["priority"] {
  const feeds = new Set(group.items.map((item) => item.feed));
  if (feeds.size >= 2) return "high";
  if (group.items.length >= 2) return "medium";
  return "low";
}

/**
 * Build one proposal from a deduped group. Throws when the group has
 * no items: the registry acceptance rule is that no proposal is built
 * without evidence_refs, and an empty group has none.
 */
export function buildWorkProposal(
  group: DedupedLeaderGroup,
  options: LeaderRunOptions = {},
): LeaderWorkProposal {
  if (group.items.length === 0) {
    throw new RangeError("Leader cannot build a proposal from a group with no feed items");
  }
  resolveNow(options.now);
  const window = resolveWindow(options.freshnessWindowHours);
  const unavailableSources = [...(options.unavailableSources ?? [])];
  const owner_team = assignOwnerTeam(group);
  const risk_class = TEAM_CONTRACT_MAP[owner_team].risk_class;
  const collaborator_teams = TEAM_KEYS.filter(
    (team) =>
      team !== owner_team &&
      group.items.some(
        (item) =>
          item.topic !== null && TOPIC_TEAM_MAP[item.topic.trim().toLowerCase()] === team,
      ),
  );
  const source_items: LeaderSourceItem[] = group.items.map((item) => ({
    feed: item.feed,
    id: item.id,
    observed_at: item.observed_at,
    subject: item.subject,
  }));
  const evidence_refs = group.items.map((item) => `${item.feed}:${item.id}`);
  // Partial-feed proposals are never "high" (package ARCHITECTURE.md
  // section 12): corroboration across available feeds caps at
  // "medium" while any feed is unavailable.
  const priority =
    unavailableSources.length > 0 && priorityForGroup(group) === "high"
      ? "medium"
      : priorityForGroup(group);
  // Expiry runs from the freshest evidence, not from the run: a
  // 6-day-old item must not yield a proposal standing 7 more days on
  // up-to-13-day-old evidence (step-4 close-out, architecture Q8).
  const freshestMs = Math.max(...group.items.map((item) => item.observed_ms));
  return {
    goal: `Follow up on: ${group.subject}`,
    evidence_refs,
    priority,
    risk_class,
    owner_team,
    acceptance_criteria: [
      "Every proposal field traces to an item in evidence_refs",
      `Owner team ${owner_team} accepts or escalates the proposal before work starts`,
      "No price, content, or code change ships from this proposal without its team's review",
    ],
    budget_limit: 0,
    collaborator_teams,
    dependencies: [],
    expiry: new Date(freshestMs + window * 3600 * 1000).toISOString(),
    dedupe_key: group.dedupe_key,
    source_items,
    unavailable_sources: unavailableSources,
  };
}

/**
 * Run the Leader over caller-supplied feed items. Fresh data yields
 * proposals; anything else yields an explicit no_action with a reason,
 * never a silent skip and never a proposal from untrusted or stale
 * data. No proposal is built from dropped items, and dropped items are
 * returned so the caller can record them.
 */
export function runLeader(
  items: readonly (LeaderFeedItemInput | null | undefined)[],
  options: LeaderRunOptions = {},
): LeaderRunResult {
  const { date: nowDate, ms: nowMs } = resolveNow(options.now);
  const window = resolveWindow(options.freshnessWindowHours);
  const unavailableSources = [...(options.unavailableSources ?? [])];
  const checked_at = nowDate.toISOString();
  if (items.length === 0) {
    return {
      kind: "no_action",
      reason: "empty_feeds",
      proposals: [],
      dropped: [],
      checked_at,
      unavailable_sources: unavailableSources,
    };
  }
  const valid: ValidLeaderFeedItem[] = [];
  const dropped: DroppedFeedItem[] = [];
  for (const item of items) {
    const result = classifyFeedItem(item, nowMs, window);
    if ("valid" in result) {
      valid.push(result.valid);
    } else {
      dropped.push(result.dropped);
    }
  }
  if (valid.length > 0) {
    const proposals = dedupeLeaderItems(valid).map((group) =>
      buildWorkProposal(group, {
        now: nowDate,
        freshnessWindowHours: window,
        unavailableSources,
      }),
    );
    return { kind: "proposal", proposals, dropped, checked_at, unavailable_sources: unavailableSources };
  }
  const reasons = new Set(dropped.map((item) => item.reason));
  // A trust signal must never be masked by a freshness signal: when a
  // run drops both stale and untrusted items, the top-level reason is
  // untrusted_source (the per-item dropped list still carries both).
  const reason: LeaderNoActionReason =
    reasons.has("untrusted_feed") || reasons.has("source_mismatch")
      ? "untrusted_source"
      : reasons.has("stale")
        ? "stale_data"
        : "no_valid_items";
  return {
    kind: "no_action",
    reason,
    proposals: [],
    dropped,
    checked_at,
    unavailable_sources: unavailableSources,
  };
}

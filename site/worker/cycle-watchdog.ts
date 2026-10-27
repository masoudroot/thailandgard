/**
 * Ù†Ú¯Ù‡Ø¨Ø§Ù† Ú†Ø±Ø®Ù‡â€ŒÛŒ ØªØ§ÛŒÙ„Ù†Ø¯Ú¯Ø±Ø¯: Ù‡Ø´Ø¯Ø§Ø± Ø®ÙˆØ¯Ú©Ø§Ø± Ø¨Ø±Ø§ÛŒ Ú†Ø±Ø®Ù‡â€ŒÛŒ Ú¯ÛŒØ±Ú©Ø±Ø¯Ù‡ Ùˆ ØªÛŒÙ… Ù‡Ù†Ú¯â€ŒÚ©Ø±Ø¯Ù‡.
 *
 * Ù‡Ø± Û±Û° Ø¯Ù‚ÛŒÙ‚Ù‡ Ø§Ø¬Ø±Ø§ Ù…ÛŒâ€ŒØ´ÙˆØ¯ (ÙˆØ±Ú©â€ŒÙÙ„Ùˆ cycle-watchdog.yml):
 *  Û±. Ø¨Ø±Ø§ÛŒ Ù‡Ø± ØªÛŒÙ…Ù Ø¯Ø± Ø­Ø§Ù„ Ø§Ø¬Ø±Ø§ØŒ Ø³Ù„Ø§Ù…Øª Ø±Ø§ Ø¨Ø§ Ø¯Ùˆ Ø³ÛŒÚ¯Ù†Ø§Ù„ Ø¬Ø¯Ø§ Ù…ÛŒâ€ŒØ³Ù†Ø¬Ø¯
 *     (heartbeat_at = Ø²Ù†Ø¯Ù‡â€ŒØ¨ÙˆØ¯Ù† ÙØ±Ø§ÛŒÙ†Ø¯ØŒ updated_at = Ø¢Ø®Ø±ÛŒÙ† Ù¾ÛŒØ´Ø±ÙØª ÙˆØ§Ù‚Ø¹ÛŒ):
 *     - Ø¶Ø±Ø¨Ø§Ù† Ø²Ù†Ø¯Ù‡ ÙˆÙ„ÛŒ Ø¨ÛŒØ´ Ø§Ø² Û±Ûµ Ø¯Ù‚ÛŒÙ‚Ù‡ Ø¨Ø¯ÙˆÙ† Ù¾ÛŒØ´Ø±ÙØª â†’ Â«Ù‡Ù†Ú¯Â» â†’ Ù‡Ø´Ø¯Ø§Ø± ØªÛŒÙ…ÛŒØ›
 *     - Ø¨ÛŒØ´ Ø§Ø² Û±Ûµ Ø¯Ù‚ÛŒÙ‚Ù‡ Ø¨Ø¯ÙˆÙ† Ù‡ÛŒÚ† Ø¶Ø±Ø¨Ø§Ù†ÛŒ â†’ Â«Ù…Ø±Ø¯Ù‡Â» â†’ Ù‡Ø´Ø¯Ø§Ø± ØªÛŒÙ…ÛŒØ›
 *  Û². Ø§Ú¯Ø± Ú©Ù„ Ú†Ø±Ø®Ù‡ Ø¨ÛŒØ´ Ø§Ø² Û±Û° Ø¯Ù‚ÛŒÙ‚Ù‡ Ù‡ÛŒÚ† Ù¾ÛŒØ´Ø±ÙØªÛŒ Ù†Ú©Ø±Ø¯Ù‡ Ø¨Ø§Ø´Ø¯ (Ù†Ù‡ Ø§ØªÙ…Ø§Ù…ØŒ Ù†Ù‡
 *     Ø¨Ù‡â€ŒØ±ÙˆØ²Ø±Ø³Ø§Ù†ÛŒ ÙˆØ§Ù‚Ø¹ÛŒ)ØŒ Ù‡Ø´Ø¯Ø§Ø± Ø³Ø·Ø­-Ú†Ø±Ø®Ù‡ Ù…ÛŒâ€ŒÙØ±Ø³ØªØ¯ (Ù¾Ø´ØªÛŒØ¨Ø§Ù†)Ø›
 *  Û³. Ø¨Ø±Ø§ÛŒ Ø¬Ù„ÙˆÚ¯ÛŒØ±ÛŒ Ø§Ø² Ø§Ø³Ù¾Ù…ØŒ Ø¨Ø±Ø§ÛŒ Ù‡Ø± (Ú†Ø±Ø®Ù‡ØŒ ØªÛŒÙ…ØŒ ÙˆØ¶Ø¹ÛŒØª) Ø­Ø¯Ø§Ú©Ø«Ø± Ù‡Ø± Û¶Û° Ø¯Ù‚ÛŒÙ‚Ù‡
 *     ÛŒÚ© Ù‡Ø´Ø¯Ø§Ø± Ù…ÛŒâ€ŒÙØ±Ø³ØªØ¯.
 *
 * Ù†Ú©ØªÙ‡â€ŒÛŒ Ø±ÛŒØ´Ù‡â€ŒØ§ÛŒ: Ù¾ÛŒØ´ Ø§Ø² Ø¬Ø¯Ø§Ø³Ø§Ø²ÛŒ Ø¶Ø±Ø¨Ø§Ù† Ø§Ø² Ù¾ÛŒØ´Ø±ÙØªØŒ updated_at Ø¨Ø§ Ù‡Ø± Ø¶Ø±Ø¨Ø§Ù†Ù
 * Û¶Û° Ø«Ø§Ù†ÛŒÙ‡â€ŒØ§ÛŒ ØªØ§Ø²Ù‡ Ù…ÛŒâ€ŒØ´Ø¯ Ùˆ ØªÛŒÙ…Ù Ù‡Ù†Ú¯Ù Ø¶Ø±Ø¨Ø§Ù†â€ŒØ²Ù† Ù‡Ù…ÛŒØ´Ù‡ Â«Ø³Ø§Ù„Ù…Â» Ø¯ÛŒØ¯Ù‡ Ù…ÛŒâ€ŒØ´Ø¯.
 * Ø­Ø§Ù„Ø§ updated_at ÙÙ‚Ø· Ø¨Ø§ Ù¾ÛŒØ´Ø±ÙØª ÙˆØ§Ù‚Ø¹ÛŒ ØªØ§Ø²Ù‡ Ù…ÛŒâ€ŒØ´ÙˆØ¯ØŒ Ù¾Ø³ Ù‡Ù†Ú¯ Ø¯Ø± â‰¤Û±Ûµ Ø¯Ù‚ÛŒÙ‚Ù‡
 * (Ø¯Ø± Ø§ÙˆÙ„ÛŒÙ† Ø§Ø¬Ø±Ø§ÛŒ Ù†Ú¯Ù‡Ø¨Ø§Ù† Ù¾Ø³ Ø§Ø² Ø¹Ø¨ÙˆØ± Ø§Ø² Ø¢Ø³ØªØ§Ù†Ù‡) Ø´Ù†Ø§Ø³Ø§ÛŒÛŒ Ù…ÛŒâ€ŒØ´ÙˆØ¯.
 *
 * Ù‚Ø§Ù†ÙˆÙ† Ø³ÙØª: Ø§ÛŒÙ† Ø§Ø³Ú©Ø±ÛŒÙ¾Øª ÙÙ‚Ø· Ù‡Ø´Ø¯Ø§Ø± Ù…ÛŒâ€ŒØ¯Ù‡Ø¯ Ùˆ Ù‡Ø±Ú¯Ø² Ú†Ø±Ø®Ù‡ØŒ Ù‚ÙÙ„ ÛŒØ§ ØªÛŒÙ…ÛŒ Ø±Ø§
 * Ø¯Ø³Øªâ€ŒÚ©Ø§Ø±ÛŒ Ù†Ù…ÛŒâ€ŒÚ©Ù†Ø¯ (Ù†Ù‡ Ø¨Ù‡â€ŒØ±ÙˆØ²Ø±Ø³Ø§Ù†ÛŒ ÙˆØ¶Ø¹ÛŒØªØŒ Ù†Ù‡ Ø¢Ø²Ø§Ø¯Ø³Ø§Ø²ÛŒ Ù‚ÙÙ„ØŒ Ù†Ù‡ Ø´Ø±ÙˆØ¹/ØªÙˆÙ‚Ù).
 * Ù‡ÛŒÚ†â€ŒÙˆÙ‚Øª throw Ù†Ù…ÛŒâ€ŒÚ©Ù†Ø¯ ØªØ§ ÙˆØ±Ú©â€ŒÙÙ„Ùˆ Ø³Ø¨Ø² Ø¨Ù…Ø§Ù†Ø¯.
 *
 * Ø§Ø¬Ø±Ø§: npx tsx worker/cycle-watchdog.ts
 * Ù†ÛŒØ§Ø²Ù…Ù†Ø¯: SUPABASE_URL Ùˆ SUPABASE_SERVICE_ROLE_KEY Ø¯Ø± env
 */
import { getSupabase } from '../lib/dashboard/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ACTIVE_CYCLE_STATUSES, type TeamRun } from '../lib/dashboard/types';
import { notifyTeamReport } from '../lib/dashboard/notify';
import { faNum } from '../lib/dashboard/format';
import { findUnhealthyTeams, type UnhealthyTeam } from '../lib/dashboard/team-health';
import { pathToFileURL } from 'node:url';
import { logger } from '../lib/logger';

/** Ø¢Ø³ØªØ§Ù†Ù‡â€ŒÛŒ ØªÙˆÙ‚Ù: Ø¨ÛŒØ´ Ø§Ø² Ø§ÛŒÙ† Ø¯Ù‚ÛŒÙ‚Ù‡ Ø¨Ø¯ÙˆÙ† Ù¾ÛŒØ´Ø±ÙØª ÙˆØ§Ù‚Ø¹ÛŒ ÛŒØ¹Ù†ÛŒ Ú¯ÛŒØ± Ú©Ø±Ø¯Ù‡ Ø§Ø³Øª. */
const STALL_THRESHOLD_MINUTES = 10;
/** Ù¾Ù†Ø¬Ø±Ù‡â€ŒÛŒ Ø¹Ø¯Ù… ØªÚ©Ø±Ø§Ø± Ù‡Ø´Ø¯Ø§Ø± Ø¨Ø±Ø§ÛŒ ÛŒÚ© Ú†Ø±Ø®Ù‡ (Ø¯Ù‚ÛŒÙ‚Ù‡). */
const ALERT_COOLDOWN_MINUTES = 60;
/** Ø¨Ø±Ú†Ø³Ø¨ ØªÛŒÙ… Ø¯Ø± Ø§Ø¹Ù„Ø§Ù†â€ŒÙ‡Ø§ (ÙØ§Ø±Ø³ÛŒØŒ Ø¨Ø±Ø§ÛŒ ÙÛŒÙ„ØªØ± Ø¯Ø± Ø¯Ø§Ø´Ø¨ÙˆØ±Ø¯). */
const WATCHDOG_LABEL = 'Ù†Ú¯Ù‡Ø¨Ø§Ù† Ú†Ø±Ø®Ù‡';
/** Ø¨Ø±Ú†Ø³Ø¨ Ù‡Ø´Ø¯Ø§Ø± Ø¨ÛŒÙ„Ø¯ Ø´Ú©Ø³ØªÙ‡â€ŒÛŒ Ø³Ø§ÛŒØª. */
const BUILD_WATCH_LABEL = 'Ù†Ú¯Ù‡Ø¨Ø§Ù† Ø¨ÛŒÙ„Ø¯ Ø³Ø§ÛŒØª';
/** Ø±ÛŒÙ¾ÙˆÛŒ Ø³Ø§ÛŒØª ØªØ§ÛŒÙ„Ù†Ø¯Ú¯Ø±Ø¯. */
const SITE_REPO = 'masoudroot/thailandgard';
/** ÙˆØ±Ú©â€ŒÙÙ„ÙˆÛŒ Ø¯ÛŒÙ¾Ù„ÙˆÛŒ Ø³Ø§ÛŒØª. */
const SITE_DEPLOY_WORKFLOW = 'prisma-deploy.yml';
/** Ø´Ø§Ø®Ù‡â€ŒÛŒ dev Ø³Ø§ÛŒØª Ú©Ù‡ Ù¾Ù„ Ø®ÙˆØ¯Ú©Ø§Ø± Ø±ÙˆÛŒ Ø¢Ù† Ù…Ø±Ø¬ Ù…ÛŒâ€ŒÚ©Ù†Ø¯. */
const SITE_DEV_BRANCH = 'dev';

interface StallInfo {
  cycleId: string;
  runId: string;
  startedAt: string;
  lastTeam: string | null;
  lastTeamStatus: string | null;
  lastProgressAt: string;
  stallMinutes: number;
}

/** Ù…Ø¯Øª ØªÙˆÙ‚Ù Ø±Ø§ Ø¨Ù‡ ÙØ§Ø±Ø³ÛŒ Ø±ÙˆØ§Ù† Ø¨Ø±Ù…ÛŒâ€ŒÚ¯Ø±Ø¯Ø§Ù†Ø¯: Â«Û´Ûµ Ø¯Ù‚ÛŒÙ‚Ù‡Â» ÛŒØ§ Â«Û² Ø³Ø§Ø¹Øª Ùˆ Û±Û° Ø¯Ù‚ÛŒÙ‚Ù‡Â». */
function faDuration(totalMinutes: number): string {
  const m = Math.floor(totalMinutes);
  if (m < 60) return `${faNum(m)} Ø¯Ù‚ÛŒÙ‚Ù‡`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (rest === 0) return `${faNum(h)} Ø³Ø§Ø¹Øª`;
  return `${faNum(h)} Ø³Ø§Ø¹Øª Ùˆ ${faNum(rest)} Ø¯Ù‚ÛŒÙ‚Ù‡`;
}

/** Ø¢Ø®Ø±ÛŒÙ† Ù¾ÛŒØ´Ø±ÙØª ÛŒÚ© Ú†Ø±Ø®Ù‡: ØªØ§Ø²Ù‡â€ŒØªØ±ÛŒÙ† updated_at ÛŒØ§ finished_at Ø¯Ø± team_runs. */
function lastProgressOf(runs: TeamRun[], cycleStartedAt: string): { at: string; team: string | null; status: string | null } {
  let best: { at: string; team: string | null; status: string | null } = {
    at: cycleStartedAt,
    team: null,
    status: null,
  };
  for (const r of runs) {
    const candidates: Array<{ at: string | null | undefined; team: string; status: string }> = [
      { at: r.finished_at, team: r.team, status: r.status },
      { at: r.updated_at, team: r.team, status: r.status },
      { at: r.started_at, team: r.team, status: r.status },
    ];
    for (const c of candidates) {
      if (c.at && c.at > best.at) {
        best = { at: c.at, team: c.team, status: c.status };
      }
    }
  }
  return best;
}

/** Ø¢ÛŒØ§ Ø¯Ø± Û¶Û° Ø¯Ù‚ÛŒÙ‚Ù‡â€ŒÛŒ Ú¯Ø°Ø´ØªÙ‡ Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ† Ú©Ù„ÛŒØ¯ (Ú†Ø±Ø®Ù‡ ÛŒØ§ Ú†Ø±Ø®Ù‡+ØªÛŒÙ…) Ù‡Ø´Ø¯Ø§Ø±ÛŒ ÙØ±Ø³ØªØ§Ø¯Ù‡ Ø´Ø¯Ù‡ØŸ (Ø¶Ø¯ Ø§Ø³Ù¾Ù…) */
async function recentlyAlerted(sb: SupabaseClient, cycleId: string, dedupKey?: string): Promise<boolean> {
  try {
    const cutoff = new Date(Date.now() - ALERT_COOLDOWN_MINUTES * 60 * 1000).toISOString();
    let q = sb
      .from('notifications')
      .select('id')
      .eq('cycle_id', cycleId)
      .eq('team', WATCHDOG_LABEL)
      .gte('sent_at', cutoff);
    if (dedupKey) q = q.ilike('message', `%${dedupKey}%`);
    const { data, error } = await q.limit(1);
    if (error) {
      logger.error('[cycle-watchdog] Ø¨Ø±Ø±Ø³ÛŒ Ù‡Ø´Ø¯Ø§Ø± Ù‚Ø¨Ù„ÛŒ Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯:', undefined, error.message);
      return false;
    }
    return (data?.length ?? 0) > 0;
  } catch (err) {
    logger.error('[cycle-watchdog] Ø®Ø·Ø§ Ø¯Ø± Ø¨Ø±Ø±Ø³ÛŒ Ù‡Ø´Ø¯Ø§Ø± Ù‚Ø¨Ù„ÛŒ:', undefined, err instanceof Error ? err.message : err);
    return false;
  }
}

/** Ø³Ø§Ø®Øª Ù…ØªÙ† ÙØ§Ø±Ø³ÛŒ Ù‡Ø´Ø¯Ø§Ø±. */
function buildAlertMessage(info: StallInfo): string {
  const lines = [
    'Ù‡Ø´Ø¯Ø§Ø±: Ú†Ø±Ø®Ù‡ Ú¯ÛŒØ± Ú©Ø±Ø¯Ù‡ Ø§Ø³Øª',
    '',
    `Ø´Ù†Ø§Ø³Ù‡ Ú†Ø±Ø®Ù‡: ${info.runId}`,
    `Ù…Ø¯Øª ØªÙˆÙ‚Ù: ${faDuration(info.stallMinutes)}`,
  ];
  if (info.lastTeam) {
    const statusFa =
      info.lastTeamStatus === 'success' ? 'Ù…ÙˆÙÙ‚'
      : info.lastTeamStatus === 'failed' ? 'Ø®Ø·Ø§ÛŒ Ø³ÛŒØ³ØªÙ…ÛŒ'
      : info.lastTeamStatus === 'rejected' ? 'Ø±Ø¯ Ø´Ø¯Ù‡ ØªÙˆØ³Ø· Ù…Ù†ØªÙ‚Ø¯'
      : info.lastTeamStatus;
    lines.push(`Ø¢Ø®Ø±ÛŒÙ† ÙØ¹Ø§Ù„ÛŒØª: ØªÛŒÙ… ${info.lastTeam} (${statusFa})`);
  } else {
    lines.push('Ø¢Ø®Ø±ÛŒÙ† ÙØ¹Ø§Ù„ÛŒØª: Ù‡ÛŒÚ† ØªÛŒÙ…ÛŒ Ù‡Ù†ÙˆØ² Ø§Ø¬Ø±Ø§ Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª');
  }
  lines.push('', 'Ø§ÛŒÙ† Ù¾ÛŒØ§Ù… ÙÙ‚Ø· Ù‡Ø´Ø¯Ø§Ø± Ø§Ø³ØªØ› Ú†Ø±Ø®Ù‡ Ø¨Ù‡â€ŒØµÙˆØ±Øª Ø®ÙˆØ¯Ú©Ø§Ø± Ø¯Ø³Øªâ€ŒÚ©Ø§Ø±ÛŒ Ù†Ø´Ø¯.');
  return lines.join('\n');
}

async function checkOneCycle(cycle: { id: string; run_id: string; started_at: string }): Promise<void> {
  const sb = getSupabase();
  // Ø§ÙˆÙ„ Ø³Ø·Ø­-ØªÛŒÙ…: Ù‡Ù†Ú¯/Ù…Ø±Ú¯ Ù‡Ø± ØªÛŒÙ…Ù Ø¯Ø± Ø­Ø§Ù„ Ø§Ø¬Ø±Ø§ Ø¬Ø¯Ø§Ú¯Ø§Ù†Ù‡ Ø´Ù†Ø§Ø³Ø§ÛŒÛŒ Ùˆ Ù‡Ø´Ø¯Ø§Ø± Ø¯Ø§Ø¯Ù‡ Ù…ÛŒâ€ŒØ´ÙˆØ¯.
  try {
    await checkHungTeams(sb, cycle);
  } catch (err) {
    logger.error(`[cycle-watchdog] Ø®Ø·Ø§ Ø¯Ø± Ø¨Ø±Ø±Ø³ÛŒ Ù‡Ù†Ú¯ ØªÛŒÙ…â€ŒÙ‡Ø§ÛŒ Ú†Ø±Ø®Ù‡ ${cycle.run_id}:`, undefined, err instanceof Error ? err.message : err);
  }

  const { data: runs, error } = await sb
    .from('team_runs')
    .select('id, team, status, started_at, finished_at, updated_at')
    .eq('cycle_id', cycle.id);
  if (error) {
    logger.error(`[cycle-watchdog] Ø®ÙˆØ§Ù†Ø¯Ù† team_runs Ø¨Ø±Ø§ÛŒ Ú†Ø±Ø®Ù‡ ${cycle.run_id} Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯:`, undefined, error.message);
    return;
  }
  const teamRuns = (runs ?? []) as TeamRun[];
  const last = lastProgressOf(teamRuns, cycle.started_at);
  const stallMinutes = (Date.now() - new Date(last.at).getTime()) / 60000;

  if (stallMinutes <= STALL_THRESHOLD_MINUTES) {
    logger.info(`[cycle-watchdog] Ú†Ø±Ø®Ù‡ ${cycle.run_id} Ø³Ø§Ù„Ù… Ø§Ø³ØªØ› Ø¢Ø®Ø±ÛŒÙ† Ù¾ÛŒØ´Ø±ÙØª ${Math.floor(stallMinutes)} Ø¯Ù‚ÛŒÙ‚Ù‡ Ù¾ÛŒØ´.`);
    return;
  }

  if (await recentlyAlerted(sb, cycle.id)) {
    logger.info(`[cycle-watchdog] Ú†Ø±Ø®Ù‡ ${cycle.run_id} Ú¯ÛŒØ± Ú©Ø±Ø¯Ù‡ ÙˆÙ„ÛŒ Ù‡Ø´Ø¯Ø§Ø± ØªØ§Ø²Ù‡ ÙØ±Ø³ØªØ§Ø¯Ù‡ Ø´Ø¯Ù‡Ø› Ø±Ø¯ Ø´Ø¯.`);
    return;
  }

  const info: StallInfo = {
    cycleId: cycle.id,
    runId: cycle.run_id,
    startedAt: cycle.started_at,
    lastTeam: last.team,
    lastTeamStatus: last.status,
    lastProgressAt: last.at,
    stallMinutes,
  };
  const message = buildAlertMessage(info);
  const { panelId, telegramMessageId } = await notifyTeamReport({
    team: WATCHDOG_LABEL,
    message,
    cycleId: cycle.id,
  });
  logger.info(
    `[cycle-watchdog] Ù‡Ø´Ø¯Ø§Ø± ØªÙˆÙ‚Ù Ø¨Ø±Ø§ÛŒ Ú†Ø±Ø®Ù‡ ${cycle.run_id} ÙØ±Ø³ØªØ§Ø¯Ù‡ Ø´Ø¯ ` +
      `(ØªÙˆÙ‚Ù ${faDuration(stallMinutes)}ØŒ Ù¾Ù†Ù„: ${panelId ?? 'Ù†Ø§Ù…ÙˆÙÙ‚'}ØŒ ØªÙ„Ú¯Ø±Ø§Ù…: ${telegramMessageId ?? 'Ù†Ø§Ù…ÙˆÙÙ‚'}).`,
  );
}

/** Ø³Ø§Ø®Øª Ù…ØªÙ† ÙØ§Ø±Ø³ÛŒ Ù‡Ø´Ø¯Ø§Ø± Ù‡Ù†Ú¯/Ù…Ø±Ú¯ ÛŒÚ© ØªÛŒÙ…. */
function buildHangAlertMessage(
  runId: string,
  t: UnhealthyTeam,
  dedupKey: string,
): string {
  const hb = t.minutesWithoutHeartbeat;
  const hbLine =
    hb === null
      ? 'Ø¶Ø±Ø¨Ø§Ù†: Ù‡ÛŒÚ† Ø¶Ø±Ø¨Ø§Ù†ÛŒ Ø«Ø¨Øª Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª'
      : hb <= 10
        ? `Ø¶Ø±Ø¨Ø§Ù†: Ø²Ù†Ø¯Ù‡ (Ø¢Ø®Ø±ÛŒÙ† Ø¶Ø±Ø¨Ø§Ù† ${faDuration(hb)} Ù¾ÛŒØ´) â€” ÙØ±Ø§ÛŒÙ†Ø¯ Ø²Ù†Ø¯Ù‡ Ø§Ø³Øª ÙˆÙ„ÛŒ Ú©Ø§Ø± Ø¬Ù„Ùˆ Ù†Ù…ÛŒâ€ŒØ±ÙˆØ¯`
        : `Ø¶Ø±Ø¨Ø§Ù†: Ù‚Ø·Ø¹ Ø´Ø¯Ù‡ (Ø¢Ø®Ø±ÛŒÙ† Ø¶Ø±Ø¨Ø§Ù† ${faDuration(hb)} Ù¾ÛŒØ´)`;
  const lines = [
    t.health === 'hung' ? 'Ù‡Ø´Ø¯Ø§Ø±: ØªÛŒÙ… Ù‡Ù†Ú¯ Ú©Ø±Ø¯Ù‡ Ø§Ø³Øª' : 'Ù‡Ø´Ø¯Ø§Ø±: ÙØ±Ø§ÛŒÙ†Ø¯ ØªÛŒÙ… Ø¨Ù‡ Ù†Ø¸Ø± Ù…Ø±Ø¯Ù‡ Ù…ÛŒâ€ŒØ±Ø³Ø¯',
    '',
    `Ú†Ø±Ø®Ù‡: ${runId}`,
    `ØªÛŒÙ…: ${t.team}`,
  ];
  if (t.health === 'hung') {
    lines.push(`Ø¨Ø¯ÙˆÙ† Ù‡ÛŒÚ† Ù¾ÛŒØ´Ø±ÙØªÛŒ: ${faDuration(t.minutesWithoutProgress)} (Ø¢Ø³ØªØ§Ù†Ù‡: Û±Ûµ Ø¯Ù‚ÛŒÙ‚Ù‡)`);
    lines.push(hbLine);
  } else {
    lines.push(
      `Ø¨Ø¯ÙˆÙ† Ø¶Ø±Ø¨Ø§Ù†: ${hb === null ? 'Ù‡ÛŒÚ†â€ŒÙˆÙ‚Øª' : faDuration(hb)} (Ø¢Ø³ØªØ§Ù†Ù‡: Û±Ûµ Ø¯Ù‚ÛŒÙ‚Ù‡)`,
    );
    lines.push(`Ø¢Ø®Ø±ÛŒÙ† Ù¾ÛŒØ´Ø±ÙØª ÙˆØ§Ù‚Ø¹ÛŒ: ${faDuration(t.minutesWithoutProgress)} Ù¾ÛŒØ´`);
  }
  if (t.currentTask) lines.push(`Ù…Ø±Ø­Ù„Ù‡â€ŒÛŒ Ø¬Ø§Ø±ÛŒ: ${t.currentTask}`);
  lines.push(
    '',
    'ÙˆØ±Ú©Ø± Ø¯Ø± ØªÛŒÚ© Ø¨Ø¹Ø¯ÛŒ Ø§ÛŒÙ† ØªÛŒÙ… Ø±Ø§ Â«Ù†Ø§Ù…ÙˆÙÙ‚Â» Ø«Ø¨Øª Ù…ÛŒâ€ŒÚ©Ù†Ø¯ ØªØ§ Ù…ÙˆØ¬ Ø¬Ù„Ùˆ Ø¨Ø±ÙˆØ¯.',
    'Ø§ÛŒÙ† Ù¾ÛŒØ§Ù… ÙÙ‚Ø· Ù‡Ø´Ø¯Ø§Ø± Ø§Ø³ØªØ› Ú†Ø±Ø®Ù‡ Ø¨Ù‡â€ŒØµÙˆØ±Øª Ø®ÙˆØ¯Ú©Ø§Ø± Ø¯Ø³Øªâ€ŒÚ©Ø§Ø±ÛŒ Ù†Ø´Ø¯.',
    '',
    dedupKey,
  );
  return lines.join('\n');
}

/**
 * Ø¨Ø±Ø±Ø³ÛŒ Ø³Ø·Ø­-ØªÛŒÙ…: ØªÛŒÙ…â€ŒÙ‡Ø§ÛŒ Ù†Ø§Ø³Ø§Ù„Ù… (Ù‡Ù†Ú¯/Ù…Ø±Ø¯Ù‡) Ø±Ø§ Ø¨Ø§ Ù‡Ù…Ø§Ù† Ù…Ù†Ø·Ù‚ Ù…Ø´ØªØ±Ú© ÙˆØ±Ú©Ø±
 * (findUnhealthyTeams Ø¯Ø± lib/team-health) Ù¾ÛŒØ¯Ø§ Ù…ÛŒâ€ŒÚ©Ù†Ø¯ Ùˆ Ø¨Ø±Ø§ÛŒ Ù‡Ø± Ú©Ø¯Ø§Ù…
 * Ù‡Ø´Ø¯Ø§Ø± Ø¬Ø¯Ø§Ú¯Ø§Ù†Ù‡ Ù…ÛŒâ€ŒÙØ±Ø³ØªØ¯.
 * ÙÙ‚Ø· Ù‡Ø´Ø¯Ø§Ø±Ø› Ù‡ÛŒÚ† Ø¯Ø³Øªâ€ŒÚ©Ø§Ø±ÛŒ Ø¯Ø± ÙˆØ¶Ø¹ÛŒØª ØªÛŒÙ… Ø§Ù†Ø¬Ø§Ù… Ù†Ù…ÛŒâ€ŒØ´ÙˆØ¯.
 *
 * Ú©Ù„Ø§ÛŒÙ†Øª Ø¯ÛŒØªØ§Ø¨ÛŒØ³ Ùˆ ØªØ§Ø¨Ø¹ Ø§Ø·Ù„Ø§Ø¹â€ŒØ±Ø³Ø§Ù†ÛŒ ØªØ²Ø±ÛŒÙ‚ Ù…ÛŒâ€ŒØ´ÙˆÙ†Ø¯ ØªØ§ Ù…Ø³ÛŒØ± ÙˆØ§Ù‚Ø¹ÛŒ
 * (Ø®ÙˆØ§Ù†Ø¯Ù† Ø±Ø¯ÛŒÙâ€ŒÙ‡Ø§ÛŒ ÙˆØ§Ù‚Ø¹ÛŒØŒ Ø·Ø¨Ù‚Ù‡â€ŒØ¨Ù†Ø¯ÛŒ ÙˆØ§Ù‚Ø¹ÛŒØŒ Ø¶Ø¯Ø§Ø³Ù¾Ù… ÙˆØ§Ù‚Ø¹ÛŒ) Ø¯Ø± ØªØ³Øª Ù‡Ù…
 * Ø§Ø¬Ø±Ø§ Ø´ÙˆØ¯Ø› Ù¾ÛŒØ´â€ŒÙØ±Ø¶â€ŒÙ‡Ø§ Ù‡Ù…Ø§Ù† Ù…Ø³ÛŒØ± Ù¾Ø±ÙˆØ¯Ø§Ú©Ø´Ù†â€ŒØ§Ù†Ø¯.
 */
export async function checkHungTeams(
  sb: SupabaseClient,
  cycle: { id: string; run_id: string },
  notify: typeof notifyTeamReport = notifyTeamReport,
): Promise<void> {
  let bad: UnhealthyTeam[];
  try {
    bad = await findUnhealthyTeams(sb, cycle.id);
  } catch (err) {
    logger.error(`[cycle-watchdog] Ø®Ø·Ø§ Ø¯Ø± Ø¨Ø±Ø±Ø³ÛŒ Ù‡Ù†Ú¯ ØªÛŒÙ…â€ŒÙ‡Ø§ÛŒ Ú†Ø±Ø®Ù‡ ${cycle.run_id}:`, undefined, err instanceof Error ? err.message : err);
    return;
  }

  for (const t of bad) {
    const dedupKey = `[hang:${t.team}:${t.health}]`;
    if (await recentlyAlerted(sb, cycle.id, dedupKey)) {
      logger.info(`[cycle-watchdog] ØªÛŒÙ… ${t.team} (${t.health}) Ù‚Ø¨Ù„Ø§Ù‹ Ù‡Ø´Ø¯Ø§Ø± Ø¯Ø§Ø¯Ù‡ Ø´Ø¯Ù‡Ø› Ø±Ø¯ Ø´Ø¯.`);
      continue;
    }
    const message = buildHangAlertMessage(cycle.run_id, t, dedupKey);
    const { panelId, telegramMessageId } = await notify({
      team: WATCHDOG_LABEL,
      message,
      cycleId: cycle.id,
    });
    logger.info(
      `[cycle-watchdog] Ù‡Ø´Ø¯Ø§Ø± Â«${t.health === 'hung' ? 'Ù‡Ù†Ú¯' : 'Ù…Ø±Ú¯ ÙØ±Ø§ÛŒÙ†Ø¯'}Â» Ø¨Ø±Ø§ÛŒ ØªÛŒÙ… ${t.team} ` +
        `Ø¯Ø± Ú†Ø±Ø®Ù‡ ${cycle.run_id} ÙØ±Ø³ØªØ§Ø¯Ù‡ Ø´Ø¯ (Ù¾Ù†Ù„: ${panelId ?? 'Ù†Ø§Ù…ÙˆÙÙ‚'}ØŒ ØªÙ„Ú¯Ø±Ø§Ù…: ${telegramMessageId ?? 'Ù†Ø§Ù…ÙˆÙÙ‚'}).`,
    );
  }
}

async function main(): Promise<void> {
  try {
    const sb = getSupabase();
    const { data: cycles, error } = await sb
      .from('cycles')
      .select('id, run_id, started_at')
      .in('status', ACTIVE_CYCLE_STATUSES)
      .order('started_at', { ascending: false });
    if (error) {
      logger.error('[cycle-watchdog] Ø®ÙˆØ§Ù†Ø¯Ù† Ú†Ø±Ø®Ù‡â€ŒÙ‡Ø§ÛŒ ÙØ¹Ø§Ù„ Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯:', undefined, error.message);
      return;
    }
    if (!cycles || cycles.length === 0) {
      logger.info('[cycle-watchdog] Ú†Ø±Ø®Ù‡â€ŒÛŒ ÙØ¹Ø§Ù„ÛŒ Ù†ÛŒØ³ØªØ› Ú©Ø§Ø±ÛŒ Ø§Ù†Ø¬Ø§Ù… Ù†Ø´Ø¯.');
    } else {
      logger.info(`[cycle-watchdog] ${faNum(cycles.length)} Ú†Ø±Ø®Ù‡â€ŒÛŒ ÙØ¹Ø§Ù„ Ø¨Ø±Ø±Ø³ÛŒ Ù…ÛŒâ€ŒØ´ÙˆØ¯.`);
      for (const cycle of cycles) {
        try {
          await checkOneCycle(cycle as { id: string; run_id: string; started_at: string });
        } catch (err) {
          logger.error(`[cycle-watchdog] Ø®Ø·Ø§ Ø¯Ø± Ø¨Ø±Ø±Ø³ÛŒ Ú†Ø±Ø®Ù‡:`, undefined, err instanceof Error ? err.message : err);
        }
      }
    }
    // Ø¨Ø±Ø±Ø³ÛŒ Ø¨ÛŒÙ„Ø¯ dev Ø³Ø§ÛŒØª (Ù¾Ù„ Ø®ÙˆØ¯Ú©Ø§Ø± Ø±ÙˆÛŒ Ø¢Ù† Ù…Ø±Ø¬ Ù…ÛŒâ€ŒÚ©Ù†Ø¯)
    try {
      await checkSiteDevBuild();
    } catch (err) {
      logger.error('[cycle-watchdog] Ø®Ø·Ø§ Ø¯Ø± Ø¨Ø±Ø±Ø³ÛŒ Ø¨ÛŒÙ„Ø¯ Ø³Ø§ÛŒØª:', undefined, err instanceof Error ? err.message : err);
    }
  } catch (err) {
    logger.error('[cycle-watchdog] Ø®Ø·Ø§ÛŒ Ú©Ù„ÛŒ:', undefined, err instanceof Error ? err.message : err);
  }
}

/**
 * Ø¨Ø±Ø±Ø³ÛŒ Ø¢Ø®Ø±ÛŒÙ† Ø¨ÛŒÙ„Ø¯ Ø´Ø§Ø®Ù‡â€ŒÛŒ dev Ø±ÛŒÙ¾ÙˆÛŒ Ø³Ø§ÛŒØª.
 * Ø§Ú¯Ø± Ø¢Ø®Ø±ÛŒÙ† Ø§Ø¬Ø±Ø§ÛŒ ØªÚ©Ù…ÛŒÙ„â€ŒØ´Ø¯Ù‡â€ŒÛŒ prisma-deploy Ø±ÙˆÛŒ dev Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨Ø§Ø´Ø¯ØŒ Ù‡Ø´Ø¯Ø§Ø± Ù…ÛŒâ€ŒÙØ±Ø³ØªØ¯.
 * ÙÙ‚Ø· Ù‡Ø´Ø¯Ø§Ø±Ø› Ù‡ÛŒÚ† Ø¯Ø³Øªâ€ŒÚ©Ø§Ø±ÛŒ Ø¯Ø± Ø±ÛŒÙ¾Ùˆ ÛŒØ§ Ù¾Ú† Ø§Ù†Ø¬Ø§Ù… Ù†Ù…ÛŒâ€ŒØ´ÙˆØ¯.
 */
async function checkSiteDevBuild(): Promise<void> {
  let token: string | null = null;
  try {
    const { getGithubConfig } = await import('../lib/dashboard/github');
    const cfg = await getGithubConfig();
    token = cfg.token;
  } catch {
    // Ø¨Ø¯ÙˆÙ† ØªÙˆÚ©Ù†ØŒ Ø¨Ø±Ø±Ø³ÛŒ Ø¨ÛŒÙ„Ø¯ Ù…Ù…Ú©Ù† Ù†ÛŒØ³Øª
  }
  if (!token) {
    logger.info('[cycle-watchdog] ØªÙˆÚ©Ù† Ú¯ÛŒØªâ€ŒÙ‡Ø§Ø¨ Ø¯Ø± Ø¯Ø³ØªØ±Ø³ Ù†ÛŒØ³ØªØ› Ø¨Ø±Ø±Ø³ÛŒ Ø¨ÛŒÙ„Ø¯ Ø³Ø§ÛŒØª Ø±Ø¯ Ø´Ø¯.');
    return;
  }
  const api = `https://api.github.com/repos/${SITE_REPO}/actions/workflows/${SITE_DEPLOY_WORKFLOW}/runs?branch=${SITE_DEV_BRANCH}&per_page=5`;
  let runs: Array<{ id: number; conclusion: string | null; status: string; head_sha: string; html_url: string }> = [];
  try {
    const res = await fetch(api, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      logger.error(`[cycle-watchdog] Ø®ÙˆØ§Ù†Ø¯Ù† ÙˆØ¶Ø¹ÛŒØª Ø¨ÛŒÙ„Ø¯ Ø³Ø§ÛŒØª Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯ (ÙˆØ¶Ø¹ÛŒØª ${res.status}).`);
      return;
    }
    const body = (await res.json()) as { workflow_runs?: typeof runs };
    runs = Array.isArray(body.workflow_runs) ? body.workflow_runs : [];
  } catch (err) {
    logger.error('[cycle-watchdog] Ø®Ø·Ø§ Ø¯Ø± ÙØ±Ø§Ø®ÙˆØ§Ù†ÛŒ API Ø¨ÛŒÙ„Ø¯ Ø³Ø§ÛŒØª:', undefined, err instanceof Error ? err.message : err);
    return;
  }
  // Ø¢Ø®Ø±ÛŒÙ† Ø§Ø¬Ø±Ø§ÛŒ ØªÚ©Ù…ÛŒÙ„â€ŒØ´Ø¯Ù‡
  const done = runs.find((r) => r.status === 'completed');
  if (!done) {
    logger.info('[cycle-watchdog] Ø§Ø¬Ø±Ø§ÛŒ ØªÚ©Ù…ÛŒÙ„â€ŒØ´Ø¯Ù‡â€ŒØ§ÛŒ Ø¨Ø±Ø§ÛŒ Ø¨ÛŒÙ„Ø¯ dev Ø³Ø§ÛŒØª Ù¾ÛŒØ¯Ø§ Ù†Ø´Ø¯.');
    return;
  }
  if (done.conclusion === 'success') {
    logger.info(`[cycle-watchdog] Ø¨ÛŒÙ„Ø¯ dev Ø³Ø§ÛŒØª Ø³Ø§Ù„Ù… Ø§Ø³Øª (Ø§Ø¬Ø±Ø§ÛŒ ${done.id}).`);
    return;
  }
  // Ù†Ø§Ù…ÙˆÙÙ‚: Ø¢ÛŒØ§ Ù‚Ø¨Ù„Ø§Ù‹ Ø¨Ø±Ø§ÛŒ Ù‡Ù…ÛŒÙ† Ø§Ø¬Ø±Ø§ Ù‡Ø´Ø¯Ø§Ø± Ø¯Ø§Ø¯Ù‡â€ŒØ§ÛŒÙ…ØŸ
  const dedupKey = `build-${done.id}`;
  try {
    const cutoff = new Date(Date.now() - ALERT_COOLDOWN_MINUTES * 60 * 1000).toISOString();
    const { data, error } = await getSupabase()
      .from('notifications')
      .select('id')
      .eq('team', BUILD_WATCH_LABEL)
      .ilike('message', `%${dedupKey}%`)
      .gte('sent_at', cutoff)
      .limit(1);
    if (!error && (data?.length ?? 0) > 0) {
      logger.info(`[cycle-watchdog] Ø¨ÛŒÙ„Ø¯ Ø´Ú©Ø³ØªÙ‡â€ŒÛŒ dev (Ø§Ø¬Ø±Ø§ÛŒ ${done.id}) Ù‚Ø¨Ù„Ø§Ù‹ Ù‡Ø´Ø¯Ø§Ø± Ø¯Ø§Ø¯Ù‡ Ø´Ø¯Ù‡Ø› Ø±Ø¯ Ø´Ø¯.`);
      return;
    }
  } catch {
    // Ø§Ø¯Ø§Ù…Ù‡ Ù…ÛŒâ€ŒØ¯Ù‡ÛŒÙ…Ø› Ø¨Ø¯ØªØ±ÛŒÙ† Ø­Ø§Ù„Øª Ù‡Ø´Ø¯Ø§Ø± ØªÚ©Ø±Ø§Ø±ÛŒ Ø§Ø³Øª
  }
  const shortSha = done.head_sha.slice(0, 7);
  const message = [
    'Ù‡Ø´Ø¯Ø§Ø± Ù†Ú¯Ù‡Ø¨Ø§Ù† Ø¨ÛŒÙ„Ø¯ Ø³Ø§ÛŒØª',
    '',
    `Ø¢Ø®Ø±ÛŒÙ† Ø¨ÛŒÙ„Ø¯ Ø´Ø§Ø®Ù‡â€ŒÛŒ dev Ø³Ø§ÛŒØª Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯ (${dedupKey}).`,
    `Ù†ØªÛŒØ¬Ù‡: ${done.conclusion ?? 'Ù†Ø§Ù…Ø´Ø®Øµ'}`,
    `Ú©Ø§Ù…ÛŒØª: ${shortSha}`,
    `Ù„ÛŒÙ†Ú©: ${done.html_url}`,
    '',
    'Ø§Ø­ØªÙ…Ø§Ù„Ø§Ù‹ ÛŒÚ©ÛŒ Ø§Ø² Ù…Ø±Ø¬â€ŒÙ‡Ø§ÛŒ Ø®ÙˆØ¯Ú©Ø§Ø± Ù¾Ù„ØŒ Ø¨ÛŒÙ„Ø¯ Ø±Ø§ Ø´Ú©Ø³ØªÙ‡ Ø§Ø³Øª.',
    'Ø¨Ø±Ø±Ø³ÛŒ Ú©Ù†ÛŒØ¯Ø› Ø¯Ø± ØµÙˆØ±Øª Ù†ÛŒØ§Ø² Ø§Ø² ØµÙØ­Ù‡â€ŒÛŒ Ù¾Ù„ØŒ Ø±ÙˆÙ„â€ŒØ¨Ú© Ø¨Ø²Ù†ÛŒØ¯.',
    '',
    'Ø§ÛŒÙ† Ù¾ÛŒØ§Ù… ÙÙ‚Ø· Ù‡Ø´Ø¯Ø§Ø± Ø§Ø³ØªØ› Ú†ÛŒØ²ÛŒ Ø¨Ù‡â€ŒØµÙˆØ±Øª Ø®ÙˆØ¯Ú©Ø§Ø± Ø¨Ø±Ù†Ú¯Ø±Ø¯Ø§Ù†Ø¯Ù‡ Ù†Ø´Ø¯.',
  ].join('\n');
  const { panelId, telegramMessageId } = await notifyTeamReport({
    team: BUILD_WATCH_LABEL,
    message,
  });
  logger.info(
    `[cycle-watchdog] Ù‡Ø´Ø¯Ø§Ø± Ø¨ÛŒÙ„Ø¯ Ø´Ú©Ø³ØªÙ‡ Ø¨Ø±Ø§ÛŒ dev ÙØ±Ø³ØªØ§Ø¯Ù‡ Ø´Ø¯ ` +
      `(Ø§Ø¬Ø±Ø§ÛŒ ${done.id}ØŒ Ù¾Ù†Ù„: ${panelId ?? 'Ù†Ø§Ù…ÙˆÙÙ‚'}ØŒ ØªÙ„Ú¯Ø±Ø§Ù…: ${telegramMessageId ?? 'Ù†Ø§Ù…ÙˆÙÙ‚'}).`,
  );
}

// ÙÙ‚Ø· ÙˆÙ‚ØªÛŒ Ù…Ø³ØªÙ‚ÛŒÙ… Ø§Ø¬Ø±Ø§ Ø´Ø¯ (npx tsx worker/cycle-watchdog.ts) main Ø±Ø§ Ø¨Ø²Ù†Ø›
// Ø¨Ø§ Ø§ÛŒÙ…Ù¾ÙˆØ±Øª (ØªØ³Øª) Ø§Ø¬Ø±Ø§ Ù†Ø´ÙˆØ¯.
if (typeof process !== 'undefined' && process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}

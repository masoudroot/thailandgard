/**
 * ÙˆØ±Ú©Ø± Ø§Ø±Ú©Ø³ØªØ±Ø§Ø³ÛŒÙˆÙ† ØªØ§ÛŒÙ„Ù†Ø¯Ú¯Ø±Ø¯ â€” Ø§Ø¬Ø±Ø§ Ø±ÙˆÛŒ Ú¯ÛŒØªâ€ŒÙ‡Ø§Ø¨ Ø§Ú©Ø´Ù†Ø².
 * Ù‡Ø± Ø§Ø¬Ø±Ø§ ÙÙ‚Ø· Â«ÛŒÚ© ØªÛŒÙ…Â» Ø±Ø§ Ø§Ø¬Ø±Ø§ Ù…ÛŒâ€ŒÚ©Ù†Ø¯ Ùˆ Ø®Ø§Ø±Ø¬ Ù…ÛŒâ€ŒØ´ÙˆØ¯.
 * Ú©Ø±ÙˆÙ† Ú¯ÛŒØªâ€ŒÙ‡Ø§Ø¨ Ù‡Ø± Ûµ Ø¯Ù‚ÛŒÙ‚Ù‡ Ø¢Ù† Ø±Ø§ ØµØ¯Ø§ Ù…ÛŒâ€ŒØ²Ù†Ø¯ ØªØ§ Ú†Ø±Ø®Ù‡ Ø¬Ù„Ùˆ Ø¨Ø±ÙˆØ¯.
 * Ø¨Ø§ Ø¢Ø±Ú¯ÙˆÙ…Ø§Ù† start-cycle ÛŒÚ© Ú†Ø±Ø®Ù‡ Ø¬Ø¯ÛŒØ¯ Ù…ÛŒâ€ŒØ³Ø§Ø²Ø¯.
 *
 * Ø§Ø¬Ø±Ø§: npx tsx worker/cycle-worker.ts [start-cycle]
 * Ù†ÛŒØ§Ø²Ù…Ù†Ø¯: SUPABASE_URL Ùˆ SUPABASE_SERVICE_ROLE_KEY Ø¯Ø± env
 */
import { getSupabase } from '../lib/dashboard/api';
import { MAX_SAME_CYCLE_FIX_ATTEMPTS, WAVES, type TeamName } from '../lib/dashboard/types';
import { findActiveCycle, finishCycle, runSingleTeam, beginCycle } from '../lib/dashboard/orchestrator';
import { claimTeam, readLock, touchLock, type LockOwner } from '../lib/dashboard/lock';
import { getSetting } from '../lib/dashboard/settings';
import { sweepHungTeams } from '../lib/dashboard/team-health';
import { recoverDeadCycles, isAutoRestartableAfterKill } from '../lib/dashboard/cycle-recovery';

/**
 * Ù†Ú¯Ù‡Ø¨Ø§Ù† Ù…Ø±Ú¯ Ø®Ø§Ù…ÙˆØ´ (Û²Ûµ Ù…Ù‡Ø± Û±Û´Û°Ûµ): Ø±ÛŒØ¬Ú©Ø´Ù† Ù‡Ù†Ø¯Ù„â€ŒÙ†Ø´Ø¯Ù‡ Ù†Ø¨Ø§ÛŒØ¯ Ù¾Ø±ÙˆØ³Ù‡ Ø±Ø§ Ø¨ÛŒâ€ŒØµØ¯Ø§ Ø¨Ú©Ø´Ø¯.
 * Ù‚Ø¨Ù„Ø§Ù‹ Ø¯Ùˆ Ù‡Ù†Ú¯ (content Ùˆ branding) Ø¨Ø§ Ù‚Ø·Ø¹ Ø¶Ø±Ø¨Ø§Ù† Ùˆ Ø¨Ø¯ÙˆÙ† Ù‡ÛŒÚ† Ù„Ø§Ú¯ÛŒ Ø±Ø® Ø¯Ø§Ø¯Ø›
 * Ù…Ø­ØªÙ…Ù„â€ŒØªØ±ÛŒÙ† Ø¹Ù„Øª Ú©Ø±Ø´ Ø¨Ø± Ø§Ø«Ø± unhandledRejection Ø¨ÙˆØ¯. Ø­Ø§Ù„Ø§ Ø®Ø·Ø§ Ù„Ø§Ú¯ Ù…ÛŒâ€ŒØ´ÙˆØ¯ Ùˆ
 * Ù¾Ø±ÙˆØ³Ù‡ Ø²Ù†Ø¯Ù‡ Ù…ÛŒâ€ŒÙ…Ø§Ù†Ø¯ ØªØ§ Ù†Ú¯Ù‡Ø¨Ø§Ù† Ù‡Ù†Ú¯ØŒ ØªÛŒÙ… Ø±Ø§ ØªÙ…ÛŒØ² Ù†Ø§Ù…ÙˆÙÙ‚ Ø«Ø¨Øª Ú©Ù†Ø¯.
 */
process.on('unhandledRejection', (reason) => {
  console.error(
    '[cycle-worker] unhandledRejection (Ù¾Ø±ÙˆØ³Ù‡ Ø²Ù†Ø¯Ù‡ Ù…Ø§Ù†Ø¯):',
    reason instanceof Error ? (reason.stack ?? reason.message) : String(reason),
  );
});
process.on('uncaughtException', (err) => {
  console.error(
    '[cycle-worker] uncaughtException (Ù¾Ø±ÙˆØ³Ù‡ Ø²Ù†Ø¯Ù‡ Ù…Ø§Ù†Ø¯):',
    err instanceof Error ? (err.stack ?? err.message) : String(err),
  );
});

import { sweepOrphanedBridgePatches } from '../lib/dashboard/bridge/sweep';

/** Ø³Ù‚Ù Ù¾Ø±Ø¯Ø§Ø²Ø´ Ù¾Ú†â€ŒÙ‡Ø§ÛŒ ÛŒØªÛŒÙ… Ø¯Ø± Ù‡Ø± ØªÛŒÚ©ØŒ ØªØ§ Ø¨ÙˆØ¯Ø¬Ù‡â€ŒÛŒ Ø²Ù…Ø§Ù†ÛŒ Ø¬Ø§Ø¨ Ø®ÙˆØ±Ø¯Ù‡ Ù†Ø´ÙˆØ¯. */
/** Ú©Ù„ÛŒØ¯ ØªÙ†Ø¸ÛŒÙ…Ø§Øª Ø´Ø±ÙˆØ¹ Ø®ÙˆØ¯Ú©Ø§Ø± Ú†Ø±Ø®Ù‡â€ŒÛŒ Ø¨Ø¹Ø¯ÛŒ (Ù…Ù‚Ø§Ø¯ÛŒØ±: true/falseØ› Ù¾ÛŒØ´â€ŒÙØ±Ø¶ Ø±ÙˆØ´Ù†). */
const AUTO_START_SETTING_KEY = 'auto_start_next_cycle';
/**
 * Ø³Ù‚Ù Ø®Ø±Ø§Ø¨ÛŒâ€ŒÙ‡Ø§ÛŒ Ù¾ÛŒØ§Ù¾ÛŒ Ú†Ø±Ø®Ù‡ Ù¾ÛŒØ´ Ø§Ø² ØªÙˆÙ‚Ù Ø´Ø±ÙˆØ¹ Ø®ÙˆØ¯Ú©Ø§Ø±.
 * Ø¨Ø¹Ø¯ Ø§Ø² Ø§ÛŒÙ† ØªØ¹Ø¯Ø§Ø¯ Ú†Ø±Ø®Ù‡â€ŒÛŒ Ù¾ÛŒØ§Ù¾ÛŒÙ Ù†Ø§Ù…ÙˆÙÙ‚ØŒ Ø¯ÛŒÚ¯Ø± Ø®ÙˆØ¯Ú©Ø§Ø± Ø´Ø±ÙˆØ¹ Ù†Ù…ÛŒâ€ŒÚ©Ù†ÛŒÙ… ØªØ§
 * Ø¹Ù„Øª Ø³ÛŒØ³ØªÙ…ÛŒ Ø¨Ø±Ø±Ø³ÛŒ Ø´ÙˆØ¯. Ø¨Ø§ Ø³ÛŒØ§Ø³Øª Ø§Ø±Ø¬Ø§Ø¹ Ø¨Ø§Ø²Ø¨ÛŒÙ† Ú¯Ø²Ø§Ø±Ø´ (Û³ Ù†Ø§Ù…ÙˆÙÙ‚ÛŒ Ù¾ÛŒØ§Ù¾ÛŒ) Ù‡Ù…â€ŒØ®ÙˆØ§Ù† Ø§Ø³Øª.
 */
const MAX_CONSECUTIVE_CYCLE_FAILURES = 3;

/**
 * Ø¬Ø§Ø±ÙˆÛŒ Ù¾Ú†â€ŒÙ‡Ø§ÛŒ ÛŒØªÛŒÙ… Ù¾Ù„ Ø¨Ù‡ Ù…Ø§Ú˜ÙˆÙ„ Ù…Ø´ØªØ±Ú© lib/bridge/sweep.ts Ù…Ù†ØªÙ‚Ù„ Ø´Ø¯ ØªØ§
 * ÙˆØ±Ú©â€ŒÙÙ„Ùˆ Ø§Ø®ØªØµØ§ØµÛŒ bridge-sweep Ù‡Ù… Ø§Ø² Ù‡Ù…Ø§Ù† Ù…Ù†Ø·Ù‚ Ø§Ø³ØªÙØ§Ø¯Ù‡ Ú©Ù†Ø¯.
 * ØµØ¯Ø§ Ø²Ø¯Ù†: await sweepOrphanedBridgePatches();
 */

/**
 * Ø´Ø±ÙˆØ¹ Ø®ÙˆØ¯Ú©Ø§Ø± Ú†Ø±Ø®Ù‡â€ŒÛŒ Ø¨Ø¹Ø¯ÛŒØŒ ÙˆÙ‚ØªÛŒ Ú†Ø±Ø®Ù‡â€ŒÛŒ ÙØ¹Ø§Ù„ÛŒ Ù†ÛŒØ³Øª.
 * Ø§Ú¯Ø± Ø¢Ø®Ø±ÛŒÙ† Ú†Ø±Ø®Ù‡ Ø¨Ø§ success Ø¨Ø³ØªÙ‡ Ø´Ø¯Ù‡ Ùˆ ØªÙ†Ø¸ÛŒÙ… auto_start_next_cycle Ù…Ø®Ø§Ù„Ù
 * ØµØ±ÛŒØ­ (false) Ù†ÛŒØ³ØªØŒ Ø®ÙˆØ¯Ú©Ø§Ø± beginCycle Ù…ÛŒâ€ŒØ²Ù†Ø¯ ØªØ§ Ø³ÛŒØ³ØªÙ… ØªØ§ Ø¯Ø®Ø§Ù„Øª Ø¯Ø³ØªÛŒ Ù†Ø®ÙˆØ§Ø¨Ø¯.
 * (Ø¯Ø³ØªÙˆØ± Ù…Ø³Ø¹ÙˆØ¯: Ø³Ø§ÛŒØª Ú©Ø§Ù…Ù„Ø§Ù‹ Ø®ÙˆØ¯Ú©Ø§Ø± Ø¨Ø§Ø´Ø¯.)
 * Ø§Ú¯Ø± Ø¢Ø®Ø±ÛŒÙ† Ú†Ø±Ø®Ù‡ failed Ø¨ÙˆØ¯ Ù‡Ù… Ú†Ø±Ø®Ù‡â€ŒÛŒ ØªØ§Ø²Ù‡ Ù…ÛŒâ€ŒØ³Ø§Ø²Ø¯ â€” Ù¾Ø§Ø±Ú© Ù†Ù…ÛŒâ€ŒØ´ÙˆØ¯
 * (Ø¯Ø³ØªÙˆØ± Ù…Ø³Ø¹ÙˆØ¯ØŒ Û²Ûµ Ù…Ù‡Ø± Û±Û´Û°Ûµ)Ø› Ø§Ø³ØªØ«Ù†Ø§: Ø§Ú¯Ø± Ø®Ø±Ø§Ø¨ÛŒâ€ŒÙ‡Ø§ÛŒ Ù¾ÛŒØ§Ù¾ÛŒ Ø¨Ù‡ Ø³Ù‚Ù
 * MAX_CONSECUTIVE_CYCLE_FAILURES Ø±Ø³ÛŒØ¯ØŒ Ø´Ø±ÙˆØ¹ Ø®ÙˆØ¯Ú©Ø§Ø± Ù…ØªÙˆÙ‚Ù Ù…ÛŒâ€ŒØ´ÙˆØ¯ ØªØ§ Ø¹Ù„Øª
 * Ø³ÛŒØ³ØªÙ…ÛŒ Ø¨Ø±Ø±Ø³ÛŒ Ø´ÙˆØ¯ (Ø¬Ù„ÙˆÚ¯ÛŒØ±ÛŒ Ø§Ø² Ø­Ù„Ù‚Ù‡â€ŒÛŒ Ø¨ÛŒâ€ŒÙ¾Ø§ÛŒØ§Ù† Ú†Ø±Ø®Ù‡â€ŒÙ‡Ø§ÛŒ Ù†Ø§Ù…ÙˆÙÙ‚).
 * Ú†Ø±Ø®Ù‡â€ŒØ§ÛŒ Ú©Ù‡ Ø¨Ø§ kill Ù…Ø±Ø¯Ù‡ Ùˆ Ø¨Ø§Ø²ÛŒØ§Ø¨ÛŒ Ø´Ø¯Ù‡ (KILLED) Ù‡Ù… Ø®ÙˆØ¯Ú©Ø§Ø± Ø¨Ø§ Ú†Ø±Ø®Ù‡â€ŒØ§ÛŒ
 * ØªÙ…ÛŒØ² Ø§Ø¯Ø§Ù…Ù‡ Ù…ÛŒâ€ŒÛŒØ§Ø¨Ø¯ØŒ Ú†ÙˆÙ† kill Ø±ÙˆÛŒØ¯Ø§Ø¯ Ø²ÛŒØ±Ø³Ø§Ø®ØªÛŒ Ø§Ø³Øª Ù†Ù‡ Ø³ÛŒÚ¯Ù†Ø§Ù„ Ú©ÛŒÙÛŒ.
 * ÙˆØ¶Ø¹ÛŒØªâ€ŒÙ‡Ø§ÛŒ stopped/paused/pausing (ØªÙˆÙ‚Ù Ø¯Ø³ØªÛŒ/Ú©Ø§Ø±Ø¨Ø±ÛŒ) Ø®ÙˆØ¯Ú©Ø§Ø± Ø´Ø±ÙˆØ¹ Ù†Ù…ÛŒâ€ŒØ´ÙˆÙ†Ø¯.
 * Ø§Ú¯Ø± Ø§ØµÙ„Ø§Ù‹ Ú†Ø±Ø®Ù‡â€ŒØ§ÛŒ Ù†Ø¨ÙˆØ¯ Ù‡Ù… Ù‡ÛŒÚ†â€ŒÚ†ÛŒØ² Ù†Ù…ÛŒâ€ŒØ³Ø§Ø²Ø¯Ø› Ø´Ø±ÙˆØ¹ Ø§ÙˆÙ„ Ø¯Ø³ØªÛŒ Ø§Ø³Øª.
 */
async function autoStartNextCycleIfNeeded(): Promise<{ cycleId: string; runId: string } | null> {
  const autoStart = await getSetting<boolean>(AUTO_START_SETTING_KEY, true);
  if (autoStart === false) {
    console.log('auto-start disabled by setting auto_start_next_cycle=false');
    return null;
  }
  const sb = getSupabase();
  const { data, error } = await sb
    .from('cycles')
    .select('id, status, error')
    .order('started_at', { ascending: false })
    .limit(MAX_CONSECUTIVE_CYCLE_FAILURES);
  if (error || !data || data.length === 0) {
    console.log('no previous cycle; waiting for manual start');
    return null;
  }
  const last = data[0] as { id: string; status: string; error?: string | null };

  // (Û²Ûµ Ù…Ù‡Ø± Û±Û´Û°ÛµØŒ Ø¯Ø³ØªÙˆØ± Ù…Ø³Ø¹ÙˆØ¯): Ú†Ø±Ø®Ù‡â€ŒÛŒ Ù†Ø§Ù…ÙˆÙÙ‚ Ù‡Ù… Ø®ÙˆØ¯Ú©Ø§Ø± Ø§Ø¯Ø§Ù…Ù‡ Ù…ÛŒâ€ŒÛŒØ§Ø¨Ø¯ â€”
  // Ø¯ÛŒÚ¯Ø± Ù¾Ø§Ø±Ú© Ù†Ù…ÛŒâ€ŒØ´ÙˆØ¯. ÙÙ‚Ø· Ø§Ú¯Ø± Ø®Ø±Ø§Ø¨ÛŒâ€ŒÙ‡Ø§ÛŒ Ù¾ÛŒØ§Ù¾ÛŒ Ø¨Ù‡ Ø³Ù‚Ù Ø±Ø³ÛŒØ¯ØŒ Ù…ØªÙˆÙ‚Ù Ù…ÛŒâ€ŒÙ…Ø§Ù†ÛŒÙ….
  if (last.status === 'failed') {
    let streak = 0;
    for (const c of data as Array<{ status: string }>) {
      if (c.status === 'failed') streak++;
      else break;
    }
    if (streak >= MAX_CONSECUTIVE_CYCLE_FAILURES) {
      console.log(
        `last ${streak} cycles failed consecutively; not auto-starting (needs attention)`,
      );
      return null;
    }
    console.log(
      `last cycle ${last.id} failed (streak ${streak}/${MAX_CONSECUTIVE_CYCLE_FAILURES}); auto-starting a new cycle`,
    );
  } else if (last.status !== 'success' && !isAutoRestartableAfterKill(last)) {
    console.log(`last cycle ${last.id} ended with '${last.status}'; not auto-starting (needs attention)`);
    return null;
  } else if (isAutoRestartableAfterKill(last)) {
    console.log(`last cycle ${last.id} was killed and recovered; auto-starting a clean cycle`);
  }
  const { cycleId, runId } = await beginCycle();
  console.log(`auto-started next cycle: ${runId} (${cycleId})`);
  return { cycleId, runId };
}

/**
 * Ø¶Ø±Ø¨Ø§Ù† Ù‚ÙÙ„ Ú†Ø±Ø®Ù‡ Ø¯Ø± Ù‡Ø± ØªÛŒÚ© ÙˆØ±Ú©Ø± (Ù‚ÙÙ„ Ø¬Ø¯ÛŒØ¯ lib/lock.ts Ø¨Ø§ TTL Ø¯Ù‡â€ŒØ¯Ù‚ÛŒÙ‚Ù‡â€ŒØ§ÛŒ).
 *
 * Ú†Ø±Ø§ Ù„Ø§Ø²Ù… Ø§Ø³ØªØŸ beginCycle Ù‚ÙÙ„ Ø±Ø§ Ø¨Ø§ owner Ù…ÛŒâ€ŒÚ¯ÛŒØ±Ø¯Ø› Ø§Ú¯Ø± Ù‡ÛŒÚ†â€ŒÚ©Ø³ heartbeat
 * Ù†Ø²Ù†Ø¯ØŒ Ù‚ÙÙ„ Ù¾Ø³ Ø§Ø² Û±Û° Ø¯Ù‚ÛŒÙ‚Ù‡ stale Ù…ÛŒâ€ŒØ´ÙˆØ¯ Ùˆ beginCycle Ø¯ÛŒÚ¯Ø±ÛŒ Ù…ÛŒâ€ŒØªÙˆØ§Ù†Ø¯ ÙˆØ³Ø·
 * Ù‡Ù…ÛŒÙ† Ú†Ø±Ø®Ù‡ Ù‚ÙÙ„ Ø±Ø§ ØªØµØ§Ø­Ø¨ Ú©Ù†Ø¯. ÙˆØ±Ú©Ø± Ù‡Ø± Ûµ Ø¯Ù‚ÛŒÙ‚Ù‡ ØªÛŒÚ© Ù…ÛŒâ€ŒØ²Ù†Ø¯ØŒ Ù¾Ø³ Ø¨Ø§ Ø§ÛŒÙ† Ø¶Ø±Ø¨Ø§Ù†
 * Ù‚ÙÙ„Ù Ú†Ø±Ø®Ù‡â€ŒÛŒ ÙØ¹Ø§Ù„ Ù‡Ù…ÛŒØ´Ù‡ ØªØ§Ø²Ù‡ Ù…ÛŒâ€ŒÙ…Ø§Ù†Ø¯.
 *
 * engine-agnostic Ø§Ø³Øª: Ù‡ÙˆÛŒØª Ø¯Ø§Ø±Ù†Ø¯Ù‡ Ø±Ø§ Ø§Ø² Ø®ÙˆØ¯ Ø±Ø¯ÛŒÙ Ù‚ÙÙ„ Ù…ÛŒâ€ŒØ®ÙˆØ§Ù†Ø¯ (Ú†Ø±Ø®Ù‡ Ù…Ù…Ú©Ù†
 * Ø§Ø³Øª Ø§Ø² ÙˆØ±Ø³Ù„ Ø´Ø±ÙˆØ¹ Ø´Ø¯Ù‡ Ø¨Ø§Ø´Ø¯ Ùˆ ÙˆØ±Ú©Ø± Ú¯ÛŒØªâ€ŒÙ‡Ø§Ø¨ Ø¢Ù† Ø±Ø§ Ø§Ø¯Ø§Ù…Ù‡ Ø¯Ù‡Ø¯). Ø§Ú¯Ø± Ù‚ÙÙ„ Ù…Ø§Ù„
 * Ú†Ø±Ø®Ù‡â€ŒÛŒ Ø¯ÛŒÚ¯Ø±ÛŒ Ø¨Ø§Ø´Ø¯ ÛŒØ§ Ø¯ÛŒÚ¯Ø± Ø¯Ø³Øª Ù…Ø§ Ù†Ø¨Ø§Ø´Ø¯ØŒ Ú†ÛŒØ²ÛŒ Ù†Ù…ÛŒâ€ŒÙ†ÙˆÛŒØ³Ø¯ (fail-soft).
 */
async function heartbeatCycleLock(cycleId: string): Promise<void> {
  try {
    const lock = await readLock();
    const st = lock?.state;
    if (!st || st.status !== 'running' || !st.owner) return;
    if (st.cycleId && st.cycleId !== cycleId) return; // Ù…Ø§Ù„ Ú†Ø±Ø®Ù‡â€ŒÛŒ Ø¯ÛŒÚ¯Ø±ÛŒ Ø§Ø³Øª
    await touchLock(st.owner);
  } catch (err) {
    // Ù‚ÙÙ„ Ø±Ø§ Ø§Ø² Ø¯Ø³Øª Ø¯Ø§Ø¯Ù‡â€ŒØ§ÛŒÙ… ÛŒØ§ Ø®Ø·Ø§ÛŒ Ø¯ÛŒØªØ§Ø¨ÛŒØ³Ø› ØªÛŒÚ© Ø§Ø¯Ø§Ù…Ù‡ Ù…ÛŒâ€ŒÛŒØ§Ø¨Ø¯
    console.error('[worker] cycle lock heartbeat failed:', err instanceof Error ? err.message : err);
  }
}

async function main(): Promise<void> {
  const sb = getSupabase();
  const action = process.argv[2];

  // Ø±ÙØ¹ Ø±ÛŒØ´Ù‡â€ŒØ§ÛŒ Ù…Ø´Ú©Ù„ kill (Ù…Ø´Ú©Ù„ Û¶): Ø¯Ø± Ø´Ø±ÙˆØ¹ Ù‡Ø± ØªÛŒÚ©ØŒ Ø§ÙˆÙ„ Ø¨Ù‚Ø§ÛŒØ§ÛŒ Ú†Ø±Ø®Ù‡ Ù…Ø±Ø¯Ù‡
  // (Ù‚ÙÙ„ staleØŒ ØªØ³Ú©â€ŒÙ‡Ø§ÛŒ claimØ´Ø¯Ù‡ Ø±Ù‡Ø§ØŒ ÙˆØ¶Ø¹ÛŒØªâ€ŒÙ‡Ø§ÛŒ Ù†Ø§ØªÙ…Ø§Ù…ØŒ Ù¾Ú†â€ŒÙ‡Ø§ÛŒ gated ÛŒØªÛŒÙ…)
  // Ø¨Ø§Ø²ÛŒØ§Ø¨ÛŒ Ù…ÛŒâ€ŒØ´ÙˆØ¯Ø› Ø¨Ø¹Ø¯ ØªØµÙ…ÛŒÙ…â€ŒÚ¯ÛŒØ±ÛŒ Ø¹Ø§Ø¯ÛŒ. fail-soft Ø§Ø³Øª.
  try {
    await recoverDeadCycles();
  } catch (err) {
    console.error('[worker] cycle recovery at tick start failed (continuing):', err instanceof Error ? err.message : err);
  }

  // Ø³Ø§Ø®Øª Ú†Ø±Ø®Ù‡ Ø¬Ø¯ÛŒØ¯
  if (action === 'start-cycle') {
    const active = await findActiveCycle();
    if (active) {
      console.log(`active cycle exists: ${active.run_id}, skipping`);
      return;
    }
    const { cycleId, runId } = await beginCycle();
    console.log(`new cycle started: ${runId} (${cycleId})`);
    return;
  }

  // Ø§Ø¨ØªØ¯Ø§ÛŒ ØªÛŒÚ©: Ø®ÙˆØ§Ù†Ø¯Ù† ÙˆØ¶Ø¹ÛŒØª Ú†Ø±Ø®Ù‡â€ŒÛŒ ÙØ¹Ø§Ù„. Ø§Ú¯Ø± ØªÙˆÙ‚Ù Ø®ÙˆØ§Ø³ØªÙ‡ Ø´Ø¯Ù‡ Ø¨ÙˆØ¯
  // (pausing/paused)ØŒ Ù‡ÛŒÚ† ØªÛŒÙ…ÛŒ claim Ù†Ù…ÛŒâ€ŒÚ©Ù†ÛŒÙ… Ùˆ Ø¨ÛŒâ€ŒØµØ¯Ø§ Ø®Ø§Ø±Ø¬ Ù…ÛŒâ€ŒØ´ÙˆÛŒÙ… â€”
  // ÙˆØ±Ú©Ø± Ù‡Ø±Ú¯Ø² Ù†Ø¨Ø§ÛŒØ¯ Ø¨Ø¹Ø¯ Ø§Ø² Â«ØªÙˆÙ‚ÙÂ» Ú©Ø§Ø±Ø¨Ø±ØŒ ØªÛŒÙ… Ø¨Ø¹Ø¯ÛŒ Ø±Ø§ Ø´Ø±ÙˆØ¹ Ú©Ù†Ø¯.
  // Ø§Ú¯Ø± Ú†Ø±Ø®Ù‡â€ŒÛŒ ÙØ¹Ø§Ù„ÛŒ Ù†ÛŒØ³ØªØŒ Ø·Ø¨Ù‚ Ù‚Ø§Ù†ÙˆÙ† Ø´Ø±ÙˆØ¹ Ø®ÙˆØ¯Ú©Ø§Ø±ØŒ Ú†Ø±Ø®Ù‡â€ŒÛŒ Ø¨Ø¹Ø¯ÛŒ Ø±Ø§ Ù…ÛŒâ€ŒØ³Ø§Ø²ÛŒÙ….
  let cycleId: string;
  let runId: string;
  {
    const active = await findActiveCycle();
    if (!active) {
      const auto = await autoStartNextCycleIfNeeded();
      if (!auto) {
        console.log('no active cycle');
        return;
      }
      cycleId = auto.cycleId;
      runId = auto.runId;
      await heartbeatCycleLock(cycleId);
    } else {
      // Ú†Ø±Ø®Ù‡â€ŒÛŒ Ù…ØªÙˆÙ‚Ùâ€ŒØ´Ø¯Ù‡ Ù‡Ù… Ù‚ÙÙ„Ø´ Ø±Ø§ Ù†Ú¯Ù‡ Ù…ÛŒâ€ŒØ¯Ø§Ø±Ø¯ ØªØ§ Ú†Ø±Ø®Ù‡â€ŒÛŒ Ø¯ÛŒÚ¯Ø±ÛŒ ÙˆØ³Ø·
      // ØªÙˆÙ‚ÙØŒ Ù‚ÙÙ„ stale Ø±Ø§ ØªØµØ§Ø­Ø¨ Ù†Ú©Ù†Ø¯Ø› Ù¾Ø³ Ø¶Ø±Ø¨Ø§Ù† Ù¾ÛŒØ´ Ø§Ø² Ø¨Ø±Ø±Ø³ÛŒ pause.
      await heartbeatCycleLock(active.id as string);
      if (active.status === 'pausing' || active.status === 'paused') {
        console.log(`cycle ${active.run_id} is ${active.status}; skipping team claim`);
        return;
      }
      cycleId = active.id as string;
      runId = (active.run_id as string) ?? 'worker';
    }
  }

  // ÙˆØ¶Ø¹ÛŒØª ØªÛŒÙ…â€ŒÙ‡Ø§ (Ù…Ø±ØªØ¨â€ŒØ³Ø§Ø²ÛŒ ØµØ¹ÙˆØ¯ÛŒ ØªØ§ Ø¢Ø®Ø±ÛŒÙ† Ø±Ø¯ÛŒÙ Ù‡Ø± ØªÛŒÙ…ØŒ Ø¬Ø¯ÛŒØ¯ØªØ±ÛŒÙ† ÙˆØ¶Ø¹ÛŒØª Ø¨Ø§Ø´Ø¯).
  // Ø­Ù„Ù‚Ù‡Ù” Ø§ØµÙ„Ø§Ø­ Ø¯Ø±ÙˆÙ†â€ŒÚ†Ø±Ø®Ù‡â€ŒØ§ÛŒ (Ø¯Ø³ØªÙˆØ± Ù…Ø³Ø¹ÙˆØ¯ØŒ Û±Û´Û°Ûµ/Û°Û·/Û²Û¶): Ø¨Ø±Ø§ÛŒ Ù‡Ø± ØªÛŒÙ… Ù‡Ù…
  // Â«Ø¢Ø®Ø±ÛŒÙ† ÙˆØ¶Ø¹ÛŒØªÂ» Ùˆ Ù‡Ù… Â«ØªØ¹Ø¯Ø§Ø¯ ØªÙ„Ø§Ø´â€ŒÙ‡Ø§ Ø¯Ø± Ù‡Ù…ÛŒÙ† Ú†Ø±Ø®Ù‡Â» Ø±Ø§ Ù†Ú¯Ù‡ Ù…ÛŒâ€ŒØ¯Ø§Ø±ÛŒÙ…Ø› ØªÛŒÙ…Ù
  // Ø±Ø¯Ø´Ø¯Ù‡/Ù†Ø§Ù…ÙˆÙÙ‚ ØªØ§ Ø³Ù‚Ù MAX_SAME_CYCLE_FIX_ATTEMPTS Ø¯ÙˆØ¨Ø§Ø±Ù‡ Ø§Ø¬Ø±Ø§ Ù…ÛŒâ€ŒØ´ÙˆØ¯ Ùˆ
  // Ú©Ø§Ø±Ø´ Ø¨Ù‡ Ú†Ø±Ø®Ù‡Ù” Ø¨Ø¹Ø¯ Ù…ÙˆÚ©ÙˆÙ„ Ù†Ù…ÛŒâ€ŒØ´ÙˆØ¯. review_rounds Ø¨Ø±Ø§ÛŒ Ø§Ø³ØªØ®Ø±Ø§Ø¬ Ø¯Ø³ØªÙˆØ±
  // Ø§ØµÙ„Ø§Ø­Ù Ø±Ø¯ Ù‚Ø¨Ù„ÛŒ Ø®ÙˆØ§Ù†Ø¯Ù‡ Ù…ÛŒâ€ŒØ´ÙˆØ¯.
  const { data: runs } = await sb
    .from('team_runs')
    .select('team, status, started_at, updated_at, current_task, review_rounds, error')
    .eq('cycle_id', cycleId)
    .order('started_at', { ascending: true });
  const teamStatus: Record<string, string> = {};
  const teamAttempts: Record<string, number> = {};
  const teamLastRun: Record<string, { review_rounds: unknown; error: string | null }> = {};
  for (const r of (runs ?? []) as Array<{
    team: string;
    status: string;
    review_rounds?: unknown;
    error?: string | null;
  }>) {
    teamStatus[r.team] = r.status;
    teamAttempts[r.team] = (teamAttempts[r.team] ?? 0) + 1;
    teamLastRun[r.team] = { review_rounds: r.review_rounds ?? null, error: r.error ?? null };
  }

  // Ø¬Ø§Ø±ÙˆÛŒ ØªÛŒÙ…â€ŒÙ‡Ø§ÛŒ Ú¯ÛŒØ±Ú©Ø±Ø¯Ù‡ (Ø¯Ùˆ Ø³ÛŒÚ¯Ù†Ø§Ù„ Ø¬Ø¯Ø§: Ø¶Ø±Ø¨Ø§Ù† Ø¯Ø± Ø¨Ø±Ø§Ø¨Ø± Ù¾ÛŒØ´Ø±ÙØª).
  //  - ÙØ±Ø§ÛŒÙ†Ø¯Ù Ø¨ÛŒâ€ŒØ¶Ø±Ø¨Ø§Ù†Ù Ø¨ÛŒØ´ Ø§Ø² Û±Ûµ Ø¯Ù‚ÛŒÙ‚Ù‡ â†’ Â«Ù…Ø±Ø¯Ù‡Â»ØŒ Ù†Ø§Ù…ÙˆÙÙ‚ Ø«Ø¨Øª Ù…ÛŒâ€ŒØ´ÙˆØ¯Ø›
  //  - Ø¶Ø±Ø¨Ø§Ù†Ù Ø²Ù†Ø¯Ù‡ ÙˆÙ„ÛŒ Ø¨ÛŒâ€ŒÙ¾ÛŒØ´Ø±ÙØªÙ Ø¨ÛŒØ´ Ø§Ø² Û±Ûµ Ø¯Ù‚ÛŒÙ‚Ù‡ â†’ Â«Ù‡Ù†Ú¯Â»ØŒ Ù†Ø§Ù…ÙˆÙÙ‚ Ø«Ø¨Øª Ù…ÛŒâ€ŒØ´ÙˆØ¯
  //    ØªØ§ Ù…ÙˆØ¬ Ø¬Ù„Ùˆ Ø¨Ø±ÙˆØ¯ (Ø±ÛŒâ€ŒØ§Ø³ØªØ§Ø±Øª Ú†Ø±Ø®Ù‡). ÙˆØ§Ú†â€ŒØ¯Ø§Ú¯ Ø¬Ø¯Ø§Ú¯Ø§Ù†Ù‡ Ù‡Ø´Ø¯Ø§Ø± Ù…ÛŒâ€ŒÙØ±Ø³ØªØ¯.
  // Ù†Ú©ØªÙ‡â€ŒÛŒ Ø±ÛŒØ´Ù‡â€ŒØ§ÛŒ: Ù…Ø¨Ù†Ø§ÛŒ Â«Ù¾ÛŒØ´Ø±ÙØªÂ» Ø³ØªÙˆÙ† updated_at Ø§Ø³Øª Ú©Ù‡ Ù¾Ø³ Ø§Ø² Ø¬Ø¯Ø§Ø³Ø§Ø²ÛŒØŒ
  // Ø¶Ø±Ø¨Ø§Ù† Ø¯ÛŒÚ¯Ø± Ø¢Ù† Ø±Ø§ ØªØ§Ø²Ù‡ Ù†Ù…ÛŒâ€ŒÚ©Ù†Ø¯Ø› Ù¾Ø³ ØªÛŒÙ…Ù Ù‡Ù†Ú¯Ù Ø¶Ø±Ø¨Ø§Ù†â€ŒØ²Ù† Ø¯ÛŒÚ¯Ø± Â«Ø³Ø§Ù„Ù…Â» Ø¯ÛŒØ¯Ù‡ Ù†Ù…ÛŒâ€ŒØ´ÙˆØ¯.
  const hung = await sweepHungTeams(sb, cycleId);
  for (const h of hung) {
    teamStatus[h.team] = 'failed';
    // Ø¬Ø§Ø±Ùˆ Ø±Ø¯ÛŒÙ Ù…ÙˆØ¬ÙˆØ¯ Ø±Ø§ Ø¨Ù‡â€ŒØ±ÙˆØ² Ù…ÛŒâ€ŒÚ©Ù†Ø¯ (Ø±Ø¯ÛŒÙ ØªØ§Ø²Ù‡ Ù†Ù…ÛŒâ€ŒØ³Ø§Ø²Ø¯)Ø› Ù¾Ø³ Ø´Ù…Ø§Ø±Ø´
    // ØªÙ„Ø§Ø´â€ŒÙ‡Ø§ Ù‡Ù…Ø§Ù† Ù…ÛŒâ€ŒÙ…Ø§Ù†Ø¯ Ùˆ ÙÙ‚Ø· ÙˆØ¶Ø¹ÛŒØª Ø¢Ø®Ø±ÛŒÙ† Ø§Ø¬Ø±Ø§ Ø¹ÙˆØ¶ Ù…ÛŒâ€ŒØ´ÙˆØ¯.
    teamLastRun[h.team] = { review_rounds: teamLastRun[h.team]?.review_rounds ?? null, error: null };
  }

  /**
   * Ø­Ù„Ù‚Ù‡Ù” Ø§ØµÙ„Ø§Ø­ Ø¯Ø±ÙˆÙ†â€ŒÚ†Ø±Ø®Ù‡â€ŒØ§ÛŒ (Ø¯Ø³ØªÙˆØ± Ù…Ø³Ø¹ÙˆØ¯ØŒ Û±Û´Û°Ûµ/Û°Û·/Û²Û¶):
   * - success/stopped/skipped â†’ ØªÙ…Ø§Ù…â€ŒØ´Ø¯Ù‡.
   * - rejected/failed â†’ ÙÙ‚Ø· ÙˆÙ‚ØªÛŒ ØªÙ…Ø§Ù…â€ŒØ´Ø¯Ù‡ Ú©Ù‡ Ø³Ù‚Ù ØªÙ„Ø§Ø´ Ø§ØµÙ„Ø§Ø­ Ø¯Ø± Ù‡Ù…ÛŒÙ† Ú†Ø±Ø®Ù‡
   *   Ø®ÙˆØ±Ø¯Ù‡ Ø¨Ø§Ø´Ø¯Ø› Ø¯Ø± ØºÛŒØ± Ø§ÛŒÙ† ØµÙˆØ±Øª ØªÛŒÙ… Ø¯Ø± ØªÛŒÚ©â€ŒÙ‡Ø§ÛŒ Ø¨Ø¹Ø¯ÛŒÙ Ù‡Ù…ÛŒÙ† Ú†Ø±Ø®Ù‡ Ø¯ÙˆØ¨Ø§Ø±Ù‡
   *   Ø§Ø¬Ø±Ø§ Ù…ÛŒâ€ŒØ´ÙˆØ¯ (Ù…ÙˆØ¬ Ø¬Ù„Ùˆ Ù†Ù…ÛŒâ€ŒØ±ÙˆØ¯ ØªØ§ ØªÛŒÙ… ÛŒØ§ Ù…ÙˆÙÙ‚ Ø´ÙˆØ¯ ÛŒØ§ Â«Ù…Ø³Ø¯ÙˆØ¯Â» Ø´ÙˆØ¯).
   * - pending/running â†’ ØªÙ…Ø§Ù…â€ŒÙ†Ø´Ø¯Ù‡.
   */
  const isDone = (t: string): boolean => {
    const s = teamStatus[t] ?? 'pending';
    if (s === 'success' || s === 'stopped' || s === 'skipped') return true;
    if (s === 'rejected' || s === 'failed') {
      return (teamAttempts[t] ?? 0) >= MAX_SAME_CYCLE_FIX_ATTEMPTS;
    }
    return false;
  };

  /**
   * Ø§Ø³ØªØ®Ø±Ø§Ø¬ Ø¯Ø³ØªÙˆØ± Ø§ØµÙ„Ø§Ø­ Ø§Ø² Ø¢Ø®Ø±ÛŒÙ† Ø§Ø¬Ø±Ø§ÛŒ Ø±Ø¯Ø´Ø¯Ù‡/Ù†Ø§Ù…ÙˆÙÙ‚ ØªÛŒÙ… Ø¯Ø± Ù‡Ù…ÛŒÙ† Ú†Ø±Ø®Ù‡:
   * Ø§Ø² review_rounds Ø¢Ø®Ø±ÛŒÙ† directive Ø±Ø¯Ø´Ø¯Ù‡ØŒ Ùˆ Ø¨Ø±Ø§ÛŒ Ø®Ø·Ø§ (failed) Ø§Ø² Ù¾ÛŒØ§Ù…
   * Ø®Ø·Ø§ ÛŒÚ© Ø¯Ø³ØªÙˆØ± ØªØ±Ù…ÛŒÙ…ÛŒ Ø³Ù†ØªØ² Ù…ÛŒâ€ŒØ´ÙˆØ¯. Ø®Ø±ÙˆØ¬ÛŒ Ø¯Ø± ØªÙ„Ø§Ø´ Ø§ØµÙ„Ø§Ø­ Ø¨Ø¹Ø¯ÛŒ Ø¨Ù‡â€ŒØ¹Ù†ÙˆØ§Ù†
   * Â«Ø¯Ø³ØªÙˆØ± Ø±Ù‡Ø¨Ø±Â» ØªØ²Ø±ÛŒÙ‚ Ù…ÛŒâ€ŒØ´ÙˆØ¯ ØªØ§ ØªÛŒÙ… Ù‡Ù…Ø§Ù† Ø§ÛŒØ±Ø§Ø¯ Ø±Ø§ Ø¨Ú¯ÛŒØ±Ø¯.
   */
  const extractPriorFixDirective = (team: string): { directive?: string; reason?: string } => {
    const last = teamLastRun[team];
    if (!last) return {};
    const rounds = last.review_rounds;
    if (Array.isArray(rounds)) {
      for (let i = rounds.length - 1; i >= 0; i--) {
        const rd = rounds[i] as { approved?: boolean; reason?: unknown; directive?: unknown } | null;
        if (rd && typeof rd === 'object' && rd.approved === false) {
          const directive = String(rd.directive ?? '').trim();
          const reason = String(rd.reason ?? '').trim();
          if (directive) {
            return { directive: directive.slice(0, 2000), reason: reason.slice(0, 500) || undefined };
          }
          // C2 ÙÛŒÚ©Ø³: Ø§Ú¯Ø± directive Ù†Ø¨ÙˆØ¯ ÙˆÙ„ÛŒ reason Ø¨ÙˆØ¯ØŒ Ø§Ø² reason Ø¯Ø³ØªÙˆØ± Ø¨Ø³Ø§Ø² ØªØ§ ØªÙ„Ø§Ø´ Ø¨Ø¹Ø¯ÛŒ Ú©ÙˆØ± Ù†Ø¨Ø§Ø´Ø¯
          if (reason) {
            return {
              reason: reason.slice(0, 500),
              directive: `Ø¯ÙˆØ± Ù‚Ø¨Ù„ÛŒâ€ŒØ§Øª Ø¯Ø± Ù‡Ù…ÛŒÙ† Ú†Ø±Ø®Ù‡ Ø±Ø¯ Ø´Ø¯. Ø¯Ù„ÛŒÙ„: ${reason.slice(0, 800)}. Ø¯Ù‚ÛŒÙ‚Ø§Ù‹ Ù‡Ù…ÛŒÙ† Ø§ÛŒØ±Ø§Ø¯ Ø±Ø§ Ø¨Ø±Ø·Ø±Ù Ú©Ù† Ùˆ Ø®Ø±ÙˆØ¬ÛŒ Ú©Ø§Ù…Ù„ Ùˆ Ø¯Ø±Ø³Øª Ø±Ø§ Ø§Ø² Ù†Ùˆ ØªÙˆÙ„ÛŒØ¯ Ú©Ù†.`,
            };
          }
        }
      }
    }
    if (last.error) {
      const errText = String(last.error).trim().slice(0, 1000);
      if (errText) {
        return {
          reason: errText.slice(0, 500),
          directive:
            `Ø§Ø¬Ø±Ø§ÛŒ Ù‚Ø¨Ù„ÛŒâ€ŒØ§Øª Ø¯Ø± Ù‡Ù…ÛŒÙ† Ú†Ø±Ø®Ù‡ Ø¨Ø§ Ø®Ø·Ø§ Ù…ØªÙˆÙ‚Ù Ø´Ø¯: ${errText}. ` +
            'Ø¹Ù„Øª Ø±Ø§ Ù¾ÛŒØ¯Ø§ Ùˆ Ø¨Ø±Ø·Ø±Ù Ú©Ù† Ùˆ Ú©Ø§Ø±Øª Ø±Ø§ Ú©Ø§Ù…Ù„ Ø§Ù†Ø¬Ø§Ù… Ø¨Ø¯Ù‡Ø› Ø®Ø±ÙˆØ¬ÛŒ Ù†Ø§Ù‚Øµ ÛŒØ§ Ù†ÛŒÙ…Ù‡â€ŒÚ©Ø§Ø±Ù‡ Ù‚Ø§Ø¨Ù„ Ù‚Ø¨ÙˆÙ„ Ù†ÛŒØ³Øª.',
        };
      }
    }
    return {};
  };

  // Ø§Ú¯Ø± Ù‡Ù…Ù‡ Ù…ÙˆØ¬â€ŒÙ‡Ø§ ØªÙ…Ø§Ù… Ø´Ø¯Ù†Ø¯ØŒ Ú†Ø±Ø®Ù‡ Ø±Ø§ Ø¨Ø¨Ù†Ø¯
  const allDone = WAVES.every((w) => w.teams.every((t) => isDone(t)));
  if (allDone) {
    const failed = Object.values(teamStatus).filter((s) => ['failed', 'stopped'].includes(s)).length;
    await finishCycle(cycleId, failed > 0 ? 'failed' : 'success');
    console.log(`cycle finished: ${failed > 0 ? 'failed' : 'success'}`);
    return;
  }

  // Ù…ÙˆØ¬ Ø¬Ø§Ø±ÛŒ: Ø§ÙˆÙ„ÛŒÙ† Ù…ÙˆØ¬ Ù†Ø§ØªÙ…Ø§Ù…
  const currentWaveDef = WAVES.find((w) => !w.teams.every((t) => isDone(t)));
  if (!currentWaveDef) {
    console.log('no pending wave');
    return;
  }

  // Ø§Ú¯Ø± ØªÛŒÙ…ÛŒ Ø¯Ø± Ø­Ø§Ù„ Ø§Ø¬Ø±Ø§Ø³ØªØŒ ØµØ¨Ø± Ú©Ù† (ØªÚ©â€ŒØªÛŒÙ…Ù‡ Ø¬Ù„Ùˆ Ù…ÛŒâ€ŒØ±ÙˆÛŒÙ…)
  const hasRunning = currentWaveDef.teams.some((t) => teamStatus[t] === 'running');
  if (hasRunning) {
    console.log(`wave ${currentWaveDef.wave} has a running team; waiting`);
    return;
  }

  // Ø§ÙˆÙ„ÛŒÙ† ØªÛŒÙ… Ù…Ø¹Ù„Ù‚ Ù…ÙˆØ¬ Ø¬Ø§Ø±ÛŒ Ø±Ø§ Ø§Ø¬Ø±Ø§ Ú©Ù†
  const nextTeam = currentWaveDef.teams.find((t) => !isDone(t)) as TeamName | undefined;
  if (!nextTeam) {
    console.log('no pending team in current wave');
    return;
  }

  // Ø­Ù„Ù‚Ù‡Ù” Ø§ØµÙ„Ø§Ø­ Ø¯Ø±ÙˆÙ†â€ŒÚ†Ø±Ø®Ù‡â€ŒØ§ÛŒ: Ø´Ù…Ø§Ø±Ù‡Ù” ØªÙ„Ø§Ø´ Ùˆ Ø¯Ø³ØªÙˆØ± Ø¨Ù‡â€ŒØ¬Ø§Ù…Ø§Ù†Ø¯Ù‡ Ø§Ø² Ø±Ø¯ Ù‚Ø¨Ù„ÛŒ
  const fixAttempt = (teamAttempts[nextTeam] ?? 0) + 1;
  const prior = fixAttempt > 1 ? extractPriorFixDirective(nextTeam) : {};
  console.log(`running team ${nextTeam} (wave ${currentWaveDef.wave})`);
  if (fixAttempt > 1) {
    console.log(
      `[fix-loop] team ${nextTeam}: same-cycle fix attempt ${fixAttempt}/${MAX_SAME_CYCLE_FIX_ATTEMPTS}` +
        (prior.reason ? ` (prev: ${prior.reason.slice(0, 200)})` : ''),
    );
  }

  // claim Ø§ØªÙ…ÛŒÚ© ØªÛŒÙ…: Ø§Ú¯Ø± ÙˆØ±Ú©Ø± Ø¯ÛŒÚ¯Ø±ÛŒ Ù‡Ù…â€ŒØ²Ù…Ø§Ù† Ù‡Ù…ÛŒÙ† ØªÛŒÙ… Ø±Ø§ Ø¨Ø±Ø¯Ø§Ø´ØªØŒ Ù…Ø§ Ø¹Ù‚Ø¨ Ù…ÛŒâ€ŒÙ†Ø´ÛŒÙ†ÛŒÙ…
  const owner: LockOwner = {
    engine: process.env.CYCLE_ENGINE ?? 'github-actions',
    runId: process.env.GITHUB_RUN_ID ?? `worker-${Date.now()}`,
  };
  const teamRunId = await claimTeam(cycleId, nextTeam, currentWaveDef.wave, owner);
  if (!teamRunId) {
    console.log(`team ${nextTeam} already claimed by another worker; skipping`);
    return;
  }

  // Ù†Ú©ØªÙ‡: heartbeat Ø³Ø·Ø­ ØªÛŒÙ… Ø¯Ø§Ø®Ù„ runSingleTeam Ø§Ù†Ø¬Ø§Ù… Ù…ÛŒâ€ŒØ´ÙˆØ¯ (Ø±Ø¯ÛŒÙ team_runs Ø±Ø§
  // ØªØ§Ø²Ù‡ Ù†Ú¯Ù‡ Ù…ÛŒâ€ŒØ¯Ø§Ø±Ø¯ ØªØ§ ØªØ§ÛŒÙ…â€ŒØ§ÙˆØª Ø§Ø´ØªØ¨Ø§Ù‡ Ù†Ø®ÙˆØ±Ø¯). heartbeat Ù‚ÙÙ„ Ú†Ø±Ø®Ù‡ Ù‡Ù… Ø¯Ø± Ø§Ø¨ØªØ¯Ø§ÛŒ
  // Ù‡Ù…ÛŒÙ† ØªÛŒÚ© Ø¨Ø§ heartbeatCycleLock Ø²Ø¯Ù‡ Ø´Ø¯ (Ù‚ÙÙ„ Ø¬Ø¯ÛŒØ¯ owner Ø¯Ø§Ø±Ø¯ Ùˆ touchLock
  // Ø¨Ø§ Ù‡ÙˆÛŒØª Ø¯Ø§Ø±Ù†Ø¯Ù‡â€ŒÛŒ Ø®ÙˆØ§Ù†Ø¯Ù‡â€ŒØ´Ø¯Ù‡ Ø§Ø² Ø±Ø¯ÛŒÙ Ú©Ø§Ø± Ù…ÛŒâ€ŒÚ©Ù†Ø¯).

  try {
    // Ú†Ú© Ù¾ÛŒØ´â€ŒØ¯Ø³ØªØ§Ù†Ù‡: Ù…Ø¯Ù„ ØªÛŒÙ… Ø³Ø§Ù„Ù… Ø§Ø³ØªØŸ Ø§Ú¯Ø± Ù†Ù‡ØŒ Ù‚Ø¨Ù„ Ø§Ø² Ø´Ø±ÙˆØ¹ Ø¹ÙˆØ¶Ø´ Ú©Ù†
    try {
      const { resolveTeamConfig } = await import('../lib/dashboard/llm-endpoints');
      const { postChatCompletions } = await import('../lib/dashboard/llm');
      const cfg = await resolveTeamConfig(nextTeam);
      if (cfg) {
        try {
          await postChatCompletions(cfg.baseUrl, cfg.apiKey, cfg.model, 'Ø³Ù„Ø§Ù…', {
            maxTokens: 8,
            temperature: 0,
            timeoutMs: 15000,
          });
        } catch {
          // Ù…Ø¯Ù„ Ø®Ø±Ø§Ø¨ Ø§Ø³ØªØ› ÙÙ‚Ø· Ù„Ø§Ú¯ Ù…ÛŒâ€ŒØ²Ù†ÛŒÙ…. Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ†ÛŒ Ø®ÙˆØ¯Ú©Ø§Ø± Ù…Ø¯Ù„ Ø¯Ø± Ø§ÛŒÙ† ÙˆØ±Ú©Ø±
          // Ù¾ÛŒØ§Ø¯Ù‡ Ù†Ø´Ø¯Ù‡Ø› Ù…Ø¯ÛŒØ± Ø§Ø² Ù¾Ù†Ù„ Ù…Ø¯Ù„ Ø³Ø§Ù„Ù… Ø±Ø§ Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ† Ù…ÛŒâ€ŒÚ©Ù†Ø¯.
          console.log(`proactive: team ${nextTeam} model unhealthy`);
        }
      }
    } catch { /* Ù†Ø§Ø¯ÛŒØ¯Ù‡ */ }
    await runSingleTeam(cycleId, nextTeam, currentWaveDef.wave, {
      runId,
      previousWavesOutput: {},
      fixAttempt,
      priorFixDirective: prior.directive,
    }, teamRunId);
    console.log(`team ${nextTeam} done`);
  } catch (err) {
    console.error(`team ${nextTeam} crashed:`, err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }

  // Ø¬Ø§Ø±ÙˆÛŒ Ù¾Ú†â€ŒÙ‡Ø§ÛŒ ÛŒØªÛŒÙ… Ù¾Ù„: Ù¾Ú†â€ŒÙ‡Ø§ÛŒÛŒ Ú©Ù‡ Ø¯Ø± proposed Ù…Ø§Ù†Ø¯Ù‡â€ŒØ§Ù†Ø¯
  // (Ù…Ø«Ù„Ø§Ù‹ Ø§Ø² Ù¾ÛŒØ´ Ø§Ø² Ù‚Ø§Ø¨Ù„ÛŒØª Ø®ÙˆØ¯Ú©Ø§Ø±ØŒ ÛŒØ§ Ú©Ø±Ø´ Ø¨ÛŒÙ† Ø«Ø¨Øª Ùˆ Ù¾Ø±Ø¯Ø§Ø²Ø´)
  // Ø±Ø§ Ø®ÙˆØ¯Ú©Ø§Ø± Ù¾Ø±Ø¯Ø§Ø²Ø´ Ù…ÛŒâ€ŒÚ©Ù†Ø¯. best-effortØ› Ù‡Ø±Ú¯Ø² Ú†Ø±Ø®Ù‡ Ø±Ø§ Ù…ØªÙˆÙ‚Ù Ù†Ù…ÛŒâ€ŒÚ©Ù†Ø¯.
  // Ø¹Ù…Ø¯Ø§Ù‹ Ø¨Ø¹Ø¯ Ø§Ø² ØªØµÙ…ÛŒÙ…â€ŒÚ¯ÛŒØ±ÛŒ Ùˆ Ø§Ø¬Ø±Ø§ÛŒ ØªÛŒÙ… Ø§ØµÙ„ÛŒ Ù…ÛŒâ€ŒØ¢ÛŒØ¯ ØªØ§ Ø¨ÙˆØ¯Ø¬Ù‡â€ŒÛŒ Ø¬Ø§Ø¨ Ø±Ø§ Ù†Ø®ÙˆØ±Ø¯.
  await sweepOrphanedBridgePatches();
}

main().catch((err) => {
  console.error('worker fatal:', err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});

/**
 * ورکر اختصاصی جاروی صف پل — اجرا روی گیت‌هاب اکشنز (ر.ک
 * .github/workflows/bridge-sweep.yml)، هر ۵ دقیقه.
 *
 * چرا جدا از cycle-worker؟ جاروی تهِ تیکِ ورکر چرخه با «بودجه باقی‌مانده»
 * جاب کار می‌کند؛ ولی هر مرج = تایپ‌چک پیش‌مرج روی رانر موقت (کلون تازه +
 * npm install کامل، چند دقیقه) + مرج گیت‌هاب + مرج dev به main (یک
 * تایپ‌چک کامل دیگر). با تایم‌اوت ۳۰دقیقه‌ای جاب، جارو معمولاً وسط مرج
 * kill می‌شد و پچ در committed می‌ماند تا reap بعدیِ چرخه مرده (که ممکن
 * است ساعت‌ها بعد باشد). این ورکر بودجه کامل جاب را به تخلیه صف می‌دهد.
 *
 * ترتیب هر اجرا:
 * ۱. recoverDeadCycles: پچ‌های gated/committed کهنه‌تر از ۳۰ دقیقه به
 *    proposed برمی‌گردند (حالا در هر تیک، نه فقط هنگام reap).
 * ۲. sweepOrphanedBridgePatches: حداکثر ۳ پچ proposed قدیمی‌تر → دروازه →
 *    کامیت → مرج خودکار به dev (و dev به main).
 *
 * کاملاً best-effort و idempotent: claim اتمیک proposed→gated جلوی
 * پردازش دوباره توسط ورکر چرخه را می‌گیرد؛ قفل PREMERGE_LOCK_DIR جلوی
 * تایپ‌چک موازی روی کلون مشترک را می‌گیرد.
 *
 * اجرا: npx tsx worker/bridge-sweep.ts
 * نیازمند: SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY در env
 */
import { recoverDeadCycles } from '../lib/dashboard/cycle-recovery';
import { sweepOrphanedBridgePatches } from '../lib/dashboard/bridge/sweep';
import { logger } from '../lib/logger';

process.on('unhandledRejection', (reason) => {
  logger.error(
    '[bridge-sweep] unhandledRejection:',
    undefined,
    reason instanceof Error ? (reason.stack ?? reason.message) : String(reason),
  );
});
process.on('uncaughtException', (err) => {
  logger.error(
    '[bridge-sweep] uncaughtException:',
    undefined,
    err instanceof Error ? (err.stack ?? err.message) : String(err),
  );
});

async function main(): Promise<void> {
  try {
    await recoverDeadCycles();
  } catch (err) {
    logger.error(
      '[bridge-sweep] cycle recovery failed (continuing):',
      undefined,
      err instanceof Error ? err.message : err,
    );
  }
  await sweepOrphanedBridgePatches();
  logger.info('[bridge-sweep] done');
}

main().catch((err) => {
  logger.error('[bridge-sweep] fatal:', undefined, err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});

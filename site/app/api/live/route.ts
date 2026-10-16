import { fail, getSupabase, ok } from '../../../lib/dashboard/api';
import { ACTIVE_CYCLE_STATUSES } from '../../../lib/dashboard/types';
import { fetchSubagents, fetchTeamRuns, toQueryResult } from '../../../lib/dashboard/live-data';

/**
 * GET /api/live : تصویر زنده‌ی چرخه‌ی فعال برای صفحه‌ی «عملیات زنده».
 *
 * برمی‌گرداند:
 *   cycle:          جدیدترین چرخه‌ی فعال (running/pausing/paused) یا null
 *   runs:           ردیف‌های team_runs همان چرخه (با progress/current_task/updated_at)
 *   subagents:      ساب‌ایجنت‌های (مرحله‌های) همان چرخه برای کنترل زنده
 *   liveColumns:    آیا ستون‌های زنده‌ی team_runs واقعاً خوانده شدند
 *   subagentsReady: آیا جدول subagents وجود دارد
 *
 * اگر مایگریشن‌های زنده هنوز اجرا نشده باشند، به‌جای خطا، داده‌ی پایه
 * با پرچم‌های false برمی‌گردد تا رابط «هنوز فعال نیست» صادقانه نشان بدهد.
 * اگر چرخه‌ی فعالی نباشد: جدیدترین چرخه‌ی تمام‌شده (هر وضعیتی) با پرچم
 * is_latest=true برمی‌گردد تا صفحه همیشه کارت تیم‌ها و تایم‌لاین را نشان بدهد؛
 * اگر اصلاً چرخه‌ای نباشد: { cycle: null, ... }.
 * اگر سوپابیس در دسترس نباشد: ۵۰۳ با پیام فارسی تا صفحه «متصل نیست» نشان بدهد.
 */
export async function GET(): Promise<Response> {
  let sb;
  try {
    sb = getSupabase();
  } catch {
    return fail('اتصال به دیتابیس برقرار نیست. اتصال را در بخش تنظیمات بررسی کنید.', 503);
  }

  try {
    const { data: cycle, error: cycleErr } = await sb
      .from('cycles')
      .select('id, run_id, status, started_at')
      .in('status', ACTIVE_CYCLE_STATUSES)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (cycleErr) return fail(`خطا در خواندن چرخه: ${cycleErr.message}`);

    if (!cycle) {
      // چرخه‌ی فعالی نیست؛ جدیدترین چرخه (هر وضعیتی) را برگردان تا صفحه
      // همیشه کارت تیم‌ها و دکمه‌ی تایم‌لاین را نشان بدهد.
      const { data: latest, error: latestErr } = await sb
        .from('cycles')
        .select('id, run_id, status, started_at')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestErr) return fail(`خطا در خواندن چرخه: ${latestErr.message}`);
      if (!latest) {
        return ok({ cycle: null, runs: [], subagents: [], liveColumns: true, subagentsReady: true, is_latest: false });
      }
      const latestId = (latest as { id: string }).id;
      const { data: latestRuns, liveColumns: latestLiveColumns } = await fetchTeamRuns(sb, async (cols) =>
        toQueryResult(
          await sb
            .from('team_runs')
            .select(cols)
            .eq('cycle_id', latestId)
            .order('wave', { ascending: true })
            .order('started_at', { ascending: true }),
        ),
      );
      const latestRunIds = latestRuns.map((r) => r.id as string);
      const { data: latestSubagents, tableReady: latestSubagentsReady } = await fetchSubagents(sb, latestRunIds);
      return ok({
        cycle: latest,
        runs: latestRuns,
        subagents: latestSubagents,
        liveColumns: latestLiveColumns,
        subagentsReady: latestSubagentsReady,
        is_latest: true,
      });
    }

    const cycleId = (cycle as { id: string }).id;
    const { data: runs, liveColumns } = await fetchTeamRuns(sb, async (cols) =>
      toQueryResult(
        await sb
          .from('team_runs')
          .select(cols)
          .eq('cycle_id', cycleId)
          .order('wave', { ascending: true })
          .order('started_at', { ascending: true }),
      ),
    );

    const runIds = runs.map((r) => r.id as string);
    const { data: subagents, tableReady: subagentsReady } = await fetchSubagents(sb, runIds);

    return ok({ cycle, runs, subagents, liveColumns, subagentsReady });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'خطای ناشناخته در خواندن وضعیت زنده.');
  }
}

import type { TeamName } from '@/lib/dashboard/types';
import { ok, fail } from '@/lib/dashboard/api';
import { TEAMS } from '@/lib/dashboard/types';
import { fetchTeamNews, teamHasNewsSource } from '@/lib/dashboard/knowledge-news';

/**
 * GET /api/knowledge/[team]/news: اخبار تازه‌ی حوزه‌ی یک تیم.
 *
 * پاسخ موفق:
 *   { ok, data: { team, configured, news: [{ title, url, summary }], message? } }
 * اگر برای تیم منبعی تعریف نشده باشد، news خالی و message برابر
 * «منبع خبر تنظیم نشده» برمی‌گردد. هرگز خطای داخلی نمی‌دهد (fail-soft).
 * (احراز ادمین با middleware است، مثل بقیه‌ی روت‌ها.)
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const team = (await params).id as TeamName;
  if (!TEAMS.includes(team)) {
    return fail('تیم نامعتبر است.', 404);
  }

  if (!teamHasNewsSource(team)) {
    return ok({
      team,
      configured: false,
      news: [],
      message: 'منبع خبر تنظیم نشده',
    });
  }

  const news = await fetchTeamNews(team);
  return ok({ team, configured: true, news });
}

import { NextRequest } from 'next/server';
import { fail, ok } from '../../../../lib/dashboard/api';
import { getTodayErrors } from '../../../../lib/dashboard/errors';
import { TEAMS, type TeamName } from '../../../../lib/dashboard/types';

/** GET /api/errors/history?team=<team>: تاریخچه‌ی خطاهای امروز (به وقت تهران). */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const teamParam = request.nextUrl.searchParams.get('team');
    let team: TeamName | undefined;
    if (teamParam) {
      if (!(TEAMS as string[]).includes(teamParam)) {
        return fail(`unknown team: ${teamParam}`, 400);
      }
      team = teamParam as TeamName;
    }
    const history = await getTodayErrors(team);
    return ok(history);
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}

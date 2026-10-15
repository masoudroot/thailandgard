import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/dashboard/api';
import { isValidTeam } from '@/lib/dashboard/knowledge';
import { scoreTeamKnowledge } from '@/lib/dashboard/knowledge-score';

/**
 * GET /api/knowledge/[team]/score: امتیاز دانش یک تیم.
 * خروجی: { ok, data: { score } }؛ خطا → { ok, data: { score: null } }
 * slug نامعتبر: ۴۰۰ با پیام فارسی.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const team = (await params).id;
  if (!isValidTeam(team)) {
    return fail('تیم نامعتبر است.', 400);
  }
  try {
    const { score } = await scoreTeamKnowledge(team);
    return ok({ score });
  } catch (err) {
    return ok({ score: null, error: err instanceof Error ? err.message : 'خطای ناشناخته' });
  }
}

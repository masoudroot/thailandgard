import { fail, ok } from '../../../../lib/dashboard/api';
import { getCurrentErrors } from '../../../../lib/dashboard/errors';

/** GET /api/errors/current: خطاهای جاری: جدیدترین ران ناموفق هر تیم (+ ران‌های گیرکرده). */
export async function GET(): Promise<Response> {
  try {
    const errors = await getCurrentErrors();
    return ok(errors);
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}

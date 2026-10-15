import { NextRequest } from 'next/server';
import { fail, ok } from '../../../../../lib/dashboard/api';
import { triggerTaskRun } from '../../../../../lib/dashboard/taskrunner';

/**
 * POST /api/tasks/[id]/run: «همین الان انجام شود».
 *
 * کار را (اگر pending است، با تأیید ضمنی) وارد اجرای واقعی مستقیم می‌کند:
 * 202 برمی‌گردد و ساب‌ایجنت‌ها در پس‌زمینه کار می‌کنند؛ نتیجه در build_queue
 * با وضعیت done (یا failed با دلیل) ثبت می‌شود. سوییچ parallel کار واقعاً
 * اعمال می‌شود.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    await triggerTaskRun((await params).id);
    return ok({ id: (await params).id, status: 'in_progress' }, 202);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code = /پیدا نشد|نامعتبر|قابل اجرا/.test(message) ? 409 : 500;
    return fail(message, code);
  }
}

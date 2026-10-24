import type { TaskType } from '../contracts';
import type { SeoSignal } from './radar';

export interface SeoPlanAction {
  id: string;
  type: TaskType;
  priority: number;
  subject: string;
  instruction: string;
  signalKey: string;
}

export interface SeoPlan {
  generatedAt: string;
  actions: SeoPlanAction[];
}

function actionFor(signal: SeoSignal): SeoPlanAction {
  const instruction =
    signal.type === 'query_opportunity'
      ? `نوشتن یا بازنویسی صفحه برای کوئری «${signal.subject}» با هدف ورود به سه نتیجهٔ اول.`
      : signal.type === 'striking_distance'
        ? `بهبود عنوان، متا و لینک‌سازی داخلی صفحهٔ مربوط به «${signal.subject}» برای رسیدن به سه نتیجهٔ اول.`
        : signal.type === 'page_decay'
          ? `بررسی علت افت ترافیک ${signal.subject} و به‌روزرسانی محتوا، لینک‌های داخلی و متادیتا.`
          : signal.type === 'news'
            ? `تبدیل خبر «${signal.subject}» به یک راهنمای سفر با تاریخ انتشار و منبع مشخص.`
            : `بررسی افت رتبهٔ «${signal.subject}» و هم‌تراز کردن محتوا با نیت جست‌وجو.`;

  const type: TaskType =
    signal.type === 'query_opportunity' || signal.type === 'news'
      ? 'draft'
      : 'edit';

  return {
    id: `action-${signal.dedupeKey}`,
    type,
    priority: signal.priority,
    subject: signal.subject,
    instruction,
    signalKey: signal.dedupeKey,
  };
}

export function buildSeoPlan(
  signals: SeoSignal[],
  options?: { now?: Date; limit?: number },
): SeoPlan {
  return {
    generatedAt: (options?.now ?? new Date()).toISOString(),
    actions: signals
      .slice(0, options?.limit ?? 10)
      .map(actionFor)
      .sort((a, b) => b.priority - a.priority),
  };
}

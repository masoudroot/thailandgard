import type { TaskType } from '../contracts';
import type { TourFact } from './facts';

export interface TourOpsAction {
  id: string;
  type: TaskType;
  priority: number;
  slug: string;
  instruction: string;
}

export interface TourOpsPlan {
  generatedAt: string;
  actions: TourOpsAction[];
}

function actionFor(fact: TourFact): TourOpsAction | null {
  if (fact.priceStatus === 'stale') {
    return {
      id: `tour-${fact.slug}-refresh-price`,
      type: 'fact_check',
      priority: Math.min(100, 60 + (fact.priceAgeDays ?? 0)),
      slug: fact.slug,
      instruction: `قیمت ${fact.title} در ${fact.priceAgeDays} روز گذشته به‌روزرسانی نشده است؛ قیمت فعلی را تأیید و تاریخ آن را ثبت کنید.`,
    };
  }
  if (fact.priceStatus === 'missing') {
    return {
      id: `tour-${fact.slug}-add-price-date`,
      type: 'fact_check',
      priority: 85,
      slug: fact.slug,
      instruction: `برای ${fact.title} قیمت ثبت شده اما تاریخ به‌روزرسانی ندارد؛ تاریخ واقعی قیمت را ثبت کنید.`,
    };
  }
  if (fact.priceStatus === 'contact') {
    return {
      id: `tour-${fact.slug}-confirm-contact`,
      type: 'fact_check',
      priority: 40,
      slug: fact.slug,
      instruction: `برای ${fact.title} قیمت «تماس بگیرید» ثبت شده است؛ تأیید کنید که این وضعیت همچنان درست است.`,
    };
  }
  return null;
}

export function buildTourOpsPlan(
  facts: TourFact[],
  options?: { now?: Date },
): TourOpsPlan {
  return {
    generatedAt: (options?.now ?? new Date()).toISOString(),
    actions: facts
      .map(actionFor)
      .filter((action): action is TourOpsAction => action !== null)
      .sort((a, b) => b.priority - a.priority),
  };
}

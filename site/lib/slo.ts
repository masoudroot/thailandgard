/**
 * Q4-05: SLO برای مسیرهای بحرانی و حساب بودجهٔ خطا.
 *
 * چرا این ماژول خالص است: عدد SLO فقط وقتی معنا دارد که از داده ساخته شود، نه
 * از حس. هر تابع اینجا ورودی می‌گیرد و عدد/حکم برمی‌گرداند؛ هیچ شبکه و هیچ
 * نوشتنی در آن نیست، پس تست می‌تواند حالت «بودجه تمام شد» را بدون تولید خطای
 * واقعی بسازد.
 *
 * تعریف‌ها از PLAN.md می‌آیند: K8 («خطای سرور ۵xx در هفته») سقف ۰٫۵٪ دارد.
 * درآمد دسترس‌پذیری از همان سقف می‌آید: ۹۹٫۵٪ در ماه یعنی ۰٫۵٪ خطا، و
 * ۰٫۵٪ از ۳۰ روز می‌شود ۲۱۶ دقیقه بودجه.
 */

/** سقف‌های تعهدشده. تغییر هر کدام یک تصمیم مالک است، نه تصمیم کد. */
export const SLO = {
  /** سهم پاسخ‌های موفق از کل درخواست‌ها در یک ماه. */
  availability: 0.995,
  /** K8: سهم پاسخ‌های ۵xx. */
  maxServerErrorRate: 0.005,
  /** سرویس سلامت باید سریع پاسخ دهد؛ اگر نه، watchdog هم دیر می‌فهمد. */
  healthP95Ms: 800,
} as const;

/** ماه عملیاتی ۳۰ روز است (بدون بحث تقویمی). */
export const MONTH_DAYS = 30;

/**
 * بودجهٔ خطای ماهانه به دقیقه.
 * ۰٫۵٪ × ۳۰ × ۲۴ × ۶۰ = ۲۱۶ دقیقه.
 */
export function monthlyErrorBudgetMinutes(
  availability: number = SLO.availability,
  days: number = MONTH_DAYS,
): number {
  const failureShare = Math.max(0, Math.min(1, 1 - availability));
  return failureShare * days * 24 * 60;
}

/** یک نمونهٔ اندازه‌گیری: یک درخواست واقعی به یک مسیر واقعی. */
export interface SloSample {
  url: string;
  /** کد وضعیت HTTP؛ `0` یعنی درخواست به پاسخ نرسید (خطای شبکه/تایم‌اوت). */
  status: number;
  ms: number;
}

/**
 * شکست سرور یعنی ۵xx یا نرسیدن پاسخ. خطای ۴xx شکست سرویس نیست: درخواست
 * کاربر غلط بوده و سرویس درست کار کرده. اگر ۴xx را هم می‌شکست حساب کنیم،
 * یک اسکنر که مسیر ناموجود می‌زند بودجهٔ خطای ما را می‌سوزاند.
 */
export function isServerFailure(status: number): boolean {
  return status === 0 || (status >= 500 && status <= 599);
}

export type SloStatus = 'ok' | 'burning' | 'breached';

export interface SloReport {
  total: number;
  failures: number;
  /** سهم شکست‌ها؛ بین ۰ و ۱. */
  errorRate: number;
  /** سهم پاسخ سالم؛ بین ۰ و ۱. */
  availability: number;
  /** چه بخشی از بودجهٔ خطا مصرف شده؛ ۱ یعنی تمام. */
  budgetSpentFraction: number;
  status: SloStatus;
  /** کندترین نمونه، برای اینکه گزارش بگوید کجا درد می‌کند. */
  slowest: SloSample | null;
}

/**
 * حکم SLO از نمونه‌ها.
 *
 * `burning` عمداً زودتر از `breached` اعلام می‌شود: وقتی نیمی از بودجه رفته،
 * هر تغییر بعدی می‌تواند تعهد را بشکند. هشدار در نیمهٔ راه، هشدار است؛ هشدار
 * در لحظهٔ شکست، گزارش تشییع است.
 */
export function evaluateSlo(
  samples: SloSample[],
  maxServerErrorRate: number = SLO.maxServerErrorRate,
): SloReport {
  const total = samples.length;
  if (total === 0) {
    return {
      total: 0,
      failures: 0,
      errorRate: 0,
      availability: 1,
      budgetSpentFraction: 0,
      status: 'ok',
      slowest: null,
    };
  }

  const failures = samples.filter((sample) => isServerFailure(sample.status)).length;
  const errorRate = failures / total;
  const budgetSpentFraction = maxServerErrorRate > 0 ? errorRate / maxServerErrorRate : 0;

  let status: SloStatus = 'ok';
  if (errorRate > maxServerErrorRate) status = 'breached';
  else if (budgetSpentFraction >= 0.5) status = 'burning';

  const slowest = samples.reduce<SloSample>(
    (worst, sample) => (sample.ms > worst.ms ? sample : worst),
    samples[0],
  );

  return {
    total,
    failures,
    errorRate,
    availability: 1 - errorRate,
    budgetSpentFraction,
    status,
    slowest,
  };
}

/** صدک درخواستی از زمان‌های پاسخ؛ ورودی خالی `null` می‌دهد. */
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const clamped = Math.max(0, Math.min(1, p));
  // نزدیک‌ترین رتبه به بالا: با ۵ نمونه و p=0.95 باید کندترین را بدهیم، نه
  // چهارمی را؛ وگرنه p95 همیشه از p100 خوش‌بین‌تر است.
  const index = Math.min(sorted.length - 1, Math.ceil(clamped * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

const STATUS_LABEL: Record<SloStatus, string> = {
  ok: 'در بودجه',
  burning: 'بودجه در حال سوختن',
  breached: 'بودجه تمام',
};

/** یک خط خلاصه برای لاگ و Issue. */
export function formatSloLine(report: SloReport): string {
  const rate = (report.errorRate * 100).toFixed(2);
  const spent = (report.budgetSpentFraction * 100).toFixed(0);
  return `${STATUS_LABEL[report.status]} — خطا ${rate}% (${report.failures}/${report.total})، بودجه ${spent}% مصرف‌شده`;
}

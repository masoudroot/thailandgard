/* اجزای نمایشی داشبورد کارخانه. این فایل هیچ داده‌ای نمی‌خواند و
   هیچ کلیدی ندارد؛ داده فقط از مسیر API فقط‌خواندنی می‌رسد.
   چرا رندر سمت سرور نشد: لی‌اوت ریشه ensureStatic='navigation' دارد و
   بیلد، رندرِ درخواستیِ سمت سرور را حتی داخل Suspense رد می‌کند (سه
   بیلد ناموفق با همین خطا ثبت شد). پس الگوی مصوب خود پروژه به کار رفت:
   صفحهٔ استاتیک + مسیر API فقط‌خواندنی، مثل داشبورد قدیمی که محتوای
   پویا را از API می‌خواند. */
import {
  Activity,
  AlertTriangle,
  Bot,
  ClipboardList,
  Clock,
  Eye,
  History,
  Layers,
  ListChecks,
  Power,
  Send,
  Wallet,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { formatJalali } from "@/lib/jalali";
import { faNumber } from "@/lib/utils";
import type {
  FactoryDashboardData,
  StatusCount,
} from "@/lib/factory-dashboard/data";

const STATUS_LABELS: Record<string, string> = {
  queued: "در صف",
  claimed: "در حال اجرا",
  succeeded: "موفق",
  failed: "ناموفق",
  blocked: "مسدود",
  cancelled: "لغوشده",
  drafting: "پیش‌نویس",
  awaiting_approval: "در انتظار تأیید",
  approved: "تأییدشده",
  publishing: "در حال انتشار",
  verified: "تأییدشده",
  needs_intervention: "نیازمند مداخله",
  pending: "در انتظار",
  dispatched: "ارسال‌شده",
  verifying: "در حال راستی‌آزمایی",
  retry_scheduled: "زمان‌بندی مجدد",
  timeout: "پایان مهلت",
  outcome_unknown: "نتیجهٔ نامشخص",
  completed: "کامل‌شده",
  started: "شروع‌شده",
  reserved: "رزروشده",
  sent: "ارسال‌شده",
  unknown: "نامعلوم",
  response_recorded: "پاسخ ثبت‌شده",
  settled_unreturned: "تسویه‌شدهٔ برگشت‌نیافته",
  settled: "تسویه‌شده",
  released: "آزادشده",
  referred: "ارجاع‌شده",
  abandoned: "رهاشده",
  rejected: "ردشده",
};

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function countOf(counts: StatusCount[], status: string): number {
  return counts.find((c) => c.status === status)?.count ?? 0;
}

function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}

function jalali(value: string | null): string {
  if (!value) return "نامشخص";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "نامشخص";
  return formatJalali(d, { year: true });
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      {children}
    </span>
  );
}

function CountRows({ counts }: { counts: StatusCount[] }) {
  if (counts.length === 0) {
    return <p className="text-sm text-muted-foreground">هنوز سطری ثبت نشده است.</p>;
  }
  return (
    <ul className="space-y-2">
      {counts.map((c) => (
        <li key={c.status} className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-b-0 last:pb-0">
          <span className="text-sm">{statusLabel(c.status)}</span>
          <span className="text-sm font-bold tabular-nums">{faNumber(c.count)}</span>
        </li>
      ))}
    </ul>
  );
}

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span aria-hidden className="text-muted-foreground">{icon}</span>
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export function DashboardView({ data }: { data: FactoryDashboardData }) {
  const paused =
    data.switches.find((s) => s.key === "factory_paused")?.value === "true";
  const queuedSteps = countOf(data.steps, "queued");
  const needsIntervention = countOf(data.publications, "needs_intervention");
  const readyItems = countOf(data.workItems, "queued");
  const runningSteps = countOf(data.steps, "claimed");
  const approvedForAwaiting = countOf(data.approvalsForAwaiting, "approved");

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Pill>
          <Eye aria-hidden className="me-1 size-3.5" />
          فقط‌خواندنی
        </Pill>
      </div>

      <SectionCard
        icon={<Activity aria-hidden className="size-5" />}
        title="وضعیت کلی کارخانه"
        description="شمار کارها، قدم‌های در صف، رویدادهای باز outbox و انتشارهای نیازمند مداخله."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Pill>{paused ? "کارخانه متوقف است" : "کارخانه فعال است"}</Pill>
          <Pill>{faNumber(data.workItemsTotal)} کار در مجموع</Pill>
          <Pill>{faNumber(data.stepsTotal)} قدم در مجموع</Pill>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Stat label="کارها" value={faNumber(data.workItemsTotal)} />
          <Stat label="قدم‌های در صف" value={faNumber(queuedSteps)} />
          <Stat label="رویدادهای باز outbox" value={faNumber(data.outboxOpen)} />
          <Stat label="انتشارهای نیازمند مداخله" value={faNumber(needsIntervention)} />
          <Stat label="کارهای آماده" value={faNumber(readyItems)} />
          <Stat label="قدم‌های در حال اجرا" value={faNumber(runningSteps)} />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">اشاره‌گر انتشار</h3>
          {data.pointers.length === 0 ? (
            <p className="text-sm text-muted-foreground">سندی ثبت نشده است.</p>
          ) : (
            <ul className="space-y-2">
              {data.pointers.map((p) => (
                <li key={p.slug} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-b-0 last:pb-0">
                  <span className="text-sm" dir="ltr">{p.slug}</span>
                  <span className="text-sm text-muted-foreground" dir="ltr">
                    {p.publishedVersionId ? shortId(p.publishedVersionId) : "بدون نسخهٔ منتشرشده"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SectionCard>

      <SectionCard
        icon={<ClipboardList aria-hidden className="size-5" />}
        title="نیازمند اقدام"
        description="کارهایی که در انتظار تأیید انسانی‌اند و Artifactهای آمادهٔ آن‌ها."
      >
        <div className="grid grid-cols-2 gap-3">
          <Stat label="کارهای در انتظار تأیید" value={faNumber(data.awaitingItems.length)} />
          <Stat label="Artifactهای آماده" value={faNumber(data.artifactsReadyCount)} />
        </div>
        <p className="text-sm text-muted-foreground">
          {approvedForAwaiting > 0
            ? `${faNumber(approvedForAwaiting)} تأیید برای این کارها ثبت شده است.`
            : "در انتظار تأیید انسانی؛ هنوز تأییدی برای این کارها ثبت نشده است."}
        </p>
        {data.awaitingItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">کاری در انتظار تأیید نیست.</p>
        ) : (
          <ul className="space-y-2">
            {data.awaitingItems.map((w) => (
              <li key={w.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{w.title || w.workKey}</span>
                  <Pill>{statusLabel(w.status)}</Pill>
                </div>
                <p className="mt-1 text-xs text-muted-foreground" dir="ltr">{w.workKey}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {w.executionMode ?? "نامشخص"} · {w.workflowVersion ?? "نامشخص"} · {jalali(w.createdAt)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Artifact: <span dir="ltr">{w.resultArtifactId ? shortId(w.resultArtifactId) : "بدون Artifact"}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        icon={<History aria-hidden className="size-5" />}
        title="فعالیت اخیر"
        description="آیتم نمایشی اتصال Gateway و تازه‌ترین قدم‌ها و Attempt آن."
      >
        {!data.demoActivity.found ? (
          <p className="text-sm text-muted-foreground">آیتم نمایشی هنوز ساخته نشده است.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold" dir="ltr">{data.demoActivity.workKey}</span>
              <Pill>{data.demoActivity.status ? statusLabel(data.demoActivity.status) : "نامشخص"}</Pill>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">سقف کار</dt>
                <dd className="mt-1 font-semibold tabular-nums">
                  {data.demoActivity.budgetLimit === null ? "نامشخص" : faNumber(data.demoActivity.budgetLimit)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">مصرف کار</dt>
                <dd className="mt-1 font-semibold tabular-nums">
                  {data.demoActivity.budgetSpent === null ? "نامشخص" : faNumber(data.demoActivity.budgetSpent)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">آخرین تغییر</dt>
                <dd className="mt-1 font-semibold">{jalali(data.demoActivity.updatedAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Artifact</dt>
                <dd className="mt-1 font-semibold" dir="ltr">
                  {data.demoActivity.resultArtifactId ? shortId(data.demoActivity.resultArtifactId) : "بدون Artifact"}
                </dd>
              </div>
            </dl>
            <div>
              <h3 className="mb-2 text-sm font-semibold">قدم‌ها</h3>
              {data.demoActivity.steps.length === 0 ? (
                <p className="text-sm text-muted-foreground">قدمی ثبت نشده است.</p>
              ) : (
                <ul className="space-y-2">
                  {data.demoActivity.steps.map((s) => (
                    <li key={s.stepKey} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-b-0 last:pb-0">
                      <span className="text-sm" dir="ltr">{s.stepKey}</span>
                      <span className="flex items-center gap-2">
                        <Pill>{statusLabel(s.status)}</Pill>
                        <span className="text-xs text-muted-foreground tabular-nums">{faNumber(s.attemptCount)} تلاش</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {data.demoActivity.lastAttempt && (
              <div>
                <h3 className="mb-2 text-sm font-semibold">آخرین Attempt</h3>
                <dl className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
                  <div>
                    <dt className="text-muted-foreground">شمارهٔ Attempt</dt>
                    <dd className="mt-1 font-semibold tabular-nums">{faNumber(data.demoActivity.lastAttempt.attemptNo)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">وضعیت پایان</dt>
                    <dd className="mt-1 font-semibold">{statusLabel(data.demoActivity.lastAttempt.finishStatus)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">هزینهٔ برآوردی</dt>
                    <dd className="mt-1 font-semibold tabular-nums">{faNumber(data.demoActivity.lastAttempt.estimatedCost)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">هزینهٔ ثبت‌شده</dt>
                    <dd className="mt-1 font-semibold tabular-nums">{faNumber(data.demoActivity.lastAttempt.actualCost)}</dd>
                  </div>
                </dl>
              </div>
            )}
          </>
        )}
      </SectionCard>

      <SectionCard
        icon={<Bot aria-hidden className="size-5" />}
        title="Model Gateway"
        description="فراخوانی‌های مدل با Provider آزمایشی؛ هزینه‌ها شبیه‌سازی‌شده‌اند، هزینهٔ واقعی نیستند."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Pill>Provider: mock</Pill>
          <Pill>وضعیت: شبیه‌سازی‌شده</Pill>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="تعداد فراخوانی" value={faNumber(data.gateway.totalCalls)} />
          <Stat label="مجموع برآوردها" value={faNumber(data.gateway.totalEstimated)} />
          <Stat
            label="تسویه‌شدهٔ شبیه‌سازی‌شده"
            value={data.gateway.settledSimulated === null ? "نامشخص" : faNumber(data.gateway.settledSimulated)}
          />
          <Stat label="مبنای هزینه" value={data.gateway.costBases.length > 0 ? data.gateway.costBases.join("، ") : "نامشخص"} />
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">سقف کار نمایشی</dt>
            <dd className="mt-1 font-semibold tabular-nums">
              {data.demoActivity.budgetLimit === null ? "نامشخص" : faNumber(data.demoActivity.budgetLimit)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">مصرف کار نمایشی</dt>
            <dd className="mt-1 font-semibold tabular-nums">
              {data.demoActivity.budgetSpent === null ? "نامشخص" : faNumber(data.demoActivity.budgetSpent)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">سقف روزانه</dt>
            <dd className="mt-1 font-semibold" dir="ltr">{data.budget.dailyLimit ?? "ثبت نشده است"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">مصرف روزانه</dt>
            <dd className="mt-1 font-semibold tabular-nums">
              {data.budget.dailySpent === null ? "ثبت نشده است" : faNumber(data.budget.dailySpent)}
            </dd>
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">تازه‌ترین عملیات‌ها</h3>
          {data.gateway.latestOperations.length === 0 ? (
            <p className="text-sm text-muted-foreground">عملیاتی ثبت نشده است.</p>
          ) : (
            <ul className="space-y-2">
              {data.gateway.latestOperations.map((op) => (
                <li key={op.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm" dir="ltr">{shortId(op.id)}</span>
                    <Pill>{statusLabel(op.state)}</Pill>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    فراخوانی: <span className="tabular-nums" dir="ltr">{faNumber(op.providerCalls)}</span>
                    {" · "}برآوردی: <span className="tabular-nums" dir="ltr">{op.estimatedCost === null ? "نامشخص" : faNumber(op.estimatedCost)}</span>
                    {" · "}واقعی: <span className="tabular-nums" dir="ltr">{op.actualCost === null ? "نامشخص" : faNumber(op.actualCost)}</span>
                    {op.unresolvedExcess !== null && (
                      <>{" · "}اضافهٔ باز: <span className="tabular-nums" dir="ltr">{faNumber(op.unresolvedExcess)}</span></>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    مبنا: {op.costBasis ?? "نامشخص"} · واحد: {op.costUnit ?? "نامشخص"} · {jalali(op.updatedAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          هزینهٔ Mock، شبیه‌سازی‌شده است و هرگز به‌عنوان هزینهٔ واقعی خوانده نمی‌شود.
        </p>
      </SectionCard>

      <SectionCard
        icon={<Clock aria-hidden className="size-5" />}
        title="آخرین Tick و Run"
        description="تازه‌ترین اجرای ثبت‌شدهٔ Tick."
      >
        {data.lastRun === null ? (
          <p className="text-sm text-muted-foreground">هنوز Tickای ثبت نشده است.</p>
        ) : (
          <dl className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">وضعیت</dt>
              <dd className="mt-1 font-semibold">{statusLabel(data.lastRun.runStatus)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">شروع</dt>
              <dd className="mt-1 font-semibold">{jalali(data.lastRun.startedAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">پایان</dt>
              <dd className="mt-1 font-semibold">{jalali(data.lastRun.finishedAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">قدم‌های گرفته‌شده</dt>
              <dd className="mt-1 font-semibold tabular-nums">{faNumber(data.lastRun.itemsClaimed)}</dd>
            </div>
            <div className="col-span-2 lg:col-span-4">
              <dt className="text-muted-foreground">نسخهٔ اجرا</dt>
              <dd className="mt-1 font-semibold" dir="ltr">{data.lastRun.runnerVersion || "نامشخص"}</dd>
            </div>
          </dl>
        )}
      </SectionCard>

      <SectionCard
        icon={<ListChecks aria-hidden className="size-5" />}
        title="Work Itemها و Stepها"
        description="شمار بر اساس وضعیت، و تازه‌ترین کارها."
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold">کارها بر اساس وضعیت</h3>
            <CountRows counts={data.workItems} />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">قدم‌ها بر اساس وضعیت</h3>
            <CountRows counts={data.steps} />
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">تازه‌ترین کارها</h3>
          {data.latestWorkItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">هنوز کاری ثبت نشده است.</p>
          ) : (
            <ul className="space-y-2">
              {data.latestWorkItems.map((w) => (
                <li key={w.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{w.title || w.workKey}</span>
                    <Pill>{statusLabel(w.status)}</Pill>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground" dir="ltr">{w.workKey}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {w.executionMode ?? "نامشخص"} · {w.workflowVersion ?? "نامشخص"} · {jalali(w.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SectionCard>

      <SectionCard
        icon={<Send aria-hidden className="size-5" />}
        title="Publication و Outbox"
        description="شمار بر اساس وضعیت، و تازه‌ترین انتشارها و رویدادها."
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold">انتشارها بر اساس وضعیت</h3>
            <CountRows counts={data.publications} />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">رویدادهای outbox بر اساس وضعیت</h3>
            <CountRows counts={data.outbox} />
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">تازه‌ترین انتشارها</h3>
          {data.latestPublications.length === 0 ? (
            <p className="text-sm text-muted-foreground">هنوز انتشاری ثبت نشده است.</p>
          ) : (
            <ul className="space-y-2">
              {data.latestPublications.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-b-0 last:pb-0">
                  <span className="text-sm" dir="ltr">{shortId(p.versionId)}</span>
                  <span className="flex items-center gap-2">
                    <Pill>{statusLabel(p.status)}</Pill>
                    <span className="text-xs text-muted-foreground">{jalali(p.createdAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SectionCard>

      <SectionCard
        icon={<AlertTriangle aria-hidden className="size-5" />}
        title="خطاهای اخیر"
        description="فقط وضعیت پایان و کد خطا؛ متن خطای دیتابیس این‌جا نمی‌آید."
      >
        {data.recentErrors.length === 0 ? (
          <p className="text-sm text-muted-foreground">خطای تازه‌ای ثبت نشده است.</p>
        ) : (
          <ul className="space-y-2">
            {data.recentErrors.map((e, i) => (
              <li key={`${e.startedAt}-${i}`} className="border-b border-border pb-2 last:border-b-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm">{statusLabel(e.finishStatus)}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground" dir="ltr">{e.errorCode ?? "بدون کد"}</span>
                    <span className="text-xs text-muted-foreground">{jalali(e.startedAt)}</span>
                  </span>
                </div>
                <details className="mt-1 text-xs text-muted-foreground">
                  <summary className="cursor-pointer">جزئیات فنی</summary>
                  <p className="mt-1" dir="ltr">{e.workKey || "بدون کلید کار"}</p>
                </details>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        icon={<Power aria-hidden className="size-5" />}
        title="Kill Switchها"
        description="مقدار خام تنظیمات، فقط‌خواندنی؛ از این‌جا چیزی تغییر نمی‌کند."
      >
        {data.switches.length === 0 ? (
          <p className="text-sm text-muted-foreground">تنظیمی ثبت نشده است.</p>
        ) : (
          <ul className="space-y-2">
            {data.switches.map((s) => (
              <li key={s.key} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-b-0 last:pb-0">
                <span className="text-sm" dir="ltr">{s.key}</span>
                <span className="flex items-center gap-2">
                  <span className="text-sm font-semibold" dir="ltr">{s.value}</span>
                  <Pill>فقط‌خواندنی</Pill>
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        icon={<Wallet aria-hidden className="size-5" />}
        title="Budget و Cost Ledger"
        description="هزینهٔ ثبت‌شده و سقف روزانه، حتی اگر هزینه فعلاً صفر باشد."
      >
        <dl className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">سطرهای ledger</dt>
            <dd className="mt-1 font-semibold tabular-nums">{faNumber(data.budget.ledgerRows)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">رزروهای باز</dt>
            <dd className="mt-1 font-semibold tabular-nums">{faNumber(data.gateway.openReservations)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">باقی‌ماندهٔ روزانه</dt>
            <dd className="mt-1 font-semibold tabular-nums">
              {data.budget.remainingDaily === null ? "نامشخص" : faNumber(data.budget.remainingDaily)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">مصالحه‌های باز</dt>
            <dd className="mt-1 font-semibold tabular-nums">
              {data.budget.openReconciliationCount === 0 ? "هیچ" : `${faNumber(data.budget.openReconciliationCount)} مورد`}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">مصالحهٔ اضافه‌هزینه</dt>
            <dd className="mt-1 font-semibold tabular-nums">
              {data.budget.openExcessCount === 0
                ? "هیچ"
                : `${faNumber(data.budget.openExcessCount)} مورد، مجموع ${data.budget.openExcessTotal === null ? "نامشخص" : faNumber(data.budget.openExcessTotal)}`}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">مصالحهٔ نامشخص</dt>
            <dd className="mt-1 font-semibold tabular-nums">
              {data.budget.openUnknownCount === 0 ? "هیچ" : `${faNumber(data.budget.openUnknownCount)} مورد`}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">سقف روزانه</dt>
            <dd className="mt-1 font-semibold" dir="ltr">{data.budget.dailyLimit ?? "ثبت نشده است"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">مصرف روزانه</dt>
            <dd className="mt-1 font-semibold tabular-nums">
              {data.budget.dailySpent === null ? "ثبت نشده است" : faNumber(data.budget.dailySpent)}
            </dd>
          </div>
        </dl>
        <p className="text-xs text-muted-foreground">
          مبلغ‌ها با همان واحدی نشان داده می‌شوند که در ledger ثبت شده است؛ واحد تازه‌ای به آن‌ها نسبت داده نمی‌شود. جمع
          مبلغ‌های ledger (رزرو و آزادسازی و تسویه و رد، با هم) هزینه نیست و این‌جا نشان داده نمی‌شود؛ فقط هزینهٔ
          تسویه‌شدهٔ شبیه‌سازی‌شده و رزروهای باز و باقی‌ماندهٔ قابل اتکا نشان داده می‌شوند و هر مقدار نامطمئن، «نامشخص» است.
        </p>
      </SectionCard>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Layers aria-hidden className="size-3.5 shrink-0" />
        این صفحه فقط می‌خواند. تأیید، انتشار، rollback و به‌روزرسانی از این‌جا انجام نمی‌شود.
      </p>
    </div>
  );
}

export function UnconfiguredCard({ reason }: { reason: string }) {
  const reasonText =
    reason === "env"
      ? "متغیرهای محیطی کارخانه تنظیم نشده است."
      : reason === "tables"
        ? "جدول‌های کارخانه در این دیتابیس نیست."
        : "خواندن دادهٔ کارخانه ممکن نشد.";
  return (
      <Card>
        <CardHeader>
          <CardTitle>کارخانه پیکربندی نشده است</CardTitle>
          <CardDescription>{reasonText}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            تا وقتی جدول‌های کارخانه و متغیرهای محیطی آن در این محیط نباشند، این صفحه
            عددی نشان نمی‌دهد و ادعای سلامت نمی‌کند. قدم بعد، پیکربندی محیط و اجرای
            Migrationهای کارخانه روی همان محیط است.
          </p>
        </CardContent>
      </Card>
  );
}

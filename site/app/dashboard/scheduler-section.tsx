"use client";

/**
 * پنل زمان‌بند داخلی داشبورد (THG-SCHED-02).
 * کارها، اجراهای اخیر و وضعیت نگهبانی را از مسیر فقط‌خواندنی
 * /api/factory-dashboard/scheduler می‌گیرد. روشن/خاموش و تغییر فاصله
 * یا ساعت روزانه با PATCH همان مسیر انجام می‌شود. اجرای دستی تیک در
 * کارت «ابزارهای پیشرفته» فقط برای اضطرار مانده است؛ زمان‌بندی عادی
 * با همین ساعت داخلی جلو می‌رود.
 */
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  SchedulerJobView,
  SchedulerOverview,
} from "@/lib/factory-dashboard/scheduler";
import type { SchedulerRun } from "@/lib/scheduler/jobs";

type LoadState =
  | { kind: "loading" }
  | { kind: "denied" }
  | { kind: "error"; detail: string }
  | { kind: "ready"; data: SchedulerOverview };

function toFaDigits(value: string): string {
  return value.replace(/[0-9]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

function jalaliTehran(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return toFaDigits(
    date.toLocaleString("fa-IR", {
      timeZone: "Asia/Tehran",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    }),
  );
}

function scheduleText(job: SchedulerJobView): string {
  if (job.kind === "interval") {
    return `هر ${toFaDigits(String(job.interval_minutes ?? 5))} دقیقه`;
  }
  if (job.kind === "once") {
    if (job.next_due) return `یک‌بار در ${jalaliTehran(job.next_due)}`;
    return "یک‌بارمصرف (اجرا شده)";
  }
  return `روزانه ساعت ${toFaDigits(job.daily_utc_time ?? "—")} UTC`;
}

function runResult(run: SchedulerRun): string {
  if (run.status !== "success") return "ناموفق";
  const result = run.result as Record<string, unknown> | null;
  if (result && typeof result === "object") {
    if (typeof result.processed === "number") {
      return `موفق · ${toFaDigits(String(result.processed))} پردازش شد`;
    }
    if (typeof result.inserted === "number") {
      return `موفق · ${toFaDigits(String(result.inserted))} ردیف تازه`;
    }
    // اجرای موفقِ بدون درج (مثل gsc_daily تا وقتی حساب سرویس ساخته
    // نشده): جملهٔ اول خروجی اسکریپت را نشان بده تا «موفق» به‌تنهایی
    // به‌معنای درج داده خوانده نشود.
    if (typeof result.log_tail === "string" && result.log_tail.trim().length > 0) {
      const firstLine = result.log_tail.trim().split("\n")[0] ?? "";
      return firstLine.slice(0, 120);
    }
  }
  return "موفق";
}

export function SchedulerSection() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    setState({ kind: "loading" });
    fetch("/api/factory-dashboard/scheduler")
      .then(async (res) => {
        if (res.status === 401) {
          setState({ kind: "denied" });
          return;
        }
        const payload = (await res.json()) as {
          ok: boolean;
          data?: SchedulerOverview;
          reason?: string;
        };
        if (!res.ok || !payload.ok || !payload.data) {
          setState({ kind: "error", detail: payload.reason ?? "خواندن زمان‌بند ممکن نشد." });
          return;
        }
        setState({ kind: "ready", data: payload.data });
      })
      .catch(() => {
        setState({ kind: "error", detail: "خواندن زمان‌بند ممکن نشد." });
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(
    jobKey: string,
    patch: { enabled?: boolean; interval_minutes?: number; daily_utc_time?: string },
  ) {
    setBusyKey(jobKey);
    try {
      const res = await fetch("/api/factory-dashboard/scheduler", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_key: jobKey, ...patch }),
      });
      if (!res.ok) {
        const payload = (await res.json()) as { reason?: string };
        setState({ kind: "error", detail: payload.reason ?? "تغییر کار ممکن نشد." });
        return;
      }
      load();
    } catch {
      setState({ kind: "error", detail: "تغییر کار ممکن نشد." });
    } finally {
      setBusyKey(null);
    }
  }

  if (state.kind === "loading") {
    return <Skeleton className="h-48 w-full" aria-label="در حال بارگذاری زمان‌بند" />;
  }

  if (state.kind === "denied") {
    return null;
  }

  if (state.kind === "error") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>زمان‌بند داخلی</CardTitle>
          <CardDescription>{state.detail}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={load}>
            تلاش دوباره
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { jobs, runs, watchdog, watchdog_text } = state.data;
  const watchdogTone =
    watchdog === "healthy"
      ? "text-emerald-700"
      : watchdog === "down"
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <Card>
      <CardHeader>
        <CardTitle>زمان‌بند داخلی</CardTitle>
        <CardDescription>
          ساعت پروژه همین‌جاست؛ هیچ زمان‌بند بیرونی زمان کارها را تعیین
          نمی‌کند. تغییر فاصله و روشن/خاموش از همین‌جا انجام می‌شود.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className={`text-sm font-medium ${watchdogTone}`}>{watchdog_text}</p>
        <div className="space-y-4">
          {jobs.map((job) => (
            <div key={job.job_key} className="space-y-2 border-t border-border pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{job.display_name}</p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busyKey === job.job_key}
                  onClick={() => void patch(job.job_key, { enabled: !job.enabled })}
                >
                  {job.enabled ? "خاموش کردن" : "روشن کردن"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {scheduleText(job)} · {job.enabled ? "روشن" : "خاموش"} · آخرین اجرا:{" "}
                {jalaliTehran(job.last_run_at)}
              </p>
              {job.kind === "interval" ? (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground" htmlFor={`interval-${job.job_key}`}>
                    فاصله (دقیقه)
                  </label>
                  <input
                    id={`interval-${job.job_key}`}
                    className="w-20 rounded-md border border-border bg-background px-2 py-1 text-sm"
                    type="number"
                    min={1}
                    max={1440}
                    defaultValue={job.interval_minutes ?? 5}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [job.job_key]: event.target.value,
                      }))
                    }
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyKey === job.job_key}
                    onClick={() => {
                      const value = Number(drafts[job.job_key]);
                      if (Number.isFinite(value)) void patch(job.job_key, { interval_minutes: value });
                    }}
                  >
                    ذخیره
                  </Button>
                </div>
              ) : job.kind === "daily" ? (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground" htmlFor={`time-${job.job_key}`}>
                    ساعت روزانه (UTC)
                  </label>
                  <input
                    id={`time-${job.job_key}`}
                    className="w-24 rounded-md border border-border bg-background px-2 py-1 text-sm"
                    type="time"
                    defaultValue={job.daily_utc_time ?? "02:00"}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [job.job_key]: event.target.value,
                      }))
                    }
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyKey === job.job_key}
                    onClick={() => {
                      const value = drafts[job.job_key];
                      if (value) void patch(job.job_key, { daily_utc_time: value });
                    }}
                  >
                    ذخیره
                  </Button>
                </div>
              ) : null}
              {job.plain_error ? (
                <p className="text-sm text-destructive">{job.plain_error}</p>
              ) : null}
            </div>
          ))}
        </div>
        <div className="space-y-1 border-t border-border pt-4">
          <p className="font-medium">اجراهای اخیر</p>
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">هنوز اجرایی ثبت نشده است.</p>
          ) : (
            runs.slice(0, 10).map((run) => (
              <p key={run.id} className="text-sm text-muted-foreground">
                {run.job_key} · {jalaliTehran(run.started_at)} · {runResult(run)}
                {run.trigger === "manual_proof" ? " · اجرای اثبات" : ""}
              </p>
            ))
          )}
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          به‌روزرسانی
        </Button>
      </CardContent>
    </Card>
  );
}

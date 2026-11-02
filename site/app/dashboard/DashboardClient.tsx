"use client";

/* پوستهٔ سمت مرورگر داشبورد کارخانه. تنها فراخوانی‌اش یک GET به مسیر
   API فقط‌خواندنیِ همین برنامه است؛ هیچ کلیدی، هیچ کوکیِ دستی و هیچ
   متد نوشتن در آن نیست. احراز هویت با کوکیِ نشستِ خود مرورگر انجام
   می‌شود و مسیر API کاربر غیرمجاز را با 401 برمی‌گرداند. */

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardView, UnconfiguredCard } from "./dashboard-view";
import type {
  DashboardResult,
  FactoryDashboardData,
} from "@/lib/factory-dashboard/data";

type ClientState =
  | { kind: "loading" }
  | { kind: "denied" }
  | { kind: "unconfigured"; reason: string }
  | { kind: "error" }
  | { kind: "ready"; data: FactoryDashboardData };

type TickState =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "done"; status: string; stepKey: string | null }
  | { kind: "error"; detail: string };

export default function DashboardClient() {
  const [state, setState] = useState<ClientState>({ kind: "loading" });
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [tickState, setTickState] = useState<TickState>({ kind: "idle" });

  async function runTick(): Promise<void> {
    setTickState({ kind: "busy" });
    try {
      const res = await fetch("/api/factory-dashboard/tick", { method: "POST" });
      const result = (await res.json().catch(() => null)) as {
        status?: unknown;
        step_key?: unknown;
        error?: unknown;
      } | null;
      if (!res.ok) {
        setTickState({
          kind: "error",
          detail: typeof result?.error === "string" ? result.error : `خطای ${res.status}`,
        });
        return;
      }
      setTickState({
        kind: "done",
        status: typeof result?.status === "string" ? result.status : "نامشخص",
        stepKey: typeof result?.step_key === "string" ? result.step_key : null,
      });
    } catch {
      setTickState({ kind: "error", detail: "فراخوان تیک ممکن نشد." });
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/factory-dashboard/summary")
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          setState({ kind: "denied" });
          return;
        }
        if (!res.ok) {
          setState({ kind: "error" });
          return;
        }
        const result = (await res.json()) as DashboardResult;
        if (!result.ok) {
          setState({ kind: "unconfigured", reason: result.reason });
          return;
        }
        setState({ kind: "ready", data: result.data });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === "loading") {
    return (
      <div className="space-y-6" aria-label="در حال بارگذاری">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (state.kind === "denied") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>دسترسی ندارید</CardTitle>
          <CardDescription>
            برای دیدن وضعیت کارخانه وارد حساب مدیر شوید.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a className="text-sm text-primary underline" href="/login">
            رفتن به صفحهٔ ورود
          </a>
        </CardContent>
      </Card>
    );
  }

  if (state.kind === "unconfigured") {
    return <UnconfiguredCard reason={state.reason} />;
  }

  if (state.kind === "error") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>خواندن داده ممکن نشد</CardTitle>
          <CardDescription>
            اتصال به دیتابیس کارخانه برقرار نشد. چند دقیقهٔ دیگر دوباره
            تلاش کنید.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardView data={state.data} />
      <Card>
        <CardHeader>
          <CardTitle>ابزارهای پیشرفته</CardTitle>
          <CardDescription>
            اجرای دستی تیک کارخانه؛ معمولاً Job پنج‌دقیقه‌ای خودش تیک
            می‌زند و این دکمه فقط برای وقتی است که بخواهید همان لحظه
            یک قدم جلو برود.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            onClick={() => setAdvancedOpen((open) => !open)}
            aria-expanded={advancedOpen}
          >
            {advancedOpen ? "پنهان کردن ابزارها" : "نمایش ابزارهای پیشرفته"}
          </Button>
          {advancedOpen && (
            <div className="space-y-2">
              <Button onClick={() => void runTick()} disabled={tickState.kind === "busy"}>
                {tickState.kind === "busy" ? "در حال اجرای تیک…" : "اجرای تیک"}
              </Button>
              {tickState.kind === "done" && (
                <p className="text-sm text-muted-foreground" dir="ltr">
                  {tickState.status}
                  {tickState.stepKey ? ` · ${tickState.stepKey}` : ""}
                </p>
              )}
              {tickState.kind === "error" && (
                <p className="text-sm text-destructive">{tickState.detail}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

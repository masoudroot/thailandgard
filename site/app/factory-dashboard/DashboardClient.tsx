"use client";

/* پوستهٔ سمت مرورگر داشبورد کارخانه. تنها فراخوانی‌اش یک GET به مسیر
   API فقط‌خواندنیِ همین برنامه است؛ هیچ کلیدی، هیچ کوکیِ دستی و هیچ
   متد نوشتن در آن نیست. احراز هویت با کوکیِ نشستِ خود مرورگر انجام
   می‌شود و مسیر API کاربر غیرمجاز را با 401 برمی‌گرداند. */

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
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

export default function DashboardClient() {
  const [state, setState] = useState<ClientState>({ kind: "loading" });

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

  return <DashboardView data={state.data} />;
}

"use client";

import { Bot } from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/dashboard/PageHeader";
import { LlmModelsPanel } from "@/components/dashboard/settings/connections/LlmModelsPanel";

/**
 * صفحه‌ی «مدل‌های هوش مصنوعی»: انتخاب مدل پیش‌فرض سامانه، مدل امبدینگ،
 * مدل هر تیم (با انتخاب خودکار) و تست واقعی پرامپت.
 * مدیریت درگاه‌ها (API) در صفحه‌ی اصلی تنظیمات است.
 */
export default function ModelsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        icon={Bot}
        title="مدل‌های هوش مصنوعی"
        subtitle="مدل پیش‌فرض سامانه، مدل امبدینگ و مدل هر یک از ۵ تیم. مدیریت درگاه‌ها در صفحه‌ی اتصال‌ها انجام می‌شود."
        actions={
          <Link
            href="/dashboard/settings"
            className="text-sm text-brand hover:underline"
          >
            بازگشت به اتصال‌ها
          </Link>
        }
      />
      <LlmModelsPanel />
    </div>
  );
}

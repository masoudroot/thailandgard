'use client';
import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpenText, FolderX } from "lucide-react";
import { TEAM_META } from "@/lib/dashboard/team-meta";
import type { TeamName } from "@/lib/dashboard/types";

/** اعتبارسنجی سبک سمت کلاینت (نسخهٔ سروری در lib/dashboard/knowledge است). */
function isValidTeam(slug: string): slug is TeamName {
  return slug in TEAM_META;
}
import PageHeader from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/ui/empty-state";
import { Button } from "@/components/dashboard/ui";
import TeamKnowledgePage from "@/components/dashboard/knowledge/TeamKnowledgePage";

/**
 * صفحهٔ دانش یک تیم (تیم ۶): app/dashboard/knowledge/[team]/page.tsx
 * سربرگ (نام فارسی، مأموریت، امتیاز دانش) این‌جا ساخته می‌شود؛
 * بدنهٔ تعاملی (دسته‌ها، جست‌وجو، افزودن/ویرایش/حذف) در TeamKnowledgePage.
 * slug نامعتبر → پیام فارسی «تیم پیدا نشود».
 * امتیاز دانش از API خوانده می‌شود تا صفحه استاتیک بماند (قاعدهٔ ensureStatic ریشه).
 */
export default function KnowledgeTeamClient({ team }: { team: string }) {
  const slug = team;
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    if (!slug || !isValidTeam(slug)) return;
    let cancelled = false;
    fetch(`/api/knowledge/${encodeURIComponent(slug)}/score`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && j?.ok) setScore(j.data?.score ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!slug || !isValidTeam(slug)) {
    return (
      <div>
        <PageHeader icon={BookOpenText} title="دانش تیم" />
        <EmptyState
          icon={FolderX}
          title="تیم پیدا نشد"
          description="چنین تیمی در داشبورد ثبت نشده است. به نمای کلی دانش برگردید و تیم درست را انتخاب کنید."
          action={
            <Link href="/dashboard/knowledge">
              <Button variant="outline">نمای کلی دانش</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <TeamKnowledgePage
      team={slug}
      faName={TEAM_META[slug].faName}
      mission={TEAM_META[slug].mission}
      score={score}
    />
  );
}

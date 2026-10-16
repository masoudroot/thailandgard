"use client";

import * as React from "react";
import { BookOpenText, CalendarDays, FolderOpen, Link2, Loader2 } from "lucide-react";
import { formatJalali } from "@/lib/dashboard/jalali";
import { Dialog } from "@/components/dashboard/ui/dialog";
import { Badge } from "@/components/dashboard/ui";

interface HistoryVersion {
  action: string;
  content: string;
  title: string;
}

interface KnowledgeDetailDialogProps {
  /** شناسهٔ دانش؛ null یعنی بسته. */
  itemId: string | null;
  /** عنوان نمایشی (از کارت) تا قبل از لود شدن متن کامل. */
  fallbackTitle: string;
  /** نام دسته برای نمایش در سربرگ. */
  categoryName: string | null;
  /** منبع دانش. */
  source: string | null;
  /** تاریخ به‌روزرسانی. */
  updatedAt: string;
  onClose: () => void;
}

/**
 * مودال «مشاهدهٔ کامل دانش».
 * متن کامل اول از جدیدترین نسخهٔ تاریخچه خوانده می‌شود (همان مسیری که ویرایش استفاده می‌کند)؛
 * اگر تاریخچه‌ای نباشد (آیتم‌های ثبت‌شده توسط ایجنت‌ها)، از خود آیتم خوانده می‌شود.
 * تایپوگرافی فارسی: خط‌به‌خط خوانا، فاصلهٔ سطر باز، بدون برش متن.
 */
export default function KnowledgeDetailDialog({
  itemId,
  fallbackTitle,
  categoryName,
  source,
  updatedAt,
  onClose,
}: KnowledgeDetailDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [content, setContent] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState(fallbackTitle);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!itemId) {
      setContent(null);
      setError(null);
      setTitle(fallbackTitle);
      return;
    }
    let cancelled = false;
    const id = itemId;
    setLoading(true);
    setContent(null);
    setError(null);
    setTitle(fallbackTitle);

    async function load() {
      // ۱. تاریخچه (همان مسیری که ویرایش استفاده می‌کند).
      try {
        const r = await fetch(`/api/knowledge/${encodeURIComponent(id)}/history`);
        const json = (await r.json().catch(() => null)) as {
          ok?: boolean;
          data?: { versions?: HistoryVersion[] };
        } | null;
        const versions = json?.ok ? (json.data?.versions ?? []) : [];
        const latest = versions.find(
          (v) => v.action === "create" || v.action === "update",
        );
        if (latest?.content) {
          if (!cancelled) {
            setTitle(latest.title || fallbackTitle);
            setContent(latest.content);
          }
          return;
        }
      } catch {
        // ادامه به مسیر جایگزین
      }
      // ۲. جایگزین: خود آیتم از team_knowledge (همیشه متن کامل دارد؛
      // آیتم‌هایی که مستقیم توسط ایجنت‌ها ثبت شده‌اند تاریخچه ندارند).
      try {
        const r = await fetch(`/api/knowledge/${encodeURIComponent(id)}`);
        const json = (await r.json().catch(() => null)) as {
          ok?: boolean;
          data?: { item?: { title?: string; content?: string } };
        } | null;
        const item = json?.ok ? json.data?.item : null;
        if (item?.content) {
          if (!cancelled) {
            setTitle(item.title || fallbackTitle);
            setContent(item.content);
          }
        } else if (!cancelled) {
          setError("متن کامل این دانش پیدا نشد.");
        }
      } catch {
        if (!cancelled) setError("خواندن متن کامل ناموفق بود. اتصال را بررسی کنید.");
      }
    }

    void load().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [itemId, fallbackTitle]);

  return (
    <Dialog
      open={itemId !== null}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title={
        <span className="flex items-start gap-2.5">
          <BookOpenText
            size={20}
            aria-hidden="true"
            className="mt-1.5 shrink-0 text-brand"
          />
          <span
            dir="auto"
            className="text-balance text-lg font-bold leading-9 text-foreground"
          >
            {title}
          </span>
        </span>
      }
      className="max-w-2xl"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs leading-6 text-muted-foreground">
        {categoryName && (
          <span className="inline-flex items-center gap-1.5">
            <FolderOpen size={14} aria-hidden="true" className="shrink-0" />
            {categoryName}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays size={14} aria-hidden="true" className="shrink-0" />
          {formatJalali(new Date(updatedAt))}
        </span>
        {source && (
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Link2 size={14} aria-hidden="true" className="shrink-0" />
            <span dir="auto" className="break-all">
              {source}
            </span>
          </span>
        )}
      </div>

      <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-card p-5">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
            در حال خواندن متن کامل…
          </div>
        )}
        {error && (
          <p role="alert" className="py-6 text-center text-sm leading-8 text-destructive">
            {error}
          </p>
        )}
        {!loading && !error && content !== null && (
          <div className="text-[15px] font-normal leading-9 text-foreground">
            {content.split(/\n{2,}/).map((para, i) => (
              <p key={i} className={i > 0 ? "mt-4" : undefined}>
                {para.split("\n").map((line, j, arr) => (
                  <React.Fragment key={j}>
                    {line}
                    {j < arr.length - 1 && <br />}
                  </React.Fragment>
                ))}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <Badge variant="secondary">متن کامل</Badge>
        <p className="text-xs leading-6 text-muted-foreground">
          برای بستن، کلید Esc را بزنید یا بیرون پنجره کلیک کنید.
        </p>
      </div>
    </Dialog>
  );
}

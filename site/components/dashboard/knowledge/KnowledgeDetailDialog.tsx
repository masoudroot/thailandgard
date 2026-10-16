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
 * متن کامل از جدیدترین نسخهٔ تاریخچه خوانده می‌شود (همان مسیری که ویرایش استفاده می‌کند).
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
    setLoading(true);
    setContent(null);
    setError(null);
    setTitle(fallbackTitle);
    fetch(`/api/knowledge/${encodeURIComponent(itemId)}/history`)
      .then((r) => r.json().catch(() => null))
      .then((json: { ok?: boolean; data?: { versions?: HistoryVersion[] } } | null) => {
        if (cancelled) return;
        const versions = json?.ok ? (json.data?.versions ?? []) : [];
        const latest = versions.find((v) => v.action === "create" || v.action === "update");
        if (latest) {
          setTitle(latest.title || fallbackTitle);
          setContent(latest.content || "");
        } else {
          setError("متن کامل این دانش پیدا نشد.");
        }
      })
      .catch(() => {
        if (!cancelled) setError("خواندن متن کامل ناموفق بود. اتصال را بررسی کنید.");
      })
      .finally(() => {
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
        <span className="flex items-center gap-2">
          <BookOpenText size={18} aria-hidden="true" className="shrink-0 text-brand" />
          <span className="leading-8">{title}</span>
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

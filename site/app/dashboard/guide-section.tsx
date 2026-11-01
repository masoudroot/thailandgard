/**
 * بخش مدیریت راهنمای داشبورد (سمت مرورگر).
 *
 * این فایل فقط مسیرهای API داشبورد راهنما را صدا می‌زند؛ هیچ کلیدی،
 * هیچ توکنی و هیچ فراخوان مستقیمی به مسیرهای داخلی در آن نیست.
 * احراز هویت با کوکیِ نشستِ خود مرورگر انجام می‌شود و مسیر API،
 * کاربر غیرمجاز را با 401 برمی‌گرداند. همهٔ اقدام‌های نوشتن
 * (ایجاد، تأیید، انتشار، تکمیل، Rollback) از مسیر API داشبورد
 * می‌گذرند و همان مسیر، آن‌ها را از لایهٔ سروری به مسیر داخلی
 * می‌رساند.
 *
 * نکتهٔ صادقانه: دکمه‌ای که پیش‌شرطش برقرار نیست، غیرفعال است و
 * دلیلش نوشته شده؛ هیچ دکمهٔ ظاهریِ بی‌اثری این‌جا نیست.
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatJalali } from "@/lib/jalali";
import { faNumber } from "@/lib/utils";
import {
  diffGuidePayload,
  isValidGuideSlug,
} from "@/lib/factory-dashboard/guide-status";
import type {
  GuideDetail,
  GuideListItem,
} from "@/lib/factory-dashboard/guide-types";
import type { PublishPayload } from "@/lib/content-versioning";

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "outline" | "success" | "warning" | "brand" | "destructive"> = {
  draft: "outline",
  awaiting_approval: "warning",
  approved: "brand",
  publishing: "secondary",
  published: "success",
  error: "destructive",
};

const PUBLICATION_LABELS: Record<string, string> = {
  pending: "در انتظار",
  dispatched: "ارسال‌شده",
  verifying: "در حال راستی‌آزمایی",
  verified: "تأییدشده",
  retry_scheduled: "زمان‌بندی مجدد",
  needs_intervention: "نیازمند مداخله",
};

function publicationLabel(status: string): string {
  return PUBLICATION_LABELS[status] ?? status;
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

type ListState =
  | { kind: "loading" }
  | { kind: "denied" }
  | { kind: "error"; message: string }
  | { kind: "ready"; guides: GuideListItem[] };

type DetailState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; detail: GuideDetail };

interface FormSection {
  heading: string;
  paragraphs: string[];
}

interface FormFaq {
  question: string;
  answer: string;
}

const EMPTY_FORM = {
  slug: "",
  title: "",
  excerpt: "",
  category: "",
  sections: [{ heading: "", paragraphs: [""] }] as FormSection[],
  faqs: [] as FormFaq[],
  seoTitle: "",
  seoDescription: "",
};

type FormState = typeof EMPTY_FORM;

function countWords(text: string): number {
  return text.split(/\s+/).filter((part) => part.length > 0).length;
}

export default function GuideSection() {
  const [listState, setListState] = useState<ListState>({ kind: "loading" });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formMode, setFormMode] = useState<"create" | "update">("create");
  const [updateDocumentId, setUpdateDocumentId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailState, setDetailState] = useState<DetailState>({ kind: "idle" });
  const [rejectReason, setRejectReason] = useState("");
  const [rollbackReasons, setRollbackReasons] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const fetchList = useCallback(async () => {
    // حالت loading فقط مقدار اولیه است؛ در به‌روزرسانی‌ها فهرست کهنه
    // تا رسیدن دادهٔ تازه می‌ماند تا صفحه چشمک نزند.
    try {
      const res = await fetch("/api/factory-dashboard/guides");
      if (res.status === 401) {
        setListState({ kind: "denied" });
        return;
      }
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        setListState({ kind: "error", message: json?.error ?? "خواندن فهرست ممکن نشد." });
        return;
      }
      const json = (await res.json()) as { guides: GuideListItem[] };
      setListState({ kind: "ready", guides: json.guides });
    } catch {
      setListState({ kind: "error", message: "خواندن فهرست ممکن نشد." });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/factory-dashboard/guides")
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          setListState({ kind: "denied" });
          return;
        }
        if (!res.ok) {
          const json = (await res.json().catch(() => null)) as { error?: string } | null;
          setListState({ kind: "error", message: json?.error ?? "خواندن فهرست ممکن نشد." });
          return;
        }
        const json = (await res.json()) as { guides: GuideListItem[] };
        setListState({ kind: "ready", guides: json.guides });
      })
      .catch(() => {
        if (!cancelled) setListState({ kind: "error", message: "خواندن فهرست ممکن نشد." });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchDetail = useCallback(async (documentId: string) => {
    setDetailState({ kind: "loading" });
    setActionMessage(null);
    try {
      const res = await fetch(`/api/factory-dashboard/guides/${encodeURIComponent(documentId)}`);
      if (res.status === 401) {
        setDetailState({ kind: "error", message: "دسترسی ندارید؛ دوباره وارد شوید." });
        return;
      }
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        setDetailState({ kind: "error", message: json?.error ?? "خواندن جزئیات ممکن نشد." });
        return;
      }
      const json = (await res.json()) as { detail: GuideDetail };
      setDetailState({ kind: "ready", detail: json.detail });
    } catch {
      setDetailState({ kind: "error", message: "خواندن جزئیات ممکن نشد." });
    }
  }, []);

  const toggleDetail = useCallback(
    (documentId: string) => {
      if (expandedId === documentId) {
        setExpandedId(null);
        setDetailState({ kind: "idle" });
        return;
      }
      setExpandedId(documentId);
      setRejectReason("");
      void fetchDetail(documentId);
    },
    [expandedId, fetchDetail],
  );

  const refreshAll = useCallback(
    async (documentId: string | null) => {
      await fetchList();
      if (documentId) await fetchDetail(documentId);
    },
    [fetchList, fetchDetail],
  );

  async function postAction(
    path: string,
    body: unknown,
    busy: string,
    documentId: string | null,
  ): Promise<void> {
    setBusyKey(busy);
    setActionMessage(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        publicationId?: string;
        workItemStatus?: string;
        replayed?: boolean;
      } | null;
      if (!res.ok) {
        setActionMessage({ text: json?.error ?? "اقدام ناموفق بود.", ok: false });
        return;
      }
      if (json?.publicationId) {
        setActionMessage({
          text: `انجام شد؛ شناسهٔ Publication: ${json.publicationId}`,
          ok: true,
        });
      } else if (json?.workItemStatus) {
        setActionMessage({
          text: `وضعیت کار: ${json.workItemStatus}${json.replayed ? " (تکراری، بدون اثر تازه)" : ""}`,
          ok: true,
        });
      } else {
        setActionMessage({ text: "انجام شد.", ok: true });
      }
      await refreshAll(documentId);
    } catch {
      setActionMessage({ text: "اقدام به نتیجه نرسید.", ok: false });
    } finally {
      setBusyKey(null);
    }
  }

  function buildPayload(): { payload: PublishPayload; error: string | null } {
    const slug = form.slug.trim();
    if (!isValidGuideSlug(slug)) {
      return { payload: null as unknown as PublishPayload, error: "slug معتبر نیست؛ فقط حروف کوچک لاتین، عدد و خط تیرهٔ میانی." };
    }
    if (!form.title.trim() || !form.excerpt.trim() || !form.category.trim()) {
      return { payload: null as unknown as PublishPayload, error: "عنوان، خلاصه و دسته لازم‌اند." };
    }
    if (!form.seoTitle.trim() || !form.seoDescription.trim()) {
      return { payload: null as unknown as PublishPayload, error: "عنوان و توضیح سئو لازم‌اند." };
    }
    const sections = form.sections
      .map((section, index) => ({
        position: index + 1,
        heading: section.heading.trim(),
        paragraphs: section.paragraphs.map((p) => p.trim()).filter((p) => p.length > 0),
      }))
      .filter((section) => section.heading.length > 0);
    if (sections.length === 0) {
      return { payload: null as unknown as PublishPayload, error: "دست‌کم یک بخش با عنوان و یک پاراگراف لازم است." };
    }
    if (sections.some((section) => section.paragraphs.length === 0)) {
      return { payload: null as unknown as PublishPayload, error: "هر بخش دست‌کم یک پاراگراف لازم دارد." };
    }
    const faqs = form.faqs
      .map((faq, index) => ({
        position: index + 1,
        question: faq.question.trim(),
        answer: faq.answer.trim(),
      }))
      .filter((faq) => faq.question.length > 0 || faq.answer.length > 0);
    if (faqs.some((faq) => faq.question.length === 0 || faq.answer.length === 0)) {
      return { payload: null as unknown as PublishPayload, error: "هر سؤال، پاسخ هم لازم دارد." };
    }
    const allText = [
      form.title,
      form.excerpt,
      ...sections.flatMap((s) => [s.heading, ...s.paragraphs]),
      ...faqs.flatMap((f) => [f.question, f.answer]),
    ].join(" ");
    const readingMinutes = Math.max(1, Math.ceil(countWords(allText) / 200));
    const payload: PublishPayload = {
      schema_version: "publish_payload_v1",
      slug,
      title: form.title.trim(),
      h1: form.title.trim(),
      published_at: null,
      excerpt: form.excerpt.trim(),
      category: form.category.trim(),
      reading_minutes: readingMinutes,
      updated_fa: formatJalali(new Date(), { year: true }),
      sections,
      faqs,
      seo: {
        title: form.seoTitle.trim(),
        description: form.seoDescription.trim(),
        canonical_path: `/guide/${slug}`,
      },
    };
    return { payload, error: null };
  }

  function startUpdate(detail: GuideDetail) {
    const published = detail.publishedPayload;
    if (!published) return;
    setForm({
      slug: detail.slug,
      title: published.title,
      excerpt: published.excerpt ?? "",
      category: published.category ?? "",
      sections: published.sections.map((s) => ({
        heading: s.heading,
        paragraphs: s.paragraphs.length > 0 ? [...s.paragraphs] : [""],
      })),
      faqs: published.faqs.map((f) => ({ question: f.question, answer: f.answer })),
      seoTitle: published.seo?.title ?? "",
      seoDescription: published.seo?.description ?? "",
    });
    setFormMode("update");
    setUpdateDocumentId(detail.documentId);
    setFormError(null);
    setFormSuccess(null);
    setShowForm(true);
  }

  async function handleCreate() {
    const { payload, error } = buildPayload();
    if (error) {
      setFormError(error);
      return;
    }
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);
    try {
      const isUpdate = formMode === "update" && updateDocumentId !== null;
      const url = isUpdate
        ? `/api/factory-dashboard/guides/${encodeURIComponent(updateDocumentId)}/update`
        : "/api/factory-dashboard/guides";
      const body = isUpdate ? { payload } : { slug: payload.slug, payload };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        step?: string;
        artifact?: { artifactHash?: string };
      } | null;
      if (!res.ok) {
        setFormError(
          json?.error
            ? `${json.error}${json.step ? ` (قدم: ${json.step})` : ""}`
            : "ساخت پیش‌نویس ناموفق بود.",
        );
        return;
      }
      setFormSuccess(
        `${isUpdate ? "پیش‌نویس به‌روزرسانی ساخته شد" : "پیش‌نویس ساخته شد"}؛ Hash دقیق Artifact: ${json?.artifact?.artifactHash ?? "نامشخص"}`,
      );
      setForm(EMPTY_FORM);
      setFormMode("create");
      setUpdateDocumentId(null);
      await fetchList();
    } catch {
      setFormError("ساخت پیش‌نویس به نتیجه نرسید.");
    } finally {
      setSubmitting(false);
    }
  }

  const slugError = useMemo(() => {
    if (form.slug.length === 0) return null;
    return isValidGuideSlug(form.slug) ? null : "فقط حروف کوچک لاتین، عدد و خط تیرهٔ میانی؛ بدون خط تیره در آغاز و پایان.";
  }, [form.slug]);

  if (listState.kind === "loading") {
    return (
      <div className="space-y-3" aria-label="در حال بارگذاری">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (listState.kind === "denied") {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold">دسترسی ندارید</p>
        <p className="mt-1 text-sm text-muted-foreground">
          برای مدیریت راهنما وارد حساب مدیر شوید.
        </p>
        <a className="mt-2 inline-block text-sm text-primary underline" href="/login">
          رفتن به صفحهٔ ورود
        </a>
      </div>
    );
  }

  if (listState.kind === "error") {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold">خواندن فهرست راهنما ممکن نشد</p>
        <p className="mt-1 text-sm text-muted-foreground">{listState.message}</p>
        <Button className="mt-3" variant="outline" onClick={() => void fetchList()}>
          تلاش دوباره
        </Button>
      </div>
    );
  }

  const guides = listState.guides;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {guides.length === 0
            ? "هنوز راهنمایی ثبت نشده است."
            : `${faNumber(guides.length)} راهنما در فهرست است.`}
        </p>
        <Button
          variant="outline"
          onClick={() => {
            if (!showForm) {
              setFormMode("create");
              setUpdateDocumentId(null);
              setForm(EMPTY_FORM);
            }
            setShowForm((v) => !v);
          }}
        >
          {showForm ? "بستن فرم" : "پیش‌نویس تازه"}
        </Button>
      </div>

      {formSuccess && (
        <p className="rounded-xl border border-border bg-card p-3 text-sm break-all">
          {formSuccess}
        </p>
      )}

      {showForm && (
        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold">{formMode === "update" ? "ایجاد پیش‌نویس به‌روزرسانی" : "ایجاد پیش‌نویس تازه"}</h3>
          <p className="text-xs text-muted-foreground">
            سند تا پیش از انتشار، عمومی و قابل ایندکس نیست؛ انتشار فقط پس از تأیید همین پیش‌نویس انجام می‌شود.
          </p>
          <div className="space-y-2">
            <Label htmlFor="guide-slug">slug</Label>
            <Input
              id="guide-slug"
              dir="ltr"
              disabled={formMode === "update"}
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="thailand-visa-guide"
            />
            {slugError && <p className="text-xs text-destructive">{slugError}</p>}
            <p className="text-xs text-muted-foreground">مسیر صفحه: <span dir="ltr">/guide/{form.slug || "…"}</span></p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="guide-title">عنوان</Label>
              <Input
                id="guide-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guide-category">دسته</Label>
              <Input
                id="guide-category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="guide-excerpt">خلاصه</Label>
            <Textarea
              id="guide-excerpt"
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">بخش‌ها</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setForm({
                    ...form,
                    sections: [...form.sections, { heading: "", paragraphs: [""] }],
                  })
                }
              >
                افزودن بخش
              </Button>
            </div>
            {form.sections.map((section, si) => (
              <div key={si} className="space-y-2 rounded-xl border border-border p-3">
                <div className="flex items-center gap-2">
                  <Input
                    aria-label={`عنوان بخش ${faNumber(si + 1)}`}
                    value={section.heading}
                    onChange={(e) => {
                      const sections = [...form.sections];
                      sections[si] = { ...sections[si], heading: e.target.value };
                      setForm({ ...form, sections });
                    }}
                    placeholder="عنوان بخش"
                  />
                  {form.sections.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setForm({ ...form, sections: form.sections.filter((_, i) => i !== si) })
                      }
                    >
                      حذف بخش
                    </Button>
                  )}
                </div>
                {section.paragraphs.map((paragraph, pi) => (
                  <div key={pi} className="flex items-start gap-2">
                    <Textarea
                      aria-label={`پاراگراف ${faNumber(pi + 1)} بخش ${faNumber(si + 1)}`}
                      value={paragraph}
                      onChange={(e) => {
                        const sections = [...form.sections];
                        const paragraphs = [...sections[si].paragraphs];
                        paragraphs[pi] = e.target.value;
                        sections[si] = { ...sections[si], paragraphs };
                        setForm({ ...form, sections });
                      }}
                      placeholder="متن پاراگراف"
                    />
                    {section.paragraphs.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const sections = [...form.sections];
                          sections[si] = {
                            ...sections[si],
                            paragraphs: sections[si].paragraphs.filter((_, i) => i !== pi),
                          };
                          setForm({ ...form, sections });
                        }}
                      >
                        حذف
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const sections = [...form.sections];
                    sections[si] = { ...sections[si], paragraphs: [...sections[si].paragraphs, ""] };
                    setForm({ ...form, sections });
                  }}
                >
                  افزودن پاراگراف
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">سؤال‌های متداول</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setForm({ ...form, faqs: [...form.faqs, { question: "", answer: "" }] })}
              >
                افزودن سؤال
              </Button>
            </div>
            {form.faqs.map((faq, fi) => (
              <div key={fi} className="space-y-2 rounded-xl border border-border p-3">
                <Input
                  aria-label={`پرسش ${faNumber(fi + 1)}`}
                  value={faq.question}
                  onChange={(e) => {
                    const faqs = [...form.faqs];
                    faqs[fi] = { ...faqs[fi], question: e.target.value };
                    setForm({ ...form, faqs });
                  }}
                  placeholder="پرسش"
                />
                <Textarea
                  aria-label={`پاسخ ${faNumber(fi + 1)}`}
                  value={faq.answer}
                  onChange={(e) => {
                    const faqs = [...form.faqs];
                    faqs[fi] = { ...faqs[fi], answer: e.target.value };
                    setForm({ ...form, faqs });
                  }}
                  placeholder="پاسخ"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setForm({ ...form, faqs: form.faqs.filter((_, i) => i !== fi) })}
                >
                  حذف سؤال
                </Button>
              </div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="guide-seo-title">عنوان سئو</Label>
              <Input
                id="guide-seo-title"
                value={form.seoTitle}
                onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guide-seo-description">توضیح سئو</Label>
              <Textarea
                id="guide-seo-description"
                value={form.seoDescription}
                onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
              />
            </div>
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button onClick={() => void handleCreate()} disabled={submitting || slugError !== null}>
            {submitting ? "در حال ثبت…" : "ثبت پیش‌نویس"}
          </Button>
        </div>
      )}

      {guides.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          هنوز راهنمایی ثبت نشده است. با دکمهٔ «پیش‌نویس تازه» نخستین پیش‌نویس را بسازید.
        </p>
      ) : (
        <ul className="space-y-3">
          {guides.map((guide) => (
            <li key={guide.documentId} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold">{guide.workItem?.title ?? guide.slug}</span>
                <Badge variant={STATUS_BADGE_VARIANT[guide.status] ?? "default"}>
                  {guide.statusLabel}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground" dir="ltr">{guide.slug}</p>
              <p className="mt-1 text-sm text-muted-foreground">{guide.statusDetail}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                به‌روزرسانی: {jalali(guide.workItem?.updatedAt ?? null)}
              </p>
              <Button
                className="mt-3"
                variant="outline"
                onClick={() => toggleDetail(guide.documentId)}
              >
                {expandedId === guide.documentId ? "بستن جزئیات" : "مشاهده و اقدام"}
              </Button>
              {expandedId === guide.documentId && (
                <div className="mt-4 space-y-4 border-t border-border pt-4">
                  {detailState.kind === "loading" && (
                    <div className="space-y-3" aria-label="در حال بارگذاری جزئیات">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  )}
                  {detailState.kind === "error" && (
                    <p className="text-sm text-destructive">{detailState.message}</p>
                  )}
                  {detailState.kind === "ready" && (
                    <GuideDetailPanel
                      detail={detailState.detail}
                      rejectReason={rejectReason}
                      onRejectReasonChange={setRejectReason}
                      rollbackReasons={rollbackReasons}
                      onRollbackReasonChange={(id, value) =>
                        setRollbackReasons((prev) => ({ ...prev, [id]: value }))
                      }
                      busyKey={busyKey}
                      actionMessage={actionMessage}
                      onApprove={(decision) => {
                        const wi = detailState.detail.workItem;
                        if (!wi) return;
                        const body =
                          decision === "rejected"
                            ? { decision, reason: rejectReason.trim() }
                            : { decision, reason: "" };
                        void postAction(
                          `/api/factory-dashboard/guides/${encodeURIComponent(wi.id)}/approve`,
                          body,
                          `approve-${wi.id}`,
                          detailState.detail.documentId,
                        );
                      }}
                      onPublish={() => {
                        const wi = detailState.detail.workItem;
                        if (!wi) return;
                        void postAction(
                          `/api/factory-dashboard/guides/${encodeURIComponent(wi.id)}/publish`,
                          {},
                          `publish-${wi.id}`,
                          detailState.detail.documentId,
                        );
                      }}
                      onComplete={() => {
                        const wi = detailState.detail.workItem;
                        if (!wi) return;
                        void postAction(
                          `/api/factory-dashboard/guides/${encodeURIComponent(wi.id)}/complete`,
                          {},
                          `complete-${wi.id}`,
                          detailState.detail.documentId,
                        );
                      }}
                      onRollback={(publicationId, reason) => {
                        void postAction(
                          `/api/factory-dashboard/guides/${encodeURIComponent(detailState.detail.documentId)}/rollback`,
                          { publication_id: publicationId, reason },
                          `rollback-${publicationId}`,
                          detailState.detail.documentId,
                        );
                      }}
                      onStartUpdate={() => startUpdate(detailState.detail)}
                    />
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GuideDetailPanel({
  detail,
  rejectReason,
  onRejectReasonChange,
  rollbackReasons,
  onRollbackReasonChange,
  busyKey,
  actionMessage,
  onApprove,
  onPublish,
  onComplete,
  onRollback,
  onStartUpdate,
}: {
  detail: GuideDetail;
  rejectReason: string;
  onRejectReasonChange: (value: string) => void;
  rollbackReasons: Record<string, string>;
  onRollbackReasonChange: (id: string, value: string) => void;
  busyKey: string | null;
  actionMessage: { text: string; ok: boolean } | null;
  onApprove: (decision: "approved" | "rejected") => void;
  onPublish: () => void;
  onComplete: () => void;
  onRollback: (publicationId: string, reason: string) => void;
  onStartUpdate: () => void;
}) {
  const diff = useMemo(
    () =>
      detail.draftPayload
        ? diffGuidePayload(detail.draftPayload, detail.publishedPayload)
        : null,
    [detail.draftPayload, detail.publishedPayload],
  );
  const publishedByPosition = useMemo(() => {
    const map = new Map<number, { heading: string; paragraphs: string[] }>();
    for (const section of detail.publishedPayload?.sections ?? []) {
      map.set(section.position, section);
    }
    return map;
  }, [detail.publishedPayload]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={detail.publishedPayload ? "secondary" : "brand"}>
          {detail.publishedPayload ? "به‌روزرسانی نسخهٔ منتشرشده" : "انتشار اول"}
        </Badge>
        <Badge variant={STATUS_BADGE_VARIANT[detail.status] ?? "default"}>{detail.statusLabel}</Badge>
        <span className="text-xs text-muted-foreground" dir="ltr">{detail.canonicalPath}</span>
        {detail.publishedPayload &&
          (!detail.workItem ||
            detail.workItem.status === "blocked" ||
            detail.workItem.status === "cancelled" ||
            detail.workItem.status === "succeeded") && (
            <Button variant="outline" onClick={onStartUpdate}>
              ایجاد پیش‌نویس به‌روزرسانی
            </Button>
          )}
      </div>

      {detail.workItem?.artifactHash && (
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs text-muted-foreground">Hash دقیق Artifact</p>
          <p className="mt-1 break-all font-mono text-xs" dir="ltr">
            {detail.workItem.artifactHash}
          </p>
        </div>
      )}

      {!detail.draftPayload && (
        <p className="text-sm text-muted-foreground">
          بار پیش‌نویس قابل خواندن نیست؛ Artifact این کار، بار کامل راهنما ندارد.
        </p>
      )}

      {detail.draftPayload && diff && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">{detail.draftPayload.title}</h3>
          <p className="text-sm text-muted-foreground">{detail.draftPayload.excerpt}</p>
          <p className="text-xs text-muted-foreground">
            دسته: {detail.draftPayload.category} · {faNumber(detail.draftPayload.reading_minutes)} دقیقه خواندن
          </p>
          {diff.sections.map((section, si) => (
            <div key={si} className="rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-semibold">{section.heading}</h4>
                {section.state === "added" && <Badge variant="brand">تازه</Badge>}
                {section.state === "removed" && <Badge variant="destructive">حذف‌شده</Badge>}
                {section.state === "changed" && <Badge variant="warning">تغییرکرده</Badge>}
              </div>
              <div className="mt-2 space-y-2">
                {section.paragraphs.map((paragraph, pi) => {
                  const oldText = publishedByPosition.get(
                    detail.draftPayload?.sections[si]?.position ?? -1,
                  )?.paragraphs[pi];
                  return (
                    <div key={pi}>
                      <p className="text-sm">{paragraph.text}</p>
                      {paragraph.state === "added" && (
                        <p className="text-xs text-muted-foreground">پاراگراف تازه</p>
                      )}
                      {paragraph.state === "changed" && oldText && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          پیش‌تر: {oldText}
                        </p>
                      )}
                      {paragraph.state === "removed" && (
                        <p className="text-xs text-muted-foreground">این پاراگراف در پیش‌نویس نیست.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {detail.draftPayload.faqs.length > 0 && (
            <div className="rounded-xl border border-border p-3">
              <h4 className="text-sm font-semibold">سؤال‌های متداول</h4>
              <ul className="mt-2 space-y-2">
                {detail.draftPayload.faqs.map((faq, i) => (
                  <li key={i}>
                    <p className="text-sm font-semibold">{faq.question}</p>
                    <p className="text-sm text-muted-foreground">{faq.answer}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="rounded-xl border border-border p-3">
            <h4 className="text-sm font-semibold">سئو</h4>
            <p className="mt-1 text-sm">{detail.draftPayload.seo.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{detail.draftPayload.seo.description}</p>
            <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
              {detail.draftPayload.seo.canonical_path}
            </p>
          </div>
        </div>
      )}

      {actionMessage && (
        <p className={`rounded-xl border border-border p-3 text-sm ${actionMessage.ok ? "" : "text-destructive"}`}>
          {actionMessage.text}
        </p>
      )}

      {detail.workItem && (
        <div className="space-y-3 rounded-xl border border-border p-3">
          <h4 className="text-sm font-semibold">تأیید یا رد پیش‌نویس</h4>
          {detail.canApprove ? (
            <>
              <p className="text-xs text-muted-foreground">
                تأیید، با دلیل پیش‌فرض «تأیید مدیر پروژه برای انتشار راهنما» ثبت می‌شود و به همین Artifact و Hash متصل است.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={busyKey !== null}
                  onClick={() => onApprove("approved")}
                >
                  {busyKey === `approve-${detail.workItem?.id}` ? "در حال ثبت…" : "تأیید پیش‌نویس"}
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reject-reason">دلیل رد (اجباری)</Label>
                <Textarea
                  id="reject-reason"
                  value={rejectReason}
                  onChange={(e) => onRejectReasonChange(e.target.value)}
                  placeholder="چرا این پیش‌نویس رد می‌شود؟"
                />
                <Button
                  variant="destructive"
                  disabled={busyKey !== null || rejectReason.trim().length === 0}
                  onClick={() => onApprove("rejected")}
                >
                  رد پیش‌نویس
                </Button>
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">{detail.approveDisabledReason}</p>
          )}
        </div>
      )}

      {detail.workItem && (
        <div className="space-y-3 rounded-xl border border-border p-3">
          <h4 className="text-sm font-semibold">انتشار</h4>
          {detail.publication && (
            <p className="text-sm text-muted-foreground">
              وضعیت Publication: {publicationLabel(detail.publication.status)}
              {detail.publication.id ? ` · شناسه: ${shortId(detail.publication.id)}` : ""}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!detail.canPublish || busyKey !== null}
              onClick={onPublish}
            >
              {busyKey === `publish-${detail.workItem.id}` ? "در حال انتشار…" : detail.workItem.status === "publishing" ? "تلاش دوبارهٔ انتشار" : "انتشار"}
            </Button>
            <Button
              variant="outline"
              disabled={!detail.canComplete || busyKey !== null}
              onClick={onComplete}
            >
              {busyKey === `complete-${detail.workItem.id}` ? "در حال بررسی…" : "بررسی وضعیت و تکمیل"}
            </Button>
          </div>
          {!detail.canPublish && detail.publishDisabledReason && (
            <p className="text-xs text-muted-foreground">{detail.publishDisabledReason}</p>
          )}
          {!detail.canComplete && detail.completeDisabledReason && (
            <p className="text-xs text-muted-foreground">{detail.completeDisabledReason}</p>
          )}
          {detail.canComplete && (
            <p className="text-xs text-muted-foreground">
              اگر Publication هنوز verified نشده باشد، این کنش پیام همان وضعیت را نشان می‌دهد؛ بعداً دوباره بزنید.
            </p>
          )}
        </div>
      )}

      {detail.versions.length > 0 && (
        <div className="rounded-xl border border-border p-3">
          <h4 className="text-sm font-semibold">نسخه‌های قبلی</h4>
          <ul className="mt-2 space-y-2">
            {detail.versions.map((version) => (
              <li key={version.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-b-0 last:pb-0">
                <span className="text-sm">نسخهٔ {faNumber(version.versionNo)}</span>
                <span className="flex flex-wrap items-center gap-2">
                  {version.isPublishedPointer && <Badge variant="success">نسخهٔ جاری</Badge>}
                  {version.hasVerifiedPublication && <Badge variant="secondary">دارای انتشار verified</Badge>}
                  <span className="text-xs text-muted-foreground" dir="ltr">{shortId(version.contentHash)}</span>
                  <span className="text-xs text-muted-foreground">{jalali(version.createdAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {detail.publications.length > 0 && (
        <div className="rounded-xl border border-border p-3">
          <h4 className="text-sm font-semibold">انتشارها و Rollback</h4>
          <ul className="mt-2 space-y-3">
            {detail.publications.map((pub) => (
              <li key={pub.id} className="space-y-2 border-b border-border pb-3 last:border-b-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm">
                    {pub.kind === "rollback" ? "Rollback" : "انتشار"} · {publicationLabel(pub.status)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    outbox: {pub.outboxStatus ? publicationLabel(pub.outboxStatus) : "نامشخص"} · {jalali(pub.createdAt)}
                  </span>
                </div>
                {pub.kind === "publish" && (
                  <div className="space-y-2">
                    <Input
                      aria-label={`دلیل Rollback برای انتشار ${shortId(pub.id)}`}
                      value={rollbackReasons[pub.id] ?? ""}
                      onChange={(e) => onRollbackReasonChange(pub.id, e.target.value)}
                      placeholder="دلیل Rollback"
                    />
                    <Button
                      variant="outline"
                      disabled={
                        !pub.canRollback ||
                        busyKey !== null ||
                        (rollbackReasons[pub.id] ?? "").trim().length === 0
                      }
                      onClick={() => onRollback(pub.id, (rollbackReasons[pub.id] ?? "").trim())}
                    >
                      {busyKey === `rollback-${pub.id}` ? "در حال ثبت…" : "درخواست Rollback"}
                    </Button>
                    {!pub.canRollback && pub.rollbackDisabledReason && (
                      <p className="text-xs text-muted-foreground">{pub.rollbackDisabledReason}</p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {detail.approvals.length > 0 && (
        <div className="rounded-xl border border-border p-3">
          <h4 className="text-sm font-semibold">تأییدهای ثبت‌شده</h4>
          <ul className="mt-2 space-y-2">
            {detail.approvals.map((approval) => (
              <li key={approval.id} className="border-b border-border pb-2 last:border-b-0 last:pb-0">
                <p className="text-sm">
                  {approval.decision === "approved" ? "تأیید" : "رد"} · {approval.reviewerId} · {jalali(approval.createdAt)}
                </p>
                {approval.reason && <p className="text-xs text-muted-foreground">{approval.reason}</p>}
                <p className="text-xs text-muted-foreground" dir="ltr">{shortId(approval.artifactHash)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

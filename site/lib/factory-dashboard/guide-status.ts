/**
 * منطق خالص وضعیت راهنما برای بخش مدیریت راهنمای داشبورد.
 *
 * این فایل، هیچ ورودی/خروجی، هیچ کلید و هیچ فراخوان شبکه‌ای ندارد و
 * هم سمت سرور و هم سمت مرورگر قابل ایمپورت است. وضعیت نمایشی راهنما
 * از ترکیب سه منبع ساخته می‌شود: اشاره‌گر انتشار سند، وضعیت Work Item
 * و وضعیت Publication. ترتیب بررسی، عمدی است: خطا بر همه‌چیز مقدم است،
 * بعد انتشار در جریان، بعد موفقیت، بعد تأیید و انتظار، و در آخر پیش‌نویس.
 *
 * وضعیت‌های نمایشی (همان شش وضعیت خواسته‌شده):
 * - draft: پیش‌نویس، بدون تأیید و بدون انتشار
 * - awaiting_approval: منتظر تأیید انسانی
 * - approved: تأییدشده و آمادهٔ انتشار
 * - publishing: در حال انتشار (Publication هنوز verified نشده است)
 * - published: منتشرشده (اشاره‌گر روی نسخه است و Publication آن verified است)
 * - error: خطا یا وضعیت ناسازگار که نیازمند بررسی مدیر است
 */

export type GuideStatus =
  | "draft"
  | "awaiting_approval"
  | "approved"
  | "publishing"
  | "published"
  | "error";

export const GUIDE_STATUS_LABELS: Record<GuideStatus, string> = {
  draft: "پیش‌نویس",
  awaiting_approval: "منتظر تأیید",
  approved: "تأییدشده",
  publishing: "در حال انتشار",
  published: "منتشرشده",
  error: "خطا",
};

/** الگوی slug راهنما؛ همان الگوی خواسته‌شده در مأموریت. */
export const GUIDE_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** اعتبارسنجی slug: فقط حروف کوچک لاتین و عدد و خط تیرهٔ میانی، حداکثر ۶۴ نویسه. */
export function isValidGuideSlug(slug: unknown): slug is string {
  return (
    typeof slug === "string" &&
    slug.length >= 1 &&
    slug.length <= 64 &&
    GUIDE_SLUG_PATTERN.test(slug)
  );
}

export interface GuideStatusInput {
  /** وضعیت ستون status سند؛ بایگانی‌شده، خطا محسوب می‌شود. */
  documentStatus: string | null;
  /** اشاره‌گر انتشار سند؛ null یعنی هنوز هیچ نسخه‌ای منتشر نشده است. */
  publishedVersionId: string | null;
  /** وضعیت Work Item؛ null یعنی برای سند، کاری ساخته نشده است. */
  workItemStatus: string | null;
  /** وضعیت Publication مرتبط با Work Item؛ null یعنی انتشاری نیست. */
  publicationStatus: string | null;
  /** آیا Work Item از پیش result_version_id دارد (برای تلاش دوبارهٔ انتشار). */
  hasResultVersion?: boolean;
}

export interface GuideStatusResult {
  status: GuideStatus;
  label: string;
  detail: string;
  canApprove: boolean;
  canPublish: boolean;
  canComplete: boolean;
  approveDisabledReason: string | null;
  publishDisabledReason: string | null;
  completeDisabledReason: string | null;
}

/**
 * مشتق‌سازی وضعیت نمایشی راهنما. ورودی‌ها فقط رشته‌اند و هیچ‌چیز
 * دیگری خوانده نمی‌شود؛ پس همین تابع، مرجع واحد تست وضعیت است.
 */
export function deriveGuideStatus(input: GuideStatusInput): GuideStatusResult {
  const { documentStatus, publishedVersionId, workItemStatus, publicationStatus } = input;
  const canApprove = workItemStatus === "awaiting_approval";
  const canPublish =
    workItemStatus === "approved" ||
    (workItemStatus === "publishing" && input.hasResultVersion === true);
  const canComplete = workItemStatus === "publishing";
  const base = {
    canApprove,
    canPublish,
    canComplete,
    approveDisabledReason: canApprove
      ? null
      : "تأیید فقط وقتی ممکن است که کار در وضعیت «منتظر تأیید» باشد.",
    publishDisabledReason: canPublish
      ? null
      : workItemStatus === "publishing"
        ? "تلاش دوبارهٔ انتشار فقط وقتی ممکن است که نسخه ساخته شده باشد."
        : "انتشار فقط وقتی ممکن است که کار تأیید شده باشد.",
    completeDisabledReason: canComplete
      ? null
      : "تکمیل فقط وقتی ممکن است که کار در وضعیت «در حال انتشار» باشد.",
  };

  if (documentStatus === "archived") {
    return {
      ...base,
      status: "error",
      label: GUIDE_STATUS_LABELS.error,
      detail: "سند بایگانی شده است و در چرخهٔ انتشار نیست.",
    };
  }
  if (workItemStatus === "blocked" || workItemStatus === "cancelled") {
    return {
      ...base,
      status: "error",
      label: GUIDE_STATUS_LABELS.error,
      detail:
        workItemStatus === "blocked"
          ? "کار مسدود شده است؛ دلیل آن را در جزئیات ببینید."
          : "کار لغو شده است.",
    };
  }
  if (
    publicationStatus === "needs_intervention" ||
    publicationStatus === "timeout" ||
    publicationStatus === "outcome_unknown"
  ) {
    return {
      ...base,
      status: "error",
      label: GUIDE_STATUS_LABELS.error,
      detail: "انتشار به مداخله نیاز دارد؛ وضعیت Publication را در جزئیات ببینید.",
    };
  }
  if (workItemStatus === "publishing") {
    return {
      ...base,
      status: "publishing",
      label: GUIDE_STATUS_LABELS.publishing,
      detail:
        publicationStatus === "verified"
          ? "انتشار verified شده است و کار آمادهٔ تکمیل است."
          : "انتشار در جریان است؛ راستی‌آزمایی Outbox هنوز کامل نشده است.",
    };
  }
  if (workItemStatus === "succeeded") {
    if (publishedVersionId) {
      return {
        ...base,
        status: "published",
        label: GUIDE_STATUS_LABELS.published,
        detail: "نسخهٔ جاری منتشر شده است و روی صفحه دیده می‌شود.",
      };
    }
    return {
      ...base,
      status: "error",
      label: GUIDE_STATUS_LABELS.error,
      detail: "کار موفق اعلام شده ولی اشاره‌گر انتشار سند خالی است.",
    };
  }
  if (workItemStatus === "approved") {
    return {
      ...base,
      status: "approved",
      label: GUIDE_STATUS_LABELS.approved,
      detail: "پیش‌نویس تأیید شده است و آمادهٔ انتشار است.",
    };
  }
  if (workItemStatus === "awaiting_approval") {
    return {
      ...base,
      status: "awaiting_approval",
      label: GUIDE_STATUS_LABELS.awaiting_approval,
      detail: "پیش‌نویس ساخته شده و در انتظار تأیید مدیر است.",
    };
  }
  if (publishedVersionId) {
    return {
      ...base,
      status: "published",
      label: GUIDE_STATUS_LABELS.published,
      detail: "نسخهٔ منتشرشده دارد؛ برای تغییر، پیش‌نویس تازه بسازید.",
    };
  }
  return {
    ...base,
    status: "draft",
    label: GUIDE_STATUS_LABELS.draft,
    detail: "هنوز تأیید و انتشاری برای این سند ثبت نشده است.",
  };
}

export interface RollbackTargetInput {
  /** وضعیت Publication مرجع؛ null یعنی انتشاری برای Rollback نیست. */
  publicationStatus: string | null;
  /** نوع Publication مرجع؛ فقط publish رو به جلو قابل Rollback است. */
  publicationKind: string | null;
  /** نسخهٔ قبلی Publication مرجع؛ null یعنی چیزی برای بازگشت نیست. */
  previousVersionId: string | null;
  /** آیا نسخهٔ هدف، Publication با وضعیت verified دارد؟ */
  targetHasVerifiedPublication: boolean;
}

export interface RollbackAvailability {
  canRollback: boolean;
  reason: string | null;
}

/**
 * پیش‌شرط نمایشی دکمهٔ Rollback؛ همان قیدهایی که مسیر Rollback داخلی
 * و Function اتمیک بررسی می‌کنند، این‌جا برای غیرفعال‌سازی دکمه با
 * دلیل به کار می‌روند. بررسی نهایی همچنان سمت سرور است.
 */
export function rollbackAvailability(input: RollbackTargetInput): RollbackAvailability {
  if (input.publicationStatus === null) {
    return { canRollback: false, reason: "انتشاری برای Rollback نیست." };
  }
  if (input.publicationKind !== "publish") {
    return { canRollback: false, reason: "فقط انتشار رو به جلو قابل Rollback است." };
  }
  if (input.publicationStatus !== "verified") {
    return { canRollback: false, reason: "Publication مرجع هنوز verified نشده است." };
  }
  if (input.previousVersionId === null) {
    return { canRollback: false, reason: "این انتشار نسخهٔ قبلی برای بازگشت ندارد." };
  }
  if (!input.targetHasVerifiedPublication) {
    return {
      canRollback: false,
      reason: "نسخهٔ هدف، Publication با وضعیت verified ندارد.",
    };
  }
  return { canRollback: true, reason: null };
}

/* ------------------------------------------------------------------ */
/* مقایسهٔ پاراگرافی پیش‌نویس با نسخهٔ منتشرشده (نمای جزئیات)          */
/* ------------------------------------------------------------------ */

import type { PublishPayload } from "@/lib/content-versioning";

export type ParagraphDiffState = "same" | "changed" | "added" | "removed";

export interface ParagraphDiff {
  text: string;
  state: ParagraphDiffState;
}

export interface SectionDiff {
  heading: string;
  state: ParagraphDiffState;
  paragraphs: ParagraphDiff[];
}

export interface GuidePayloadDiff {
  isFirstPublish: boolean;
  sections: SectionDiff[];
  /** فیلدهایی که نسبت به نسخهٔ منتشرشده فرق کرده‌اند؛ در انتشار اول تهی است. */
  changedFields: Array<"title" | "excerpt" | "category" | "sections" | "faqs" | "seo">;
  faqs: Array<{
    question: string;
    state: ParagraphDiffState;
    answerChanged: boolean;
  }>;
  seoChanged: { title: boolean; description: boolean; canonicalPath: boolean };
}

/**
 * مقایسهٔ پیش‌نویس با نسخهٔ منتشرشده، بر اساس position بخش و سؤال و
 * ترتیب پاراگراف‌ها. اگر نسخهٔ منتشرشده نباشد، همه‌چیز «انتشار اول»
 * است و هیچ مقایسه‌ای انجام نمی‌شود. مقایسهٔ پاراگراف‌ها ترتیبی است:
 * درج پاراگراف در میان بخش، پاراگراف‌های بعد را «تغییرکرده» نشان
 * می‌دهد؛ این محدودیت در رابط هم گفته می‌شود.
 */
export function diffGuidePayload(
  draft: PublishPayload,
  published: PublishPayload | null,
): GuidePayloadDiff {
  if (published === null) {
    return {
      isFirstPublish: true,
      sections: draft.sections.map((section) => ({
        heading: section.heading,
        state: "added" as const,
        paragraphs: section.paragraphs.map((text) => ({ text, state: "added" as const })),
      })),
      changedFields: [],
      faqs: draft.faqs.map((faq) => ({ question: faq.question, state: "added" as const, answerChanged: false })),
      seoChanged: { title: false, description: false, canonicalPath: false },
    };
  }
  const publishedByPosition = new Map(published.sections.map((s) => [s.position, s]));
  const draftPositions = new Set(draft.sections.map((s) => s.position));
  const sections: SectionDiff[] = draft.sections.map((section) => {
    const old = publishedByPosition.get(section.position);
    if (!old) {
      return {
        heading: section.heading,
        state: "added" as const,
        paragraphs: section.paragraphs.map((text) => ({ text, state: "added" as const })),
      };
    }
    const paragraphs: ParagraphDiff[] = section.paragraphs.map((text, index) => {
      const oldText = old.paragraphs[index];
      if (oldText === undefined) return { text, state: "added" as const };
      if (oldText === text) return { text, state: "same" as const };
      return { text, state: "changed" as const };
    });
    const headingChanged = old.heading !== section.heading;
    const removedCount = Math.max(0, old.paragraphs.length - section.paragraphs.length);
    const state: ParagraphDiffState =
      !headingChanged &&
      paragraphs.every((p) => p.state === "same") &&
      removedCount === 0
        ? "same"
        : "changed";
    return { heading: section.heading, state, paragraphs };
  });
  for (const old of published.sections) {
    if (!draftPositions.has(old.position)) {
      sections.push({
        heading: old.heading,
        state: "removed",
        paragraphs: old.paragraphs.map((text) => ({ text, state: "removed" as const })),
      });
    }
  }
  const sectionsChanged = sections.some((s) => s.state !== "same");

  const publishedFaqsByPosition = new Map(published.faqs.map((f) => [f.position, f]));
  const draftFaqPositions = new Set(draft.faqs.map((f) => f.position));
  const faqs: GuidePayloadDiff["faqs"] = draft.faqs.map((faq) => {
    const old = publishedFaqsByPosition.get(faq.position);
    if (!old) return { question: faq.question, state: "added" as const, answerChanged: false };
    const answerChanged = old.answer !== faq.answer;
    const state: ParagraphDiffState =
      old.question === faq.question && !answerChanged ? "same" : "changed";
    return { question: faq.question, state, answerChanged };
  });
  for (const old of published.faqs) {
    if (!draftFaqPositions.has(old.position)) {
      faqs.push({ question: old.question, state: "removed" as const, answerChanged: false });
    }
  }
  const faqsChanged = faqs.some((f) => f.state !== "same");

  const seoChanged = {
    title: draft.seo.title !== published.seo.title,
    description: draft.seo.description !== published.seo.description,
    canonicalPath: draft.seo.canonical_path !== published.seo.canonical_path,
  };
  const seoAnyChanged = seoChanged.title || seoChanged.description || seoChanged.canonicalPath;

  const changedFields: GuidePayloadDiff["changedFields"] = [];
  if (draft.title !== published.title || draft.h1 !== published.h1) changedFields.push("title");
  if (draft.excerpt !== published.excerpt) changedFields.push("excerpt");
  if (draft.category !== published.category) changedFields.push("category");
  if (sectionsChanged) changedFields.push("sections");
  if (faqsChanged) changedFields.push("faqs");
  if (seoAnyChanged) changedFields.push("seo");

  return { isFirstPublish: false, sections, changedFields, faqs, seoChanged };
}

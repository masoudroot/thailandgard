import { describe, expect, it } from 'vitest';
import {
  VERSIONED_READ_SLUGS,
  VersionedReadError,
  compareGuideRenders,
  fetchVersionedGuide,
  isVersionedReadSlug,
  payloadToGuide,
  resolveContentReadMode,
  visibleTextHash,
} from '@/lib/guide-versioned-read';
import type { PublishPayload } from '@/lib/content-versioning';
import type { Guide } from '@/lib/guides';

const SAMPLE_PAYLOAD: PublishPayload = {
  schema_version: 'publish_payload_v1',
  slug: 'r2b-test-doc',
  title: 'سند آزمایشی R2-B',
  h1: null,
  published_at: null,
  excerpt: 'لید نسخهٔ اول',
  category: 'آزمایش',
  reading_minutes: 3,
  updated_fa: '۸ آبان ۱۴۰۵',
  sections: [{ position: 1, heading: 'بخش اول', paragraphs: ['پاراگراف اول'] }],
  faqs: [{ position: 1, question: 'سؤال؟', answer: 'جواب.' }],
  seo: {
    title: 'سند آزمایشی R2-B',
    description: 'لید نسخهٔ اول',
    canonical_path: '/guide/r2b-test-doc',
  },
};

const CFG = { supabaseUrl: 'https://staging.example', serviceRoleKey: 'service-key-for-tests' };

function stubFetch(
  docs: unknown[],
  versions: unknown[],
  ok = true,
): (url: string) => Promise<Response> {
  return async (url: string) => {
    const body = url.includes('content_documents') ? docs : versions;
    return {
      ok,
      status: ok ? 200 : 500,
      json: async () => body,
    } as unknown as Response;
  };
}

function guideFromPayload(payload: PublishPayload): Guide {
  return payloadToGuide(payload);
}

describe('resolveContentReadMode', () => {
  it('نبودن و خالی و نامعتبر، legacy می‌شود', () => {
    expect(resolveContentReadMode(undefined)).toBe('legacy');
    expect(resolveContentReadMode(null)).toBe('legacy');
    expect(resolveContentReadMode('')).toBe('legacy');
    expect(resolveContentReadMode('bogus')).toBe('legacy');
    expect(resolveContentReadMode('production')).toBe('legacy');
  });

  it('دو حالت غیرlegacy فقط با مقدار دقیق و نرمال‌شده می‌آیند', () => {
    expect(resolveContentReadMode('versioned')).toBe('versioned');
    expect(resolveContentReadMode(' Versioned ')).toBe('versioned');
    expect(resolveContentReadMode('VERSIONED')).toBe('versioned');
    expect(resolveContentReadMode('shadow_compare')).toBe('shadow_compare');
    expect(resolveContentReadMode(' Shadow_Compare ')).toBe('shadow_compare');
  });
});

describe('isVersionedReadSlug', () => {
  it('فقط دو slug محدودهٔ Staging باز هستند', () => {
    expect(VERSIONED_READ_SLUGS).toEqual(['best-time-to-visit-thailand', 'r2b-test-doc']);
    expect(isVersionedReadSlug('best-time-to-visit-thailand')).toBe(true);
    expect(isVersionedReadSlug('r2b-test-doc')).toBe(true);
    expect(isVersionedReadSlug('thailand-visa-guide')).toBe(false);
    expect(isVersionedReadSlug('')).toBe(false);
  });
});

describe('payloadToGuide و visibleTextHash', () => {
  it('payload به همان فیلدهای Guide می‌رسد', () => {
    const guide = guideFromPayload(SAMPLE_PAYLOAD);
    expect(guide.slug).toBe('r2b-test-doc');
    expect(guide.title).toBe('سند آزمایشی R2-B');
    expect(guide.excerpt).toBe('لید نسخهٔ اول');
    expect(guide.sections).toEqual([{ heading: 'بخش اول', paragraphs: ['پاراگراف اول'] }]);
    expect(guide.faqs).toEqual([{ question: 'سؤال؟', answer: 'جواب.' }]);
  });

  it('Hash متن قابل‌مشاهده قطعی است و با تغییر متن عوض می‌شود', () => {
    const guide = guideFromPayload(SAMPLE_PAYLOAD);
    expect(visibleTextHash(guide)).toBe(visibleTextHash(guide));
    expect(visibleTextHash(guide)).toMatch(/^[0-9a-f]{64}$/);
    const changed = { ...guide, excerpt: 'لید نسخهٔ دوم' };
    expect(visibleTextHash(changed)).not.toBe(visibleTextHash(guide));
  });
});

describe('compareGuideRenders', () => {
  it('دو رندر یکسان، equal است و اختلافی ندارد', () => {
    const guide = guideFromPayload(SAMPLE_PAYLOAD);
    const comparison = compareGuideRenders('r2b-test-doc', guide, guide);
    expect(comparison.equal).toBe(true);
    expect(comparison.differences).toEqual([]);
    expect(comparison.legacy.canonical).toBe('/guide/r2b-test-doc');
    expect(comparison.versioned.canonical).toBe('/guide/r2b-test-doc');
  });

  it('تغییر لید، description و visibleHash را اختلاف می‌زند، نه title را', () => {
    const legacy = guideFromPayload(SAMPLE_PAYLOAD);
    const versioned = { ...legacy, excerpt: 'لید نسخهٔ دوم' };
    const comparison = compareGuideRenders('r2b-test-doc', legacy, versioned);
    expect(comparison.equal).toBe(false);
    expect(comparison.differences).toContain('description');
    expect(comparison.differences).toContain('visibleHash');
    expect(comparison.differences).not.toContain('title');
  });

  it('تغییر بخش، sections و visibleHash را اختلاف می‌زند', () => {
    const legacy = guideFromPayload(SAMPLE_PAYLOAD);
    const versioned = {
      ...legacy,
      sections: [{ heading: 'بخش دوم', paragraphs: ['پاراگراف دوم'] }],
    };
    const comparison = compareGuideRenders('r2b-test-doc', legacy, versioned);
    expect(comparison.differences).toContain('sections');
    expect(comparison.differences).toContain('visibleHash');
  });
});

describe('fetchVersionedGuide با fetch ساختگی', () => {
  const doc = {
    id: 'doc-1',
    slug: 'r2b-test-doc',
    canonical_path: '/guide/r2b-test-doc',
    published_version_id: 'ver-1',
  };
  const version = {
    id: 'ver-1',
    content_id: 'doc-1',
    version_no: 1,
    payload: SAMPLE_PAYLOAD,
    content_hash: 'a'.repeat(64),
  };

  it('مسیر سالم، Guide نسخهٔ منتشرشده را با شناسه‌ها برمی‌گرداند', async () => {
    const result = await fetchVersionedGuide(
      'r2b-test-doc',
      CFG,
      stubFetch([doc], [version]),
    );
    expect(result.guide.title).toBe('سند آزمایشی R2-B');
    expect(result.documentId).toBe('doc-1');
    expect(result.versionId).toBe('ver-1');
    expect(result.versionNo).toBe(1);
    expect(result.canonicalPath).toBe('/guide/r2b-test-doc');
  });

  it('نبودن document، خطای صریح DOCUMENT_NOT_FOUND می‌دهد', async () => {
    await expect(fetchVersionedGuide('r2b-test-doc', CFG, stubFetch([], []))).rejects.toMatchObject({
      name: 'VersionedReadError',
      code: 'DOCUMENT_NOT_FOUND',
    });
  });

  it('اشاره‌گر تهی، خطای صریح VERSION_NOT_FOUND می‌دهد', async () => {
    const noPointer = { ...doc, published_version_id: null };
    await expect(
      fetchVersionedGuide('r2b-test-doc', CFG, stubFetch([noPointer], [])),
    ).rejects.toMatchObject({ code: 'VERSION_NOT_FOUND' });
  });

  it('نسخهٔ پیدا‌نشده، خطای صریح VERSION_NOT_FOUND می‌دهد', async () => {
    await expect(fetchVersionedGuide('r2b-test-doc', CFG, stubFetch([doc], []))).rejects.toMatchObject({
      code: 'VERSION_NOT_FOUND',
    });
  });

  it('نسخهٔ سند دیگر، خطای صریح VERSION_MISMATCH می‌دهد', async () => {
    const foreign = { ...version, content_id: 'doc-other' };
    await expect(
      fetchVersionedGuide('r2b-test-doc', CFG, stubFetch([doc], [foreign])),
    ).rejects.toMatchObject({ code: 'VERSION_MISMATCH' });
  });

  it('پاسخ ناموفق بالادست، خطای صریح UPSTREAM_ERROR می‌دهد', async () => {
    await expect(
      fetchVersionedGuide('r2b-test-doc', CFG, stubFetch([doc], [version], false)),
    ).rejects.toMatchObject({ code: 'UPSTREAM_ERROR' });
  });

  it('نبودن پیکربندی، خطای صریح NOT_CONFIGURED می‌دهد', async () => {
    await expect(
      fetchVersionedGuide('r2b-test-doc', null, stubFetch([doc], [version])),
    ).rejects.toMatchObject({ code: 'NOT_CONFIGURED' });
  });

  it('payload نامعتبر، از اعتبارسنجی lib نسخه‌بندی خطا می‌گیرد', async () => {
    const bad = { ...version, payload: { ...SAMPLE_PAYLOAD, title: '' } };
    await expect(fetchVersionedGuide('r2b-test-doc', CFG, stubFetch([doc], [bad]))).rejects.toThrow(
      /validatePublishPayload/,
    );
  });
});

describe('VersionedReadError', () => {
  it('کد و نام خطا روی نمونه می‌نشینند', () => {
    const error = new VersionedReadError('DOCUMENT_NOT_FOUND', 'no doc');
    expect(error.code).toBe('DOCUMENT_NOT_FOUND');
    expect(error.name).toBe('VersionedReadError');
    expect(error).toBeInstanceOf(Error);
  });
});

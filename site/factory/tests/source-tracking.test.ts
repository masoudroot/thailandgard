import { describe, expect, it } from 'vitest';
import { pathnamePagePart, tourPagePart } from '@/lib/source-tracking';
import { parseSource } from '@/lib/lead-metrics';

/**
 * باگ #230: بخش «صفحه» در منبع باید برای لید و کلیک تماس یکی باشد.
 *
 * فرم، مسیر را دستی می‌ساخت (`tour/<slug>`) و ردیاب، مسیر واقعی مرورگر را
 * می‌خواند (`tours/<slug>`). نتیجه: هر گزارش تبدیل این دو را جدا می‌شمرد.
 */
describe('source page part', () => {
  it('gives a tour the same page part from its slug and from its pathname', () => {
    const slug = 'phuket-7-days';
    expect(tourPagePart(slug)).toBe('tours/phuket-7-days');
    expect(tourPagePart(slug)).toBe(pathnamePagePart(`/tours/${slug}`));
  });

  it('keeps the rest of the site paths as they are', () => {
    expect(pathnamePagePart('/')).toBe('home');
    expect(pathnamePagePart('')).toBe('home');
    expect(pathnamePagePart('/contact')).toBe('contact');
    expect(pathnamePagePart('/guides/bangkok-first-trip')).toBe('guides/bangkok-first-trip');
  });

  it('never leaves a leading slash that would split a page into a different key', () => {
    expect(tourPagePart('/phuket-7-days')).toBe('tours/phuket-7-days');
    expect(pathnamePagePart('//contact')).toBe('contact');
  });

  it('produces one page key for a lead and a call click on the same tour', () => {
    const slug = 'krabi-6-days';
    const leadSource = `direct|${tourPagePart(slug)}|none`;
    const clickSource = `direct|${pathnamePagePart(`/tours/${slug}`)}|none`;
    expect(parseSource(leadSource).page).toBe(parseSource(clickSource).page);
  });

  it('uses the real route prefix, not the old singular one', () => {
    expect(tourPagePart('phuket-7-days').startsWith('tour/')).toBe(false);
    expect(tourPagePart('phuket-7-days').split('/')[0]).toBe('tours');
  });
});

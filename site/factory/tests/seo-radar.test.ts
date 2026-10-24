import { describe, expect, it } from 'vitest';
import { buildSeoRadar } from '@/lib/factory/seo/radar';

const now = new Date('2026-10-21T00:00:00.000Z');

describe('SEO radar', () => {
  it('aggregates daily GSC rows into one opportunity signal', () => {
    const result = buildSeoRadar(
      {
        gscQueries: [
          {
            query: 'تور پوکت',
            clicks: 0,
            impressions: 200,
            ctr: 0,
            avg_position: 14,
            date: '2026-10-18',
          },
          {
            query: 'تور پوکت',
            clicks: 1,
            impressions: 300,
            ctr: 0.003,
            avg_position: 16,
            date: '2026-10-19',
          },
        ],
        pageAnalytics: [],
        intelFeed: [],
        serp: [],
      },
      { now },
    );

    expect(result.signals).toHaveLength(1);
    expect(result.signals[0].type).toBe('query_opportunity');
    expect(result.signals[0].metrics.impressions).toBe(500);
    expect(result.signals[0].priority).toBeGreaterThan(50);
  });

  it('detects striking-distance queries', () => {
    const result = buildSeoRadar(
      {
        gscQueries: [
          {
            query: 'بهترین زمان سفر به تایلند',
            clicks: 4,
            impressions: 120,
            ctr: 0.033,
            avg_position: 6,
            date: '2026-10-19',
          },
        ],
        pageAnalytics: [],
        intelFeed: [],
        serp: [],
      },
      { now },
    );
    expect(result.signals[0].type).toBe('striking_distance');
  });

  it('flags a page with a sharp traffic drop', () => {
    const result = buildSeoRadar(
      {
        gscQueries: [],
        pageAnalytics: [
          {
            page_path: '/tours/phuket',
            views: 100,
            clicks: 100,
            impressions: 1000,
            avg_position: 8,
            date: '2026-10-08',
          },
          {
            page_path: '/tours/phuket',
            views: 20,
            clicks: 20,
            impressions: 400,
            avg_position: 9,
            date: '2026-10-15',
          },
        ],
        intelFeed: [],
        serp: [],
      },
      { now },
    );
    expect(result.signals[0].type).toBe('page_decay');
    expect(result.signals[0].metrics.drop).toBeGreaterThan(0.7);
  });

  it('keeps relevant fresh news and ignores unrelated items', () => {
    const result = buildSeoRadar(
      {
        gscQueries: [],
        pageAnalytics: [],
        intelFeed: [
          {
            title: 'رونق گردشگری تایلند در فصل باران',
            summary: 'تایلند میزبان گردشگران بیشتری است.',
            source_url: 'https://example.com/thailand-tourism',
            source_name: 'TAT News',
            tags: ['تایلند', 'گردشگری'],
            blog_angle: 'فرصت تولید محتوای فصلی',
            created_at: '2026-10-20T10:00:00.000Z',
          },
          {
            title: 'نتیجهٔ بازی فوتبال',
            summary: 'خبر ورزشی',
            source_url: 'https://example.com/football',
            source_name: 'Sports',
            tags: ['ورزش'],
            blog_angle: null,
            created_at: '2026-10-20T10:00:00.000Z',
          },
        ],
        serp: [],
      },
      { now },
    );
    expect(result.signals).toHaveLength(1);
    expect(result.signals[0].type).toBe('news');
  });

  it('flags a SERP drop', () => {
    const result = buildSeoRadar(
      {
        gscQueries: [],
        pageAnalytics: [],
        intelFeed: [],
        serp: [
          {
            query: 'تور کرابی',
            position: 14,
            previousPosition: 6,
            url: 'https://thailandgard.ir/tours/krabi',
            date: '2026-10-20',
          },
        ],
      },
      { now },
    );
    expect(result.signals[0].type).toBe('serp');
  });
});

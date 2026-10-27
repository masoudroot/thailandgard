import { loadFactoryEnvFile } from '../../lib/factory/local-env';
import {
  buildSeoRadar,
  collectSeoRadar,
  type SeoRadarInput,
} from '../../lib/factory/seo/radar';
import { persistSeoSignals } from '../../lib/factory/seo/store';
import { logger } from '../../lib/logger';

function dateDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

function fixture(): SeoRadarInput {
  return {
    gscQueries: [
      {
        query: 'تور پوکت',
        clicks: 0,
        impressions: 240,
        ctr: 0,
        avg_position: 15,
        date: dateDaysAgo(2),
      },
      {
        query: 'تور پوکت',
        clicks: 1,
        impressions: 310,
        ctr: 0.003,
        avg_position: 17,
        date: dateDaysAgo(1),
      },
      {
        query: 'بهترین زمان سفر به تایلند',
        clicks: 5,
        impressions: 140,
        ctr: 0.035,
        avg_position: 6,
        date: dateDaysAgo(1),
      },
    ],
    pageAnalytics: [
      {
        page_path: '/tours/phuket',
        views: 80,
        clicks: 80,
        impressions: 900,
        avg_position: 8,
        date: dateDaysAgo(8),
      },
      {
        page_path: '/tours/phuket',
        views: 12,
        clicks: 12,
        impressions: 300,
        avg_position: 9,
        date: dateDaysAgo(2),
      },
    ],
    intelFeed: [
      {
        title: 'رونق گردشگری تایلند در فصل باران',
        summary: 'تایلند میزبان گردشگران بیشتری است.',
        source_url: 'https://example.com/thailand-tourism',
        source_name: 'TAT News',
        tags: ['تایلند', 'گردشگری'],
        blog_angle: 'فرصت تولید محتوای فصلی',
        created_at: new Date(Date.now() - 86_400_000).toISOString(),
      },
    ],
    serp: [],
  };
}

async function main(): Promise<void> {
  loadFactoryEnvFile();
  const useFixture = process.argv.includes('--fixture');
  const persist = !process.argv.includes('--no-persist');

  const radar = useFixture
    ? buildSeoRadar(fixture(), { source: 'fixture' })
    : await collectSeoRadar();

  const persistence = persist
    ? await persistSeoSignals(radar.signals)
    : null;

  logger.info(
    JSON.stringify(
      {
        generatedAt: radar.generatedAt,
        source: radar.source,
        count: radar.signals.length,
        persistence,
        signals: radar.signals.slice(0, 10),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  logger.error(
    '[seo-radar]',
    undefined,
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
});

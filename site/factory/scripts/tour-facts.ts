import {
  buildTourFactGate,
  loadTourFacts,
  summarizeTourFacts,
} from '../../lib/factory/tours/facts';
import { loadFactoryEnvFile } from '../../lib/factory/local-env';
import { persistTourFacts } from '../../lib/factory/tours/store';
import { logger } from '../../lib/logger';

async function main(): Promise<void> {
  loadFactoryEnvFile();
  const requireFresh = process.argv.includes('--require-fresh');
  const requireSupabase = process.argv.includes('--require-supabase');
  const fallback = process.argv.includes('--fallback');
  const persist = !process.argv.includes('--no-persist');

  const facts = await loadTourFacts({
    source: fallback ? 'fallback' : 'auto',
  });
  const gate = buildTourFactGate(facts, {
    requireFreshPrices: requireFresh,
    requireSupabase,
  });
  const summary = summarizeTourFacts(facts);

  let persistence: { inserted: number; existing: number } | null = null;
  if (persist) {
    persistence = await persistTourFacts(facts);
  }

  logger.info(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        summary,
        gate,
        persistence,
        facts,
      },
      null,
      2,
    ),
  );

  if (!gate.passed) process.exitCode = 1;
}

main().catch((error) => {
  logger.error(
    '[tour-facts]',
    undefined,
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
});

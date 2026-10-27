import { closePool, getPool } from '../../lib/factory/db';
import { loadFactoryEnvFile } from '../../lib/factory/local-env';
import { planOutreach } from '../../lib/factory/outreach/planner';
import { dispatchDueOutreach } from '../../lib/factory/outreach/sender';
import {
  addProspect,
  addSuppression,
  getOutreachContext,
  insertOutreachPlan,
  listProspects,
} from '../../lib/factory/outreach/store';
import { drainProjections } from '../../lib/factory/projector';
import { PgProjectorStore } from '../../lib/factory/projector-pg';
import { createWorkItem, getWorkItem } from '../../lib/factory/repository';
import { runOutreach } from '../../lib/factory/runner';
import { logger } from '../../lib/logger';

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

function print(value: unknown): void {
  logger.info(JSON.stringify(value, null, 2));
}

async function main(): Promise<void> {
  loadFactoryEnvFile();
  const command = process.argv[2] ?? 'list';

  if (command === 'add') {
    const domain = option('--domain');
    const url = option('--url');
    if (!domain || !url) {
      throw new Error('add requires --domain and --url');
    }
    const prospect = await addProspect({
      domain,
      url,
      contactEmail: option('--email') ?? null,
      relevance: option('--relevance')
        ? Number(option('--relevance'))
        : undefined,
      notes: option('--notes') ?? null,
    });
    print({ prospect });
    return;
  }

  if (command === 'list') {
    const prospects = await listProspects({
      status: option('--status'),
      limit: option('--limit') ? Number(option('--limit')) : undefined,
    });
    print({ count: prospects.length, prospects });
    return;
  }

  if (command === 'suppress') {
    const email = option('--email');
    if (!email) throw new Error('suppress requires --email');
    await addSuppression(email, option('--reason') ?? 'manual');
    print({ suppressed: email.toLowerCase() });
    return;
  }

  if (command === 'plan') {
    const prospects = await listProspects({
      limit: option('--limit') ? Number(option('--limit')) : 100,
    });
    const context = await getOutreachContext();
    const plan = planOutreach(prospects, context);
    const persistence = await insertOutreachPlan(plan);
    print({
      planned: plan.planned.length,
      skipped: plan.skipped.length,
      persistence,
      plan,
    });
    return;
  }

  if (command === 'send') {
    const live = process.argv.includes('--live');
    const dispatch = await dispatchDueOutreach({
      live,
      limit: option('--limit') ? Number(option('--limit')) : 20,
    });
    print({ live, dispatch });
    return;
  }

  if (command === 'run') {
    const requestedId = option('--work-item');
    const item =
      requestedId !== undefined
        ? await getWorkItem(requestedId)
        : await createWorkItem({
            domain: 'seo',
            ownerRole: 'seo',
            title: `Outreach ${new Date().toISOString()}`,
            risk: 'R1',
            kpiTarget: 'qualified_outreach',
            outcomeWindow: '14d',
            budget: { tokens: 8_000, costUsd: 0.2, wallClockMinutes: 15 },
            actor: 'outreach',
          });

    if (!item) throw new Error(`WorkItem not found: ${requestedId}`);

    const result = await runOutreach({
      workItemId: item.id,
      actor: 'outreach',
      limit: option('--limit') ? Number(option('--limit')) : 20,
      dryRunDispatch: process.argv.includes('--dry-run-dispatch'),
    });

    await drainProjections(new PgProjectorStore(getPool()));
    const stored = await getWorkItem(item.id);

    print({
      workItemId: item.id,
      status: result.status,
      projectionStatus: stored?.status,
      planned: result.planned,
      skipped: result.skipped,
      dispatched: result.dispatched,
    });
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main()
  .catch((error) => {
    logger.error(
      '[outreach]',
      undefined,
      error instanceof Error ? error.message : String(error),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });

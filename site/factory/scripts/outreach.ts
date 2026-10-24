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
import { projectBatch } from '../../lib/factory/projector';
import { PgProjectorStore } from '../../lib/factory/projector-pg';
import { createWorkItem, getWorkItem } from '../../lib/factory/repository';
import { startOutreachWorkflow } from '../../lib/factory/temporal/client';

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

function print(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

async function waitForStatus(
  id: string,
  expected: string[],
  timeoutMs = 120_000,
): Promise<string> {
  const store = new PgProjectorStore(getPool());
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await projectBatch(store);
    const item = await getWorkItem(id);
    if (item && expected.includes(item.status)) return item.status;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`Timed out waiting for ${id} to reach ${expected.join(', ')}`);
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

    const workflowId = await startOutreachWorkflow({
      workItemId: item.id,
      actor: 'outreach',
      limit: option('--limit') ? Number(option('--limit')) : 20,
      dryRunDispatch: process.argv.includes('--dry-run-dispatch'),
    });

    const status = process.argv.includes('--no-wait')
      ? 'started'
      : await waitForStatus(item.id, [
          'awaiting_approval',
          'blocked',
          'failed',
          'done',
        ]);

    print({ workItemId: item.id, workflowId, status });
    if (status === 'blocked' || status === 'failed') process.exitCode = 1;
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main()
  .catch((error) => {
    console.error(
      '[outreach]',
      error instanceof Error ? error.message : String(error),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });

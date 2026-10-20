# Factory v2 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase 0/1 foundation for the ThailandGard autonomous factory: a real Temporal runtime, append-only event log, Postgres projections, authenticated Control API, health checks, CI, and local smoke test. No production content generation or release automation is included in this plan.

**Architecture:** Temporal Cloud (or local Temporal dev server) owns workflow state. Postgres is an operational event store and read model. Every mutation is appended as an immutable event, then projected into query tables. The only production-capable component is the stateless role worker; the sandbox and release workers come in later phases. The existing site continues to run unchanged behind `FACTORY_RUNTIME=old`.

**Tech Stack:** Node 22.23.2, Next.js 16.4.0, TypeScript 5, Temporal TypeScript SDK, PostgreSQL 16, `pg`, `zod`, `uuid`, S3-compatible object storage, Docker, Vitest, OpenTelemetry Node SDK.

---

## Source of Truth

- `docs/factory-v2/ARCHITECTURE.md`
- `docs/factory-v2/ROADMAP.md`

If this plan conflicts with the architecture document, stop and ask. Do not silently change role boundaries, risk policy, release gates, or data ownership.

---

## Global Constraints

- Work only inside `site/` for application code and `docs/` for documentation.
- Do not modify the existing dashboard runtime, cycle worker, bridge sweep, or deploy queue until Phase 2.
- Do not enable `FACTORY_RUNTIME=new` in production during this plan.
- Do not write directly to the existing Supabase dashboard tables. Factory v2 uses a separate operational Postgres database.
- Every database mutation goes through the event store. Query tables are projections only.
- No secret is logged, committed, or returned by an API response.
- The control token is at least 32 characters. Production token lives in a secret manager.
- All timestamps are ISO-8601 UTC strings in application code and `timestamptz` in Postgres.
- IDs are UUIDv7 from the `uuid` package.
- No placeholder code. If a task cannot be completed, stop and report the blocker.
- Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` before claiming completion.
- Use `node node_modules\next\dist\bin\next build --webpack` if `npm run build` fails because `.bin/next` is missing on Windows.
- Package versions are not pinned in advance because the npm registry is currently unreachable through the local proxy. Install current stable versions and commit `package-lock.json`.
- Commit after every task. Do not squash unrelated tasks into one commit.

---

## File Map

### New application files

- `site/lib/factory/config.ts` — validated environment configuration.
- `site/lib/factory/contracts.ts` — Zod schemas and state machines.
- `site/lib/factory/ids.ts` — UUIDv7 and hashing helpers.
- `site/lib/factory/db.ts` — Postgres pool and transaction helper.
- `site/lib/factory/migrations.ts` — migration discovery and checksums.
- `site/lib/factory/events.ts` — event types.
- `site/lib/factory/event-store.ts` — append-only event writer.
- `site/lib/factory/projections.ts` — pure reducers for read models.
- `site/lib/factory/projector.ts` — projection batch runner and store interface.
- `site/lib/factory/projector-pg.ts` — Postgres projector store.
- `site/lib/factory/repository.ts` — work item commands and queries.
- `site/lib/factory/auth.ts` — bearer token and admin cookie authorization.
- `site/lib/factory/api.ts` — Control API request schemas.
- `site/lib/factory/health.ts` — injectable health checks.
- `site/lib/factory/artifacts.ts` — S3-compatible artifact storage adapter.
- `site/lib/factory/telemetry.ts` — OpenTelemetry bootstrap.
- `site/lib/factory/temporal/workflows.ts` — WorkItem workflow.
- `site/lib/factory/temporal/activities.ts` — workflow activities.
- `site/lib/factory/temporal/client.ts` — Temporal client and starter.
- `site/worker/factory/role-worker.ts` — Temporal worker entry point.
- `site/worker/factory/projector.ts` — projector loop entry point.
- `site/app/api/factory/health/route.ts` — readiness endpoint.
- `site/app/api/factory/work-items/route.ts` — create work item.
- `site/app/api/factory/work-items/[id]/route.ts` — read work item projection.
- `site/factory/migrations/0001_core.sql` — core event and projection schema.
- `site/factory/scripts/migrate.ts` — migration CLI.
- `site/factory/scripts/smoke.ts` — end-to-end foundation smoke test.
- `site/factory/scripts/baseline.mjs` — production baseline snapshot.
- `site/factory/docker-compose.yml` — local Postgres and Temporal.
- `site/factory/Dockerfile.worker` — worker image.
- `site/factory/.dockerignore` — worker image exclusions.
- `site/factory/README.md` — local runbook.
- `site/vitest.config.ts` — test configuration.
- `.github/workflows/factory-ci.yml` — factory CI workflow.

### New tests

- `site/factory/tests/harness.test.ts`
- `site/factory/tests/config.test.ts`
- `site/factory/tests/contracts.test.ts`
- `site/factory/tests/migrations.test.ts`
- `site/factory/tests/projections.test.ts`
- `site/factory/tests/projector.test.ts`
- `site/factory/tests/api.test.ts`
- `site/factory/tests/auth.test.ts`
- `site/factory/tests/health.test.ts`
- `site/factory/tests/artifacts.test.ts`
- `site/factory/tests/event-store.integration.test.ts`

### Modified files

- `site/package.json` — scripts and dependencies.
- `site/next.config.ts` — external server packages for Temporal and Postgres.
- `README.md` — link to Factory v2 docs and retirement notice for the old model.
- `docs/ARCHITECTURE.md` — superseded banner.
- `docs/GROWTH-ENGINE.md` — superseded banner.

---

## Phase 0 Prerequisites

Complete these before Task 1. They are operational, not code.

- [ ] Export and store an encrypted database backup of the current dashboard state.
- [ ] Record the current production commit SHA and deployment URL.
- [ ] Capture the current sitemap and the top 50 organic landing pages. Sitemap metadata recorded at `site/factory/baseline/2026-10-20T15-39-23-661Z.json` with SHA-256 `d22a8da741e7fe705e3f33b92a6d4ec1d4b0ebf3911a87695d96273f543008ae`; top 50 landing pages still pending.
- [ ] Confirm `FACTORY_CONTROL_TOKEN` is generated with at least 32 random bytes.
- [ ] Confirm a separate operational Postgres database exists for `factory-staging`.
- [ ] Confirm a Temporal Cloud namespace exists for `factory-staging`; if not, use local Temporal for Phase 1 only.
- [ ] Confirm an S3-compatible artifact bucket exists for `factory-staging` with no public access.
- [ ] Confirm all factory secrets are available from the platform secret manager, not from the repository.
- [ ] Confirm the current production deployment is healthy before any change.
- [ ] Confirm no scheduled cycle worker is active.

Stop if any prerequisite is missing. Do not substitute the existing Supabase database.

---

## Task 1: Add the Test Harness and Local Services

**Files:**
- Modify: `site/package.json`
- Create: `site/vitest.config.ts`
- Create: `site/factory/tests/harness.test.ts`
- Create: `site/factory/docker-compose.yml`

**Interfaces:**
- Produces: `npm run test`, `npm run test:watch`, `npm run typecheck`, local Postgres on `localhost:5433`, local Temporal on `localhost:7233`.

- [ ] **Step 1: Add local services**

Create `site/factory/docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: factory
      POSTGRES_PASSWORD: factory
      POSTGRES_DB: factory
    ports:
      - "5433:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U factory"]
      interval: 5s
      timeout: 5s
      retries: 20

  temporal:
    image: temporalio/temporal:latest
    command: ["server", "start-dev", "--ip", "0.0.0.0"]
    ports:
      - "7233:7233"
      - "8233:8233"

  minio:
    image: minio/minio:latest
    command: ["server", "/data", "--console-address", ":9001"]
    environment:
      MINIO_ROOT_USER: factory
      MINIO_ROOT_PASSWORD: factory-secret
    ports:
      - "9000:9000"
      - "9001:9001"

  minio-init:
    image: minio/mc:latest
    depends_on:
      - minio
    entrypoint: >
      /bin/sh -c "
      until mc alias set local http://minio:9000 factory factory-secret; do sleep 1; done;
      mc mb --ignore-existing local/factory-artifacts;
      "
```

Start them:

```powershell
docker compose -f factory/docker-compose.yml up -d
```

Expected: both containers are healthy. If Docker is unavailable, stop and report the blocker.

- [ ] **Step 2: Install dependencies**

Run from `site/`:

```powershell
npm install @temporalio/activity @temporalio/client @temporalio/common @temporalio/worker @temporalio/workflow @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/exporter-trace-otlp-http @aws-sdk/client-s3 pg uuid zod
npm install -D @types/pg vitest
```

If the registry is unreachable, stop and report `ECONNREFUSED`. Do not invent versions.

- [ ] **Step 3: Add scripts**

Add these entries to `site/package.json` under `"scripts"`:

```json
"typecheck": "tsc --noEmit",
"test": "vitest run",
"test:watch": "vitest",
"factory:migrate": "tsx factory/scripts/migrate.ts",
"factory:worker": "tsx worker/factory/role-worker.ts",
"factory:projector": "tsx worker/factory/projector.ts",
"factory:smoke": "tsx factory/scripts/smoke.ts",
"factory:baseline": "node factory/scripts/baseline.mjs"
```

- [ ] **Step 4: Write the failing harness test**

Create `site/factory/tests/harness.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('factory test harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run the test**

Run:

```powershell
npm run test
```

Expected: one passing test.

- [ ] **Step 6: Add Vitest config**

Create `site/vitest.config.ts`:

```ts
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(root),
    },
  },
  test: {
    environment: 'node',
    include: ['factory/tests/**/*.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
```

- [ ] **Step 7: Verify**

Run:

```powershell
npm run typecheck
npm run test
```

Expected: both pass.

- [ ] **Step 8: Commit**

```powershell
git add site/package.json site/package-lock.json site/vitest.config.ts site/factory/tests/harness.test.ts site/factory/docker-compose.yml
git commit -m "test(factory): add vitest harness, local services, and factory scripts"
```

---

## Task 2: Add Configuration and Contracts

**Files:**
- Create: `site/lib/factory/config.ts`
- Create: `site/lib/factory/ids.ts`
- Create: `site/lib/factory/contracts.ts`
- Test: `site/factory/tests/config.test.ts`
- Test: `site/factory/tests/contracts.test.ts`

**Interfaces:**
- Produces: `loadFactoryConfig(env?)`, `FactoryConfig`, `newId()`, `sha256Hex()`, `WorkItemSchema`, `TaskOutputSchema`, `assertWorkItemTransition()`, `assertTaskTransition()`.

- [ ] **Step 1: Write the failing config test**

Create `site/factory/tests/config.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { loadFactoryConfig } from '@/lib/factory/config';

const base = {
  FACTORY_ENV: 'local',
  FACTORY_DATABASE_URL: 'postgres://factory:factory@localhost:5433/factory',
  FACTORY_CONTROL_TOKEN: 'x'.repeat(32),
  TEMPORAL_ADDRESS: 'localhost:7233',
  TEMPORAL_NAMESPACE: 'default',
  FACTORY_TASK_QUEUE: 'factory-orchestration',
};

describe('loadFactoryConfig', () => {
  it('loads a valid configuration', () => {
    const config = loadFactoryConfig(base);
    expect(config.databaseUrl).toBe(base.FACTORY_DATABASE_URL);
    expect(config.taskQueue).toBe('factory-orchestration');
    expect(config.controlToken).toHaveLength(32);
  });

  it('rejects a short control token', () => {
    expect(() =>
      loadFactoryConfig({ ...base, FACTORY_CONTROL_TOKEN: 'short' }),
    ).toThrow(/FACTORY_CONTROL_TOKEN/);
  });

  it('rejects a missing database URL', () => {
    expect(() =>
      loadFactoryConfig({ ...base, FACTORY_DATABASE_URL: '' }),
    ).toThrow(/FACTORY_DATABASE_URL/);
  });
});
```

- [ ] **Step 2: Run it and confirm failure**

Run:

```powershell
npm run test -- factory/tests/config.test.ts
```

Expected: fail because `@/lib/factory/config` does not exist.

- [ ] **Step 3: Implement config**

Create `site/lib/factory/config.ts`:

```ts
import { z } from 'zod';

const EnvSchema = z.object({
  FACTORY_ENV: z.enum(['local', 'staging', 'production']).default('local'),
  FACTORY_DATABASE_URL: z.string().url(),
  FACTORY_CONTROL_TOKEN: z.string().min(32),
  TEMPORAL_ADDRESS: z.string().min(1).default('localhost:7233'),
  TEMPORAL_NAMESPACE: z.string().min(1).default('default'),
  TEMPORAL_TLS: z.enum(['true', 'false']).default('false'),
  TEMPORAL_API_KEY: z.string().min(1).optional(),
  FACTORY_TASK_QUEUE: z.string().min(1).default('factory-orchestration'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  FACTORY_ARTIFACT_ENDPOINT: z.string().url().optional(),
  FACTORY_ARTIFACT_REGION: z.string().min(1).default('auto'),
  FACTORY_ARTIFACT_BUCKET: z.string().min(1).optional(),
  FACTORY_ARTIFACT_ACCESS_KEY_ID: z.string().min(1).optional(),
  FACTORY_ARTIFACT_SECRET_ACCESS_KEY: z.string().min(1).optional(),
});

export interface FactoryConfig {
  env: 'local' | 'staging' | 'production';
  databaseUrl: string;
  controlToken: string;
  temporalAddress: string;
  temporalNamespace: string;
  temporalTls: boolean;
  temporalApiKey?: string;
  taskQueue: string;
  otlpEndpoint?: string;
  artifacts?: {
    endpoint: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
}

export function loadFactoryConfig(
  env: NodeJS.ProcessEnv = process.env,
): FactoryConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid factory configuration: ${details}`);
  }

  const artifactValues = [
    parsed.data.FACTORY_ARTIFACT_ENDPOINT,
    parsed.data.FACTORY_ARTIFACT_BUCKET,
    parsed.data.FACTORY_ARTIFACT_ACCESS_KEY_ID,
    parsed.data.FACTORY_ARTIFACT_SECRET_ACCESS_KEY,
  ];
  const artifactConfigured = artifactValues.every(Boolean);

  if (artifactValues.some(Boolean) && !artifactConfigured) {
    throw new Error(
      'Invalid factory configuration: artifact settings must be provided together',
    );
  }

  return {
    env: parsed.data.FACTORY_ENV,
    databaseUrl: parsed.data.FACTORY_DATABASE_URL,
    controlToken: parsed.data.FACTORY_CONTROL_TOKEN,
    temporalAddress: parsed.data.TEMPORAL_ADDRESS,
    temporalNamespace: parsed.data.TEMPORAL_NAMESPACE,
    temporalTls: parsed.data.TEMPORAL_TLS === 'true',
    temporalApiKey: parsed.data.TEMPORAL_API_KEY,
    taskQueue: parsed.data.FACTORY_TASK_QUEUE,
    otlpEndpoint: parsed.data.OTEL_EXPORTER_OTLP_ENDPOINT,
    artifacts: artifactConfigured
      ? {
          endpoint: parsed.data.FACTORY_ARTIFACT_ENDPOINT as string,
          region: parsed.data.FACTORY_ARTIFACT_REGION,
          bucket: parsed.data.FACTORY_ARTIFACT_BUCKET as string,
          accessKeyId: parsed.data.FACTORY_ARTIFACT_ACCESS_KEY_ID as string,
          secretAccessKey: parsed.data.FACTORY_ARTIFACT_SECRET_ACCESS_KEY as string,
        }
      : undefined,
  };
}
```

- [ ] **Step 4: Write the failing contracts test**

Create `site/factory/tests/contracts.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  assertTaskTransition,
  assertWorkItemTransition,
  TaskOutputSchema,
  WorkItemSchema,
} from '@/lib/factory/contracts';
import { newId } from '@/lib/factory/ids';

const now = new Date().toISOString();

const item = {
  id: newId(),
  domain: 'content',
  ownerRole: 'content',
  title: 'Update the Phuket October guide',
  risk: 'R1',
  status: 'planned',
  playbookVersion: 'content@1',
  policyVersion: 'policy@1',
  kpiTarget: 'organic_sessions_phuket_october',
  outcomeWindow: '28d',
  budget: { tokens: 50_000, costUsd: 2, wallClockMinutes: 120 },
  createdAt: now,
  updatedAt: now,
};

describe('WorkItemSchema', () => {
  it('accepts a valid work item', () => {
    expect(WorkItemSchema.parse(item).id).toBe(item.id);
  });

  it('rejects an unknown risk', () => {
    expect(() => WorkItemSchema.parse({ ...item, risk: 'R5' })).toThrow();
  });
});

describe('work item transitions', () => {
  it('allows running to verifying', () => {
    expect(() => assertWorkItemTransition('running', 'verifying')).not.toThrow();
  });

  it('rejects done to running', () => {
    expect(() => assertWorkItemTransition('done', 'running')).toThrow(
      /done -> running/,
    );
  });
});

describe('task transitions', () => {
  it('allows ready to running', () => {
    expect(() => assertTaskTransition('ready', 'running')).not.toThrow();
  });
});

describe('TaskOutputSchema', () => {
  it('requires evidence or an artifact for an ok output', () => {
    expect(() =>
      TaskOutputSchema.parse({
        status: 'ok',
        artifacts: [],
        evidence: [],
        confidence: 0.9,
        cost: { tokens: 100, usd: 0.01 },
        reason: 'looks good',
        nextActions: [],
      }),
    ).toThrow(/artifact or evidence/);
  });
});
```

- [ ] **Step 5: Implement ids and contracts**

Create `site/lib/factory/ids.ts`:

```ts
import { createHash } from 'node:crypto';
import { v7 as uuidv7 } from 'uuid';

export function newId(): string {
  return uuidv7();
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
```

Create `site/lib/factory/contracts.ts`:

```ts
import { z } from 'zod';

export const DomainSchema = z.enum([
  'leader',
  'tour-manager',
  'content',
  'seo',
  'design',
  'dev',
]);

export const RiskSchema = z.enum(['R0', 'R1', 'R2', 'R3', 'R4']);

export const WorkItemStatusSchema = z.enum([
  'intake',
  'planned',
  'ready',
  'running',
  'verifying',
  'awaiting_approval',
  'releasing',
  'production_verified',
  'done',
  'blocked',
  'failed',
  'canceled',
  'rolled_back',
]);

export const TaskStatusSchema = z.enum([
  'pending',
  'ready',
  'running',
  'verifying',
  'done',
  'blocked',
  'failed',
  'canceled',
]);

export const TaskTypeSchema = z.enum([
  'plan',
  'research',
  'draft',
  'edit',
  'fact_check',
  'seo_review',
  'design_review',
  'implement',
  'test',
  'release',
  'outcome',
]);

export const BudgetSchema = z.object({
  tokens: z.number().int().positive(),
  costUsd: z.number().nonnegative(),
  wallClockMinutes: z.number().int().positive(),
});

export const WorkItemSchema = z.object({
  id: z.string().uuid(),
  domain: DomainSchema,
  ownerRole: DomainSchema,
  title: z.string().min(3).max(200),
  risk: RiskSchema,
  status: WorkItemStatusSchema,
  playbookVersion: z.string().min(1),
  policyVersion: z.string().min(1),
  kpiTarget: z.string().min(1),
  outcomeWindow: z.string().min(1),
  budget: BudgetSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ArtifactSchema = z.object({
  id: z.string().uuid(),
  workItemId: z.string().uuid(),
  kind: z.string().min(1),
  hash: z.string().min(32),
  uri: z.string().min(1),
  producer: z.string().min(1),
  createdAt: z.string().datetime(),
});

export const EvidenceSchema = z.object({
  id: z.string().uuid(),
  workItemId: z.string().uuid(),
  gate: z.string().min(1),
  hash: z.string().min(32),
  uri: z.string().min(1),
  createdBy: z.string().min(1),
  createdAt: z.string().datetime(),
});

export const TaskOutputSchema = z
  .object({
    status: z.enum(['ok', 'rejected', 'needs_review', 'failed']),
    artifacts: z.array(z.string().min(1)).default([]),
    evidence: z.array(z.string().min(1)).default([]),
    confidence: z.number().min(0).max(1),
    cost: z.object({
      tokens: z.number().int().nonnegative(),
      usd: z.number().nonnegative(),
    }),
    reason: z.string().min(1),
    nextActions: z.array(z.string()).default([]),
  })
  .refine(
    (value) =>
      value.status !== 'ok' ||
      value.artifacts.length > 0 ||
      value.evidence.length > 0,
    {
      message: 'ok output requires at least one artifact or evidence',
      path: ['evidence'],
    },
  );

export type Domain = z.infer<typeof DomainSchema>;
export type Risk = z.infer<typeof RiskSchema>;
export type WorkItemStatus = z.infer<typeof WorkItemStatusSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type WorkItem = z.infer<typeof WorkItemSchema>;
export type TaskOutput = z.infer<typeof TaskOutputSchema>;

const WORK_ITEM_TRANSITIONS: Record<WorkItemStatus, readonly WorkItemStatus[]> = {
  intake: ['planned', 'canceled'],
  planned: ['ready', 'blocked', 'canceled'],
  ready: ['running', 'blocked', 'canceled'],
  running: ['verifying', 'failed', 'blocked', 'canceled'],
  verifying: ['awaiting_approval', 'releasing', 'failed', 'blocked'],
  awaiting_approval: ['releasing', 'blocked', 'canceled'],
  releasing: ['production_verified', 'rolled_back', 'failed'],
  production_verified: ['done', 'rolled_back'],
  done: [],
  blocked: ['planned', 'ready', 'canceled'],
  failed: ['planned', 'canceled'],
  canceled: [],
  rolled_back: ['planned', 'canceled'],
};

const TASK_TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  pending: ['ready', 'canceled'],
  ready: ['running', 'blocked', 'canceled'],
  running: ['verifying', 'failed', 'blocked', 'canceled'],
  verifying: ['done', 'failed', 'blocked'],
  done: [],
  blocked: ['ready', 'canceled'],
  failed: ['pending', 'canceled'],
  canceled: [],
};

export function assertWorkItemTransition(
  from: WorkItemStatus,
  to: WorkItemStatus,
): void {
  if (!WORK_ITEM_TRANSITIONS[from].includes(to)) {
    throw new Error(`Invalid work item transition: ${from} -> ${to}`);
  }
}

export function assertTaskTransition(from: TaskStatus, to: TaskStatus): void {
  if (!TASK_TRANSITIONS[from].includes(to)) {
    throw new Error(`Invalid task transition: ${from} -> ${to}`);
  }
}
```

- [ ] **Step 6: Run tests and typecheck**

```powershell
npm run test -- factory/tests/config.test.ts factory/tests/contracts.test.ts
npm run typecheck
```

Expected: all pass.

- [ ] **Step 7: Commit**

```powershell
git add site/lib/factory/config.ts site/lib/factory/ids.ts site/lib/factory/contracts.ts site/factory/tests/config.test.ts site/factory/tests/contracts.test.ts
git commit -m "feat(factory): add validated config and domain contracts"
```

---

## Task 3: Add the Core Database Schema and Migration Runner

**Files:**
- Create: `site/factory/migrations/0001_core.sql`
- Create: `site/lib/factory/db.ts`
- Create: `site/lib/factory/migrations.ts`
- Create: `site/factory/scripts/migrate.ts`
- Test: `site/factory/tests/migrations.test.ts`

**Interfaces:**
- Produces: `getPool()`, `withTransaction()`, `closePool()`, `listMigrations(dir)`, `npm run factory:migrate`.

- [ ] **Step 1: Write the failing migration discovery test**

Create `site/factory/tests/migrations.test.ts`:

```ts
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { listMigrations } from '@/lib/factory/migrations';

describe('listMigrations', () => {
  it('sorts migrations and computes stable checksums', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'factory-migrations-'));
    try {
      await writeFile(path.join(dir, '0002_second.sql'), 'select 2;', 'utf8');
      await writeFile(path.join(dir, '0001_first.sql'), 'select 1;', 'utf8');

      const files = await listMigrations(dir);

      expect(files.map((file) => file.version)).toEqual([
        '0001_first.sql',
        '0002_second.sql',
      ]);
      expect(files[0].checksum).toMatch(/^[0-9a-f]{64}$/);
      expect(files[0].sql).toBe('select 1;');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Run it and confirm failure**

```powershell
npm run test -- factory/tests/migrations.test.ts
```

Expected: fail because the module does not exist.

- [ ] **Step 3: Implement the pool and migration discovery**

Create `site/lib/factory/db.ts`:

```ts
import { Pool, type PoolClient } from 'pg';
import { loadFactoryConfig } from './config';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const config = loadFactoryConfig();
    pool = new Pool({
      connectionString: config.databaseUrl,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return pool;
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
```

Create `site/lib/factory/migrations.ts`:

```ts
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export interface MigrationFile {
  version: string;
  sql: string;
  checksum: string;
}

export async function listMigrations(dir: string): Promise<MigrationFile[]> {
  const files = (await readdir(dir))
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  return Promise.all(
    files.map(async (version) => {
      const sql = await readFile(path.join(dir, version), 'utf8');
      return {
        version,
        sql,
        checksum: createHash('sha256').update(sql).digest('hex'),
      };
    }),
  );
}
```

- [ ] **Step 4: Write the core migration**

Create `site/factory/migrations/0001_core.sql`:

```sql
CREATE TABLE IF NOT EXISTS events (
  sequence bigserial PRIMARY KEY,
  id uuid NOT NULL UNIQUE,
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  actor text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL,
  UNIQUE (aggregate_id, version)
);

CREATE INDEX IF NOT EXISTS events_aggregate_idx
  ON events (aggregate_id, version);

CREATE TABLE IF NOT EXISTS outbox (
  id bigserial PRIMARY KEY,
  event_sequence bigint NOT NULL REFERENCES events(sequence) ON DELETE CASCADE,
  topic text NOT NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outbox_unpublished_idx
  ON outbox (published_at)
  WHERE published_at IS NULL;

CREATE TABLE IF NOT EXISTS projection_checkpoints (
  name text PRIMARY KEY,
  last_sequence bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_items (
  id uuid PRIMARY KEY,
  status text NOT NULL,
  domain text NOT NULL,
  risk text NOT NULL,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS work_items_status_idx
  ON work_items (status, updated_at DESC);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY,
  work_item_id uuid NOT NULL,
  status text NOT NULL,
  role text NOT NULL,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS tasks_work_item_idx
  ON tasks (work_item_id);

CREATE TABLE IF NOT EXISTS artifacts (
  id uuid PRIMARY KEY,
  work_item_id uuid NOT NULL,
  kind text NOT NULL,
  hash text NOT NULL,
  uri text NOT NULL,
  producer text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS artifacts_work_item_idx
  ON artifacts (work_item_id);

CREATE TABLE IF NOT EXISTS evidence (
  id uuid PRIMARY KEY,
  work_item_id uuid NOT NULL,
  gate text NOT NULL,
  hash text NOT NULL,
  uri text NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evidence_work_item_idx
  ON evidence (work_item_id, gate);

CREATE TABLE IF NOT EXISTS releases (
  id uuid PRIMARY KEY,
  work_item_id uuid NOT NULL,
  risk text NOT NULL,
  build_sha text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS releases_work_item_idx
  ON releases (work_item_id, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY,
  actor text NOT NULL,
  action text NOT NULL,
  subject_type text NOT NULL,
  subject_id uuid NOT NULL,
  details jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_subject_idx
  ON audit_log (subject_type, subject_id, created_at DESC);
```

- [ ] **Step 5: Implement the migration CLI**

Create `site/factory/scripts/migrate.ts`:

```ts
import path from 'node:path';
import { closePool, getPool } from '../../lib/factory/db';
import { listMigrations } from '../../lib/factory/migrations';

async function main(): Promise<void> {
  const dir = path.resolve(process.cwd(), 'factory/migrations');
  const migrations = await listMigrations(dir);
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version text PRIMARY KEY,
        checksum text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    for (const migration of migrations) {
      const existing = await client.query<{ checksum: string }>(
        'SELECT checksum FROM schema_migrations WHERE version = $1',
        [migration.version],
      );

      if (existing.rowCount) {
        if (existing.rows[0].checksum !== migration.checksum) {
          throw new Error(
            `Migration checksum mismatch: ${migration.version}`,
          );
        }
        continue;
      }

      await client.query('BEGIN');
      try {
        await client.query(migration.sql);
        await client.query(
          'INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)',
          [migration.version, migration.checksum],
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    client.release();
    await closePool();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
```

- [ ] **Step 6: Run unit tests and typecheck**

```powershell
npm run test -- factory/tests/migrations.test.ts
npm run typecheck
```

Expected: pass.

- [ ] **Step 7: Run the migration against local Postgres**

Start Postgres first:

```powershell
docker compose -f factory/docker-compose.yml up -d postgres
```

Then:

```powershell
$env:FACTORY_DATABASE_URL='postgres://factory:factory@localhost:5433/factory'
$env:FACTORY_CONTROL_TOKEN=('x' * 32)
npm run factory:migrate
```

Expected: no output except a successful exit. Re-running must not fail.

- [ ] **Step 8: Commit**

```powershell
git add site/lib/factory/db.ts site/lib/factory/migrations.ts site/factory/scripts/migrate.ts site/factory/migrations/0001_core.sql site/factory/tests/migrations.test.ts
git commit -m "feat(factory): add event schema and migration runner"
```

---

## Task 4: Add the Event Store, Projections, and Projector

**Files:**
- Create: `site/lib/factory/events.ts`
- Create: `site/lib/factory/event-store.ts`
- Create: `site/lib/factory/projections.ts`
- Create: `site/lib/factory/projector.ts`
- Create: `site/lib/factory/projector-pg.ts`
- Create: `site/lib/factory/repository.ts`
- Create: `site/worker/factory/projector.ts`
- Test: `site/factory/tests/projections.test.ts`
- Test: `site/factory/tests/projector.test.ts`
- Test: `site/factory/tests/event-store.integration.test.ts`

**Interfaces:**
- Produces: `appendEvent()`, `readEvents()`, `reduceWorkItem()`, `projectBatch()`, `PgProjectorStore`, `createWorkItem()`, `getWorkItem()`, `loadWorkItemState()`, `transitionWorkItem()`.

- [ ] **Step 1: Write the failing projection reducer test**

Create `site/factory/tests/projections.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { FactoryEvent } from '@/lib/factory/events';
import type { WorkItem } from '@/lib/factory/contracts';
import { reduceWorkItem } from '@/lib/factory/projections';
import { newId } from '@/lib/factory/ids';

const now = new Date().toISOString();
const item: WorkItem = {
  id: newId(),
  domain: 'seo',
  ownerRole: 'seo',
  title: 'Refresh the Bangkok guide',
  risk: 'R1',
  status: 'planned',
  playbookVersion: 'seo@1',
  policyVersion: 'policy@1',
  kpiTarget: 'organic_sessions_bangkok',
  outcomeWindow: '7d',
  budget: { tokens: 10_000, costUsd: 1, wallClockMinutes: 30 },
  createdAt: now,
  updatedAt: now,
};

function event(
  eventType: string,
  payload: Record<string, unknown>,
  version: number,
): FactoryEvent {
  return {
    sequence: version,
    id: newId(),
    aggregateType: 'work_item',
    aggregateId: item.id,
    eventType,
    payload,
    actor: 'test',
    occurredAt: now,
    version,
  };
}

describe('reduceWorkItem', () => {
  it('creates a work item', () => {
    const state = reduceWorkItem(null, event('WorkItemCreated', item, 1));
    expect(state?.status).toBe('planned');
    expect(state?.id).toBe(item.id);
  });

  it('applies a valid status change', () => {
    const created = reduceWorkItem(null, event('WorkItemCreated', item, 1));
    const running = reduceWorkItem(
      created,
      event('WorkItemStatusChanged', { from: 'planned', to: 'running' }, 2),
    );
    expect(running?.status).toBe('running');
  });

  it('rejects an invalid status change', () => {
    const created = reduceWorkItem(null, event('WorkItemCreated', item, 1));
    expect(() =>
      reduceWorkItem(
        created,
        event('WorkItemStatusChanged', { from: 'planned', to: 'done' }, 2),
      ),
    ).toThrow(/planned -> done/);
  });
});
```

- [ ] **Step 2: Run it and confirm failure**

```powershell
npm run test -- factory/tests/projections.test.ts
```

Expected: fail because the module does not exist.

- [ ] **Step 3: Implement event types and reducers**

Create `site/lib/factory/events.ts`:

```ts
export interface FactoryEvent {
  sequence: number;
  id: string;
  aggregateType: 'work_item' | 'task';
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  actor: string;
  occurredAt: string;
  version: number;
}
```

Create `site/lib/factory/projections.ts`:

```ts
import {
  assertWorkItemTransition,
  WorkItemSchema,
  WorkItemStatusSchema,
  type WorkItem,
} from './contracts';
import type { FactoryEvent } from './events';

export type WorkItemProjection = WorkItem;

export function reduceWorkItem(
  state: WorkItemProjection | null,
  event: FactoryEvent,
): WorkItemProjection | null {
  switch (event.eventType) {
    case 'WorkItemCreated': {
      return WorkItemSchema.parse(event.payload);
    }
    case 'WorkItemStatusChanged': {
      if (!state) {
        throw new Error(`Cannot change status before creation: ${event.aggregateId}`);
      }
      const next = WorkItemStatusSchema.parse(event.payload.to);
      assertWorkItemTransition(state.status, next);
      return {
        ...state,
        status: next,
        updatedAt: event.occurredAt,
      };
    }
    default:
      return state;
  }
}
```

- [ ] **Step 4: Implement the event store**

Create `site/lib/factory/event-store.ts`:

```ts
import { withTransaction } from './db';
import type { FactoryEvent } from './events';
import { newId } from './ids';

export interface AppendEventInput {
  aggregateType: 'work_item' | 'task';
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  actor: string;
  topic?: string;
  expectedVersion?: number;
}

export async function appendEvent(
  input: AppendEventInput,
): Promise<FactoryEvent> {
  return withTransaction(async (client) => {
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtext($1)::bigint)',
      [input.aggregateId],
    );

    const versionResult = await client.query<{ next_version: string }>(
      'SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM events WHERE aggregate_id = $1',
      [input.aggregateId],
    );
    const version = Number(versionResult.rows[0].next_version);
    if (
      input.expectedVersion !== undefined &&
      version !== input.expectedVersion + 1
    ) {
      throw new Error(
        `Concurrent modification for aggregate ${input.aggregateId}`,
      );
    }
    const id = newId();
    const occurredAt = new Date().toISOString();

    const result = await client.query<{ sequence: string }>(
      `INSERT INTO events
        (id, aggregate_type, aggregate_id, event_type, payload, actor, occurred_at, version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING sequence`,
      [
        id,
        input.aggregateType,
        input.aggregateId,
        input.eventType,
        input.payload,
        input.actor,
        occurredAt,
        version,
      ],
    );
    const sequence = Number(result.rows[0].sequence);

    await client.query(
      'INSERT INTO outbox (event_sequence, topic) VALUES ($1, $2)',
      [sequence, input.topic ?? 'factory.events'],
    );

    return {
      sequence,
      id,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      eventType: input.eventType,
      payload: input.payload,
      actor: input.actor,
      occurredAt,
      version,
    };
  });
}

export async function readEvents(
  aggregateId: string,
): Promise<FactoryEvent[]> {
  const result = await withTransaction(async (client) => {
    return client.query(
      `SELECT sequence, id, aggregate_type, aggregate_id, event_type, payload, actor, occurred_at, version
       FROM events
       WHERE aggregate_id = $1
       ORDER BY version ASC`,
      [aggregateId],
    );
  });

  return result.rows.map((row) => ({
    sequence: Number(row.sequence),
    id: String(row.id),
    aggregateType: row.aggregate_type,
    aggregateId: String(row.aggregate_id),
    eventType: String(row.event_type),
    payload: row.payload,
    actor: String(row.actor),
    occurredAt: new Date(row.occurred_at).toISOString(),
    version: Number(row.version),
  }));
}

```

- [ ] **Step 5: Implement the projector interface and runner**

Create `site/lib/factory/projector.ts`:

```ts
import type { FactoryEvent } from './events';
import { reduceWorkItem, type WorkItemProjection } from './projections';

export interface ProjectorStore {
  loadCheckpoint(name: string): Promise<number>;
  loadEvents(afterSequence: number, limit: number): Promise<FactoryEvent[]>;
  getWorkItem(id: string): Promise<WorkItemProjection | null>;
  saveWorkItem(item: WorkItemProjection): Promise<void>;
  saveCheckpoint(name: string, sequence: number): Promise<void>;
}

export async function projectBatch(
  store: ProjectorStore,
  name = 'default',
  limit = 100,
): Promise<number> {
  let lastSequence = await store.loadCheckpoint(name);
  const events = await store.loadEvents(lastSequence, limit);
  let applied = 0;

  for (const event of events) {
    if (event.aggregateType === 'work_item') {
      const current = await store.getWorkItem(event.aggregateId);
      const next = reduceWorkItem(current, event);
      if (next) await store.saveWorkItem(next);
    }
    lastSequence = event.sequence;
    applied += 1;
  }

  if (applied > 0) {
    await store.saveCheckpoint(name, lastSequence);
  }

  return applied;
}
```

- [ ] **Step 6: Write the failing projector test**

Create `site/factory/tests/projector.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { FactoryEvent } from '@/lib/factory/events';
import type { WorkItem } from '@/lib/factory/contracts';
import { newId } from '@/lib/factory/ids';
import { projectBatch, type ProjectorStore } from '@/lib/factory/projector';
import type { WorkItemProjection } from '@/lib/factory/projections';

const now = new Date().toISOString();
const id = newId();

const created: WorkItem = {
  id,
  domain: 'design',
  ownerRole: 'design',
  title: 'Improve the tour card hierarchy',
  risk: 'R1',
  status: 'planned',
  playbookVersion: 'design@1',
  policyVersion: 'policy@1',
  kpiTarget: 'tour_card_ctr',
  outcomeWindow: '7d',
  budget: { tokens: 10_000, costUsd: 1, wallClockMinutes: 30 },
  createdAt: now,
  updatedAt: now,
};

const events: FactoryEvent[] = [
  {
    sequence: 1,
    id: newId(),
    aggregateType: 'work_item',
    aggregateId: id,
    eventType: 'WorkItemCreated',
    payload: created,
    actor: 'test',
    occurredAt: now,
    version: 1,
  },
  {
    sequence: 2,
    id: newId(),
    aggregateType: 'work_item',
    aggregateId: id,
    eventType: 'WorkItemStatusChanged',
    payload: { from: 'planned', to: 'running' },
    actor: 'test',
    occurredAt: now,
    version: 2,
  },
];

class MemoryStore implements ProjectorStore {
  checkpoint = 0;
  checkpointName = '';
  item: WorkItemProjection | null = null;

  async loadCheckpoint(): Promise<number> {
    return this.checkpoint;
  }

  async loadEvents(afterSequence: number, limit: number): Promise<FactoryEvent[]> {
    return events.filter((event) => event.sequence > afterSequence).slice(0, limit);
  }

  async getWorkItem(): Promise<WorkItemProjection | null> {
    return this.item;
  }

  async saveWorkItem(item: WorkItemProjection): Promise<void> {
    this.item = item;
  }

  async saveCheckpoint(name: string, sequence: number): Promise<void> {
    this.checkpointName = name;
    this.checkpoint = sequence;
  }
}

describe('projectBatch', () => {
  it('applies events and advances the checkpoint', async () => {
    const store = new MemoryStore();
    const applied = await projectBatch(store);
    expect(applied).toBe(2);
    expect(store.checkpointName).toBe('default');
    expect(store.checkpoint).toBe(2);
    expect(store.item?.status).toBe('running');
  });
});
```

- [ ] **Step 7: Implement the Postgres projector store and repository**

Create `site/lib/factory/projector-pg.ts`:

```ts
import type { Pool } from 'pg';
import type { FactoryEvent } from './events';
import type { ProjectorStore } from './projector';
import type { WorkItemProjection } from './projections';

export class PgProjectorStore implements ProjectorStore {
  constructor(private readonly pool: Pool) {}

  async loadCheckpoint(name: string): Promise<number> {
    const result = await this.pool.query<{ last_sequence: string }>(
      'SELECT last_sequence FROM projection_checkpoints WHERE name = $1',
      [name],
    );
    return result.rowCount ? Number(result.rows[0].last_sequence) : 0;
  }

  async loadEvents(afterSequence: number, limit: number): Promise<FactoryEvent[]> {
    const result = await this.pool.query(
      `SELECT sequence, id, aggregate_type, aggregate_id, event_type, payload, actor, occurred_at, version
       FROM events
       WHERE sequence > $1
       ORDER BY sequence ASC
       LIMIT $2`,
      [afterSequence, limit],
    );

    return result.rows.map((row) => ({
      sequence: Number(row.sequence),
      id: String(row.id),
      aggregateType: row.aggregate_type,
      aggregateId: String(row.aggregate_id),
      eventType: String(row.event_type),
      payload: row.payload,
      actor: String(row.actor),
      occurredAt: new Date(row.occurred_at).toISOString(),
      version: Number(row.version),
    }));
  }

  async getWorkItem(id: string): Promise<WorkItemProjection | null> {
    const result = await this.pool.query<{ data: WorkItemProjection }>(
      'SELECT data FROM work_items WHERE id = $1',
      [id],
    );
    return result.rowCount ? result.rows[0].data : null;
  }

  async saveWorkItem(item: WorkItemProjection): Promise<void> {
    await this.pool.query(
      `INSERT INTO work_items (id, status, domain, risk, data, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         domain = EXCLUDED.domain,
         risk = EXCLUDED.risk,
         data = EXCLUDED.data,
         updated_at = EXCLUDED.updated_at`,
      [item.id, item.status, item.domain, item.risk, item, item.updatedAt],
    );
  }

  async saveCheckpoint(name: string, sequence: number): Promise<void> {
    await this.pool.query(
      `INSERT INTO projection_checkpoints (name, last_sequence, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (name) DO UPDATE SET
         last_sequence = EXCLUDED.last_sequence,
         updated_at = now()`,
      [name, sequence],
    );
  }
}
```

Create `site/lib/factory/repository.ts`:

```ts
import {
  assertWorkItemTransition,
  type Domain,
  type Risk,
  type WorkItem,
  WorkItemSchema,
  type WorkItemStatus,
} from './contracts';
import { getPool } from './db';
import { appendEvent, readEvents } from './event-store';
import { newId } from './ids';
import { reduceWorkItem } from './projections';

export interface CreateWorkItemInput {
  domain: Domain;
  ownerRole: Domain;
  title: string;
  risk: Risk;
  kpiTarget: string;
  outcomeWindow: string;
  budget: WorkItem['budget'];
  actor: string;
}

export async function createWorkItem(
  input: CreateWorkItemInput,
): Promise<WorkItem> {
  const now = new Date().toISOString();
  const item = WorkItemSchema.parse({
    id: newId(),
    domain: input.domain,
    ownerRole: input.ownerRole,
    title: input.title,
    risk: input.risk,
    status: 'planned',
    playbookVersion: 'v0',
    policyVersion: 'v0',
    kpiTarget: input.kpiTarget,
    outcomeWindow: input.outcomeWindow,
    budget: input.budget,
    createdAt: now,
    updatedAt: now,
  });

  await appendEvent({
    aggregateType: 'work_item',
    aggregateId: item.id,
    eventType: 'WorkItemCreated',
    payload: item,
    actor: input.actor,
    expectedVersion: 0,
  });

  return item;
}

export async function getWorkItem(id: string): Promise<WorkItem | null> {
  const result = await getPool().query<{ data: WorkItem }>(
    'SELECT data FROM work_items WHERE id = $1',
    [id],
  );
  return result.rowCount ? result.rows[0].data : null;
}

export async function loadWorkItemState(
  id: string,
): Promise<{ item: WorkItem; version: number } | null> {
  const events = await readEvents(id);
  if (events.length === 0) return null;
  const item = events.reduce<WorkItem | null>(
    (state, event) => reduceWorkItem(state, event),
    null,
  );
  if (!item) return null;
  return { item, version: events[events.length - 1].version };
}

export async function loadWorkItemFromEvents(
  id: string,
): Promise<WorkItem | null> {
  return (await loadWorkItemState(id))?.item ?? null;
}

export async function transitionWorkItem(
  id: string,
  to: WorkItemStatus,
  actor: string,
): Promise<WorkItem> {
  const state = await loadWorkItemState(id);
  if (!state) throw new Error(`WorkItem not found: ${id}`);
  assertWorkItemTransition(state.item.status, to);

  const occurredAt = new Date().toISOString();
  await appendEvent({
    aggregateType: 'work_item',
    aggregateId: id,
    eventType: 'WorkItemStatusChanged',
    payload: { from: state.item.status, to },
    actor,
    expectedVersion: state.version,
  });

  return { ...state.item, status: to, updatedAt: occurredAt };
}
```

- [ ] **Step 8: Add the projector loop**

Create `site/worker/factory/projector.ts`:

```ts
import { closePool, getPool } from '../../lib/factory/db';
import { projectBatch } from '../../lib/factory/projector';
import { PgProjectorStore } from '../../lib/factory/projector-pg';

async function main(): Promise<void> {
  const store = new PgProjectorStore(getPool());
  let running = true;

  process.on('SIGINT', () => {
    running = false;
  });
  process.on('SIGTERM', () => {
    running = false;
  });

  while (running) {
    const applied = await projectBatch(store);
    if (applied === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }

  await closePool();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
```

- [ ] **Step 9: Add the integration test**

Create `site/factory/tests/event-store.integration.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closePool, getPool } from '@/lib/factory/db';
import { appendEvent, readEvents } from '@/lib/factory/event-store';
import { newId } from '@/lib/factory/ids';

const databaseUrl = process.env.TEST_DATABASE_URL;
const hasDatabase = Boolean(databaseUrl);

if (databaseUrl) {
  process.env.FACTORY_DATABASE_URL = databaseUrl;
  process.env.FACTORY_CONTROL_TOKEN = process.env.FACTORY_CONTROL_TOKEN ?? 'x'.repeat(32);
}

describe.skipIf(!hasDatabase)('event store integration', () => {
  beforeAll(async () => {
    await getPool().query('SELECT 1');
  });

  afterAll(async () => {
    await closePool();
  });

  it('appends an event and assigns a monotonic version', async () => {
    const aggregateId = newId();
    const first = await appendEvent({
      aggregateType: 'work_item',
      aggregateId,
      eventType: 'WorkItemCreated',
      payload: { id: aggregateId },
      actor: 'integration-test',
    });
    const second = await appendEvent({
      aggregateType: 'work_item',
      aggregateId,
      eventType: 'WorkItemStatusChanged',
      payload: { from: 'planned', to: 'running' },
      actor: 'integration-test',
    });

    expect(first.version).toBe(1);
    expect(second.version).toBe(2);

    const events = await readEvents(aggregateId);
    expect(events.map((event) => event.version)).toEqual([1, 2]);

    await expect(
      appendEvent({
        aggregateType: 'work_item',
        aggregateId,
        eventType: 'WorkItemStatusChanged',
        payload: { from: 'running', to: 'verifying' },
        actor: 'integration-test',
        expectedVersion: 0,
      }),
    ).rejects.toThrow(/Concurrent modification/);
  });
});
```

- [ ] **Step 10: Run tests and typecheck**

```powershell
npm run test -- factory/tests/projections.test.ts factory/tests/projector.test.ts
npm run typecheck
```

Expected: pass. The integration test is skipped unless `TEST_DATABASE_URL` is set.

To run it locally after migrations:

```powershell
$env:TEST_DATABASE_URL='postgres://factory:factory@localhost:5433/factory'
npm run test -- factory/tests/event-store.integration.test.ts
```

Expected: the integration test passes.

- [ ] **Step 11: Commit**

```powershell
git add site/lib/factory/events.ts site/lib/factory/event-store.ts site/lib/factory/projections.ts site/lib/factory/projector.ts site/lib/factory/projector-pg.ts site/lib/factory/repository.ts site/worker/factory/projector.ts site/factory/tests/projections.test.ts site/factory/tests/projector.test.ts site/factory/tests/event-store.integration.test.ts
git commit -m "feat(factory): add event store and postgres projections"
```

---

## Task 5: Add the Temporal Workflow, Activities, and Worker

**Files:**
- Create: `site/lib/factory/temporal/workflows.ts`
- Create: `site/lib/factory/temporal/activities.ts`
- Create: `site/lib/factory/temporal/client.ts`
- Create: `site/lib/factory/telemetry.ts`
- Create: `site/worker/factory/role-worker.ts`

**Interfaces:**
- Produces: `workItemWorkflow()`, `startWorkItemWorkflow()`, `npm run factory:worker`.

- [ ] **Step 1: Implement the workflow**

Create `site/lib/factory/temporal/workflows.ts`:

```ts
import { log, proxyActivities } from '@temporalio/workflow';
import type * as activities from './activities';

const {
  loadWorkItem,
  markWorkItemRunning,
  markWorkItemAwaitingApproval,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '2 minutes',
  retry: {
    maximumAttempts: 3,
    initialInterval: '1 second',
    backoffCoefficient: 2,
  },
});

export interface WorkItemWorkflowInput {
  workItemId: string;
  actor: string;
}

export interface WorkItemWorkflowResult {
  status: 'awaiting_approval';
}

export async function workItemWorkflow(
  input: WorkItemWorkflowInput,
): Promise<WorkItemWorkflowResult> {
  await loadWorkItem(input);
  await markWorkItemRunning(input);
  await markWorkItemAwaitingApproval(input);
  log.info('work item prepared for approval', {
    workItemId: input.workItemId,
  });
  return { status: 'awaiting_approval' };
}
```

- [ ] **Step 2: Implement the activities**

Create `site/lib/factory/temporal/activities.ts`:

```ts
import { ApplicationFailure } from '@temporalio/activity';
import {
  loadWorkItemFromEvents,
  transitionWorkItem,
} from '../repository';
import type { WorkItemWorkflowInput } from './workflows';

export async function loadWorkItem(input: WorkItemWorkflowInput) {
  const item = await loadWorkItemFromEvents(input.workItemId);
  if (!item) {
    throw ApplicationFailure.nonRetryable(
      `WorkItem not found: ${input.workItemId}`,
      'WORK_ITEM_NOT_FOUND',
    );
  }
  return item;
}

export async function markWorkItemRunning(
  input: WorkItemWorkflowInput,
): Promise<void> {
  const current = await loadWorkItemFromEvents(input.workItemId);
  if (!current) {
    throw ApplicationFailure.nonRetryable(
      `WorkItem not found: ${input.workItemId}`,
      'WORK_ITEM_NOT_FOUND',
    );
  }
  if (current.status === 'running') return;
  if (current.status === 'planned') {
    await transitionWorkItem(input.workItemId, 'ready', input.actor);
  }
  if (current.status !== 'planned' && current.status !== 'ready') {
    throw ApplicationFailure.nonRetryable(
      `Unexpected WorkItem status: ${current.status}`,
      'UNEXPECTED_STATUS',
    );
  }
  await transitionWorkItem(input.workItemId, 'running', input.actor);
}

export async function markWorkItemAwaitingApproval(
  input: WorkItemWorkflowInput,
): Promise<void> {
  const current = await loadWorkItemFromEvents(input.workItemId);
  if (!current) {
    throw ApplicationFailure.nonRetryable(
      `WorkItem not found: ${input.workItemId}`,
      'WORK_ITEM_NOT_FOUND',
    );
  }

  if (current.status === 'running') {
    await transitionWorkItem(input.workItemId, 'verifying', input.actor);
  }

  const verifying = await loadWorkItemFromEvents(input.workItemId);
  if (verifying?.status === 'awaiting_approval') return;
  if (verifying?.status !== 'verifying') {
    throw ApplicationFailure.nonRetryable(
      `Unexpected WorkItem status: ${verifying?.status ?? 'missing'}`,
      'UNEXPECTED_STATUS',
    );
  }

  await transitionWorkItem(
    input.workItemId,
    'awaiting_approval',
    input.actor,
  );
}
```

- [ ] **Step 3: Implement the Temporal client**

Create `site/lib/factory/temporal/client.ts`:

```ts
import { Client, Connection } from '@temporalio/client';
import { WorkflowIdReusePolicy } from '@temporalio/common';
import { loadFactoryConfig, type FactoryConfig } from '../config';
import type { WorkItemWorkflowInput } from './workflows';

let client: Client | null = null;

export function temporalConnectionOptions(config: FactoryConfig) {
  return {
    address: config.temporalAddress,
    ...(config.temporalTls ? { tls: true as const } : {}),
    ...(config.temporalApiKey ? { apiKey: config.temporalApiKey } : {}),
  };
}

export async function getTemporalClient(): Promise<Client> {
  if (!client) {
    const config = loadFactoryConfig();
    const connection = await Connection.connect(
      temporalConnectionOptions(config),
    );
    client = new Client({
      connection,
      namespace: config.temporalNamespace,
    });
  }
  return client;
}

export async function startWorkItemWorkflow(
  input: WorkItemWorkflowInput,
): Promise<string> {
  const config = loadFactoryConfig();
  const temporal = await getTemporalClient();
  const handle = await temporal.workflow.start('workItemWorkflow', {
    taskQueue: config.taskQueue,
    workflowId: `work-item-${input.workItemId}`,
    workflowIdReusePolicy: WorkflowIdReusePolicy.ALLOW_DUPLICATE_FAILED_ONLY,
    args: [input],
  });
  return handle.workflowId;
}
```

- [ ] **Step 4: Implement telemetry**

Create `site/lib/factory/telemetry.ts`:

```ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

let sdk: NodeSDK | null = null;

export function startFactoryTelemetry(): void {
  if (sdk) return;
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) return;

  sdk = new NodeSDK({
    serviceName: 'factory-worker',
    traceExporter: new OTLPTraceExporter({
      url: `${endpoint.replace(/\/$/, '')}/v1/traces`,
    }),
  });
  sdk.start();
}

export async function stopFactoryTelemetry(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
  }
}
```

- [ ] **Step 5: Implement the worker**

Create `site/worker/factory/role-worker.ts`:

```ts
import path from 'node:path';
import { NativeConnection, Worker } from '@temporalio/worker';
import { loadFactoryConfig } from '../../lib/factory/config';
import * as activities from '../../lib/factory/temporal/activities';
import { temporalConnectionOptions } from '../../lib/factory/temporal/client';
import {
  startFactoryTelemetry,
  stopFactoryTelemetry,
} from '../../lib/factory/telemetry';

async function main(): Promise<void> {
  startFactoryTelemetry();
  const config = loadFactoryConfig();
  const connection = await NativeConnection.connect(
    temporalConnectionOptions(config),
  );

  const worker = await Worker.create({
    connection,
    namespace: config.temporalNamespace,
    taskQueue: config.taskQueue,
    workflowsPath: path.join(__dirname, '../../lib/factory/temporal/workflows.ts'),
    activities,
  });

  const shutdown = async () => {
    await worker.shutdown();
    await connection.close();
    await stopFactoryTelemetry();
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());

  await worker.run();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
```

- [ ] **Step 6: Verify typecheck and build**

```powershell
npm run typecheck
npm run build
```

Expected: both pass. If Next fails to bundle `@temporalio/client` or `pg`, add this to `site/next.config.ts`:

```ts
serverExternalPackages: ['@temporalio/client', '@temporalio/common', 'pg'],
```

Re-run the build.

- [ ] **Step 7: Commit**

```powershell
git add site/lib/factory/temporal/workflows.ts site/lib/factory/temporal/activities.ts site/lib/factory/temporal/client.ts site/lib/factory/telemetry.ts site/worker/factory/role-worker.ts site/next.config.ts
git commit -m "feat(factory): add temporal workflow and worker"
```

---

## Task 6: Add the Control API and Health Endpoint

**Files:**
- Create: `site/lib/factory/auth.ts`
- Create: `site/lib/factory/api.ts`
- Create: `site/lib/factory/health.ts`
- Create: `site/app/api/factory/work-items/route.ts`
- Create: `site/app/api/factory/work-items/[id]/route.ts`
- Create: `site/app/api/factory/health/route.ts`
- Test: `site/factory/tests/api.test.ts`
- Test: `site/factory/tests/auth.test.ts`
- Test: `site/factory/tests/health.test.ts`

**Interfaces:**
- Produces: `isFactoryAuthorized()`, `CreateWorkItemRequestSchema`, `checkFactoryHealth()`, `POST /api/factory/work-items`, `GET /api/factory/work-items/[id]`, `GET /api/factory/health`.

- [ ] **Step 1: Write the failing API tests**

Create `site/factory/tests/api.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CreateWorkItemRequestSchema } from '@/lib/factory/api';

const valid = {
  domain: 'content',
  ownerRole: 'content',
  title: 'Refresh the Chiang Mai guide',
  risk: 'R1',
  kpiTarget: 'organic_sessions_chiang_mai',
  outcomeWindow: '28d',
  budget: { tokens: 40_000, costUsd: 2, wallClockMinutes: 120 },
  actor: 'masoud',
};

describe('CreateWorkItemRequestSchema', () => {
  it('accepts a valid request', () => {
    expect(CreateWorkItemRequestSchema.parse(valid).title).toContain('Chiang Mai');
  });

  it('rejects a request without a KPI', () => {
    const withoutKpi = Object.fromEntries(
      Object.entries(valid).filter(([key]) => key !== 'kpiTarget'),
    );
    expect(() => CreateWorkItemRequestSchema.parse(withoutKpi)).toThrow();
  });
});
```

Create `site/factory/tests/auth.test.ts`:

```ts
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { isFactoryAuthorized } from '@/lib/factory/auth';

const token = 'x'.repeat(32);
process.env.FACTORY_DATABASE_URL = 'postgres://factory:factory@localhost:5433/factory';
process.env.FACTORY_CONTROL_TOKEN = token;

function request(authorization?: string): NextRequest {
  return new NextRequest('http://localhost/api/factory/work-items', {
    headers: authorization ? { authorization } : {},
  });
}

describe('isFactoryAuthorized', () => {
  it('accepts the bearer token', async () => {
    await expect(isFactoryAuthorized(request(`Bearer ${token}`))).resolves.toBe(true);
  });

  it('rejects a wrong bearer token', async () => {
    await expect(isFactoryAuthorized(request('Bearer wrong'))).resolves.toBe(false);
  });

  it('rejects a missing token', async () => {
    await expect(isFactoryAuthorized(request())).resolves.toBe(false);
  });

  it('rejects session auth for mutations when disabled', async () => {
    await expect(
      isFactoryAuthorized(request(), { allowSession: false }),
    ).resolves.toBe(false);
  });
});
```

Create `site/factory/tests/health.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { checkFactoryHealth } from '@/lib/factory/health';

describe('checkFactoryHealth', () => {
  it('reports healthy dependencies', async () => {
    const health = await checkFactoryHealth({
      dbCheck: async () => undefined,
      temporalCheck: async () => undefined,
    });
    expect(health.ok).toBe(true);
    expect(health.db).toBe('ok');
    expect(health.temporal).toBe('ok');
  });

  it('reports a failed dependency', async () => {
    const health = await checkFactoryHealth({
      dbCheck: async () => {
        throw new Error('db down');
      },
      temporalCheck: async () => undefined,
    });
    expect(health.ok).toBe(false);
    expect(health.db).toBe('error');
  });
});
```

- [ ] **Step 2: Run them and confirm failure**

```powershell
npm run test -- factory/tests/api.test.ts factory/tests/auth.test.ts factory/tests/health.test.ts
```

Expected: fail because the modules do not exist.

- [ ] **Step 3: Implement auth, API schema, and health**

Create `site/lib/factory/auth.ts`:

```ts
import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { isAuthenticated } from '@/lib/dashboard/auth';
import { loadFactoryConfig } from './config';

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface FactoryAuthOptions {
  allowSession?: boolean;
}

export async function isFactoryAuthorized(
  request: NextRequest,
  options: FactoryAuthOptions = {},
): Promise<boolean> {
  const header = request.headers.get('authorization') ?? '';
  const token = header.replace(/^Bearer\s+/i, '').trim();

  if (token && safeEqual(token, loadFactoryConfig().controlToken)) {
    return true;
  }

  if (options.allowSession === false) return false;
  return isAuthenticated(request);
}
```

Create `site/lib/factory/api.ts`:

```ts
import { z } from 'zod';
import { BudgetSchema, DomainSchema, RiskSchema } from './contracts';

export const CreateWorkItemRequestSchema = z.object({
  domain: DomainSchema,
  ownerRole: DomainSchema,
  title: z.string().min(3).max(200),
  risk: RiskSchema,
  kpiTarget: z.string().min(1),
  outcomeWindow: z.string().min(1),
  budget: BudgetSchema,
  actor: z.string().min(1).max(120),
});

export type CreateWorkItemRequest = z.infer<
  typeof CreateWorkItemRequestSchema
>;
```

Create `site/lib/factory/health.ts`:

```ts
export interface HealthDependencies {
  dbCheck: () => Promise<void>;
  temporalCheck: () => Promise<void>;
}

export interface FactoryHealth {
  ok: boolean;
  db: 'ok' | 'error';
  temporal: 'ok' | 'error';
}

export async function checkFactoryHealth(
  dependencies: HealthDependencies,
): Promise<FactoryHealth> {
  const [db, temporal] = await Promise.allSettled([
    dependencies.dbCheck(),
    dependencies.temporalCheck(),
  ]);

  return {
    ok: db.status === 'fulfilled' && temporal.status === 'fulfilled',
    db: db.status === 'fulfilled' ? 'ok' : 'error',
    temporal: temporal.status === 'fulfilled' ? 'ok' : 'error',
  };
}
```

- [ ] **Step 4: Implement the routes**

Create `site/app/api/factory/work-items/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { CreateWorkItemRequestSchema } from '@/lib/factory/api';
import { isFactoryAuthorized } from '@/lib/factory/auth';
import { createWorkItem } from '@/lib/factory/repository';
import { startWorkItemWorkflow } from '@/lib/factory/temporal/client';

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!(await isFactoryAuthorized(request, { allowSession: false }))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = CreateWorkItemRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_request', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const item = await createWorkItem(input);
  const workflowId = await startWorkItemWorkflow({
    workItemId: item.id,
    actor: input.actor,
  });

  return NextResponse.json({ workItem: item, workflowId }, { status: 202 });
}
```

Create `site/app/api/factory/work-items/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { isFactoryAuthorized } from '@/lib/factory/auth';
import { getWorkItem } from '@/lib/factory/repository';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  if (!(await isFactoryAuthorized(request))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const id = (await params).id;
  const item = await getWorkItem(id);
  if (!item) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ workItem: item });
}
```

Create `site/app/api/factory/health/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getPool } from '@/lib/factory/db';
import { checkFactoryHealth } from '@/lib/factory/health';
import { getTemporalClient } from '@/lib/factory/temporal/client';

export async function GET(): Promise<NextResponse> {
  try {
    const health = await checkFactoryHealth({
      dbCheck: async () => {
        await getPool().query('SELECT 1');
      },
      temporalCheck: async () => {
        const client = await getTemporalClient();
        await client.connection.workflowService.getSystemInfo({});
      },
    });

    return NextResponse.json(health, { status: health.ok ? 200 : 503 });
  } catch {
    return NextResponse.json(
      { ok: false, db: 'error', temporal: 'error' },
      { status: 503 },
    );
  }
}
```

- [ ] **Step 5: Run tests and typecheck**

```powershell
npm run test -- factory/tests/api.test.ts factory/tests/auth.test.ts factory/tests/health.test.ts
npm run typecheck
```

Expected: pass.

- [ ] **Step 6: Verify the API against local services**

Start Postgres and Temporal:

```powershell
docker compose -f factory/docker-compose.yml up -d
```

Run migrations:

```powershell
$env:FACTORY_DATABASE_URL='postgres://factory:factory@localhost:5433/factory'
$env:FACTORY_CONTROL_TOKEN=('x' * 32)
npm run factory:migrate
```

Start the worker and projector in separate terminals:

```powershell
$env:FACTORY_DATABASE_URL='postgres://factory:factory@localhost:5433/factory'
$env:FACTORY_CONTROL_TOKEN=('x' * 32)
npm run factory:worker
```

```powershell
$env:FACTORY_DATABASE_URL='postgres://factory:factory@localhost:5433/factory'
$env:FACTORY_CONTROL_TOKEN=('x' * 32)
npm run factory:projector
```

Create a work item:

```powershell
$body = @{
  domain = 'content'
  ownerRole = 'content'
  title = 'Foundation smoke item'
  risk = 'R1'
  kpiTarget = 'smoke'
  outcomeWindow = '1d'
  budget = @{ tokens = 1000; costUsd = 0.01; wallClockMinutes = 5 }
  actor = 'local-smoke'
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/factory/work-items -Headers @{ Authorization = 'Bearer ' + ('x' * 32); 'Content-Type' = 'application/json' } -Body $body
```

Expected: `202` with `workItem.id` and `workflowId`.

- [ ] **Step 7: Commit**

```powershell
git add site/lib/factory/auth.ts site/lib/factory/api.ts site/lib/factory/health.ts site/app/api/factory site/factory/tests/api.test.ts site/factory/tests/auth.test.ts site/factory/tests/health.test.ts
git commit -m "feat(factory): add authenticated control api and health checks"
```

---

## Task 7: Add the End-to-End Smoke Test

**Files:**
- Create: `site/factory/scripts/smoke.ts`

**Interfaces:**
- Produces: `npm run factory:smoke`.

- [ ] **Step 1: Implement the smoke script**

Create `site/factory/scripts/smoke.ts`:

```ts
import {
  artifactKey,
  createS3ArtifactStore,
} from '../../lib/factory/artifacts';
import { closePool, getPool } from '../../lib/factory/db';
import { projectBatch } from '../../lib/factory/projector';
import { PgProjectorStore } from '../../lib/factory/projector-pg';
import { createWorkItem, getWorkItem } from '../../lib/factory/repository';
import { startWorkItemWorkflow } from '../../lib/factory/temporal/client';

async function waitForStatus(
  id: string,
  expected: string,
  timeoutMs = 60_000,
): Promise<void> {
  const store = new PgProjectorStore(getPool());
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await projectBatch(store);
    const item = await getWorkItem(id);
    if (item?.status === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(`Timed out waiting for ${id} to reach ${expected}`);
}

async function main(): Promise<void> {
  const item = await createWorkItem({
    domain: 'content',
    ownerRole: 'content',
    title: `Foundation smoke ${new Date().toISOString()}`,
    risk: 'R1',
    kpiTarget: 'smoke',
    outcomeWindow: '1d',
    budget: { tokens: 1_000, costUsd: 0.01, wallClockMinutes: 5 },
    actor: 'factory-smoke',
  });

  const workflowId = await startWorkItemWorkflow({
    workItemId: item.id,
    actor: 'factory-smoke',
  });

  const key = artifactKey(item.id, 'smoke.txt');
  await createS3ArtifactStore().put(
    key,
    new TextEncoder().encode('factory-smoke'),
    'text/plain',
  );

  await waitForStatus(item.id, 'awaiting_approval');
  console.log(
    JSON.stringify({
      workItemId: item.id,
      workflowId,
      artifactKey: key,
      status: 'awaiting_approval',
    }),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
```

- [ ] **Step 2: Run the smoke test**

Ensure Postgres, Temporal, the worker, and the projector are running. Then:

```powershell
$env:FACTORY_DATABASE_URL='postgres://factory:factory@localhost:5433/factory'
$env:FACTORY_CONTROL_TOKEN=('x' * 32)
npm run factory:smoke
```

Expected output includes:

```json
{"workItemId":"...","workflowId":"work-item-...","artifactKey":"work-items/.../smoke.txt","status":"awaiting_approval"}
```

- [ ] **Step 3: Verify the event log**

```powershell
$env:PGPASSWORD='factory'
psql -h localhost -p 5433 -U factory -d factory -c "SELECT event_type, version FROM events ORDER BY sequence DESC LIMIT 5;"
```

Expected event types include `WorkItemCreated` and two `WorkItemStatusChanged` rows. There must be no direct update to `work_items` outside the projector.

- [ ] **Step 4: Commit**

```powershell
git add site/factory/scripts/smoke.ts
git commit -m "test(factory): add temporal end-to-end smoke script"
```

---

## Task 8: Add Artifact Storage and the Worker Image

**Files:**
- Create: `site/lib/factory/artifacts.ts`
- Test: `site/factory/tests/artifacts.test.ts`
- Create: `site/factory/Dockerfile.worker`
- Create: `site/factory/.dockerignore`

**Interfaces:**
- Produces: `artifactKey()`, `createS3ArtifactStore()`, `factory-worker` image.

- [ ] **Step 1: Write the failing artifact test**

Create `site/factory/tests/artifacts.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { artifactKey } from '@/lib/factory/artifacts';
import { newId } from '@/lib/factory/ids';

describe('artifactKey', () => {
  it('scopes artifacts to the work item and sanitizes the name', () => {
    const id = newId();
    expect(artifactKey(id, 'SEO Report / v1.pdf')).toBe(
      `work-items/${id}/SEO-Report-v1.pdf`,
    );
  });

  it('rejects an empty name', () => {
    expect(() => artifactKey(newId(), '///')).toThrow(/empty/);
  });
});
```

- [ ] **Step 2: Run it and confirm failure**

```powershell
npm run test -- factory/tests/artifacts.test.ts
```

Expected: fail because the module does not exist.

- [ ] **Step 3: Implement the S3-compatible adapter**

Create `site/lib/factory/artifacts.ts`:

```ts
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { loadFactoryConfig, type FactoryConfig } from './config';

export interface ArtifactStore {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
}

export function artifactKey(workItemId: string, name: string): string {
  const safe = name
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!safe) throw new Error('Artifact name is empty after sanitization');
  return `work-items/${workItemId}/${safe}`;
}

export function createS3ArtifactStore(
  config: FactoryConfig = loadFactoryConfig(),
): ArtifactStore {
  const artifacts = config.artifacts;
  if (!artifacts) throw new Error('Artifact storage is not configured');

  const client = new S3Client({
    endpoint: artifacts.endpoint,
    region: artifacts.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: artifacts.accessKeyId,
      secretAccessKey: artifacts.secretAccessKey,
    },
  });

  return {
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: artifacts.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    },
  };
}
```

- [ ] **Step 4: Run the test**

```powershell
npm run test -- factory/tests/artifacts.test.ts
npm run typecheck
```

Expected: both pass.

- [ ] **Step 5: Add the worker image**

Create `site/factory/Dockerfile.worker`:

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci && chown -R node:node /app

ENV NODE_ENV=production

COPY --chown=node:node . .

USER node

CMD ["npm", "run", "factory:worker"]
```

Create `site/factory/.dockerignore`:

```text
node_modules
.next
factory/baseline
*.log
.env
.env.*
```

- [ ] **Step 6: Build the image**

Run from `site/`:

```powershell
docker build -f factory/Dockerfile.worker -t factory-worker:local .
```

Expected: image builds successfully. The image must not contain a `.env` file or any secret.

Verify:

```powershell
docker run --rm factory-worker:local node -e "console.log(process.version)"
```

Expected: prints the Node version.

- [ ] **Step 7: Commit**

```powershell
git add site/lib/factory/artifacts.ts site/factory/tests/artifacts.test.ts site/factory/Dockerfile.worker site/factory/.dockerignore
git commit -m "feat(factory): add artifact storage and worker image"
```

---

## Task 9: Add the Local Runbook and CI

**Files:**
- Create: `site/factory/README.md`
- Create: `.github/workflows/factory-ci.yml`

- [ ] **Step 1: Add the runbook**

Create `site/factory/README.md`:

````markdown
# Factory v2 Local Runbook

This directory contains the Phase 1 foundation only. It does not generate content and does not touch production.

## Services

```powershell
docker compose -f factory/docker-compose.yml up -d
```

## Environment

```powershell
$env:FACTORY_ENV='local'
$env:FACTORY_DATABASE_URL='postgres://factory:factory@localhost:5433/factory'
$env:FACTORY_CONTROL_TOKEN=('x' * 32)
$env:TEMPORAL_ADDRESS='localhost:7233'
$env:TEMPORAL_NAMESPACE='default'
$env:TEMPORAL_TLS='false'
$env:FACTORY_TASK_QUEUE='factory-orchestration'
$env:FACTORY_ARTIFACT_ENDPOINT='http://localhost:9000'
$env:FACTORY_ARTIFACT_REGION='us-east-1'
$env:FACTORY_ARTIFACT_BUCKET='factory-artifacts'
$env:FACTORY_ARTIFACT_ACCESS_KEY_ID='factory'
$env:FACTORY_ARTIFACT_SECRET_ACCESS_KEY='factory-secret'
```

Never use this local token or these local credentials in staging or production. In staging and production, inject all values from the platform secret manager. Do not bake secrets into the worker image.

For Temporal Cloud, also set:

```powershell
$env:TEMPORAL_ADDRESS='<namespace>.<account>.tmprl.cloud:7233'
$env:TEMPORAL_NAMESPACE='<namespace>.<account>'
$env:TEMPORAL_TLS='true'
$env:TEMPORAL_API_KEY='<from-secret-manager>'
```

## Migrate

```powershell
npm run factory:migrate
```

## Run the runtime

Open three terminals from `site/` and run:

```powershell
npm run factory:worker
npm run factory:projector
npm run dev
```

## Worker image

```powershell
docker build -f factory/Dockerfile.worker -t factory-worker:local .
docker run --rm factory-worker:local node -e "console.log(process.version)"
```

Run the image only with environment variables injected by the platform. Never pass `--env-file` from a file that is inside the build context.

## Smoke test

```powershell
npm run factory:smoke
```

Expected status: `awaiting_approval`.

## Boundaries

- `events` is append-only.
- `work_items` and `tasks` are projections.
- Control API mutations require a bearer token. Reads also accept an admin session cookie.
- The worker does not have release authority.
- Production remains on `FACTORY_RUNTIME=old`.
````

- [ ] **Step 2: Add CI**

Create `.github/workflows/factory-ci.yml`:

```yaml
name: Factory CI

on:
  pull_request:
    paths:
      - "site/**"
      - ".github/workflows/factory-ci.yml"
  push:
    branches:
      - main
    paths:
      - "site/**"
      - ".github/workflows/factory-ci.yml"

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: factory
          POSTGRES_PASSWORD: factory
          POSTGRES_DB: factory
        ports:
          - 5433:5432
        options: >-
          --health-cmd "pg_isready -U factory"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 20
    defaults:
      run:
        working-directory: site
    env:
      FACTORY_ENV: local
      FACTORY_DATABASE_URL: postgres://factory:factory@localhost:5433/factory
      FACTORY_CONTROL_TOKEN: factory-ci-token-0123456789abcdef
      TEMPORAL_ADDRESS: localhost:7233
      TEMPORAL_NAMESPACE: default
      FACTORY_TASK_QUEUE: factory-orchestration
      TEST_DATABASE_URL: postgres://factory:factory@localhost:5433/factory
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: site/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run factory:migrate
      - run: npm run test
      - run: npm run build
      - run: docker build -f factory/Dockerfile.worker -t factory-worker:ci .
```

- [ ] **Step 3: Verify locally**

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
docker build -f factory/Dockerfile.worker -t factory-worker:local .
```

Expected: all pass.

- [ ] **Step 4: Commit**

```powershell
git add site/factory/README.md .github/workflows/factory-ci.yml
git commit -m "chore(factory): add local runbook and ci"
```

---

## Task 10: Add the Production Baseline Snapshot

**Files:**
- Create: `site/factory/scripts/baseline.mjs`

- [ ] **Step 1: Implement the baseline script**

Create `site/factory/scripts/baseline.mjs`:

```js
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const url = process.argv[2] ?? 'https://thailandgard.ir/sitemap.xml';
const response = await fetch(url, {
  headers: { 'user-agent': 'thailandgard-factory-baseline/1.0' },
  signal: AbortSignal.timeout(30_000),
});

if (!response.ok) {
  throw new Error(`Baseline fetch failed: ${response.status} ${response.statusText}`);
}

const body = await response.text();
const sha = createHash('sha256').update(body).digest('hex');
const gitSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const capturedAt = new Date().toISOString();
const outputDir = path.resolve(process.cwd(), 'factory/baseline');
const outputFile = path.join(outputDir, `${capturedAt.replace(/[:.]/g, '-')}.json`);

await mkdir(outputDir, { recursive: true });
await writeFile(
  outputFile,
  JSON.stringify({ url, gitSha, capturedAt, sha256: sha, bytes: Buffer.byteLength(body) }, null, 2),
  'utf8',
);

console.log(outputFile);
```

- [ ] **Step 2: Run the baseline**

```powershell
npm run factory:baseline
```

Expected: writes a JSON file under `site/factory/baseline/` and prints its path.

- [ ] **Step 3: Record the baseline**

Copy the file path and SHA-256 into the Phase 0 migration checklist. Do not commit large sitemap bodies; only commit the JSON metadata.

- [ ] **Step 4: Commit**

```powershell
git add site/factory/scripts/baseline.mjs site/factory/baseline/*.json
git commit -m "chore(factory): capture production baseline metadata"
```

---

## Task 11: Retire Conflicting Documentation

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/GROWTH-ENGINE.md`
- Modify: `README.md`

- [ ] **Step 1: Add the superseded banner**

At the top of `docs/ARCHITECTURE.md`, add:

```markdown
> **SUPERSEDED (2026-10-20):** This document describes the old 13-team, 3-wave model. The approved architecture is `docs/factory-v2/ARCHITECTURE.md`. Do not implement from this file.
```

At the top of `docs/GROWTH-ENGINE.md`, add:

```markdown
> **SUPERSEDED (2026-10-20):** This document describes the old growth engine. The approved architecture is `docs/factory-v2/ARCHITECTURE.md` and the execution plan is `docs/factory-v2/ROADMAP.md`.
```

- [ ] **Step 2: Update the README**

Replace the old team/rhythm description with:

```markdown
## Factory v2

ThailandGard is migrating to an autonomous, exception-controlled factory.

- Architecture: `docs/factory-v2/ARCHITECTURE.md`
- Roadmap: `docs/factory-v2/ROADMAP.md`
- Foundation plan: `docs/superpowers/plans/2026-10-20-factory-v2-foundation.md`
- Local factory runbook: `site/factory/README.md`

The old 13-team model and the `dev` branch workflow are retired. Production remains on the old runtime until the Phase 5 cutover gate passes.
```

Keep the existing production URL and deployment commands.

- [ ] **Step 3: Verify links**

```powershell
Test-Path docs/factory-v2/ARCHITECTURE.md
Test-Path docs/factory-v2/ROADMAP.md
Test-Path docs/superpowers/plans/2026-10-20-factory-v2-foundation.md
Test-Path site/factory/README.md
```

Expected: all `True`.

- [ ] **Step 4: Commit**

```powershell
git add docs/ARCHITECTURE.md docs/GROWTH-ENGINE.md README.md
git commit -m "docs: supersede old factory model"
```

---

## Phase 1 Exit Gate

Do not mark Phase 1 complete until all of the following are true:

- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes.
- [ ] `npm run build` passes.
- [ ] `npm run factory:migrate` is idempotent.
- [ ] `npm run factory:smoke` reaches `awaiting_approval`.
- [ ] The smoke artifact `work-items/<id>/smoke.txt` exists in the `factory-artifacts` bucket.
- [ ] The event log contains `WorkItemCreated` and two `WorkItemStatusChanged` events for the smoke item.
- [ ] The worker image builds and contains no `.env` file or secret value.
- [ ] The service worker starts with no secret values in logs.
- [ ] `GET /api/factory/health` returns `200` with `{ "ok": true }`.
- [ ] A wrong bearer token returns `401`.
- [ ] Production is still running the old runtime.
- [ ] `FACTORY_RUNTIME=new` has not been enabled anywhere.
- [ ] The Phase 0 baseline JSON is recorded.
- [ ] A rollback note exists: stop the worker, stop the projector, delete the staging database, and redeploy the last known-good SHA.

## Risks and Mitigations

- **Temporal local server unavailable in CI:** keep workflow tests out of the default suite; use the smoke script against local Docker. Add a Temporal test environment in Phase 2.
- **Postgres projection lag:** GET endpoints read projections, so a response may briefly lag the event log. Workflow transitions replay events, not projections, so they never act on stale status. The smoke test polls the projection. Do not add synchronous projection writes to the API.
- **Duplicate workflow IDs:** the workflow ID is deterministic per WorkItem. A retried create request returns the existing WorkItem if the caller supplies an idempotency key in Phase 2. For now, the Control API is internal and bearer-protected.
- **Native module bundling in Next:** `serverExternalPackages` isolates Temporal and Postgres from the Next bundler. Verify the build after adding it.
- **Secret leakage:** the Control API never returns configuration. Health returns only dependency status. Structured logs must not include headers or environment values.
- **Old system interference:** the existing cycle worker and bridge sweep remain untouched. Do not point them at the factory database.

## Self-Review

- Every Phase 0/1 roadmap item has a task or a checklist item.
- Every code-producing task has a test or a verification command.
- No task modifies the production runtime, deploy queue, or existing dashboard tables.
- No task claims quality without evidence.
- The plan preserves the architecture's hard rules: Temporal owns workflow state, Postgres projections are derived, release authority is separate, and production remains on the old runtime.
- The plan deliberately stops before content generation, quality gates, release automation, and cutover.

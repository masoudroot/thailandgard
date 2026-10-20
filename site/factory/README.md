# Factory v2 Local Runbook

This directory contains the Phase 1 foundation only. It does not generate content and does not touch production.

## Services

From `site/`:

```powershell
docker compose -f factory/docker-compose.yml up -d
```

This starts Postgres on `5433`, Temporal on `7233`/`8233`, and MinIO on `9000`/`9001`.

If Docker is unavailable, use any local Postgres 16+, Temporal dev server, and S3-compatible endpoint. The artifact adapter uses path-style S3 access.

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

Never use this local token or these local credentials in staging or production. Inject all values from the platform secret manager. Do not bake secrets into the worker image.

For Temporal Cloud, also set:

```powershell
$env:TEMPORAL_ADDRESS='<namespace>.<account>.tmprl.cloud:7233'
$env:TEMPORAL_NAMESPACE='<namespace>.<account>'
$env:TEMPORAL_TLS='true'
$env:TEMPORAL_API_KEY='<from-secret-manager>'
```

## Install

From `site/`:

```powershell
npm ci --legacy-peer-deps
```

The repository currently has an upstream peer-dependency conflict between `vitest@5` and the pinned `@types/node@20`; plain `npm ci` fails. Remove `--legacy-peer-deps` after the type packages are aligned.

## Migrate

```powershell
npm run factory:migrate
```

The migration runner is idempotent.

## Run the runtime

Open three terminals from `site/` and run:

```powershell
npm run factory:worker
npm run factory:projector
npm run dev
```

If port `3000` is busy, run `npm run dev -- -p 3001`.

## Worker image

From `site/`:

```powershell
docker build -f factory/Dockerfile.worker -t factory-worker:local .
docker run --rm factory-worker:local node -e "console.log(process.version)"
```

The build context is `site/`, so `site/.dockerignore` excludes `node_modules`, `.next`, logs, and environment files. Run the image only with environment variables injected by the platform. Never pass an env file from inside the build context.

## Smoke test

With Postgres, Temporal, the worker, and the projector running:

```powershell
npm run factory:smoke
```

Expected status: `awaiting_approval`. The script also writes `work-items/<id>/smoke.txt` to the configured artifact bucket. The event log should contain `WorkItemCreated` followed by four `WorkItemStatusChanged` events.

## Verification

From `site/`:

```powershell
npm run lint:factory
npm run typecheck
npm test
npm run build
```

The full `npm run lint` currently fails on pre-existing React hook and `no-explicit-any` errors in the legacy dashboard. `lint:factory` is the blocking check for this Phase 1 work; the legacy lint debt is tracked separately.

## Rollback

Stop the worker and projector, delete the staging database, and redeploy the last known-good SHA. Production remains on the old runtime until the Phase 5 cutover gate passes; do not enable `FACTORY_RUNTIME=new` as part of a rollback.

## Boundaries

- `events` is append-only.
- `work_items` and `tasks` are projections.
- Control API mutations require a bearer token. Reads also accept an admin session cookie.
- The worker does not have release authority.
- Production remains on `FACTORY_RUNTIME=old`.

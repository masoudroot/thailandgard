# Factory v2 Local Runbook

This directory contains the Phase 1 foundation and the local dry-run portion of the Phase 2 walking skeleton. The walking skeleton generates content and release evidence in dry-run mode only. It does not publish content or touch production; merge queue and production deploy remain gated.

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
$env:FACTORY_EVIDENCE_SECRET=('e' * 32)
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

The build context is `site/`, so `site/.dockerignore` excludes `node_modules`, `.next`, logs, and environment files. The image uses `node:22-bookworm-slim` because the Temporal core bridge requires glibc; do not switch it to Alpine. If the npm registry is slow, pass `--build-arg NPM_REGISTRY=<mirror>`.

Run the image only with environment variables injected by the platform. Never pass an env file from inside the build context.

## Smoke test

With Postgres, Temporal, the worker, and the projector running:

```powershell
npm run factory:smoke
```

Expected status: `awaiting_approval`. The script also writes `work-items/<id>/smoke.txt` to the configured artifact bucket. The event log should contain `WorkItemCreated` followed by four `WorkItemStatusChanged` events.

## Walking skeleton (Content R0, dry-run)

The walking skeleton creates an R0 content WorkItem, generates a deterministic Persian draft, runs the content and SEO gates, signs and stores both evidence records, evaluates `policy@1`, writes a dry-run release manifest and preview, and records a pending outcome.

With Postgres, Temporal, the worker, the projector, and artifact storage running, and `FACTORY_EVIDENCE_SECRET` set:

```powershell
npm run factory:walking-skeleton
```

Expected output includes `status: "done"`, at least 1 artifact, at least 2 evidence records, 1 release, and 1 outcome.

This command refuses to run when `FACTORY_RUNTIME=new`. The release row and manifest are `dry_run`; no production content is written. To regenerate the JSON Schemas:

```powershell
npm run factory:schemas
```

## P3 — SEO Radar, Tour Facts, R1 Gate, Outreach

P3 reuses the existing Supabase GSC/news feeds and the checked-in tour fallback. Put credentials in `site/.env.factory.local` (gitignored); the P3 scripts, worker, and projector load it automatically. See `docs/factory-v2/P3-CREDENTIALS.md` for every variable and where to obtain it. Never paste secrets into a terminal command, issue, or commit.

Local credential form:

```powershell
npm run factory:credentials
```

Open `http://127.0.0.1:4317`, fill the required fields, and save. The form writes `site/.env.factory.local` and can restart the worker and projector automatically.

Tour fact snapshot and gate:

```powershell
npm run factory:tour-facts
npm run factory:tour-facts -- --fallback --no-persist
```

A passing gate requires fresh prices and a Supabase source. The fallback is intentionally marked with missing price dates so it cannot masquerade as production data.

SEO radar and R1 technical gate:

```powershell
npm run factory:seo-radar -- --fixture
npm run factory:seo-radar
npm run factory:seo-gate -- --url http://localhost:3001/tours/phuket-7-days --canonical https://thailandgard.ir/tours/phuket-7-days --jsonld TouristTrip
```

Domain Ops workflows:

```powershell
npm run factory:seo-ops
npm run factory:seo-ops -- --url http://localhost:3001/tours/phuket-7-days --canonical https://thailandgard.ir/tours/phuket-7-days --jsonld TouristTrip
npm run factory:tour-ops
npm run factory:tour-ops -- --allow-fallback --no-require-fresh --no-require-supabase
```

Outreach pipeline (dry-run by default):

```powershell
npm run factory:outreach -- add --domain example.com --url https://example.com/thailand --email editor@example.com --relevance 80
npm run factory:outreach -- list
npm run factory:outreach -- plan
npm run factory:outreach -- run --dry-run-dispatch
npm run factory:outreach -- send
npm run factory:outreach -- send --live
```

Live outreach requires `FACTORY_OUTREACH_LIVE=true`, `RESEND_API_KEY`, `FACTORY_OUTREACH_FROM_EMAIL`, and `FACTORY_OUTREACH_UNSUBSCRIBE_BASE`. The sender refuses to send any message that still contains the `{{unsubscribeUrl}}` placeholder.

## Verification

From `site/`:

```powershell
npm run lint
npm run lint:factory
npm run typecheck
npm test
npm run build
```

The pre-existing React hook and `no-explicit-any` violations in the legacy dashboard are recorded in `site/eslint-suppressions.json`. `npm run lint` fails on new violations. Run `npx eslint --prune-suppressions` after fixing legacy code. `npm run lint:factory` remains available for a focused check.

## Rollback

Stop the worker and projector, delete the staging database, and redeploy the last known-good SHA. Production remains on the old runtime until the Phase 5 cutover gate passes; do not enable `FACTORY_RUNTIME=new` as part of a rollback.

## Boundaries

- `events` is append-only.
- `work_items` and `tasks` are projections.
- Control API mutations require a bearer token. Reads also accept an admin session cookie.
- The worker has dry-run release authority only. Production merge/deploy authority remains disabled.
- Production remains on `FACTORY_RUNTIME=old`.

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

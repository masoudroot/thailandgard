CREATE TABLE IF NOT EXISTS seo_signals (
  id uuid PRIMARY KEY,
  dedupe_key text NOT NULL UNIQUE,
  type text NOT NULL,
  priority integer NOT NULL CHECK (priority BETWEEN 0 AND 100),
  title text NOT NULL,
  detail text NOT NULL,
  subject text NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  observed_at timestamptz NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seo_signals_status_idx
  ON seo_signals (status, priority DESC, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS tour_fact_snapshots (
  id uuid PRIMARY KEY,
  tour_slug text NOT NULL,
  source text NOT NULL,
  price_status text NOT NULL,
  payload jsonb NOT NULL,
  hash text NOT NULL,
  fetched_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tour_slug, hash)
);

CREATE INDEX IF NOT EXISTS tour_fact_snapshots_slug_idx
  ON tour_fact_snapshots (tour_slug, fetched_at DESC);

CREATE TABLE IF NOT EXISTS outreach_prospects (
  id uuid PRIMARY KEY,
  domain text NOT NULL UNIQUE,
  url text NOT NULL,
  contact_email text,
  relevance integer NOT NULL DEFAULT 0 CHECK (relevance BETWEEN 0 AND 100),
  status text NOT NULL DEFAULT 'new',
  last_contacted_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outreach_prospects_status_idx
  ON outreach_prospects (status, relevance DESC);

CREATE TABLE IF NOT EXISTS outreach_messages (
  id uuid PRIMARY KEY,
  prospect_id uuid NOT NULL REFERENCES outreach_prospects(id) ON DELETE CASCADE,
  work_item_id uuid,
  step integer NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  provider_id text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prospect_id, step)
);

CREATE INDEX IF NOT EXISTS outreach_messages_status_idx
  ON outreach_messages (status, created_at DESC);

CREATE TABLE IF NOT EXISTS outreach_suppressions (
  email text PRIMARY KEY,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

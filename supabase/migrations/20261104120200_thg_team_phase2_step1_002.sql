-- THG-TEAM-ARCHITECTURE-01 Phase 2, step 1: MIGRATION-002 (new entities)
-- Source draft (NOT edited): /home/hatch/workspace/thg-team-architecture-01/migrations/002_new_entities.sql
-- Finalized 2026-11-04. Additive ONLY: CREATE TABLE IF NOT EXISTS, no DROP,
-- no ALTER of existing tables, no UPDATE, no DELETE, no leads access.
-- Idempotency: every statement is CREATE TABLE IF NOT EXISTS. The draft contains
-- no ENUM types and no CHECK constraints, so there is nothing else to make
-- idempotent. UNIQUE constraints and foreign keys are inline in the CREATE
-- statements, so a re-run is a no-op for tables that already exist.
-- No dependency on 001_work_graph_extensions.sql: this file references only
-- pre-existing base columns (factory_work_items.id, factory_artifacts.id,
-- tours.slug) and none of the columns 001 adds (owner_team, proposal_id, etc.).
-- Dependency note: factory_knowledge_claims references knowledge_sources(id).
-- On production knowledge_sources already exists, so this file runs as-is there.
-- On staging it required the preceding bootstrap migration
-- (20261104120100_thg_team_phase2_step1_knowledge_sources_bootstrap.sql), which
-- restores knowledge_sources with the repo DDL; that bootstrap is CREATE TABLE
-- IF NOT EXISTS and bannered staging-only, so a production run is a harmless no-op.
-- Rollback (per draft): stop writers; keep tables, do not drop them.

CREATE TABLE IF NOT EXISTS factory_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  source_url text,
  observed_at timestamptz NOT NULL,
  title text NOT NULL,
  summary text,
  tags text[] NOT NULL DEFAULT '{}',
  dedupe_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS factory_work_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal text NOT NULL,
  evidence_refs text[] NOT NULL DEFAULT '{}',
  priority text NOT NULL,
  risk_class text NOT NULL,
  owner_team text NOT NULL,
  collaborator_teams text[] NOT NULL DEFAULT '{}',
  acceptance_criteria text[] NOT NULL DEFAULT '{}',
  budget_limit numeric NOT NULL DEFAULT 0,
  dependencies text[] NOT NULL DEFAULT '{}',
  expiry timestamptz NOT NULL,
  dedupe_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft',
  origin text NOT NULL DEFAULT 'factory',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS factory_work_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_work_id uuid NOT NULL REFERENCES factory_work_items(id),
  to_work_id uuid NOT NULL REFERENCES factory_work_items(id),
  artifact_id uuid REFERENCES factory_artifacts(id),
  dependency_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_work_id, to_work_id, dependency_type)
);

CREATE TABLE IF NOT EXISTS factory_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id uuid NOT NULL REFERENCES factory_work_items(id),
  claim text NOT NULL,
  source text NOT NULL,
  source_url text,
  observed_at timestamptz,
  validity_status text NOT NULL DEFAULT 'unverified',
  conflict_state text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS factory_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id uuid NOT NULL REFERENCES factory_work_items(id),
  reviewer_team text NOT NULL,
  review_type text NOT NULL,
  severity text NOT NULL,
  finding text NOT NULL,
  evidence_refs text[] NOT NULL DEFAULT '{}',
  required_change text,
  decision text NOT NULL,
  confidence numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS factory_knowledge_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES knowledge_sources(id),
  claim text NOT NULL,
  observed_at timestamptz NOT NULL,
  valid_until timestamptz,
  validity_status text NOT NULL DEFAULT 'unverified',
  conflict_state text,
  related_pages text[] NOT NULL DEFAULT '{}',
  dedupe_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS factory_learning_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id uuid REFERENCES factory_work_items(id),
  team text NOT NULL,
  event_type text NOT NULL,
  detail text NOT NULL,
  rule_change text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tour_price_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_slug text NOT NULL REFERENCES tours(slug),
  previous_price numeric,
  candidate_price numeric NOT NULL,
  price_formula text NOT NULL,
  rate_ref text,
  rate_observed_at timestamptz,
  evidence_refs text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'candidate',
  reviewed_by text,
  reviewed_at timestamptz,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

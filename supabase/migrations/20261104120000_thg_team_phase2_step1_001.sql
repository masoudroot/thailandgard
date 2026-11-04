-- THG-TEAM-ARCHITECTURE-01 Phase 2, step 1: MIGRATION-001 (work graph extensions)
-- Finalized from: thg-team-architecture-01/migrations/001_work_graph_extensions.sql (draft, untouched)
-- Additive ONLY, idempotent: safe to run twice. No DROP, no UPDATE, no DELETE,
-- no ALTER that removes or changes an existing column, no new table in this file.
-- NOTE: draft 001 creates NO new table. It adds columns to two existing tables only.
-- NOTE on CHECK constraints: the draft comment says the final migration should carry
-- NAMED check constraints for owner_team (member of the six teams), policy_decision
-- (auto | human | business | none) and outcome_status
-- (success | failed | blocked | superseded | no_action). The draft states the value
-- lists for policy_decision and outcome_status, so those two are added below as named,
-- idempotent constraints (DO blocks, NULL allowed so existing rows pass untouched).
-- The six team identifiers for owner_team are the frozen TeamKey values from
-- site/lib/factory/teams/registry.ts (product_leader, tour_manager, content, seo,
-- design, development); the owner_team CHECK below uses exactly those identifiers.
-- The proposal_id FOREIGN KEY to factory_work_proposals is added in a later step-1
-- follow-up, not here, because 001 must be able to run before 002 creates that table.
-- Rollback: stop the new writers; keep the columns (dropping a column would drop new data).

ALTER TABLE factory_work_items
  ADD COLUMN IF NOT EXISTS owner_team text,
  ADD COLUMN IF NOT EXISTS collaborator_teams text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS proposal_id uuid,
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'factory',
  ADD COLUMN IF NOT EXISTS policy_decision text,
  ADD COLUMN IF NOT EXISTS policy_decided_by text,
  ADD COLUMN IF NOT EXISTS policy_decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS outcome_status text,
  ADD COLUMN IF NOT EXISTS outcome_evidence text,
  ADD COLUMN IF NOT EXISTS stop_reason text,
  ADD COLUMN IF NOT EXISTS deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS freshness_window_hours integer;

ALTER TABLE factory_approvals
  ADD COLUMN IF NOT EXISTS review_type text,
  ADD COLUMN IF NOT EXISTS severity text,
  ADD COLUMN IF NOT EXISTS confidence numeric;

-- Named CHECKs, idempotent via DO blocks (values exactly as stated in the draft).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'factory_work_items_policy_decision_check'
      AND conrelid = 'public.factory_work_items'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE public.factory_work_items ADD CONSTRAINT factory_work_items_policy_decision_check CHECK (policy_decision IS NULL OR policy_decision IN (''auto'', ''human'', ''business'', ''none''))';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'factory_work_items_outcome_status_check'
      AND conrelid = 'public.factory_work_items'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE public.factory_work_items ADD CONSTRAINT factory_work_items_outcome_status_check CHECK (outcome_status IS NULL OR outcome_status IN (''success'', ''failed'', ''blocked'', ''superseded'', ''no_action''))';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'factory_work_items_owner_team_check'
      AND conrelid = 'public.factory_work_items'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE public.factory_work_items ADD CONSTRAINT factory_work_items_owner_team_check CHECK (owner_team IS NULL OR owner_team IN (''product_leader'', ''tour_manager'', ''content'', ''seo'', ''design'', ''development''))';
  END IF;
END
$$;

-- THG-TEAM-ARCHITECTURE-01 Phase 2, step 1: proposal_id foreign key (follow-up)
-- This file exists because 001 must run before 002 creates factory_work_proposals,
-- so the FK could not live inside 001; it must run after the 002 file.
-- Additive ONLY, idempotent: safe to run twice. No DROP, no UPDATE, no DELETE,
-- no ALTER that removes or changes an existing column, no new table in this file.
-- The FK already exists on staging (added as a step-1 follow-up there), so a
-- re-run on staging is a no-op: the DO block below skips when the constraint
-- already exists. Constraint name and action match staging exactly:
-- factory_work_items_proposal_id_fkey, FOREIGN KEY (proposal_id)
-- REFERENCES factory_work_proposals(id) ON DELETE NO ACTION.
-- Rollback: stop the writers that fill proposal_id; keep the constraint
-- (dropping it would silently allow orphan proposal references).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'factory_work_items_proposal_id_fkey'
      AND conrelid = 'public.factory_work_items'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE public.factory_work_items ADD CONSTRAINT factory_work_items_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.factory_work_proposals(id) ON DELETE NO ACTION';
  END IF;
END
$$;

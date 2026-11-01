-- 20261101110000_gateway_operation_columns.sql | THG-UNIFY-01: provider/model/token columns
--
-- Companion to the dashboard operations list (TEAMS-DASHBOARD finding):
-- public.factory_gateway_operations has NO provider, model, or token
-- columns today; provider_calls is only a count, and provider/model/
-- token_limit exist solely in the in-memory OperationInput, folded
-- into input_fingerprint and never persisted. The dashboard therefore
-- cannot show which provider/model served an operation or how many
-- tokens it used, and the earlier "mock label" gap is really this
-- missing-columns gap.
--
-- This file is ADDITIVE ONLY: five nullable columns, no backfill, no
-- data change, no behavior change. Persisting values into these
-- columns from the gateway input (operations.ts) and extending the
-- dashboard data.ts selects are follow-up code changes AFTER this
-- migration is applied; until then the columns stay null and the
-- dashboard must keep showing cost as unknown, never zero.
--
-- Rollback plan: a follow-up migration dropping these five columns
-- (only safe once no code reads them); the columns carry no data
-- until the persistence change lands, so dropping is lossless then.
--
-- Status: written, NOT applied to any database.

alter table public.factory_gateway_operations
  add column if not exists provider text,
  add column if not exists model text,
  add column if not exists prompt_tokens integer,
  add column if not exists completion_tokens integer,
  add column if not exists total_tokens integer;

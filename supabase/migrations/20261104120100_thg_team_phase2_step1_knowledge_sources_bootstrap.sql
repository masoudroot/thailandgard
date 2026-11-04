-- THG-TEAM-ARCHITECTURE-01 Phase 2, step 1 close-out -- Q2 bootstrap (STAGING ONLY)
-- STAGING ONLY. This file must NEVER be applied to production as a production
-- migration: production already has knowledge_sources (verified 2026-11-04 by a
-- read-only production DDL diff against the repo DDL below; the two match).
-- Purpose: restore on staging the table that the dashboard/ migration directory
-- never applied there (see PLAN.md step-1 entry, migration-runner scope finding),
-- so the deferred factory_knowledge_claims CREATE can run against it.
-- The CREATE below is verbatim from
-- supabase/migrations/dashboard/20261015160000_knowledge_management.sql lines 47-69
-- (knowledge_sources CREATE plus its two indexes ONLY). Nothing else from that
-- file is copied: its team_knowledge alterations and knowledge_usage table are
-- out of scope. The statement is CREATE TABLE IF NOT EXISTS, so a production run
-- would be a harmless no-op; it is nevertheless bannered staging-only and must
-- not be run on production.
-- Types used are core PostgreSQL only (uuid, text, smallint, integer, timestamptz,
-- boolean; gen_random_uuid() is built in) -- no extension is required. The table
-- lands in public (the deferred FK uses the unqualified name knowledge_sources).
-- No RLS is enabled by this file, matching the repo file and production state
-- (production relrowsecurity = f, no policies, no triggers).

create table if not exists knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  team text not null,
  url text not null,
  title text,
  source_type text not null default 'other'
    check (source_type in ('official-doc', 'expert-blog', 'research', 'competitor', 'course', 'community', 'other')),
  authority_tier smallint not null default 2
    check (authority_tier between 1 and 3),
  fetch_frequency_hours integer not null default 168
    check (fetch_frequency_hours > 0),
  last_fetched_at timestamptz,
  last_fetch_status text
    check (last_fetch_status is null or last_fetch_status in ('ok', 'failed')),
  last_fetch_error text,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team, url)
);
create index if not exists knowledge_sources_team_idx on knowledge_sources(team);
create index if not exists knowledge_sources_team_active_idx on knowledge_sources(team, is_active);

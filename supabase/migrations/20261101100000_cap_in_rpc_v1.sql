-- 20261101100000_cap_in_rpc_v1.sql | THG-UNIFY-01: daily publish cap inside the v1 RPC
--
-- Companion to 20261101090000_cap_in_rpc.sql (v2 cap). This file does
-- ONE thing: it redefines publish_content_atomic (v1) with the EXACT
-- same signature and the EXACT same behavior as 20261030120100, plus
-- the same hard daily cap of 70 enforced inside the function. No schema
-- change, no new table, no backfill, no data change. The v1 body is
-- copied verbatim (including its M2-slice slug check); only the
-- declaration of v_daily_count and the cap block after the replay
-- branch are added, so a diff against the original shows only those.
--
-- Semantics (identical to the v2 cap, same day lock namespace):
-- - Boundary: UTC calendar day; the lock key 727001 + YYYYMMDD is
--   shared with the v2 cap, so v1 and v2 serialize on the same day
--   lock and count the same factory_publications publish rows. A day
--   can therefore no longer exceed 70 through v1 alone, and v2's count
--   already includes v1 rows.
-- - Replay exemption: the idempotency replay branch runs BEFORE the
--   cap block and returns early; replay consumes no quota.
-- - Rollback exemption: kind = 'rollback' skips the cap block.
-- - At 69 a new publish succeeds (70th); at 70 it raises 'daily
--   publish limit reached (70 per UTC day)' and rolls back fully.
-- - Grants: execute stays service_role only, as before.
-- - Rollback plan: a follow-up migration CREATE OR REPLACE restoring
--   the 20261030120100 body verbatim; the cap adds no tables/columns,
--   so there is nothing else to undo.
-- - Status: written, NOT applied to any database. Behavior still needs
--   a database test (Staging dry-run, coordinator decision).

-- publish_content_atomic نهایی (016): انتشار و Rollback اتمیک.
create or replace function public.publish_content_atomic(
  p_content_id uuid,
  p_version_id uuid,
  p_idempotency_key text,
  p_expected_marker text,
  p_previous_unique_text text,
  p_publication_kind text default 'publish',
  p_rollback_of_publication_id uuid default null,
  p_reason text default null,
  p_work_item_id uuid default null,
  p_approval_id uuid default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_doc public.content_documents%rowtype;
  v_version public.content_versions%rowtype;
  v_existing public.factory_publications%rowtype;
  v_rollback_of public.factory_publications%rowtype;
  v_publication_id uuid;
  v_daily_count bigint;
  v_outbox_id uuid;
  v_previous_version_id uuid;
begin
  if p_idempotency_key is null or length(p_idempotency_key) = 0 then
    raise exception 'idempotency_key is required';
  end if;
  if p_publication_kind is null or p_publication_kind not in ('publish', 'rollback') then
    raise exception 'publication_kind must be publish or rollback';
  end if;

  select * into v_existing from public.factory_publications where idempotency_key = p_idempotency_key;
  if found then
    if v_existing.content_id <> p_content_id or v_existing.version_id <> p_version_id
      or v_existing.publication_kind is distinct from p_publication_kind
      or v_existing.rollback_of_publication_id is distinct from p_rollback_of_publication_id
      or v_existing.work_item_id is distinct from p_work_item_id
      or v_existing.approval_id is distinct from p_approval_id then
      raise exception 'idempotency_key already used for a different publication';
    end if;
    select id into v_outbox_id from public.factory_outbox_events where publication_id = v_existing.id;
    return jsonb_build_object(
      'publication_id', v_existing.id,
      'outbox_id', v_outbox_id,
      'previous_version_id', v_existing.previous_version_id,
      'version_id', v_existing.version_id,
      'status', v_existing.status,
      'publication_kind', v_existing.publication_kind,
      'rollback_of_publication_id', v_existing.rollback_of_publication_id,
      'work_item_id', v_existing.work_item_id,
      'approval_id', v_existing.approval_id,
      'replayed', true
    );
  end if;

  -- SECURITY-CAP (2026-11-01): hard daily cap, enforced inside this
  -- function so no caller can bypass it: not the v2 service, not the
  -- tick route, and not a direct authorized RPC call. The replay
  -- branch above already returned, so a replay never consumes quota.
  -- Rollback skips this block entirely (recovery, not a new publish).
  if p_publication_kind = 'publish' then
    -- One transaction at a time per UTC day: the lock is held until
    -- this transaction commits or rolls back, so the count below
    -- cannot go stale for a concurrent publisher. Key = namespace
    -- 727001 + YYYYMMDD; the value exceeds the int32 range, so it
    -- cannot collide with the hashtext-based advisory locks used
    -- elsewhere in this codebase.
    perform pg_advisory_xact_lock(
      72700100000000::bigint
        + to_char(timezone('UTC', now()), 'YYYYMMDD')::bigint
    );
    select count(*) into v_daily_count
      from public.factory_publications
      where publication_kind = 'publish'
        and requested_at >= date_trunc('day', timezone('UTC', now())) at time zone 'UTC'
        and requested_at < date_trunc('day', timezone('UTC', now())) at time zone 'UTC' + interval '1 day';
    -- The count covers every publish row of the UTC day, whatever its
    -- status (pending, verified, needs_intervention): a row is written
    -- at publish time, so a row that later needs intervention still
    -- consumed its slot. This matches the service-level count.
    if v_daily_count >= 70 then
      raise exception 'daily publish limit reached (70 per UTC day)';
    end if;
  end if;

  select * into v_doc from public.content_documents where id = p_content_id for update;
  if not found then
    raise exception 'content document not found';
  end if;
  if v_doc.slug <> 'best-time-to-visit-thailand' or v_doc.content_type <> 'guide' then
    raise exception 'content document is outside the M2 slice';
  end if;

  select * into v_version from public.content_versions where id = p_version_id;
  if not found then
    raise exception 'content version not found';
  end if;
  if v_version.content_id <> p_content_id then
    raise exception 'version does not belong to this content document';
  end if;
  if v_version.schema_version <> 'publish_payload_v1' then
    raise exception 'version schema is not publish_payload_v1';
  end if;
  if v_doc.is_test_fixture or v_version.is_test_fixture then
    raise exception 'test fixture cannot be published';
  end if;

  if p_publication_kind = 'rollback' then
    if p_rollback_of_publication_id is null then
      raise exception 'rollback_of_publication_id is required for rollback';
    end if;
    if p_reason is null or length(p_reason) = 0 then
      raise exception 'reason is required for rollback';
    end if;
    select * into v_rollback_of from public.factory_publications where id = p_rollback_of_publication_id;
    if not found then
      raise exception 'rollback_of publication not found';
    end if;
    if v_rollback_of.content_id <> p_content_id then
      raise exception 'rollback_of publication belongs to a different content document';
    end if;
    if v_rollback_of.version_id is distinct from v_doc.published_version_id then
      raise exception 'rollback_of publication is not the currently published version';
    end if;
    if v_rollback_of.status <> 'verified' then
      raise exception 'rollback_of publication is not verified';
    end if;
    if not exists (
      select 1 from public.factory_publications
      where version_id = p_version_id and status = 'verified'
    ) then
      raise exception 'target version was never published';
    end if;
  else
    if p_rollback_of_publication_id is not null then
      raise exception 'rollback_of_publication_id is only allowed for rollback';
    end if;
  end if;

  v_previous_version_id := v_doc.published_version_id;
  if v_previous_version_id is not null and v_previous_version_id = p_version_id then
    raise exception 'version already published';
  end if;

  update public.content_documents
    set published_version_id = p_version_id, updated_at = now()
    where id = p_content_id;

  insert into public.factory_publications
    (content_id, version_id, previous_version_id, status, idempotency_key, requested_at, attempts, publication_kind, rollback_of_publication_id, reason, work_item_id, approval_id)
    values (p_content_id, p_version_id, v_previous_version_id, 'pending', p_idempotency_key, now(), 0, p_publication_kind, p_rollback_of_publication_id, p_reason, p_work_item_id, p_approval_id)
    returning id into v_publication_id;

  insert into public.factory_outbox_events
    (publication_id, event_type, payload, status, attempts, max_attempts, idempotency_key)
    values (
      v_publication_id,
      'content_published',
      jsonb_build_object(
        'content_id', p_content_id,
        'version_id', p_version_id,
        'previous_version_id', v_previous_version_id,
        'slug', v_doc.slug,
        'canonical_path', v_doc.canonical_path,
        'version_no', v_version.version_no,
        'content_hash', v_version.content_hash,
        'expected_marker', p_expected_marker,
        'previous_unique_text', p_previous_unique_text,
        'publication_kind', p_publication_kind,
        'rollback_of_publication_id', p_rollback_of_publication_id,
        'reason', p_reason,
        'work_item_id', p_work_item_id,
        'approval_id', p_approval_id
      ),
      'pending', 0, 5, p_idempotency_key
    )
    returning id into v_outbox_id;

  return jsonb_build_object(
    'publication_id', v_publication_id,
    'outbox_id', v_outbox_id,
    'previous_version_id', v_previous_version_id,
    'version_id', p_version_id,
    'status', 'pending',
    'publication_kind', p_publication_kind,
    'rollback_of_publication_id', p_rollback_of_publication_id,
    'work_item_id', p_work_item_id,
    'approval_id', p_approval_id,
    'replayed', false
  );
end;
$$;

revoke execute on function public.publish_content_atomic(uuid, uuid, text, text, text, text, uuid, text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.publish_content_atomic(uuid, uuid, text, text, text, text, uuid, text, uuid, uuid) to service_role;

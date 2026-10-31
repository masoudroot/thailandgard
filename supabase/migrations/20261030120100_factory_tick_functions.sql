-- REBUILD-R2: Functionهای هستهٔ کارخانهٔ یکپارچه، Work Item و Outbox.
-- تاریخ: 2026-10-30. فقط Staging. هیچ Migration قبلی تغییر نمی‌کند؛
-- فقط افزودنی و روبه‌جلو. پیش‌نیاز: فایل جدول‌های R2
-- (20261030120000) که جدول‌های موردارجاع این Functionها را می‌سازد.
-- همهٔ بدنه‌ها از تعریف‌های نهایی آزمایشگاه MVP-01، کلمه‌به‌کلمه،
-- برداشته شده‌اند: publish_content_atomic و create_approved_version
-- از 016، claim_outbox_event از 015، و چهار RPC هستهٔ Tick از 017.
-- بازتعریف Functionها با CREATE OR REPLACE است؛ روی Staging که همین
-- تعریف‌ها را دارد، اجرا No-op معنایی است.

-- حذف نسخهٔ ۸ آرگومانی قدیمی (روی Staging از قبل حذف شده؛ No-op).
drop function if exists public.publish_content_atomic(uuid, uuid, text, text, text, text, uuid, text);

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

-- create_approved_version نهایی (016).
create or replace function public.create_approved_version(
  p_content_id uuid,
  p_payload jsonb,
  p_content_hash text,
  p_work_item_id uuid,
  p_artifact_id uuid
)
returns public.content_versions
language plpgsql
security definer
as $$
declare
  v_doc public.content_documents%rowtype;
  v_work public.factory_work_items%rowtype;
  v_artifact public.factory_artifacts%rowtype;
  v_existing public.content_versions%rowtype;
  v_next_no integer;
  v_version public.content_versions%rowtype;
begin
  if p_content_hash is null or p_content_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'content_hash is invalid';
  end if;
  if p_payload is null or (p_payload ->> 'schema_version') <> 'publish_payload_v1' then
    raise exception 'payload schema is not publish_payload_v1';
  end if;

  select * into v_doc from public.content_documents where id = p_content_id for update;
  if not found then
    raise exception 'content document not found';
  end if;
  if v_doc.slug <> 'best-time-to-visit-thailand' or v_doc.content_type <> 'guide' then
    raise exception 'content document is outside the M2 slice';
  end if;
  if v_doc.is_test_fixture then
    raise exception 'test fixture cannot be published';
  end if;

  select * into v_work from public.factory_work_items where id = p_work_item_id;
  if not found then
    raise exception 'work item not found';
  end if;
  if v_work.content_id <> p_content_id then
    raise exception 'work item belongs to a different content document';
  end if;
  if v_work.result_version_id is not null then
    select * into v_existing from public.content_versions where id = v_work.result_version_id;
    if not found then
      raise exception 'work item version not found';
    end if;
    return v_existing;
  end if;
  if v_work.status <> 'approved' then
    raise exception 'work item is not approved';
  end if;

  select * into v_artifact from public.factory_artifacts where id = p_artifact_id;
  if not found then
    raise exception 'artifact not found';
  end if;
  if v_artifact.work_item_id <> p_work_item_id then
    raise exception 'artifact belongs to a different work item';
  end if;
  if v_artifact.artifact_hash <> p_content_hash then
    raise exception 'artifact hash does not match content_hash';
  end if;

  select coalesce(max(version_no), 0) + 1 into v_next_no
    from public.content_versions where content_id = p_content_id;

  insert into public.content_versions
    (content_id, version_no, schema_version, payload, content_hash)
    values (p_content_id, v_next_no, 'publish_payload_v1', p_payload, p_content_hash)
    returning * into v_version;

  update public.factory_work_items
    set result_version_id = v_version.id, status = 'publishing', updated_at = now()
    where id = p_work_item_id;

  return v_version;
end;
$$;

revoke execute on function public.create_approved_version(uuid, jsonb, text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.create_approved_version(uuid, jsonb, text, uuid, uuid) to service_role;

-- claim_outbox_event نهایی (015): Fencing + Audit + تفکیک Dispatch و Redispatch.
create or replace function public.claim_outbox_event(
  p_runner_id text,
  p_lease_seconds integer
)
returns public.factory_outbox_events
language plpgsql
security definer
as $$
declare
  v_event public.factory_outbox_events%rowtype;
  v_old_status text;
begin
  if p_runner_id is null or length(p_runner_id) = 0 then
    raise exception 'runner_id is required';
  end if;
  select * into v_event
    from public.factory_outbox_events
    where (status = 'pending' or (status = 'claimed' and lease_until is not null and lease_until < now()))
      and (next_attempt_at is null or next_attempt_at <= now())
    order by created_at
    limit 1
    for update skip locked;
  if not found then
    return null;
  end if;
  v_old_status := v_event.status;
  update public.factory_outbox_events
    set status = 'claimed',
        lease_owner = p_runner_id,
        lease_until = now() + make_interval(secs => p_lease_seconds),
        attempts = attempts + 1,
        fencing_token = fencing_token + 1
    where id = v_event.id
    returning * into v_event;
  update public.factory_publications
    set fencing_token = v_event.fencing_token
    where id = v_event.publication_id;
  insert into public.factory_audit_events
    (publication_id, outbox_id, kind, status_from, status_to, error, attempts, fencing_token)
    values (v_event.publication_id, v_event.id, 'claim', v_old_status, 'claimed', null, v_event.attempts, v_event.fencing_token);
  return v_event;
end;
$$;

revoke execute on function public.claim_outbox_event(text, integer) from public, anon, authenticated;
grant execute on function public.claim_outbox_event(text, integer) to service_role;

-- claim_work_step_by_id (017): Claim اتمیک Step با بازیابی Lease منقضی.
create or replace function public.claim_work_step_by_id(
  p_step_id uuid,
  p_executor text,
  p_lease_seconds integer
)
returns setof public.factory_work_steps
language plpgsql
as $$
declare
  recovered_id uuid;
begin
  for recovered_id in
    select id from public.factory_work_steps
    where status = 'claimed' and lease_until is not null and lease_until < now()
  loop
    update public.factory_work_steps
      set status = 'queued', lease_owner = null, lease_until = null
      where id = recovered_id;
    update public.factory_attempts
      set finish_status = 'outcome_unknown',
          reconciliation_status = 'pending',
          finished_at = now()
      where work_step_id = recovered_id and finish_status = 'started';
  end loop;

  return query
    update public.factory_work_steps
      set status = 'claimed',
          lease_owner = p_executor,
          lease_until = now() + make_interval(secs => p_lease_seconds),
          fencing_token = fencing_token + 1,
          attempt_count = attempt_count + 1,
          started_at = now()
      where id = p_step_id
        and status = 'queued'
        and scheduled_at <= now()
        and attempt_count < max_attempts
      returning *;
end;
$$;

revoke execute on function public.claim_work_step_by_id(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.claim_work_step_by_id(uuid, text, integer) to service_role;

-- finish_work_step (017): پایان Step با Fencing.
create or replace function public.finish_work_step(
  p_step_id uuid,
  p_fencing_token integer,
  p_lease_owner text,
  p_new_status text,
  p_finish_status text,
  p_reconciliation_status text,
  p_error_code text,
  p_output_artifact_id uuid,
  p_scheduled_at timestamptz
)
returns setof public.factory_work_steps
language plpgsql
as $$
declare
  updated_row public.factory_work_steps;
begin
  update public.factory_work_steps
    set status = p_new_status,
        finished_at = now(),
        error_code = p_error_code,
        output_artifact_id = coalesce(p_output_artifact_id, output_artifact_id),
        scheduled_at = coalesce(p_scheduled_at, scheduled_at),
        lease_owner = case when p_new_status = 'queued' then null else lease_owner end,
        lease_until = case when p_new_status = 'queued' then null else lease_until end
    where id = p_step_id
      and status = 'claimed'
      and fencing_token = p_fencing_token
      and lease_owner = p_lease_owner
      and lease_until is not null
      and lease_until > now()
    returning * into updated_row;

  if updated_row is null then
    return;
  end if;

  update public.factory_attempts
    set finish_status = p_finish_status,
        reconciliation_status = p_reconciliation_status,
        finished_at = now(),
        error_code = p_error_code
    where work_step_id = p_step_id and finish_status = 'started';

  return next updated_row;
end;
$$;

revoke execute on function public.finish_work_step(uuid, integer, text, text, text, text, text, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.finish_work_step(uuid, integer, text, text, text, text, text, uuid, timestamptz) to service_role;

-- reserve_budget (017).
create or replace function public.reserve_budget(
  p_work_item_id uuid,
  p_attempt_id uuid,
  p_amount numeric
)
returns boolean
language plpgsql
as $$
declare
  wi_limit numeric;
  wi_spent numeric;
  day_limit numeric;
  day_spent numeric;
  setting_limit text;
begin
  select budget_limit, budget_spent into wi_limit, wi_spent
    from public.factory_work_items where id = p_work_item_id for update;
  if wi_limit is null then
    return false;
  end if;

  select value into setting_limit from public.factory_settings where key = 'daily_budget_limit';
  insert into public.factory_daily_budgets (budget_date, daily_limit, daily_spent)
    values (current_date, coalesce(setting_limit::numeric, 0), 0)
    on conflict (budget_date) do nothing;
  select daily_limit, daily_spent into day_limit, day_spent
    from public.factory_daily_budgets where budget_date = current_date for update;

  if wi_spent + p_amount > wi_limit or day_spent + p_amount > day_limit then
    insert into public.factory_cost_ledger (work_item_id, attempt_id, entry_kind, amount)
      values (p_work_item_id, p_attempt_id, 'rejected', p_amount);
    return false;
  end if;

  insert into public.factory_cost_ledger (work_item_id, attempt_id, entry_kind, amount)
    values (p_work_item_id, p_attempt_id, 'reservation', p_amount);
  update public.factory_work_items set budget_spent = budget_spent + p_amount where id = p_work_item_id;
  update public.factory_daily_budgets set daily_spent = daily_spent + p_amount where budget_date = current_date;
  return true;
end;
$$;

revoke execute on function public.reserve_budget(uuid, uuid, numeric) from public, anon, authenticated;
grant execute on function public.reserve_budget(uuid, uuid, numeric) to service_role;

-- release_budget (017).
create or replace function public.release_budget(
  p_work_item_id uuid,
  p_attempt_id uuid,
  p_amount numeric
)
returns boolean
language plpgsql
as $$
begin
  insert into public.factory_cost_ledger (work_item_id, attempt_id, entry_kind, amount)
    values (p_work_item_id, p_attempt_id, 'release', p_amount);
  update public.factory_work_items
    set budget_spent = greatest(0, budget_spent - p_amount) where id = p_work_item_id;
  update public.factory_daily_budgets
    set daily_spent = greatest(0, daily_spent - p_amount) where budget_date = current_date;
  return true;
end;
$$;

revoke execute on function public.release_budget(uuid, uuid, numeric) from public, anon, authenticated;
grant execute on function public.release_budget(uuid, uuid, numeric) to service_role;

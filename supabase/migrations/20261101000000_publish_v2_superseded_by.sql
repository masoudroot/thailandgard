-- 20261101000000_publish_v2_superseded_by.sql | M5 publish-v2
--
-- زنجیرهٔ نسخه‌ها برای انتشار v2: هر نسخهٔ منتشرشدهٔ پیشین، با
-- superseded_by به نسخهٔ جایگزینش وصل می‌شود؛ Rollback فقط با
-- برگرداندن superseded_by نسخهٔ هدف به NULL (به‌علاوهٔ برگرداندن
-- Pointer) انجام می‌شود. هیچ ردیفی حذف نمی‌شود و Draft (Artifact و
-- نسخهٔ منتشرنشده) سر جایش می‌ماند.
--
-- این Migration فقط افزودنی و روبه‌جلو است: یک ستون تازه، یک Trigger
-- تعلق تازه، بازنویسی تابع تغییرناپذیری (با همان نام و همان Triggerها)
-- و یک Function تازه برای انتشار v2. Function نسخهٔ اول (v1) و مسیر
-- Tick فعلی دست نمی‌خورند؛ مسیر v2 فقط برای Work Itemهای UpdateContent
-- از سرویس publish-v2 صدا زده می‌شود. هیچ Backfill داده‌ای انجام
-- نمی‌شود و هیچ DOWN مخربی در این فایل نیست.
--
-- معنای superseded_by: فقط انتشار روبه‌جلو (kind=publish) آن را مقدار
-- می‌دهد (نسخهٔ منتشرشدهٔ پیشین ← نسخهٔ تازه). Rollback، مقدار نسخهٔ
-- هدف را NULL می‌کند تا دوباره جاری شود؛ سطرهای Publication با
-- kind=rollback، سند Rollback می‌مانند. انتشار دوبارهٔ یک نسخهٔ
-- پیش‌تر supersedeشده هم مقدارش را NULL می‌کند، چون دوباره جاری است.

alter table public.content_versions
  add column if not exists superseded_by uuid references public.content_versions (id) on delete restrict;

create index if not exists content_versions_superseded_by_idx
  on public.content_versions (superseded_by);

-- superseded_by باید متعلق به همان document باشد، نه document دیگر.
create or replace function public.content_versions_superseded_by_must_belong()
returns trigger
language plpgsql
as $$
begin
  if new.superseded_by is not null
     and not exists (
       select 1 from public.content_versions
       where id = new.superseded_by and content_id = new.content_id
     ) then
    raise exception 'superseded_by must belong to the same content document';
  end if;
  return new;
end;
$$;

drop trigger if exists content_versions_superseded_by_belongs on public.content_versions;
create trigger content_versions_superseded_by_belongs
  before insert or update of superseded_by on public.content_versions
  for each row execute function public.content_versions_superseded_by_must_belong();

-- تغییرناپذیری نسخه‌ها، با یک استثنای دقیق: UPDATE فقط وقتی مجاز است
-- که دقیقاً و فقط ستون superseded_by عوض شده باشد. هر تغییر دیگری
-- (payload، hash، شمارهٔ نسخه، document، زمان ساخت، پرچم تست) و هر
-- DELETE، مثل قبل رد می‌شود.
create or replace function public.content_versions_immutable()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'UPDATE' then
    if old.id is distinct from new.id
      or old.content_id is distinct from new.content_id
      or old.version_no is distinct from new.version_no
      or old.schema_version is distinct from new.schema_version
      or old.payload is distinct from new.payload
      or old.content_hash is distinct from new.content_hash
      or old.created_at is distinct from new.created_at
      or old.is_test_fixture is distinct from new.is_test_fixture then
      raise exception 'content_versions are immutable except superseded_by';
    end if;
    return new;
  end if;
  raise exception 'content_versions are immutable';
end;
$$;

drop trigger if exists content_versions_no_update on public.content_versions;
create trigger content_versions_no_update
  before update on public.content_versions
  for each row execute function public.content_versions_immutable();

drop trigger if exists content_versions_no_delete on public.content_versions;
create trigger content_versions_no_delete
  before delete on public.content_versions
  for each row execute function public.content_versions_immutable();

-- publish_v2_content_atomic: انتشار v2 (و Rollback v2) به‌صورت اتمیک.
-- تفاوت‌ها با نسخهٔ اول: بدون محدودیت تک‌slug (هر document از نوع
-- guide)، نگهداری زنجیرهٔ superseded_by، و همان معنای Idempotency و
-- Replay نسخهٔ اول. خطا در هر نقطه، کل تراکنش را برمی‌گرداند؛ پس
-- Pointer قبلی، زنجیره و Outbox، دست‌نخورده می‌مانند.
create or replace function public.publish_v2_content_atomic(
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
  if v_doc.content_type <> 'guide' then
    raise exception 'content document is not a guide';
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

  if p_publication_kind = 'rollback' then
    -- Rollback فقط با برگرداندن superseded_by نسخهٔ هدف به NULL.
    update public.content_versions
      set superseded_by = null
      where id = p_version_id;
  else
    -- انتشار روبه‌جلو: نسخهٔ منتشرشدهٔ پیشین به نسخهٔ تازه وصل می‌شود،
    -- و اگر نسخهٔ تازه پیش‌تر supersede شده بود، مقدارش پاک می‌شود چون
    -- دوباره جاری است.
    if v_previous_version_id is not null then
      update public.content_versions
        set superseded_by = p_version_id
        where id = v_previous_version_id;
    end if;
    update public.content_versions
      set superseded_by = null
      where id = p_version_id and superseded_by is not null;
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

revoke execute on function public.publish_v2_content_atomic(uuid, uuid, text, text, text, text, uuid, text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.publish_v2_content_atomic(uuid, uuid, text, text, text, text, uuid, text, uuid, uuid) to service_role;

comment on column public.content_versions.superseded_by is
  'M5 publish-v2: the version that replaced this one (forward publishes only); null means not currently superseded. Rollback restores the target version superseded_by to null.';

-- create_approved_version_v2: همان قرارداد نسخهٔ اول، بدون محدودیت
-- تک‌slug؛ برای قدم create_version در Work Itemهای UpdateContent که
-- هر راهنمایی (نه فقط یک slug) را پوشش می‌دهند. نسخهٔ اول دست
-- نمی‌خورد و مسیر v1 با همان محدودیت قبلی کار می‌کند.
create or replace function public.create_approved_version_v2(
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
  if v_doc.content_type <> 'guide' then
    raise exception 'content document is not a guide';
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

revoke execute on function public.create_approved_version_v2(uuid, jsonb, text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.create_approved_version_v2(uuid, jsonb, text, uuid, uuid) to service_role;

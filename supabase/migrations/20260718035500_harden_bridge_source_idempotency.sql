begin;

-- Final controlled-alpha Bridge request semantics:
--   * null/non-array sources fail before jsonb_array_length;
--   * source IDs are canonical bigint text;
--   * duplicate normalized sources are rejected;
--   * reusing a non-terminal idempotency key with another parent or source set
--     fails rather than silently returning consent for different intent.

create or replace function public.create_bridge_share_request(
  p_parent_user_id uuid,
  p_idempotency_key text,
  p_sources jsonb,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_teen_user_id uuid := auth.uid();
  v_request_id uuid;
  v_source jsonb;
  v_source_kind text;
  v_source_id text;
  v_normalized_source jsonb;
  v_normalized_sources jsonb := '[]'::jsonb;
  v_requested_sources jsonb := '[]'::jsonb;
  v_existing_sources jsonb := '[]'::jsonb;
  v_normalized_idempotency_key text := trim(coalesce(p_idempotency_key, ''));
  v_existing_status text;
  v_existing_parent_user_id uuid;
begin
  if v_teen_user_id is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'permanent_account_required' using errcode = '42501';
  end if;

  if p_parent_user_id is null or p_parent_user_id = v_teen_user_id then
    raise exception 'invalid_parent' using errcode = '22023';
  end if;

  if length(v_normalized_idempotency_key) < 8 then
    raise exception 'invalid_idempotency_key' using errcode = '22023';
  end if;

  if p_sources is null or jsonb_typeof(p_sources) <> 'array' then
    raise exception 'sources_must_be_array' using errcode = '22023';
  end if;

  if jsonb_array_length(p_sources) = 0 then
    raise exception 'sources_required' using errcode = '22023';
  end if;

  if jsonb_array_length(p_sources) > 20 then
    raise exception 'too_many_sources' using errcode = '22023';
  end if;

  perform 1
  from public.parent_links pl
  where pl.teen_user_id = v_teen_user_id
    and pl.parent_user_id = p_parent_user_id
    and pl.status = 'active'
    and pl.is_active = true
  for share;

  if not found then
    raise exception 'active_parent_link_required' using errcode = '42501';
  end if;

  for v_source in select value from jsonb_array_elements(p_sources)
  loop
    v_source_kind := coalesce(v_source->>'kind', '');
    v_source_id := trim(coalesce(v_source->>'sourceId', ''));

    if v_source_kind not in ('journal', 'mood')
       or v_source_id = ''
       or v_source_id !~ '^[0-9]+$' then
      raise exception 'unsupported_or_invalid_source' using errcode = '22023';
    end if;

    begin
      v_source_id := (v_source_id::bigint)::text;
    exception when numeric_value_out_of_range then
      raise exception 'unsupported_or_invalid_source' using errcode = '22023';
    end;

    if v_source_kind = 'journal' and not exists (
      select 1
      from public.journal_entries entry
      where entry.user_id = v_teen_user_id
        and entry.id = v_source_id::bigint
    ) then
      raise exception 'source_not_available' using errcode = '42501';
    end if;

    if v_source_kind = 'mood' and not exists (
      select 1
      from public.mood_history mood
      where mood.user_id = v_teen_user_id
        and mood.id = v_source_id::bigint
    ) then
      raise exception 'source_not_available' using errcode = '42501';
    end if;

    v_normalized_source := jsonb_build_object(
      'kind', v_source_kind,
      'sourceId', v_source_id
    );

    if v_normalized_sources @> jsonb_build_array(v_normalized_source) then
      raise exception 'duplicate_source' using errcode = '22023';
    end if;

    v_normalized_sources := v_normalized_sources || jsonb_build_array(v_normalized_source);
  end loop;

  select coalesce(
    jsonb_agg(value order by value->>'kind', value->>'sourceId'),
    '[]'::jsonb
  )
  into v_requested_sources
  from jsonb_array_elements(v_normalized_sources);

  perform pg_advisory_xact_lock(
    hashtextextended(v_teen_user_id::text || ':' || v_normalized_idempotency_key, 0)
  );

  select id, status, parent_user_id
    into v_request_id, v_existing_status, v_existing_parent_user_id
  from public.bridge_share_requests
  where teen_user_id = v_teen_user_id
    and idempotency_key = v_normalized_idempotency_key
  for update;

  if v_request_id is null then
    insert into public.bridge_share_requests (
      teen_user_id,
      parent_user_id,
      status,
      idempotency_key,
      consented_at,
      expires_at
    ) values (
      v_teen_user_id,
      p_parent_user_id,
      'pending',
      v_normalized_idempotency_key,
      now(),
      p_expires_at
    )
    returning id into v_request_id;
  elsif v_existing_status in ('revoked', 'expired', 'failed', 'deleted') then
    update public.bridge_share_requests
    set parent_user_id = p_parent_user_id,
        status = 'pending',
        consented_at = now(),
        revoked_at = null,
        expires_at = p_expires_at,
        failure_code = null,
        updated_at = now()
    where id = v_request_id;

    delete from public.bridge_share_sources
    where request_id = v_request_id;

    delete from public.bridge_summaries
    where request_id = v_request_id;
  else
    if v_existing_parent_user_id <> p_parent_user_id then
      raise exception 'idempotency_conflict' using errcode = '22023';
    end if;

    select coalesce(
      jsonb_agg(
        jsonb_build_object('kind', source_kind, 'sourceId', source_id)
        order by source_kind, source_id
      ),
      '[]'::jsonb
    )
    into v_existing_sources
    from public.bridge_share_sources
    where request_id = v_request_id;

    if v_existing_sources <> v_requested_sources then
      raise exception 'idempotency_conflict' using errcode = '22023';
    end if;

    update public.bridge_share_requests
    set updated_at = now()
    where id = v_request_id;
  end if;

  if v_existing_status is null
     or v_existing_status in ('revoked', 'expired', 'failed', 'deleted') then
    for v_source in select value from jsonb_array_elements(v_normalized_sources)
    loop
      insert into public.bridge_share_sources (request_id, source_kind, source_id)
      values (
        v_request_id,
        v_source->>'kind',
        v_source->>'sourceId'
      )
      on conflict (request_id, source_kind, source_id) do nothing;
    end loop;
  end if;

  return v_request_id;
end;
$$;

revoke all on function public.create_bridge_share_request(uuid, text, jsonb, timestamptz)
  from public, anon;
grant execute on function public.create_bridge_share_request(uuid, text, jsonb, timestamptz)
  to authenticated;

comment on function public.create_bridge_share_request(uuid, text, jsonb, timestamptz) is
  'Creates an idempotent teen-consented Bridge request through an active parent link. Controlled alpha accepts a unique canonical set of teen-owned Journal and Mood sources and rejects idempotency-key reuse with different active intent.';

commit;

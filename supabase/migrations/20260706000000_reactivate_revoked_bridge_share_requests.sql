begin;

-- Allow a teen to reuse the same Bridge share idempotency key after they
-- intentionally revoked, expired, deleted, or failed the previous request.
-- Reuse replaces the old consent record in-place only after re-validating the
-- active parent link; still-active requests keep their original idempotent id.
create or replace function public.create_bridge_share_request(
  p_parent_user_id uuid,
  p_idempotency_key text,
  p_sources jsonb,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_teen_user_id uuid := auth.uid();
  v_request_id uuid;
  v_source jsonb;
  v_normalized_idempotency_key text := trim(p_idempotency_key);
  v_existing_status text;
begin
  if v_teen_user_id is null then
    raise exception 'unauthorized';
  end if;

  if p_parent_user_id is null or p_parent_user_id = v_teen_user_id then
    raise exception 'invalid_parent';
  end if;

  if p_idempotency_key is null or length(v_normalized_idempotency_key) < 8 then
    raise exception 'invalid_idempotency_key';
  end if;

  if jsonb_typeof(p_sources) <> 'array' or jsonb_array_length(p_sources) = 0 then
    raise exception 'sources_required';
  end if;

  if jsonb_array_length(p_sources) > 20 then
    raise exception 'too_many_sources';
  end if;

  if not exists (
    select 1 from public.parent_links pl
    where pl.teen_user_id = v_teen_user_id
      and pl.parent_user_id = p_parent_user_id
      and pl.status = 'active'
      and pl.is_active = true
  ) then
    raise exception 'active_parent_link_required';
  end if;

  -- Serialize by teen + idempotency key before checking for an existing row.
  -- A missing row cannot be protected by FOR UPDATE, so this transaction-scoped
  -- advisory lock preserves idempotency for simultaneous first-time requests.
  perform pg_advisory_xact_lock(
    hashtextextended(v_teen_user_id::text || ':' || v_normalized_idempotency_key, 0)
  );

  select id, status
    into v_request_id, v_existing_status
  from public.bridge_share_requests
  where teen_user_id = v_teen_user_id
    and idempotency_key = v_normalized_idempotency_key
  for update;

  if v_request_id is null then
    insert into public.bridge_share_requests (
      teen_user_id, parent_user_id, status, idempotency_key, consented_at, expires_at
    ) values (
      v_teen_user_id, p_parent_user_id, 'pending', v_normalized_idempotency_key, now(), p_expires_at
    )
    returning id into v_request_id;
  elsif v_existing_status in ('revoked','expired','failed','deleted') then
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
    update public.bridge_share_requests
    set updated_at = now()
    where id = v_request_id;
  end if;

  if v_existing_status is null or v_existing_status in ('revoked','expired','failed','deleted') then
    for v_source in select value from jsonb_array_elements(p_sources)
    loop
      if coalesce(v_source->>'kind','') not in ('journal','mood','goal','scrapbook')
         or nullif(trim(v_source->>'sourceId'),'') is null then
        raise exception 'invalid_source';
      end if;

      insert into public.bridge_share_sources (request_id, source_kind, source_id)
      values (v_request_id, v_source->>'kind', trim(v_source->>'sourceId'))
      on conflict (request_id, source_kind, source_id) do nothing;
    end loop;
  end if;

  return v_request_id;
end;
$$;

revoke execute on function public.create_bridge_share_request(uuid,text,jsonb,timestamptz) from public, anon;
grant execute on function public.create_bridge_share_request(uuid,text,jsonb,timestamptz) to authenticated;

comment on function public.create_bridge_share_request(uuid,text,jsonb,timestamptz) is
  'Creates an idempotent teen-consented Bridge summary request. Reusing a key for a revoked, expired, failed, or deleted request revalidates the active link and replaces sources/summary before returning the same request id. Transaction-scoped advisory locking serializes first-time duplicate requests by teen and idempotency key.';

commit;

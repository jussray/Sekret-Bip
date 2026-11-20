begin;

-- Controlled-alpha relationship hardening.
--
-- 1. Bridge request/source mutations are RPC-only. The security-definer RPC
--    validates the active parent link, restricts alpha sources to Journal/Mood,
--    and proves every selected source belongs to the authenticated teen.
-- 2. Crew share insertion and revocation are RPC-only. A private trigger helper
--    enforces that every share owner matches the referenced check-in owner.
--    Recipient-policy hardening follows in the next ordered migration.

create schema if not exists private;
revoke all on schema private from public;

-- ---------------------------------------------------------------------------
-- Bridge: remove direct client mutation paths and harden the canonical RPC.
-- ---------------------------------------------------------------------------

drop policy if exists bridge_share_requests_teen_insert on public.bridge_share_requests;
drop policy if exists bridge_share_requests_teen_update on public.bridge_share_requests;
drop policy if exists bridge_share_sources_teen_insert on public.bridge_share_sources;

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
  v_normalized_idempotency_key text := trim(p_idempotency_key);
  v_existing_status text;
begin
  if v_teen_user_id is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'permanent_account_required' using errcode = '42501';
  end if;

  if p_parent_user_id is null or p_parent_user_id = v_teen_user_id then
    raise exception 'invalid_parent' using errcode = '22023';
  end if;

  if p_idempotency_key is null or length(v_normalized_idempotency_key) < 8 then
    raise exception 'invalid_idempotency_key' using errcode = '22023';
  end if;

  if jsonb_typeof(p_sources) <> 'array' or jsonb_array_length(p_sources) = 0 then
    raise exception 'sources_required' using errcode = '22023';
  end if;

  if jsonb_array_length(p_sources) > 20 then
    raise exception 'too_many_sources' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.parent_links pl
    where pl.teen_user_id = v_teen_user_id
      and pl.parent_user_id = p_parent_user_id
      and pl.status = 'active'
      and pl.is_active = true
  ) then
    raise exception 'active_parent_link_required' using errcode = '42501';
  end if;

  -- Validate every source before writing the consent request. Future source kinds
  -- require a separate reviewed migration that adds ownership, RLS, deletion,
  -- Worker lookup, privacy, and denial proof.
  for v_source in select value from jsonb_array_elements(p_sources)
  loop
    v_source_kind := coalesce(v_source->>'kind', '');
    v_source_id := trim(coalesce(v_source->>'sourceId', ''));

    if v_source_kind not in ('journal', 'mood')
       or v_source_id = ''
       or v_source_id !~ '^[0-9]+$' then
      raise exception 'unsupported_or_invalid_source' using errcode = '22023';
    end if;

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
  end loop;

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
    update public.bridge_share_requests
    set updated_at = now()
    where id = v_request_id;
  end if;

  if v_existing_status is null
     or v_existing_status in ('revoked', 'expired', 'failed', 'deleted') then
    for v_source in select value from jsonb_array_elements(p_sources)
    loop
      insert into public.bridge_share_sources (request_id, source_kind, source_id)
      values (
        v_request_id,
        v_source->>'kind',
        trim(v_source->>'sourceId')
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
  'Creates an idempotent teen-consented Bridge summary request through an active parent link. Controlled alpha accepts only teen-owned Journal and Mood sources. Direct request/source mutation policies are intentionally absent.';

-- ---------------------------------------------------------------------------
-- Crew: enforce check-in ownership and use a scoped revocation RPC.
-- ---------------------------------------------------------------------------

drop policy if exists crew_check_in_shares_owner_insert on public.crew_check_in_shares;
drop policy if exists crew_check_in_shares_owner_update on public.crew_check_in_shares;

create or replace function private.enforce_crew_check_in_share_owner()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_check_in_owner uuid;
begin
  select owner_user_id
    into v_check_in_owner
  from public.crew_check_ins
  where id = new.check_in_id;

  if v_check_in_owner is null or v_check_in_owner <> new.owner_user_id then
    raise exception 'crew_share_owner_mismatch' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_crew_check_in_share_owner()
  from public, anon, authenticated;

-- Preserve malformed legacy rows for audit while ending their access before the
-- stricter trigger and recipient policies take effect.
update public.crew_check_in_shares share_row
set status = 'revoked',
    revoked_at = coalesce(share_row.revoked_at, now()),
    updated_at = now()
where share_row.status = 'active'
  and not exists (
    select 1
    from public.crew_check_ins ci
    where ci.id = share_row.check_in_id
      and ci.owner_user_id = share_row.owner_user_id
  );

drop trigger if exists crew_check_in_shares_owner_guard on public.crew_check_in_shares;
create trigger crew_check_in_shares_owner_guard
  before insert or update of check_in_id, owner_user_id
  on public.crew_check_in_shares
  for each row execute function private.enforce_crew_check_in_share_owner();

create or replace function public.revoke_crew_check_in_share(
  p_check_in_id uuid,
  p_shared_with uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_share_id uuid;
begin
  if v_user_id is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'permanent_account_required' using errcode = '42501';
  end if;

  if p_check_in_id is null or p_shared_with is null or p_shared_with = v_user_id then
    raise exception 'invalid_crew_share' using errcode = '22023';
  end if;

  update public.crew_check_in_shares
  set status = 'revoked',
      revoked_at = now(),
      updated_at = now()
  where check_in_id = p_check_in_id
    and owner_user_id = v_user_id
    and shared_with = p_shared_with
    and status = 'active'
  returning id into v_share_id;

  return v_share_id;
end;
$$;

revoke all on function public.revoke_crew_check_in_share(uuid, uuid)
  from public, anon;
grant execute on function public.revoke_crew_check_in_share(uuid, uuid)
  to authenticated;

comment on function public.revoke_crew_check_in_share(uuid, uuid) is
  'Revokes one exact active Crew check-in share owned by the authenticated permanent user and returns the affected share id. Null means no transition occurred.';

commit;

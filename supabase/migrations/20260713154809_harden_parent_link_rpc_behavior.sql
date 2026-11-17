begin;

-- Parent-link invite creation is a teen-side capability. Reuse the canonical
-- parent_links row because the live schema intentionally permits one row per
-- teen, and refuse to replace an active relationship without explicit revoke.
create or replace function public.create_parent_link_invite()
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text;
  v_profile public.app_profiles%rowtype;
  v_link public.parent_links%rowtype;
  v_state text;
  v_has_link boolean := false;
begin
  if v_user_id is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  select * into v_profile
  from public.app_profiles
  where user_id = v_user_id;

  if not found
     or v_profile.account_side <> 'teen'
     or v_profile.onboarding_complete is not true then
    raise exception 'completed teen profile required' using errcode = '42501';
  end if;

  select verification_state into v_state
  from public.account_verification
  where user_id = v_user_id;

  if found and v_state in ('SUSPENDED', 'MANUAL_REVIEW') then
    raise exception 'teen account is not eligible to create an invite' using errcode = '42501';
  end if;

  select * into v_link
  from public.parent_links
  where teen_user_id = v_user_id
  for update;
  v_has_link := found;

  if v_has_link
     and v_link.status = 'active'
     and v_link.is_active is true then
    raise exception 'active parent link must be revoked first' using errcode = '42501';
  end if;

  loop
    v_code := upper(substr(md5(gen_random_uuid()::text), 1, 8));
    exit when not exists (
      select 1
      from public.parent_links
      where invite_code = v_code
    );
  end loop;

  if v_has_link then
    update public.parent_links
    set parent_user_id = null,
        is_active = true,
        status = 'pending',
        invite_code = v_code,
        expires_at = now() + interval '48 hours',
        updated_at = now()
    where id = v_link.id;
  else
    insert into public.parent_links (
      teen_user_id,
      parent_user_id,
      is_active,
      status,
      invite_code,
      expires_at,
      created_at,
      updated_at
    ) values (
      v_user_id,
      null,
      true,
      'pending',
      v_code,
      now() + interval '48 hours',
      now(),
      now()
    );
  end if;

  insert into public.account_verification (
    user_id,
    verification_state,
    parent_link_state,
    verification_reason,
    verification_updated_at
  ) values (
    v_user_id,
    'PENDING_PARENT',
    'pending',
    'parent_invite_created',
    now()
  )
  on conflict (user_id) do update
  set verification_state = 'PENDING_PARENT',
      parent_link_state = 'pending',
      verification_reason = 'parent_invite_created',
      verification_updated_at = now();

  return v_code;
end;
$$;

revoke all on function public.create_parent_link_invite()
  from public, anon;
grant execute on function public.create_parent_link_invite()
  to authenticated, service_role;

comment on function public.create_parent_link_invite() is
  'Self-scoped permanent-teen RPC. Requires completed teen onboarding, denies suspended/manual-review accounts, recycles the canonical parent_links row for regenerated codes, and refuses to replace an active relationship.';

-- Expiration is a state transition, not merely an error response. Returning no
-- rows lets the existing client report invalid/expired/used while allowing the
-- expired link and teen verification state to commit instead of rolling back.
create or replace function public.redeem_parent_link_invite(
  p_invite_code text
)
returns table (
  link_id uuid,
  teen_user_id uuid,
  parent_user_id uuid,
  status text,
  activated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_parent_id uuid := auth.uid();
  v_link public.parent_links%rowtype;
begin
  if v_parent_id is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if p_invite_code is null
     or upper(trim(p_invite_code)) !~ '^[A-Z0-9]{8}$' then
    raise exception 'invalid_invite_code' using errcode = '22023';
  end if;

  select * into v_link
  from public.parent_links
  where invite_code = upper(trim(p_invite_code))
  for update;

  if not found then
    raise exception 'invite_not_found' using errcode = 'P0002';
  end if;

  if v_link.status <> 'pending'
     or v_link.is_active is not true then
    raise exception 'invite_not_pending' using errcode = '22023';
  end if;

  if v_link.expires_at is null
     or v_link.expires_at <= now() then
    update public.parent_links
    set status = 'expired',
        is_active = false,
        invite_code = null,
        updated_at = now()
    where id = v_link.id;

    update public.account_verification
    set verification_state = 'EXPIRED',
        parent_link_state = 'expired',
        verification_reason = 'parent_invite_expired',
        verification_updated_at = now()
    where user_id = v_link.teen_user_id;

    return;
  end if;

  if v_link.teen_user_id = v_parent_id then
    raise exception 'cannot_link_self' using errcode = '42501';
  end if;

  update public.parent_links
  set parent_user_id = v_parent_id,
      status = 'active',
      is_active = true,
      invite_code = null,
      expires_at = null,
      updated_at = now()
  where id = v_link.id;

  insert into public.account_verification (
    user_id,
    verification_state,
    parent_link_state,
    verification_reason,
    verification_updated_at
  ) values (
    v_link.teen_user_id,
    'VERIFIED_TEEN',
    'active',
    'parent_approved',
    now()
  )
  on conflict (user_id) do update
  set verification_state = 'VERIFIED_TEEN',
      parent_link_state = 'active',
      verification_reason = 'parent_approved',
      verification_updated_at = now();

  return query
  select
    pl.id,
    pl.teen_user_id,
    pl.parent_user_id,
    pl.status,
    pl.updated_at
  from public.parent_links pl
  where pl.id = v_link.id;
end;
$$;

revoke all on function public.redeem_parent_link_invite(text)
  from public, anon;
grant execute on function public.redeem_parent_link_invite(text)
  to authenticated, service_role;

comment on function public.redeem_parent_link_invite(text) is
  'Permanent-account parent-link consent RPC. Consumes one pending code, denies self-linking, persists expired state by returning no rows, and updates only the selected teen relationship. Guardian identity review remains independent.';

commit;

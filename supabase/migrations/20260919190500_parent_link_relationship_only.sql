begin;

-- A parent/trusted-adult link is relationship consent, not teen identity
-- verification. Bridge and parent-linked surfaces may depend on an active
-- parent_links row, but creating/redeeming/revoking that row must never grant,
-- remove, expire, or suspend the teen's independent verification state.

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

  if not found then
    raise exception 'teen verification record required' using errcode = '42501';
  end if;

  if v_state in ('SUSPENDED', 'MANUAL_REVIEW') then
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

  -- Keep the human-facing code at eight characters while avoiding the old
  -- eight-hex-character (32-bit) ceiling. Each random byte maps uniformly to
  -- one symbol in this 32-character, ambiguity-reduced alphabet, yielding
  -- 40 bits of code entropy without changing the product/UI contract.
  loop
    select string_agg(
      substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (get_byte(raw_bytes, i) % 32) + 1, 1),
      '' order by i
    )
    into v_code
    from (select extensions.gen_random_bytes(8) as raw_bytes) entropy
    cross join generate_series(0, 7) as positions(i);

    exit when not exists (
      select 1 from public.parent_links where invite_code = v_code
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

  update public.account_verification
  set parent_link_state = 'pending',
      verification_updated_at = now()
  where user_id = v_user_id;

  return v_code;
end;
$$;

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
  v_parent_profile public.app_profiles%rowtype;
  v_link public.parent_links%rowtype;
begin
  if v_parent_id is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  -- Bridge adult eligibility is intentionally weaker than guardian authority:
  -- the receiver must have completed Parent Side, but does not need
  -- VERIFIED_GUARDIAN merely to accept Teen-controlled relationship consent.
  -- Guardian-only powers such as Teen age assurance and Bip Jr remain gated by
  -- their own explicit VERIFIED_GUARDIAN checks.
  select * into v_parent_profile
  from public.app_profiles
  where user_id = v_parent_id;

  if not found
     or v_parent_profile.account_side <> 'parent'
     or v_parent_profile.onboarding_complete is not true then
    raise exception 'completed parent or trusted-adult profile required' using errcode = '42501';
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
        expires_at = null,
        updated_at = now()
    where id = v_link.id;

    update public.account_verification
    set parent_link_state = 'expired',
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

  update public.account_verification
  set parent_link_state = 'active',
      verification_updated_at = now()
  where user_id = v_link.teen_user_id;

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

create or replace function public.revoke_parent_link(p_link_id uuid default null)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_link public.parent_links%rowtype;
begin
  if v_user_id is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  select * into v_link
  from public.parent_links
  where (p_link_id is null or id = p_link_id)
    and is_active = true
    and status in ('pending', 'active')
    and (teen_user_id = v_user_id or parent_user_id = v_user_id)
  order by updated_at desc
  limit 1
  for update;

  if not found then
    return false;
  end if;

  update public.parent_links
  set status = 'revoked',
      is_active = false,
      invite_code = null,
      expires_at = null,
      updated_at = now()
  where id = v_link.id;

  update public.account_verification
  set parent_link_state = 'revoked',
      verification_updated_at = now()
  where user_id = v_link.teen_user_id;

  return true;
end;
$$;

revoke all on function public.create_parent_link_invite() from public, anon;
grant execute on function public.create_parent_link_invite() to authenticated, service_role;

revoke all on function public.redeem_parent_link_invite(text) from public, anon;
grant execute on function public.redeem_parent_link_invite(text) to authenticated, service_role;

revoke all on function public.revoke_parent_link(uuid) from public, anon;
grant execute on function public.revoke_parent_link(uuid) to authenticated, service_role;

comment on function public.create_parent_link_invite() is
  'Creates an eight-character, 40-bit Teen-controlled relationship-consent code without changing Teen verification authority.';
comment on function public.redeem_parent_link_invite(text) is
  'Redeems teen-issued relationship consent for a completed Parent-side account; it mirrors parent_link_state only and does not grant VERIFIED_TEEN or guardian authority.';
comment on function public.revoke_parent_link(uuid) is
  'Revokes relationship consent and mirrors parent_link_state only; teen verification remains independent.';

commit;

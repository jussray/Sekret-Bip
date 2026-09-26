begin;

create or replace function public.create_parent_link_invite()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text;
begin
  if v_user_id is null then
    raise exception 'unauthorized';
  end if;

  loop
    v_code := upper(substr(md5(gen_random_uuid()::text), 1, 8));
    exit when not exists (
      select 1 from public.parent_links where invite_code = v_code
    );
  end loop;

  update public.parent_links
  set status = 'revoked',
      is_active = false,
      invite_code = null,
      updated_at = now()
  where teen_user_id = v_user_id
    and status = 'pending';

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

revoke execute on function public.create_parent_link_invite() from public, anon;
grant execute on function public.create_parent_link_invite() to authenticated;

create or replace function public.redeem_parent_link_invite(p_invite_code text)
returns table(
  link_id uuid,
  teen_user_id uuid,
  parent_user_id uuid,
  status text,
  activated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_id uuid := auth.uid();
  v_link public.parent_links%rowtype;
begin
  if v_parent_id is null then
    raise exception 'unauthorized';
  end if;

  if p_invite_code is null or upper(trim(p_invite_code)) !~ '^[A-Z0-9]{8}$' then
    raise exception 'invalid_invite_code';
  end if;

  select * into v_link
  from public.parent_links
  where invite_code = upper(trim(p_invite_code))
  for update;

  if not found then
    raise exception 'invite_not_found';
  end if;

  if v_link.status <> 'pending' then
    raise exception 'invite_not_pending';
  end if;

  if v_link.expires_at is null or v_link.expires_at <= now() then
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

    raise exception 'invite_expired';
  end if;

  if v_link.teen_user_id = v_parent_id then
    raise exception 'cannot_link_self';
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
  select pl.id, pl.teen_user_id, pl.parent_user_id, pl.status, pl.updated_at
  from public.parent_links pl
  where pl.id = v_link.id;
end;
$$;

revoke execute on function public.redeem_parent_link_invite(text) from public, anon;
grant execute on function public.redeem_parent_link_invite(text) to authenticated;

commit;

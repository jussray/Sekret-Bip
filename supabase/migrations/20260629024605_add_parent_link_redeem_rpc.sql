create or replace function public.redeem_parent_link_invite(p_invite_code text)
returns table (
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

  return query
  select pl.id, pl.teen_user_id, pl.parent_user_id, pl.status, pl.updated_at
  from public.parent_links pl
  where pl.id = v_link.id;
end;
$$;

revoke all on function public.redeem_parent_link_invite(text) from public;
grant execute on function public.redeem_parent_link_invite(text) to authenticated;

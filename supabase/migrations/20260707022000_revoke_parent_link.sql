begin;

create or replace function public.revoke_parent_link()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_link public.parent_links%rowtype;
begin
  if v_user_id is null then
    raise exception 'unauthorized';
  end if;

  select * into v_link
  from public.parent_links
  where is_active = true
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
  set verification_state = 'PENDING_PARENT',
      parent_link_state = 'revoked',
      verification_reason = 'parent_link_revoked',
      verification_updated_at = now()
  where user_id = v_link.teen_user_id;

  return true;
end;
$$;

revoke execute on function public.revoke_parent_link() from public, anon;
grant execute on function public.revoke_parent_link() to authenticated;

comment on function public.revoke_parent_link() is
  'Allows either party to revoke their active or pending parent link and immediately removes linked access.';

commit;

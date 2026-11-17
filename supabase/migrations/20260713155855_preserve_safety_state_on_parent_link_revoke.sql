begin;

create or replace function public.revoke_parent_link(
  p_link_id uuid default null
)
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

  -- Revocation removes relationship consent. It must not erase a safety or
  -- manual-review decision that is independent from the parent-link state.
  update public.account_verification
  set verification_state = case
        when verification_state in ('SUSPENDED', 'MANUAL_REVIEW')
          then verification_state
        else 'PENDING_PARENT'
      end,
      parent_link_state = 'revoked',
      verification_reason = case
        when verification_state in ('SUSPENDED', 'MANUAL_REVIEW')
          then verification_reason
        else 'parent_link_revoked'
      end,
      verification_updated_at = now()
  where user_id = v_link.teen_user_id;

  return true;
end;
$$;

revoke all on function public.revoke_parent_link(uuid)
  from public, anon;
grant execute on function public.revoke_parent_link(uuid)
  to authenticated, service_role;

comment on function public.revoke_parent_link(uuid) is
  'Revokes one active or pending parent relationship only for the linked permanent teen or parent. Relationship consent is removed while SUSPENDED and MANUAL_REVIEW verification states and reasons remain protected.';

commit;

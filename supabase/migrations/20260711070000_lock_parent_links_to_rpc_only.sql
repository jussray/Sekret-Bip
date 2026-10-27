begin;

alter table public.parent_links enable row level security;

-- Parent/teen consent is a state machine. Clients may read their own link,
-- but every mutation must pass through the audited SECURITY DEFINER RPCs.
revoke all on table public.parent_links from anon, authenticated;
grant select on table public.parent_links to authenticated;

drop policy if exists "parent links insert teen only" on public.parent_links;
drop policy if exists "parent links update linked teen" on public.parent_links;
drop policy if exists "parent_links_insert" on public.parent_links;
drop policy if exists "parent_links_update" on public.parent_links;
drop policy if exists "parent links select linked users" on public.parent_links;
drop policy if exists "parent_links_select" on public.parent_links;

create policy "parent_links_select"
on public.parent_links
for select
to authenticated
using (
  public.is_non_anonymous_user()
  and (
    (select auth.uid()) = teen_user_id
    or (select auth.uid()) = parent_user_id
  )
);

-- Replace the legacy no-argument function with an optional link selector.
-- Omitting p_link_id preserves the app helper's existing behavior.
drop function if exists public.revoke_parent_link();

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
  where is_active = true
    and status in ('pending', 'active')
    and (teen_user_id = v_user_id or parent_user_id = v_user_id)
    and (p_link_id is null or id = p_link_id)
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

revoke execute on function public.revoke_parent_link(uuid) from public, anon;
grant execute on function public.revoke_parent_link(uuid) to authenticated, service_role;

comment on function public.revoke_parent_link(uuid) is
  'Revokes a pending or active parent link for either linked party; direct client table writes are disabled.';

commit;

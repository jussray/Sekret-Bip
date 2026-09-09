-- Reject anonymous-authenticated sessions at the shared founder boundary.

create or replace function public.is_founder()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
    and exists (
      select 1
      from public.app_profiles p
      where p.user_id = (select auth.uid())
        and p.role in ('founder', 'admin', 'developer')
        and p.can_view_audits = true
    );
$$;

revoke all on function public.is_founder() from public;
revoke all on function public.is_founder() from anon;
grant execute on function public.is_founder() to authenticated, service_role;

comment on function public.is_founder() is
  'Returns true only for non-anonymous authenticated founder/admin/developer profiles with audit access.';

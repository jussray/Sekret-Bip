-- Require non-anonymous authenticated callers for audit and Control Room policies.

drop policy if exists audit_events_insert_authenticated on public.audit_events;
create policy audit_events_insert_authenticated
  on public.audit_events
  for insert
  to authenticated
  with check (
    coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
    and (user_id is null or user_id = (select auth.uid()))
  );

drop policy if exists audit_events_select_founder on public.audit_events;
create policy audit_events_select_founder
  on public.audit_events
  for select
  to authenticated
  using (
    coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
    and exists (
      select 1
      from public.app_profiles p
      where p.user_id = (select auth.uid())
        and p.can_view_audits = true
        and p.role in ('developer', 'admin', 'founder')
    )
  );

drop policy if exists audit_events_update_founder on public.audit_events;
create policy audit_events_update_founder
  on public.audit_events
  for update
  to authenticated
  using (
    coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
    and exists (
      select 1
      from public.app_profiles p
      where p.user_id = (select auth.uid())
        and p.can_manage_app = true
        and p.role in ('admin', 'founder')
    )
  )
  with check (
    coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
    and exists (
      select 1
      from public.app_profiles p
      where p.user_id = (select auth.uid())
        and p.can_manage_app = true
        and p.role in ('admin', 'founder')
    )
  );

drop policy if exists audit_events_delete_founder on public.audit_events;
create policy audit_events_delete_founder
  on public.audit_events
  for delete
  to authenticated
  using (
    coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
    and exists (
      select 1
      from public.app_profiles p
      where p.user_id = (select auth.uid())
        and p.can_manage_app = true
        and p.role = 'founder'
    )
  );

drop policy if exists registry_access on public.control_room_fingerprints;
create policy registry_access
  on public.control_room_fingerprints
  for all
  to authenticated
  using (public.is_founder())
  with check (public.is_founder());

drop policy if exists control_room_issue_events_founder on public.control_room_issue_events;
create policy control_room_issue_events_founder
  on public.control_room_issue_events
  for all
  to authenticated
  using (public.is_founder())
  with check (public.is_founder());

drop policy if exists issue_history_founder on public.control_room_issue_history;
create policy issue_history_founder
  on public.control_room_issue_history
  for all
  to authenticated
  using (public.is_founder())
  with check (public.is_founder());

drop policy if exists control_room_issues_founder on public.control_room_issues;
create policy control_room_issues_founder
  on public.control_room_issues
  for all
  to authenticated
  using (public.is_founder())
  with check (public.is_founder());

drop policy if exists "Founder: releases" on public.control_room_releases;
create policy "Founder: releases"
  on public.control_room_releases
  for all
  to authenticated
  using (public.is_founder())
  with check (public.is_founder());

begin;

-- These tables predate the Control Room migrations that consume them. Keep the
-- repository's minimum historical shape explicit so a fresh replay and a
-- production migration-history reconciliation have the same prerequisites.

create table if not exists public.app_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user'
    check (role in ('user', 'teen', 'parent', 'moderator', 'developer', 'admin', 'founder')),
  can_view_audits boolean not null default false,
  can_manage_app boolean not null default false,
  exclude_from_analytics boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  screen text,
  severity text not null default 'info'
    check (severity in ('info', 'warning', 'error', 'critical')),
  message text,
  metadata jsonb not null default '{}'::jsonb,
  resolved boolean not null default false,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_created_at_idx
  on public.audit_events (created_at desc);
create index if not exists audit_events_severity_idx
  on public.audit_events (severity, resolved, created_at desc);
create index if not exists audit_events_event_type_idx
  on public.audit_events (event_type, created_at desc);

alter table public.app_profiles enable row level security;
alter table public.audit_events enable row level security;

revoke all on table public.app_profiles from anon, authenticated;
grant select on table public.app_profiles to authenticated;

drop policy if exists app_profiles_select_own on public.app_profiles;
create policy app_profiles_select_own
  on public.app_profiles
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  );

revoke all on table public.audit_events from anon, authenticated;
grant insert, select, update, delete on table public.audit_events to authenticated;

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

commit;

begin;

-- The normalization migration below expands this table. Keep its historical
-- prerequisite explicit in the active replay chain instead of relying on the
-- archived 20240702 migration.

create table if not exists public.control_room_issues (
  id               uuid primary key default gen_random_uuid(),
  category         text not null,
  severity         text not null default 'info',
  status           text not null default 'open',
  title            text not null,
  summary          text,
  suggested_fix    text,
  affected_surface text,
  affected_users   integer not null default 0,
  occurrence_count integer not null default 1,
  first_seen_at    timestamptz not null default now(),
  last_seen_at     timestamptz not null default now(),
  owner            text,
  release          text,
  metadata         jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists control_room_issues_status_last_seen_idx
  on public.control_room_issues (status, last_seen_at desc);

alter table public.control_room_issues enable row level security;

revoke all on table public.control_room_issues from anon, authenticated;
grant select, insert, update, delete on table public.control_room_issues to authenticated;

drop policy if exists "Founder: control room issues" on public.control_room_issues;
create policy "Founder: control room issues"
  on public.control_room_issues
  for all
  to authenticated
  using (
    coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
    and exists (
      select 1
      from public.app_profiles p
      where p.user_id = (select auth.uid())
        and p.role in ('founder', 'admin', 'developer')
        and p.can_view_audits = true
    )
  )
  with check (
    coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
    and exists (
      select 1
      from public.app_profiles p
      where p.user_id = (select auth.uid())
        and p.role in ('founder', 'admin', 'developer')
        and p.can_view_audits = true
    )
  );

comment on table public.control_room_issues is
  'Normalized, deduplicated issues grouped from raw audit_events.';

commit;

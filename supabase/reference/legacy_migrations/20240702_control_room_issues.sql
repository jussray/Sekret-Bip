-- Control Room: control_room_issues table
-- Normalized issue layer on top of raw audit_events.
-- PR 2 adds the deduplication + auto-grouping logic.

create table if not exists public.control_room_issues (
  id               uuid primary key default gen_random_uuid(),
  category         text not null,
  severity         text not null default 'info',
  status           text not null default 'open',
  title            text not null,
  summary          text,
  suggested_fix    text,
  affected_surface text,
  affected_users   integer default 0,
  occurrence_count integer default 1,
  first_seen_at    timestamptz not null default now(),
  last_seen_at     timestamptz not null default now(),
  owner            text,
  release          text,
  metadata         jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.control_room_issues enable row level security;

create policy "Founder: control room issues"
  on public.control_room_issues
  for all
  using (
    exists (
      select 1
      from   public.app_profiles
      where  user_id = auth.uid()
        and  role in ('founder', 'admin', 'developer')
    )
  );

create index if not exists control_room_issues_status_last_seen_idx
  on public.control_room_issues (status, last_seen_at desc);

comment on table public.control_room_issues is
  'Normalized, deduplicated issues grouped from raw audit_events. PR 2 adds auto-grouping logic.';

-- Also add resolved_at column to audit_events if not already present.
alter table public.audit_events
  add column if not exists resolved_at timestamptz;

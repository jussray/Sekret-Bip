alter table public.control_room_issues
  add column if not exists snoozed_until timestamptz;

create index if not exists control_room_issues_snoozed_until_idx
  on public.control_room_issues (snoozed_until)
  where snoozed_until is not null;

create table if not exists public.control_room_release_checks (
  id uuid primary key default gen_random_uuid(),
  release_key text not null references public.control_room_releases(release_key) on delete cascade,
  check_name text not null,
  status text not null,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now(),
  unique (release_key, check_name)
);

create index if not exists control_room_release_checks_release_idx
  on public.control_room_release_checks (release_key, checked_at desc);

alter table public.control_room_release_checks enable row level security;

drop policy if exists "Founder: release checks" on public.control_room_release_checks;
create policy "Founder: release checks"
  on public.control_room_release_checks
  for all
  using (public.is_founder())
  with check (public.is_founder());

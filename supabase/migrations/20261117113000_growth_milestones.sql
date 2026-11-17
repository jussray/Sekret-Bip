-- Permanent-account Growth completions. One row per account and track.
-- Anonymous JWTs and all cross-account reads/writes are denied by RLS.
create table public.growth_milestones (
  user_id uuid not null references auth.users(id) on delete cascade,
  track_key text not null check (track_key in (
    'focus', 'confidence', 'mindset', 'money', 'school', 'social', 'habits'
  )),
  completed_at timestamptz not null default now(),
  primary key (user_id, track_key)
);

alter table public.growth_milestones enable row level security;
revoke all on public.growth_milestones from public, anon, authenticated;
grant select, insert on public.growth_milestones to authenticated;

create policy growth_milestones_select_own on public.growth_milestones
  for select to authenticated
  using (
    (select auth.uid()) = user_id
    and (select (auth.jwt()->>'is_anonymous')::boolean) is false
  );

create policy growth_milestones_insert_own on public.growth_milestones
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (select (auth.jwt()->>'is_anonymous')::boolean) is false
  );

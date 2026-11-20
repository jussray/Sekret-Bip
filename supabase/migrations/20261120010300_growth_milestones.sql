-- Growth milestones: each row records one track completion for a user.
-- onMilestone() in GrowthScreen fires here; counts toward streaks server-side.

create table if not exists growth_milestones (
  id            bigint generated always as identity primary key,
  user_id       uuid    not null references auth.users(id) on delete cascade,
  track_key     text    not null,
  completed_at  timestamptz not null default now()
);

alter table growth_milestones enable row level security;

create policy "Users own their growth milestones"
  on growth_milestones for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index on growth_milestones(user_id, completed_at desc);

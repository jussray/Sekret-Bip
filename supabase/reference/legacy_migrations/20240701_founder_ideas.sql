-- Control Room: founder_ideas table
-- Run this migration in your Supabase project.

create table if not exists public.founder_ideas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  notes       text,
  status      text not null default 'backlog',
  category    text,
  priority    integer default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.founder_ideas enable row level security;

create policy "Founder: own ideas only"
  on public.founder_ideas
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists founder_ideas_user_id_created_at_idx
  on public.founder_ideas (user_id, created_at desc);

comment on table public.founder_ideas is
  'Founder product ideas tracked from backlog through shipped, surfaced in the Control Room.';

-- parent_repair_wins: tracks parent's logged connection wins / rituals
create table if not exists public.parent_repair_wins (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  id         bigint      not null,
  text       text        not null,
  date       text        not null,
  ritual     text,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.parent_repair_wins enable row level security;
create policy "owner" on public.parent_repair_wins
  using (user_id = auth.uid());

-- parent_voice_reflections: tracks parent's private reflection journal entries
create table if not exists public.parent_voice_reflections (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  id         bigint      not null,
  prompt     text        not null,
  text       text        not null,
  date       text        not null,
  lens       text        not null,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.parent_voice_reflections enable row level security;
create policy "owner" on public.parent_voice_reflections
  using (user_id = auth.uid());

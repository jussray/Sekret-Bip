-- ───────────────────────────────────────────────────────────────────────────
-- Se'kret Bip — initial migration (mirror of db/schema.sql)
-- ───────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

create or replace function bip_now() returns timestamptz
  language sql stable as $$ select now() $$;

create table if not exists public.mood_history (
  user_id     uuid        not null references auth.users(id) on delete cascade,
  id          bigint      not null,
  mood        text        not null,
  date        text        not null,
  time        text        not null,
  created_at  timestamptz not null default bip_now(),
  primary key (user_id, id)
);

create table if not exists public.journal_entries (
  user_id      uuid        not null references auth.users(id) on delete cascade,
  id           bigint      not null,
  text         text        not null,
  mood         text        not null,
  date         text        not null,
  time         text        not null,
  sekret_reply text,
  created_at   timestamptz not null default bip_now(),
  primary key (user_id, id)
);

create table if not exists public.circle_posts (
  user_id     uuid        not null references auth.users(id) on delete cascade,
  id          bigint      not null,
  text        text        not null,
  date        text        not null,
  time        text        not null,
  reactions   jsonb       not null default '{"felt":0,"comfort":0,"proud":0,"stay":0}'::jsonb,
  circle_tag  text,
  post_mood   text,
  media_kind  text,
  created_at  timestamptz not null default bip_now(),
  primary key (user_id, id)
);

create table if not exists public.voice_notes (
  user_id     uuid        not null references auth.users(id) on delete cascade,
  id          bigint      not null,
  title       text        not null,
  date        text        not null,
  time        text        not null,
  duration    text        not null,
  audio_url   text,
  created_at  timestamptz not null default bip_now(),
  primary key (user_id, id)
);

create table if not exists public.comfort_sessions (
  user_id     uuid        not null references auth.users(id) on delete cascade,
  id          bigint      not null,
  type        text        not null check (type in ('comfort','calm','voice','journal','growth','mood')),
  mood        text,
  date        text        not null,
  time        text        not null,
  created_at  timestamptz not null default bip_now(),
  primary key (user_id, id)
);

create table if not exists public.crew_members (
  user_id     uuid        not null references auth.users(id) on delete cascade,
  id          bigint      not null,
  name        text        not null,
  emoji       text        not null,
  commitment  text        not null,
  cadence     text        not null check (cadence in ('daily','weekly','whenever')),
  invite_code text        not null,
  added_at    timestamptz not null default bip_now(),
  primary key (user_id, id)
);

create table if not exists public.crew_check_ins (
  user_id     uuid        not null references auth.users(id) on delete cascade,
  id          bigint      not null,
  member_id   bigint      not null,
  note        text        not null,
  mood        text,
  date        text        not null,
  time        text        not null,
  created_at  timestamptz not null default bip_now(),
  primary key (user_id, id)
);

create table if not exists public.bridge_shares (
  user_id     uuid        not null references auth.users(id) on delete cascade,
  id          bigint      not null,
  payload     jsonb       not null,
  shared_at   timestamptz not null default bip_now(),
  primary key (user_id, id)
);

create table if not exists public.period_days (
  user_id     uuid        not null references auth.users(id) on delete cascade,
  date        text        not null,
  phase       text,
  flow        text,
  note        text,
  updated_at  timestamptz not null default bip_now(),
  primary key (user_id, date)
);

create table if not exists public.room_memory (
  user_id      uuid        not null references auth.users(id) on delete cascade,
  character    text        not null default 'raylene',
  last_visit   timestamptz,
  last_hotspot text,
  last_summon  text,
  visit_count  integer     not null default 0,
  updated_at   timestamptz not null default bip_now(),
  primary key (user_id)
);

create table if not exists public.bip_points (
  id           bigserial primary key,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  total        integer     not null,
  captured_at  timestamptz not null default bip_now()
);

create table if not exists public.parent_circle_posts (
  user_id        uuid        not null references auth.users(id) on delete cascade,
  id             bigint      not null,
  text           text        not null,
  date           text        not null,
  time           text        not null,
  reactions      jsonb       not null default '{"felt":0,"comfort":0,"proud":0,"stay":0}'::jsonb,
  circle_tag     text,
  created_at     timestamptz not null default bip_now(),
  primary key (user_id, id)
);

do $$
declare t text;
begin
  for t in
    select unnest(array[
      'mood_history','journal_entries','circle_posts','voice_notes',
      'comfort_sessions','crew_members','crew_check_ins',
      'bridge_shares','period_days','room_memory','bip_points',
      'parent_circle_posts'
    ])
  loop
    execute format('alter table public.%I enable row level security;', t);

    execute format('drop policy if exists "%s_owner_select" on public.%I;', t, t);
    execute format('drop policy if exists "%s_owner_insert" on public.%I;', t, t);
    execute format('drop policy if exists "%s_owner_update" on public.%I;', t, t);
    execute format('drop policy if exists "%s_owner_delete" on public.%I;', t, t);

    execute format(
      'create policy "%s_owner_select" on public.%I for select using (auth.uid() = user_id);', t, t);
    execute format(
      'create policy "%s_owner_insert" on public.%I for insert with check (auth.uid() = user_id);', t, t);
    execute format(
      'create policy "%s_owner_update" on public.%I for update using (auth.uid() = user_id);', t, t);
    execute format(
      'create policy "%s_owner_delete" on public.%I for delete using (auth.uid() = user_id);', t, t);
  end loop;
end $$;

-- Production retained these four all-operation self policies alongside the
-- per-command owner policies. They existed before the recorded June 29 auth
-- hardening migrations, so fresh replay must reconstruct that precondition.
drop policy if exists mood_history_self on public.mood_history;
create policy mood_history_self on public.mood_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists journal_entries_self on public.journal_entries;
create policy journal_entries_self on public.journal_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists voice_notes_self on public.voice_notes;
create policy voice_notes_self on public.voice_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists period_days_self on public.period_days;
create policy period_days_self on public.period_days
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_mood_user_date           on public.mood_history        (user_id, date);
create index if not exists idx_journal_user_date        on public.journal_entries     (user_id, date);
create index if not exists idx_circle_user_date         on public.circle_posts        (user_id, date);
create index if not exists idx_voice_user_date          on public.voice_notes         (user_id, date);
create index if not exists idx_comfort_user_date        on public.comfort_sessions    (user_id, date);
create index if not exists idx_checkins_user_member     on public.crew_check_ins      (user_id, member_id);
create index if not exists idx_bip_points_user_captured on public.bip_points          (user_id, captured_at desc);
create index if not exists idx_parent_circle_user_date  on public.parent_circle_posts (user_id, date);

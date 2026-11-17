-- Se'kret Bip — Supplemental tables migration
-- Run after 0001_init.sql and 0002_circle_v1.sql.
--
-- Covers:
--   1. Fix parent_circle_posts reactions default (beenThere/solidarity/... not felt/comfort/...)
--   2. Add shared-read RLS to parent_circle_posts so the Parent Circle feed works
--   3. parent_links compatibility indexes/policies
--   4. circle_members — tracks circle membership (supplement to circle_friendships)
--   5. circles — generic named circle containers (V2 model, forward-compat)
--   6. posts — generic post rows keyed to a circle (V2 model, forward-compat)
--   7. post_reactions — one reaction per user per post (V2 generic model)
--   8. post_comments — threaded comments on posts (forward-compat)
--   9. moods — reference table for mood taxonomy
--  10. parent_mood_summaries — weekly mood digest visible to linked parent
--
-- IMPORTANT DEPLOY FIX:
-- `safety_alerts` is owned by 0003_oracle_parentlinks_period_safety.sql and
-- hardened by 20260619_safety_scan.sql. This migration must NOT create a
-- competing `safety_alerts(teen_user_id, context_snippet, status...)` shape,
-- because fresh Supabase deploys will already have `safety_alerts.user_id` from
-- the canonical migration and policies referencing `teen_user_id` will fail.

-- ── 1. Fix parent_circle_posts reactions default ─────────────────────────────
alter table public.parent_circle_posts
  alter column reactions set default '{"beenThere":0,"solidarity":0,"reminder":0,"needed":0,"strength":0}'::jsonb;

-- ── 2. Add shared-read policy for parent_circle_posts ───────────────────────
-- Parents need to see community posts — not just their own.
-- user_id is stored for moderation but stripped by the app layer before display.
drop policy if exists "parent_circle_posts_owner_select" on public.parent_circle_posts;
create policy "parent_circle_posts_owner_select" on public.parent_circle_posts
  for select using (auth.uid() is not null);
-- Keep the owner-only insert/update/delete policies from 0001.

-- ── 3. parent_links compatibility ────────────────────────────────────────────
-- Canonical parent_links is created by 0003_oracle_parentlinks_period_safety.sql.
-- Keep this section as compatibility-only so it works whether this migration is
-- applied to a fresh database or an older database that did not have the table.
create table if not exists public.parent_links (
  id              uuid        primary key default gen_random_uuid(),
  parent_user_id  uuid        references auth.users(id) on delete set null,
  teen_user_id    uuid        not null references auth.users(id) on delete cascade,
  invite_code     text        not null unique,
  status          text        not null default 'pending',
  linked_at       timestamptz,
  expires_at      timestamptz not null default (now() + interval '48 hours'),
  created_at      timestamptz not null default now()
);
alter table public.parent_links enable row level security;

drop policy if exists "parent_links_self" on public.parent_links;
create policy "parent_links_self" on public.parent_links
  for select using (auth.uid() = teen_user_id or auth.uid() = parent_user_id);

drop policy if exists "parent_links_insert" on public.parent_links;
create policy "parent_links_insert" on public.parent_links
  for insert with check (auth.uid() = teen_user_id);

drop policy if exists "parent_links_update" on public.parent_links;
create policy "parent_links_update" on public.parent_links
  for update using (auth.uid() = teen_user_id or auth.uid() = parent_user_id);

create index if not exists idx_parent_links_teen   on public.parent_links (teen_user_id);
create index if not exists idx_parent_links_parent on public.parent_links (parent_user_id);

-- ── 4. circle_members ────────────────────────────────────────────────────────
-- Supplement to circle_friendships: tracks membership in a named circle.
-- circle_id references the circles table (below).
create table if not exists public.circle_members (
  id         bigserial     primary key,
  circle_id  bigint        not null,
  user_id    uuid          not null references auth.users(id) on delete cascade,
  role       text          not null default 'member' check (role in ('owner','member')),
  joined_at  timestamptz   not null default now(),
  unique (circle_id, user_id)
);
alter table public.circle_members enable row level security;
drop policy if exists "circle_members_self" on public.circle_members;
create policy "circle_members_self" on public.circle_members
  for select using (auth.uid() = user_id);
drop policy if exists "circle_members_insert" on public.circle_members;
create policy "circle_members_insert" on public.circle_members
  for insert with check (auth.uid() = user_id);
drop policy if exists "circle_members_delete" on public.circle_members;
create policy "circle_members_delete" on public.circle_members
  for delete using (auth.uid() = user_id);
create index if not exists idx_circle_members_circle on public.circle_members (circle_id);
create index if not exists idx_circle_members_user   on public.circle_members (user_id);

-- ── 5. circles ───────────────────────────────────────────────────────────────
-- Named circle containers (V2 model). Each user has up to 3 circles (public/friends/crew).
-- kind: 'public' | 'friends' | 'crew'
create table if not exists public.circles (
  id            bigserial     primary key,
  owner_user_id uuid          not null references auth.users(id) on delete cascade,
  kind          text          not null check (kind in ('public','friends','crew')),
  name          text,
  created_at    timestamptz   not null default now(),
  unique (owner_user_id, kind)
);
alter table public.circles enable row level security;
drop policy if exists "circles_owner_rw" on public.circles;
create policy "circles_owner_rw" on public.circles
  using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);
drop policy if exists "circles_members_read" on public.circles;
create policy "circles_members_read" on public.circles
  for select using (
    id in (select circle_id from public.circle_members where user_id = auth.uid())
  );
create index if not exists idx_circles_owner_kind on public.circles (owner_user_id, kind);

-- ── 6. posts ─────────────────────────────────────────────────────────────────
-- Generic post rows keyed to a circle_id (V2 model, forward-compat).
-- The V1 model uses per-type tables (public_circle_posts, friends_circle_posts, etc.).
create table if not exists public.posts (
  id                   bigserial     primary key,
  author_user_id       uuid          not null references auth.users(id) on delete cascade,
  circle_id            bigint        not null references public.circles(id) on delete cascade,
  body                 text          not null,
  mood_tag             text,
  content_warning      text,
  is_identity_revealed boolean       not null default false,
  is_deleted           boolean       not null default false,
  created_at           timestamptz   not null default now()
);
alter table public.posts enable row level security;
drop policy if exists "posts_author_rw" on public.posts;
create policy "posts_author_rw" on public.posts
  using (auth.uid() = author_user_id) with check (auth.uid() = author_user_id);
drop policy if exists "posts_members_read" on public.posts;
create policy "posts_members_read" on public.posts
  for select using (
    is_deleted = false
    and circle_id in (select circle_id from public.circle_members where user_id = auth.uid())
  );
create index if not exists idx_posts_circle_created on public.posts (circle_id, created_at desc);

-- ── 7. post_reactions ────────────────────────────────────────────────────────
-- One reaction row per user per post (V2 generic model).
create table if not exists public.post_reactions (
  id         bigserial     primary key,
  post_id    bigint        not null references public.posts(id) on delete cascade,
  user_id    uuid          not null references auth.users(id) on delete cascade,
  reaction   text          not null,
  created_at timestamptz   not null default now(),
  unique (post_id, user_id, reaction)
);
alter table public.post_reactions enable row level security;
drop policy if exists "post_reactions_self" on public.post_reactions;
create policy "post_reactions_self" on public.post_reactions
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "post_reactions_read" on public.post_reactions;
create policy "post_reactions_read" on public.post_reactions
  for select using (auth.uid() is not null);
create index if not exists idx_post_reactions_post on public.post_reactions (post_id);

-- ── 8. post_comments ─────────────────────────────────────────────────────────
create table if not exists public.post_comments (
  id         bigserial     primary key,
  post_id    bigint        not null references public.posts(id) on delete cascade,
  user_id    uuid          not null references auth.users(id) on delete cascade,
  text       text          not null,
  created_at timestamptz   not null default now()
);
alter table public.post_comments enable row level security;
drop policy if exists "post_comments_self_write" on public.post_comments;

-- Compatibility: older bootstrap databases use author_user_id instead of user_id.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'post_comments'
      and column_name = 'user_id'
  ) then
    execute 'create policy "post_comments_self_write" on public.post_comments
      using (auth.uid() = user_id) with check (auth.uid() = user_id)';
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'post_comments'
      and column_name = 'author_user_id'
  ) then
    execute 'create policy "post_comments_self_write" on public.post_comments
      using (auth.uid() = author_user_id) with check (auth.uid() = author_user_id)';
  else
    raise exception 'post_comments requires user_id or author_user_id for owner RLS';
  end if;
end
$$;

drop policy if exists "post_comments_read" on public.post_comments;
create policy "post_comments_read" on public.post_comments
  for select using (auth.uid() is not null);
create index if not exists idx_post_comments_post on public.post_comments (post_id, created_at desc);

-- ── 9. moods ─────────────────────────────────────────────────────────────────
-- Reference table for mood taxonomy. Populated via seed data.
create table if not exists public.moods (
  id          serial        primary key,
  slug        text          not null unique,
  label       text          not null,
  emoji       text,
  category    text,
  sort_order  integer       not null default 0
);
alter table public.moods enable row level security;
drop policy if exists "moods_read" on public.moods;
create policy "moods_read" on public.moods
  for select using (auth.uid() is not null);

-- ── 10. parent_mood_summaries ────────────────────────────────────────────────
-- Weekly mood digest shared with a linked parent. Privacy-first: only aggregate
-- counts are shared, never the raw journal text.
create table if not exists public.parent_mood_summaries (
  id              bigserial     primary key,
  teen_user_id    uuid          not null references auth.users(id) on delete cascade,
  parent_user_id  uuid          not null references auth.users(id) on delete cascade,
  week_start      date          not null,
  mood_counts     jsonb         not null default '{}'::jsonb,
  created_at      timestamptz   not null default now(),
  unique (teen_user_id, parent_user_id, week_start)
);
alter table public.parent_mood_summaries enable row level security;
drop policy if exists "pms_teen_write" on public.parent_mood_summaries;
create policy "pms_teen_write" on public.parent_mood_summaries
  for insert with check (auth.uid() = teen_user_id);
drop policy if exists "pms_teen_update" on public.parent_mood_summaries;
create policy "pms_teen_update" on public.parent_mood_summaries
  for update using (auth.uid() = teen_user_id);
drop policy if exists "pms_read" on public.parent_mood_summaries;
create policy "pms_read" on public.parent_mood_summaries
  for select using (auth.uid() = teen_user_id or auth.uid() = parent_user_id);

-- Compatibility: current schema uses week_start; older bootstrap schema uses period_start/period_end.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'parent_mood_summaries'
      and column_name = 'week_start'
  ) then
    execute 'create index if not exists idx_pms_teen_week
      on public.parent_mood_summaries (teen_user_id, week_start desc)';
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'parent_mood_summaries'
      and column_name = 'period_end'
  ) then
    execute 'create index if not exists idx_pms_teen_week
      on public.parent_mood_summaries (teen_user_id, period_end desc)';
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'parent_mood_summaries'
      and column_name = 'period_start'
  ) then
    execute 'create index if not exists idx_pms_teen_week
      on public.parent_mood_summaries (teen_user_id, period_start desc)';
  else
    raise exception 'parent_mood_summaries requires week_start, period_end, or period_start for date indexing';
  end if;
end
$$;

-- ── 11. safety_alerts ────────────────────────────────────────────────────────
-- Canonical safety_alerts is created in 0003_oracle_parentlinks_period_safety.sql
-- and adjusted in 20260619_safety_scan.sql. Do not redefine it here.

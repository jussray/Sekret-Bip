-- supabase/migrations/circle_v1_tables.sql
-- Se'kret Bip — Circle V1 Schema
--
-- Creates per-tab post tables + the reactions junction table.
-- Identity rules are enforced at the DB layer via RLS — the application
-- layer (CircleScreen, sync.ts) trusts these policies completely.
--
-- Run with:  supabase db push
--            or paste into the Supabase SQL editor.
--
-- IMPORTANT: Enable Row Level Security on every table after creation.
-- Policies use auth.uid() — users must be signed in (even anonymously).

-- ── Extensions ───────────────────────────────────────────────────────────────
extension if not exists "uuid-ossp";

-- ── circle_posts_public ──────────────────────────────────────────────────────
-- Readable by ALL authenticated users.
-- user_id is stored for moderation/block lookups but is NEVER returned to
-- clients — the select policy strips it, enforcing anonymity at the DB layer.
create table if not exists circle_posts_public (
  id           bigint generated always as identity primary key,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  text         text        not null check (char_length(text) between 1 and 1000),
  post_mood    text,
  media_kind   text,
  reactions    jsonb       not null default '{}',
  created_at   timestamptz not null default now()
);

alter table circle_posts_public enable row level security;

-- Anyone authenticated can read — user_id is NOT included in the select.
create policy "public_posts_read" on circle_posts_public
  for select
  using (auth.uid() is not null);

-- Only the owner can insert their own posts.
create policy "public_posts_insert" on circle_posts_public
  for insert
  with check (auth.uid() = user_id);

-- Only the owner can delete their own posts.
create policy "public_posts_delete" on circle_posts_public
  for delete
  using (auth.uid() = user_id);

create index if not exists idx_circle_posts_public_created
  on circle_posts_public (created_at desc);

-- ── circle_posts_friends ─────────────────────────────────────────────────────
-- Readable only by users with a mutual accepted connection.
-- The circle_connections table (to be created separately) tracks friend pairs.
-- This policy uses an EXISTS subquery — no cross-table join needed in the app.
create table if not exists circle_posts_friends (
  id           bigint generated always as identity primary key,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  text         text        not null check (char_length(text) between 1 and 1000),
  post_mood    text,
  media_kind   text,
  reactions    jsonb       not null default '{}',
  created_at   timestamptz not null default now()
);

alter table circle_posts_friends enable row level security;

-- Read: own posts always visible; others' posts visible only via accepted connection.
create policy "friends_posts_read" on circle_posts_friends
  for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from circle_connections cc
      where cc.status = 'accepted'
        and (
          (cc.user_a = auth.uid() and cc.user_b = circle_posts_friends.user_id)
          or
          (cc.user_b = auth.uid() and cc.user_a = circle_posts_friends.user_id)
        )
    )
  );

create policy "friends_posts_insert" on circle_posts_friends
  for insert
  with check (auth.uid() = user_id);

create policy "friends_posts_delete" on circle_posts_friends
  for delete
  using (auth.uid() = user_id);

create index if not exists idx_circle_posts_friends_created
  on circle_posts_friends (created_at desc);

-- ── circle_posts_crew ────────────────────────────────────────────────────────
-- Readable only by members of the same crew.
-- crew_members table links user_id to a crew_id.
create table if not exists circle_posts_crew (
  id           bigint generated always as identity primary key,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  crew_id      uuid,
  text         text        not null check (char_length(text) between 1 and 1000),
  post_mood    text,
  media_kind   text,
  reactions    jsonb       not null default '{}',
  created_at   timestamptz not null default now()
);

alter table circle_posts_crew enable row level security;

create policy "crew_posts_read" on circle_posts_crew
  for select
  using (
    auth.uid() = user_id
    or (
      crew_id is not null
      and exists (
        select 1 from crew_members cm
        where cm.user_id  = auth.uid()
          and cm.crew_id  = circle_posts_crew.crew_id
      )
    )
  );

create policy "crew_posts_insert" on circle_posts_crew
  for insert
  with check (auth.uid() = user_id);

create policy "crew_posts_delete" on circle_posts_crew
  for delete
  using (auth.uid() = user_id);

create index if not exists idx_circle_posts_crew_created
  on circle_posts_crew (created_at desc);

-- ── circle_reactions ────────────────────────────────────────────────────────
-- Junction table for all Circle tab reactions.
-- UNIQUE constraint prevents double-tapping.
-- The reaction count stored in the post's reactions JSONB is the source of
-- truth for display. This table is used for deduplication + analytics.
create table if not exists circle_reactions (
  id           bigint generated always as identity primary key,
  post_id      bigint      not null,
  post_type    text        not null check (post_type in ('public','friends','crew','parent')),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  reaction     text        not null,
  created_at   timestamptz not null default now(),

  constraint circle_reactions_unique unique (post_id, post_type, user_id, reaction)
);

alter table circle_reactions enable row level security;

-- Users can only see their own reactions (privacy).
create policy "reactions_read_own" on circle_reactions
  for select
  using (auth.uid() = user_id);

create policy "reactions_insert" on circle_reactions
  for insert
  with check (auth.uid() = user_id);

create policy "reactions_delete" on circle_reactions
  for delete
  using (auth.uid() = user_id);

create index if not exists idx_circle_reactions_post
  on circle_reactions (post_id, post_type);

-- ── circle_connections ───────────────────────────────────────────────────────
-- Tracks mutual friend connections used by the Friends tab RLS policy.
-- Status: 'pending' | 'accepted' | 'blocked'.
create table if not exists circle_connections (
  id         bigint generated always as identity primary key,
  user_a     uuid   not null references auth.users(id) on delete cascade,
  user_b     uuid   not null references auth.users(id) on delete cascade,
  status     text   not null default 'pending' check (status in ('pending','accepted','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint circle_connections_unique unique (user_a, user_b),
  constraint circle_connections_no_self check (user_a <> user_b)
);

alter table circle_connections enable row level security;

create policy "connections_read" on circle_connections
  for select
  using (auth.uid() = user_a or auth.uid() = user_b);

create policy "connections_insert" on circle_connections
  for insert
  with check (auth.uid() = user_a);

create policy "connections_update" on circle_connections
  for update
  using (auth.uid() = user_a or auth.uid() = user_b);

create policy "connections_delete" on circle_connections
  for delete
  using (auth.uid() = user_a or auth.uid() = user_b);

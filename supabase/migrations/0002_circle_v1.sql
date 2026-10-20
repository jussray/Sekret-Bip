-- Se'kret Bip — Circle V1 Migration
-- Run in Supabase SQL editor after 0001_init.sql
-- All tables are RLS-scoped. Parent data is fully isolated from teen circle data.

create table if not exists public.circle_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default 'Anonymous',
  avatar_emoji text not null default '🌙',
  account_type text not null default 'teen' check (account_type in ('teen','parent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.circle_profiles enable row level security;
create policy "circle_profiles_self_rw" on public.circle_profiles
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.circle_friend_requests (
  id bigserial primary key,
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  unique (from_user, to_user)
);
alter table public.circle_friend_requests enable row level security;
create policy "cfr_self" on public.circle_friend_requests
  using (auth.uid() = from_user or auth.uid() = to_user)
  with check (auth.uid() = from_user);

create table if not exists public.circle_friendships (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'accepted',
  created_at timestamptz not null default now(),
  unique (user_id, friend_id)
);
alter table public.circle_friendships enable row level security;
create policy "cf_self" on public.circle_friendships
  using (auth.uid() = user_id or auth.uid() = friend_id);
create policy "circle_profiles_friends_read" on public.circle_profiles
  for select using (
    user_id in (
      select friend_id from public.circle_friendships where user_id = auth.uid() and status = 'accepted'
      union
      select user_id from public.circle_friendships where friend_id = auth.uid() and status = 'accepted'
    )
  );

create table if not exists public.crew_memberships (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, member_id)
);
alter table public.crew_memberships enable row level security;
create policy "cm_self" on public.crew_memberships
  using (auth.uid() = user_id or auth.uid() = member_id);

create table if not exists public.public_circle_posts (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  post_mood text,
  media_kind text,
  reactions jsonb not null default '{"felt":0,"comfort":0,"proud":0,"stay":0}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.public_circle_posts enable row level security;
create policy "pcp_read" on public.public_circle_posts
  for select using (auth.uid() is not null);
create policy "pcp_insert" on public.public_circle_posts
  for insert with check (auth.uid() = user_id);
create policy "pcp_delete" on public.public_circle_posts
  for delete using (auth.uid() = user_id);
create index if not exists idx_public_circle_posts_created
  on public.public_circle_posts (created_at desc);

create table if not exists public.friends_circle_posts (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  post_mood text,
  media_kind text,
  reactions jsonb not null default '{"felt":0,"comfort":0,"proud":0,"stay":0}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.friends_circle_posts enable row level security;
create policy "fcp_self_write" on public.friends_circle_posts
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "fcp_friends_read" on public.friends_circle_posts
  for select using (
    auth.uid() = user_id
    or user_id in (
      select friend_id from public.circle_friendships where user_id = auth.uid() and status = 'accepted'
      union
      select user_id from public.circle_friendships where friend_id = auth.uid() and status = 'accepted'
    )
  );
create index if not exists idx_friends_circle_posts_created
  on public.friends_circle_posts (created_at desc);

create table if not exists public.crew_circle_posts (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  post_mood text,
  media_kind text,
  reactions jsonb not null default '{"felt":0,"comfort":0,"proud":0,"stay":0}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.crew_circle_posts enable row level security;
create policy "ccp_self_write" on public.crew_circle_posts
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ccp_crew_read" on public.crew_circle_posts
  for select using (
    auth.uid() = user_id
    or user_id in (
      select member_id from public.crew_memberships where user_id = auth.uid()
      union
      select user_id from public.crew_memberships where member_id = auth.uid()
    )
  );
create index if not exists idx_crew_circle_posts_created
  on public.crew_circle_posts (created_at desc);

create table if not exists public.circle_comments (
  id bigserial primary key,
  post_id bigint not null,
  post_type text not null check (post_type in ('friends','crew','parent')),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);
alter table public.circle_comments enable row level security;
create policy "cc_self_write" on public.circle_comments
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cc_read" on public.circle_comments
  for select using (auth.uid() is not null);
create index if not exists idx_circle_comments_post
  on public.circle_comments (post_id, post_type, created_at desc);

create table if not exists public.circle_reactions (
  id bigserial primary key,
  post_id bigint not null,
  post_type text not null check (post_type in ('public','friends','crew','parent')),
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (post_id, post_type, user_id)
);
alter table public.circle_reactions enable row level security;
create policy "cr_self" on public.circle_reactions
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cr_read" on public.circle_reactions
  for select using (auth.uid() is not null);

create table if not exists public.blocked_users (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, blocked_id)
);
alter table public.blocked_users enable row level security;
create policy "bu_self" on public.blocked_users
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.reported_posts (
  id bigserial primary key,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  post_id bigint not null,
  post_type text not null check (post_type in ('public','friends','crew','parent')),
  reason text,
  created_at timestamptz not null default now(),
  unique (reporter_id, post_id, post_type)
);
alter table public.reported_posts enable row level security;
create policy "rp_self" on public.reported_posts
  using (auth.uid() = reporter_id) with check (auth.uid() = reporter_id);

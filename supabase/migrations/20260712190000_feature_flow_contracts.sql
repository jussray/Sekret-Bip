begin;

-- Journal entries are shared by Teen Pages and Parent Pages. The account owner
-- remains the only reader/writer through the existing owner RLS policies; this
-- column separates the two product surfaces without creating a second notebook
-- table or weakening privacy.
alter table public.journal_entries
  add column if not exists owner_side text not null default 'teen',
  add column if not exists source text,
  add column if not exists entry_mode text,
  add column if not exists mood_tag text,
  add column if not exists locked boolean not null default false,
  add column if not exists media_type text,
  add column if not exists sekret_avatar_state text;

do $$
begin
  alter table public.journal_entries
    add constraint journal_entries_owner_side_check
    check (owner_side in ('teen', 'parent'));
exception
  when duplicate_object then null;
end
$$;

create index if not exists journal_entries_owner_side_created_idx
  on public.journal_entries (user_id, owner_side, created_at desc);

-- Circle profiles contain the public pseudonym/avatar used beside community
-- posts. Cross-account reads are required for the feed, but account_type remains
-- server-only through column-level grants.
alter table public.circle_profiles enable row level security;

drop policy if exists circle_profiles_owner_select on public.circle_profiles;
drop policy if exists circle_profiles_public_identity_select on public.circle_profiles;

create policy circle_profiles_public_identity_select
on public.circle_profiles
for select
to authenticated
using (true);

revoke all on table public.circle_profiles from anon;
revoke all on table public.circle_profiles from authenticated;
grant select (user_id, nickname, avatar_emoji)
  on table public.circle_profiles to authenticated;
grant insert (user_id, nickname, avatar_emoji, account_type, updated_at)
  on table public.circle_profiles to authenticated;
grant update (user_id, nickname, avatar_emoji, account_type, updated_at)
  on table public.circle_profiles to authenticated;

-- Replace overlapping legacy policies on public posts. Anonymous Auth users may
-- read the feed, but only permanent users may create or delete their own posts.
alter table public.public_circle_posts enable row level security;

drop policy if exists pcp_read on public.public_circle_posts;
drop policy if exists pcp_insert on public.public_circle_posts;
drop policy if exists pcp_delete on public.public_circle_posts;
drop policy if exists "Anonymous and permanent users can view the public feed" on public.public_circle_posts;
drop policy if exists "Only permanent users can post to the public feed" on public.public_circle_posts;
drop policy if exists public_circle_posts_owner_insert on public.public_circle_posts;
drop policy if exists public_circle_posts_permanent_insert on public.public_circle_posts;
drop policy if exists public_circle_posts_owner_delete on public.public_circle_posts;
drop policy if exists public_circle_posts_permanent_delete on public.public_circle_posts;

create policy "Anonymous and permanent users can view the public feed"
on public.public_circle_posts
for select
to authenticated
using (true);

create policy public_circle_posts_owner_insert
on public.public_circle_posts
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
);

create policy public_circle_posts_permanent_insert
on public.public_circle_posts
as restrictive
for insert
to authenticated
with check (
  coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) is false
);

create policy public_circle_posts_owner_delete
on public.public_circle_posts
for delete
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
);

create policy public_circle_posts_permanent_delete
on public.public_circle_posts
as restrictive
for delete
to authenticated
using (
  coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) is false
);

revoke all on table public.public_circle_posts from anon;
revoke all on table public.public_circle_posts from authenticated;
grant select, insert, delete on table public.public_circle_posts to authenticated;
revoke all on sequence public.public_circle_posts_id_seq from anon;
grant usage, select on sequence public.public_circle_posts_id_seq to authenticated;

-- One reaction per permanent account and post. A later reaction replaces the
-- previous reaction instead of inflating totals by repeated taps.
create unique index if not exists circle_reactions_unique_user_post
  on public.circle_reactions (post_id, post_type, user_id);

-- Keep the user foreign key cheap to validate/delete independently from the
-- composite uniqueness index above, whose leading columns are post scoped.
create index if not exists circle_reactions_user_id_idx
  on public.circle_reactions (user_id);

-- The legacy policy treated anonymous Supabase Auth users as ordinary signed-in
-- users because they also assume the authenticated Postgres role. Replace it
-- with a restrictive permanent-account boundary plus an owner policy.
alter table public.circle_reactions enable row level security;

drop policy if exists cr_read on public.circle_reactions;
drop policy if exists cr_self on public.circle_reactions;
drop policy if exists circle_reactions_permanent_accounts_only on public.circle_reactions;
drop policy if exists circle_reactions_self on public.circle_reactions;
drop policy if exists circle_reactions_direct_insert_non_public on public.circle_reactions;
drop policy if exists circle_reactions_direct_update_non_public on public.circle_reactions;
drop policy if exists circle_reactions_direct_delete_non_public on public.circle_reactions;

create policy circle_reactions_permanent_accounts_only
on public.circle_reactions
as restrictive
for all
to authenticated
using (
  coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) is false
)
with check (
  coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) is false
);

create policy circle_reactions_self
on public.circle_reactions
for all
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
)
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
);

-- Public reactions must flow through the guarded RPC so emoji validation and
-- cached post totals cannot be bypassed by a direct Data API write. Non-public
-- reaction types retain owner-scoped direct writes for later Friends/Crew work.
create policy circle_reactions_direct_insert_non_public
on public.circle_reactions
as restrictive
for insert
to authenticated
with check (post_type <> 'public');

create policy circle_reactions_direct_update_non_public
on public.circle_reactions
as restrictive
for update
to authenticated
using (post_type <> 'public')
with check (post_type <> 'public');

create policy circle_reactions_direct_delete_non_public
on public.circle_reactions
as restrictive
for delete
to authenticated
using (post_type <> 'public');

-- Default privileges on this older project were far broader than the app needs,
-- including TRUNCATE, REFERENCES, and TRIGGER for client roles.
revoke all on table public.circle_reactions from anon;
revoke all on table public.circle_reactions from authenticated;
grant select, insert, update, delete on table public.circle_reactions to authenticated;
revoke all on sequence public.circle_reactions_id_seq from anon;
grant usage, select on sequence public.circle_reactions_id_seq to authenticated;

create or replace function public.react_to_public_circle_post(
  p_post_id bigint,
  p_emoji text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_counts jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'permanent account required' using errcode = '42501';
  end if;

  if p_emoji not in ('felt', 'comfort', 'proud', 'stay') then
    raise exception 'unsupported reaction' using errcode = '22023';
  end if;

  -- Serialize reaction/count updates for this post. Without this row lock, two
  -- concurrent reactions can each count before seeing the other's uncommitted
  -- row and the last writer can leave the cached totals stale.
  perform 1
  from public.public_circle_posts
  where id = p_post_id
    and safety_flagged is false
  for update;

  if not found then
    raise exception 'post not found' using errcode = 'P0002';
  end if;

  insert into public.circle_reactions (post_id, post_type, user_id, emoji)
  values (p_post_id, 'public', v_user_id, p_emoji)
  on conflict (post_id, post_type, user_id)
  do update set
    emoji = excluded.emoji,
    created_at = now();

  select jsonb_build_object(
    'felt', count(*) filter (where emoji = 'felt'),
    'comfort', count(*) filter (where emoji = 'comfort'),
    'proud', count(*) filter (where emoji = 'proud'),
    'stay', count(*) filter (where emoji = 'stay')
  )
  into v_counts
  from public.circle_reactions
  where post_id = p_post_id
    and post_type = 'public';

  update public.public_circle_posts
  set reactions = v_counts
  where id = p_post_id;

  return v_counts;
end;
$$;

revoke all on function public.react_to_public_circle_post(bigint, text) from public;
revoke all on function public.react_to_public_circle_post(bigint, text) from anon;
grant execute on function public.react_to_public_circle_post(bigint, text) to authenticated;

commit;

begin;

-- Open Bip may use a stable Circle pseudonym, but the public feed must not hand
-- another account's auth.users UUID to the client. Give each Circle profile a
-- random public identifier that cannot be derived from the private auth id.
alter table public.circle_profiles
  add column if not exists public_id uuid;

update public.circle_profiles
set public_id = gen_random_uuid()
where public_id is null;

alter table public.circle_profiles
  alter column public_id set default gen_random_uuid(),
  alter column public_id set not null;

create unique index if not exists circle_profiles_public_id_uidx
  on public.circle_profiles(public_id);

-- Existing Circle RLS still allows relationship-scoped profile reads for legacy
-- Friends/Crew behavior. Keep that behavior, but never let authenticated clients
-- select public_id directly alongside auth-backed user_id. The public pseudonym
-- may cross the client boundary only through the bounded SECURITY DEFINER RPCs.
alter table public.circle_profiles enable row level security;

drop policy if exists circle_profiles_owner_select on public.circle_profiles;
create policy circle_profiles_owner_select
on public.circle_profiles
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) is false
);

revoke all on table public.circle_profiles from public, anon, authenticated;
grant select (user_id, nickname, avatar_emoji, account_type, created_at, updated_at)
  on table public.circle_profiles to authenticated;
-- Preserve the existing PostgREST upsert shape without letting a client choose,
-- rotate, overwrite, or directly read the database-owned public pseudonym.
grant insert (user_id, nickname, avatar_emoji, account_type, updated_at)
  on table public.circle_profiles to authenticated;
grant update (user_id, nickname, avatar_emoji, account_type, updated_at)
  on table public.circle_profiles to authenticated;

-- Preserve the existing RPC shape for compatibility: `author_user_id` now means
-- the random public Circle id, never auth.users.id. `is_own_post` is still
-- computed internally against the private auth id.
create or replace function public.get_public_circle_feed(p_limit integer default 40)
returns table (
  post_id bigint,
  author_user_id uuid,
  post_text text,
  post_mood text,
  media_kind text,
  created_at timestamptz,
  reaction_counts jsonb,
  viewer_reaction text,
  is_own_post boolean
)
language plpgsql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 40), 1), 100);
begin
  if v_user is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'permanent_account_required' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    cp.public_id,
    p.text,
    p.post_mood,
    p.media_kind,
    p.created_at,
    case when p.user_id = v_user then p.reactions else null end,
    r.emoji,
    p.user_id = v_user
  from public.public_circle_posts p
  left join public.circle_profiles cp
    on cp.user_id = p.user_id
  left join public.circle_reactions r
    on r.post_id = p.id
   and r.post_type = 'public'
   and r.user_id = v_user
  where p.safety_flagged is false
  order by p.created_at desc
  limit v_limit;
end;
$$;

create or replace function public.create_public_circle_post(
  p_text text,
  p_post_mood text default null
)
returns table (
  post_id bigint,
  author_user_id uuid,
  post_text text,
  post_mood text,
  media_kind text,
  created_at timestamptz,
  reaction_counts jsonb,
  viewer_reaction text,
  is_own_post boolean
)
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_public_id uuid;
  v_post public.public_circle_posts%rowtype;
  v_text text := btrim(coalesce(p_text, ''));
begin
  if v_user is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'permanent_account_required' using errcode = '42501';
  end if;

  select cp.public_id
    into v_public_id
  from public.circle_profiles cp
  where cp.user_id = v_user;

  if v_public_id is null then
    raise exception 'circle_profile_required' using errcode = '42501';
  end if;

  if char_length(v_text) < 1 or char_length(v_text) > 280 then
    raise exception 'post must contain between 1 and 280 characters' using errcode = '22023';
  end if;

  insert into public.public_circle_posts (
    user_id,
    text,
    post_mood,
    media_kind,
    reactions
  ) values (
    v_user,
    v_text,
    p_post_mood,
    null,
    '{"felt":0,"comfort":0,"proud":0,"stay":0}'::jsonb
  )
  returning * into v_post;

  return query
  select
    v_post.id,
    v_public_id,
    v_post.text,
    v_post.post_mood,
    v_post.media_kind,
    v_post.created_at,
    v_post.reactions,
    null::text,
    true;
end;
$$;

-- The compatibility profile RPC now accepts and returns only the random public
-- Circle ids emitted by the feed. Passing a private auth UUID returns no row.
create or replace function public.get_public_circle_profiles(
  p_user_ids uuid[]
)
returns table (
  user_id uuid,
  nickname text,
  avatar_emoji text
)
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
begin
  if auth.uid() is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'permanent_account_required' using errcode = '42501';
  end if;

  if coalesce(array_length(p_user_ids, 1), 0) > 100 then
    raise exception 'too many profile ids' using errcode = '22023';
  end if;

  return query
  select cp.public_id, cp.nickname, cp.avatar_emoji
  from public.circle_profiles cp
  where cp.public_id = any(coalesce(p_user_ids, array[]::uuid[]));
end;
$$;

revoke all on function public.get_public_circle_feed(integer) from public, anon;
revoke all on function public.create_public_circle_post(text, text) from public, anon;
revoke all on function public.get_public_circle_profiles(uuid[]) from public, anon;
grant execute on function public.get_public_circle_feed(integer) to authenticated;
grant execute on function public.create_public_circle_post(text, text) to authenticated;
grant execute on function public.get_public_circle_profiles(uuid[]) to authenticated;

comment on column public.circle_profiles.public_id is
  'Random stable Circle pseudonym identifier. RPC-only for authenticated clients; never expose alongside auth.users.id on Open Bip clients.';
comment on function public.get_public_circle_feed(integer) is
  'Open Bip feed. author_user_id is a compatibility field containing circle_profiles.public_id, never auth.users.id.';
comment on function public.get_public_circle_profiles(uuid[]) is
  'Resolves Open Bip public ids to public pseudonym fields only; private auth UUID lookup is not supported.';

commit;

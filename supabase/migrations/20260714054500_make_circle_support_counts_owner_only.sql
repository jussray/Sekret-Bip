-- Public Circle support is not a popularity score.
-- Feed viewers may react and see their own selected reaction. Only the post
-- owner may receive aggregate support totals.

begin;

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
  if v_user is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'permanent account required' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.user_id,
    p.text,
    p.post_mood,
    p.media_kind,
    p.created_at,
    case when p.user_id = v_user then p.reactions else null end,
    r.emoji,
    p.user_id = v_user
  from public.public_circle_posts p
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
  v_post public.public_circle_posts%rowtype;
  v_text text := btrim(coalesce(p_text, ''));
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'permanent account required' using errcode = '42501';
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
    v_post.user_id,
    v_post.text,
    v_post.post_mood,
    v_post.media_kind,
    v_post.created_at,
    v_post.reactions,
    null::text,
    true;
end;
$$;

-- Preserve the cached aggregate for the owner, but do not return that aggregate
-- to the reacting viewer. The caller receives only their own saved state.
create or replace function public.react_to_public_circle_post(p_post_id bigint, p_emoji text)
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

  return jsonb_build_object('saved', true, 'reaction', p_emoji);
end;
$$;

revoke all on function public.get_public_circle_feed(integer) from public, anon;
revoke all on function public.create_public_circle_post(text, text) from public, anon;
revoke all on function public.react_to_public_circle_post(bigint, text) from public, anon;
grant execute on function public.get_public_circle_feed(integer) to authenticated;
grant execute on function public.create_public_circle_post(text, text) to authenticated;
grant execute on function public.react_to_public_circle_post(bigint, text) to authenticated;

-- Prevent a modified client from bypassing the owner-only RPC and selecting the
-- cached totals directly. Existing insert/delete permissions remain unchanged.
revoke select on table public.public_circle_posts from anon, authenticated;

comment on function public.get_public_circle_feed(integer) is
  'Returns public Circle posts, the viewer own reaction, and aggregate counts only when the viewer owns the post.';

commit;

begin;

-- App Store / Google Play UGC safety hardening.
--
-- Open Bip keeps private auth.users ids inside Postgres. A client supplies only
-- the post id; this SECURITY DEFINER function resolves the private author,
-- records a durable block, and never returns that private identity.
create or replace function public.block_public_circle_author_from_post(
  p_post_id bigint
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_blocked uuid;
begin
  if v_user is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'permanent_account_required' using errcode = '42501';
  end if;

  select p.user_id
    into v_blocked
  from public.public_circle_posts p
  where p.id = p_post_id;

  if v_blocked is null then
    raise exception 'circle_post_not_found' using errcode = 'P0002';
  end if;

  if v_blocked = v_user then
    raise exception 'cannot_block_self' using errcode = '22023';
  end if;

  insert into public.blocked_users (user_id, blocked_id)
  values (v_user, v_blocked)
  on conflict (user_id, blocked_id) do nothing;

  return true;
end;
$$;

-- Preserve the existing pseudonymous response shape while enforcing blocks
-- below the client boundary. A block is reciprocal for feed visibility: once
-- either account blocks the other, neither account sees the other's Open Bip
-- posts through this canonical feed RPC.
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
    and not exists (
      select 1
      from public.blocked_users b
      where (b.user_id = v_user and b.blocked_id = p.user_id)
         or (b.user_id = p.user_id and b.blocked_id = v_user)
    )
  order by p.created_at desc
  limit v_limit;
end;
$$;

revoke all on function public.block_public_circle_author_from_post(bigint) from public, anon;
grant execute on function public.block_public_circle_author_from_post(bigint) to authenticated;

-- Keep the canonical feed callable only by authenticated accounts after its
-- definition is replaced above.
revoke all on function public.get_public_circle_feed(integer) from public, anon;
grant execute on function public.get_public_circle_feed(integer) to authenticated;

comment on function public.block_public_circle_author_from_post(bigint) is
  'Blocks the private author of an Open Bip post without exposing auth.users identity to the client.';

commit;

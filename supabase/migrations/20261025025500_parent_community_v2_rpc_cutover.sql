-- Parent Circle V2 — canonical shared-backend RPC cutover.
--
-- Authority: jussray/Sekret-Bip is the canonical Bip backend/schema owner.
-- Specialized Bip repos consume these contracts; they do not own a second DB.
--
-- Production application remains a separate founder gate.
-- Parent Community raw rows are blocked from authenticated clients and exposed
-- only through minimized SECURITY DEFINER RPCs.

begin;

create or replace function public.is_verified_guardian()
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select public.is_non_anonymous_user()
    and exists (
      select 1
      from public.account_verification av
      join public.circle_profiles cp on cp.user_id = av.user_id
      where av.user_id = auth.uid()
        and av.verification_state = 'VERIFIED_GUARDIAN'
        and cp.account_type = 'guardian'
    );
$$;

do $$
begin
  if exists (
    select 1
    from public.circles
    where kind = 'parent_community'::public.circle_kind
    group by owner_user_id
    having count(*) > 1
  ) then
    raise exception 'duplicate_parent_community_circles';
  end if;
end
$$;

create unique index if not exists circles_owner_parent_community_uniq
  on public.circles (owner_user_id, kind)
  where kind = 'parent_community'::public.circle_kind;

alter table public.posts
  add column if not exists topic_tag text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.posts'::regclass
      and conname = 'posts_topic_tag_length'
  ) then
    alter table public.posts
      add constraint posts_topic_tag_length
      check (
        topic_tag is null
        or char_length(trim(topic_tag)) between 1 and 40
      );
  end if;
end
$$;

-- Legacy moderation stores numeric Circle IDs. Text preserves every legacy
-- bigint value while allowing V2 UUID post IDs without a second report table.
alter table public.reported_posts
  alter column post_id type text
  using post_id::text;

-- RLS helper functions deliberately reveal only a boolean classification for an
-- unguessable UUID. SECURITY DEFINER lets the restrictive policies classify a
-- row even after raw Parent Community visibility is removed from clients.
create or replace function public.is_parent_community_circle_id(p_circle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
set row_security = off
as $$
  select exists (
    select 1
    from public.circles c
    where c.id = p_circle_id
      and c.kind = 'parent_community'::public.circle_kind
  );
$$;

create or replace function public.is_parent_community_post_id(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
set row_security = off
as $$
  select exists (
    select 1
    from public.posts p
    join public.circles c on c.id = p.circle_id
    where p.id = p_post_id
      and c.kind = 'parent_community'::public.circle_kind
  );
$$;

revoke all on function public.is_parent_community_circle_id(uuid) from public, anon;
revoke all on function public.is_parent_community_post_id(uuid) from public, anon;
grant execute on function public.is_parent_community_circle_id(uuid) to authenticated;
grant execute on function public.is_parent_community_post_id(uuid) to authenticated;

-- Restrictive policies layer over the existing Circle policies. They affect
-- only parent_community and leave public/friends/crew/private-family behavior
-- unchanged. SECURITY DEFINER Parent Community RPCs bypass these table-level
-- client membranes because migrations run as the table owner and FORCE RLS is
-- not enabled on these tables.
drop policy if exists parent_community_circles_rpc_only on public.circles;
create policy parent_community_circles_rpc_only
on public.circles
as restrictive
for all
to authenticated
using (kind <> 'parent_community'::public.circle_kind)
with check (kind <> 'parent_community'::public.circle_kind);

drop policy if exists parent_community_membership_rpc_only on public.circle_members;
create policy parent_community_membership_rpc_only
on public.circle_members
as restrictive
for all
to authenticated
using (not public.is_parent_community_circle_id(circle_id))
with check (not public.is_parent_community_circle_id(circle_id));

drop policy if exists parent_community_posts_rpc_only on public.posts;
create policy parent_community_posts_rpc_only
on public.posts
as restrictive
for all
to authenticated
using (not public.is_parent_community_post_id(id))
with check (not public.is_parent_community_circle_id(circle_id));

drop policy if exists parent_community_comments_rpc_only on public.post_comments;
create policy parent_community_comments_rpc_only
on public.post_comments
as restrictive
for all
to authenticated
using (not public.is_parent_community_post_id(post_id))
with check (not public.is_parent_community_post_id(post_id));

drop policy if exists parent_community_reactions_rpc_only on public.post_reactions;
create policy parent_community_reactions_rpc_only
on public.post_reactions
as restrictive
for all
to authenticated
using (not public.is_parent_community_post_id(post_id))
with check (not public.is_parent_community_post_id(post_id));

-- Legacy parent reports use numeric IDs. V2 Parent Community uses UUID IDs.
-- Keep legacy reporting intact while forcing V2 UUID parent reports through
-- report_parent_community_post(), where guardian authority and post existence
-- are checked.
drop policy if exists parent_community_reports_rpc_only on public.reported_posts;
create policy parent_community_reports_rpc_only
on public.reported_posts
as restrictive
for all
to authenticated
using (
  not (
    post_type = 'parent'
    and post_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  )
)
with check (
  not (
    post_type = 'parent'
    and post_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  )
);

create or replace function public.get_parent_community_feed(
  p_limit integer default 50
)
returns table (
  post_id uuid,
  post_text text,
  circle_tag text,
  created_at timestamptz,
  reaction_counts jsonb,
  quiet_reply_count bigint
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if not public.is_non_anonymous_user() then
    raise exception 'permanent_account_required' using errcode = '42501';
  end if;
  if not public.is_verified_guardian() then
    raise exception 'verified_guardian_required' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.body,
    p.topic_tag,
    p.created_at,
    (
      select jsonb_build_object(
        'beenThere', count(*) filter (where pr.reaction::text = 'beenThere'),
        'solidarity', count(*) filter (where pr.reaction::text = 'solidarity'),
        'reminder', count(*) filter (where pr.reaction::text = 'reminder'),
        'needed', count(*) filter (where pr.reaction::text = 'needed'),
        'strength', count(*) filter (where pr.reaction::text = 'strength')
      )
      from public.post_reactions pr
      where pr.post_id = p.id
    ),
    (
      select count(*)::bigint
      from public.post_comments pc
      where pc.post_id = p.id
        and pc.is_deleted is false
    )
  from public.posts p
  join public.circles c on c.id = p.circle_id
  where c.kind = 'parent_community'::public.circle_kind
    and p.is_deleted is false
  order by p.created_at desc
  limit v_limit;
end;
$$;

create or replace function public.create_parent_community_post(
  p_text text,
  p_circle_tag text default null
)
returns table (
  post_id uuid,
  post_text text,
  circle_tag text,
  created_at timestamptz,
  reaction_counts jsonb,
  quiet_reply_count bigint
)
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_circle_id uuid;
  v_post_id uuid;
  v_created_at timestamptz;
  v_text text := trim(coalesce(p_text, ''));
  v_tag text := nullif(trim(coalesce(p_circle_tag, '')), '');
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if not public.is_non_anonymous_user() then
    raise exception 'permanent_account_required' using errcode = '42501';
  end if;
  if not public.is_verified_guardian() then
    raise exception 'verified_guardian_required' using errcode = '42501';
  end if;
  if char_length(v_text) < 1 or char_length(v_text) > 5000 then
    raise exception 'invalid_parent_community_post' using errcode = '22023';
  end if;
  if v_tag is not null and char_length(v_tag) > 40 then
    raise exception 'invalid_parent_community_tag' using errcode = '22023';
  end if;

  select c.id
    into v_circle_id
  from public.circles c
  where c.owner_user_id = v_user
    and c.kind = 'parent_community'::public.circle_kind
  order by c.created_at asc
  limit 1;

  if v_circle_id is null then
    insert into public.circles (owner_user_id, kind, name)
    values (v_user, 'parent_community'::public.circle_kind, 'Parent Circle')
    on conflict do nothing
    returning id into v_circle_id;

    if v_circle_id is null then
      select c.id
        into v_circle_id
      from public.circles c
      where c.owner_user_id = v_user
        and c.kind = 'parent_community'::public.circle_kind
      order by c.created_at asc
      limit 1;
    end if;
  end if;

  if v_circle_id is null then
    raise exception 'parent_community_circle_unavailable';
  end if;

  insert into public.posts (
    author_user_id,
    circle_id,
    body,
    topic_tag,
    is_identity_revealed
  )
  values (
    v_user,
    v_circle_id,
    v_text,
    v_tag,
    false
  )
  returning id, created_at
    into v_post_id, v_created_at;

  return query
  select
    v_post_id,
    v_text,
    v_tag,
    v_created_at,
    jsonb_build_object(
      'beenThere', 0,
      'solidarity', 0,
      'reminder', 0,
      'needed', 0,
      'strength', 0
    ),
    0::bigint;
end;
$$;

create or replace function public.react_to_parent_community_post(
  p_post_id uuid,
  p_reaction text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_reaction text := trim(coalesce(p_reaction, ''));
  v_counts jsonb;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if not public.is_non_anonymous_user() then
    raise exception 'permanent_account_required' using errcode = '42501';
  end if;
  if not public.is_verified_guardian() then
    raise exception 'verified_guardian_required' using errcode = '42501';
  end if;
  if v_reaction not in ('beenThere','solidarity','reminder','needed','strength') then
    raise exception 'invalid_parent_community_reaction' using errcode = '22023';
  end if;

  perform 1
  from public.posts p
  join public.circles c on c.id = p.circle_id
  where p.id = p_post_id
    and p.is_deleted is false
    and c.kind = 'parent_community'::public.circle_kind;
  if not found then
    raise exception 'parent_community_post_not_found' using errcode = 'P0002';
  end if;

  insert into public.post_reactions (post_id, user_id, reaction)
  values (p_post_id, v_user, v_reaction::public.reaction_kind)
  on conflict (post_id, user_id, reaction) do nothing;

  select jsonb_build_object(
    'beenThere', count(*) filter (where pr.reaction::text = 'beenThere'),
    'solidarity', count(*) filter (where pr.reaction::text = 'solidarity'),
    'reminder', count(*) filter (where pr.reaction::text = 'reminder'),
    'needed', count(*) filter (where pr.reaction::text = 'needed'),
    'strength', count(*) filter (where pr.reaction::text = 'strength')
  )
  into v_counts
  from public.post_reactions pr
  where pr.post_id = p_post_id;

  return v_counts;
end;
$$;

create or replace function public.reply_to_parent_community_post(
  p_post_id uuid,
  p_body text
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_body text := trim(coalesce(p_body, ''));
  v_count bigint;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if not public.is_non_anonymous_user() then
    raise exception 'permanent_account_required' using errcode = '42501';
  end if;
  if not public.is_verified_guardian() then
    raise exception 'verified_guardian_required' using errcode = '42501';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 2000 then
    raise exception 'invalid_parent_community_reply' using errcode = '22023';
  end if;

  perform 1
  from public.posts p
  join public.circles c on c.id = p.circle_id
  where p.id = p_post_id
    and p.is_deleted is false
    and c.kind = 'parent_community'::public.circle_kind;
  if not found then
    raise exception 'parent_community_post_not_found' using errcode = 'P0002';
  end if;

  insert into public.post_comments (post_id, author_user_id, body)
  values (p_post_id, v_user, v_body);

  select count(*)::bigint
    into v_count
  from public.post_comments pc
  where pc.post_id = p_post_id
    and pc.is_deleted is false;

  return v_count;
end;
$$;

create or replace function public.report_parent_community_post(
  p_post_id uuid,
  p_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if not public.is_non_anonymous_user() then
    raise exception 'permanent_account_required' using errcode = '42501';
  end if;
  if not public.is_verified_guardian() then
    raise exception 'verified_guardian_required' using errcode = '42501';
  end if;

  perform 1
  from public.posts p
  join public.circles c on c.id = p.circle_id
  where p.id = p_post_id
    and p.is_deleted is false
    and c.kind = 'parent_community'::public.circle_kind;
  if not found then
    raise exception 'parent_community_post_not_found' using errcode = 'P0002';
  end if;

  insert into public.reported_posts as rp (
    reporter_id,
    post_id,
    post_type,
    reason
  )
  values (
    v_user,
    p_post_id::text,
    'parent',
    nullif(trim(coalesce(p_reason, '')), '')
  )
  on conflict (reporter_id, post_id, post_type)
  do update set reason = coalesce(excluded.reason, rp.reason);

  return true;
end;
$$;

revoke all on function public.get_parent_community_feed(integer) from public, anon;
revoke all on function public.create_parent_community_post(text, text) from public, anon;
revoke all on function public.react_to_parent_community_post(uuid, text) from public, anon;
revoke all on function public.reply_to_parent_community_post(uuid, text) from public, anon;
revoke all on function public.report_parent_community_post(uuid, text) from public, anon;

grant execute on function public.get_parent_community_feed(integer) to authenticated;
grant execute on function public.create_parent_community_post(text, text) to authenticated;
grant execute on function public.react_to_parent_community_post(uuid, text) to authenticated;
grant execute on function public.reply_to_parent_community_post(uuid, text) to authenticated;
grant execute on function public.report_parent_community_post(uuid, text) to authenticated;

comment on function public.get_parent_community_feed(integer) is
  'Canonical redacted Parent Circle feed. Main Bip owns this backend contract.';
comment on function public.create_parent_community_post(text, text) is
  'Canonical Parent Circle post write path for verified permanent guardians.';
comment on policy parent_community_posts_rpc_only on public.posts is
  'Raw Parent Community post access is denied to authenticated clients; use redacted RPCs.';

commit;

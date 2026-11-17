-- ============================================================
-- Se'kret Bip — Full Bootstrap SQL
-- Run once on a fresh Supabase project.
-- Requires: Supabase Auth enabled (auth.users must exist).
-- Order matters: enums → base tables → dependent tables
--                → functions → triggers → RLS → storage.
-- ============================================================

-- ── Migration 1: Circles + Posts ────────────────────────────

create extension if not exists pgcrypto;

create type public.circle_kind as enum (
  'public',
  'friends',
  'crew',
  'parent'
);

create table if not exists public.crews (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  description text,
  max_members integer not null default 15 check (max_members between 2 and 15),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parent_links (
  id uuid primary key default gen_random_uuid(),
  teen_user_id uuid not null references auth.users(id) on delete cascade,
  parent_user_id uuid not null references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint parent_links_distinct_users check (teen_user_id <> parent_user_id),
  constraint parent_links_one_parent_per_teen unique (teen_user_id)
);

create table if not exists public.circles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  kind public.circle_kind not null,
  crew_id uuid references public.crews(id) on delete cascade,
  parent_link_id uuid references public.parent_links(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint circles_kind_shape check (
    (kind = 'crew' and crew_id is not null and parent_link_id is null)
    or (kind = 'parent' and parent_link_id is not null and crew_id is null)
    or (kind in ('public','friends') and crew_id is null and parent_link_id is null)
  )
);

create unique index if not exists circles_owner_public_uniq
  on public.circles(owner_user_id, kind)
  where kind = 'public';

create unique index if not exists circles_owner_friends_uniq
  on public.circles(owner_user_id, kind)
  where kind = 'friends';

create unique index if not exists circles_owner_crew_uniq
  on public.circles(owner_user_id, crew_id)
  where kind = 'crew';

create unique index if not exists circles_owner_parent_uniq
  on public.circles(owner_user_id, parent_link_id)
  where kind = 'parent';

create table if not exists public.circle_members (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  created_at timestamptz not null default now(),
  unique (circle_id, user_id)
);

create table if not exists public.friendships (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_user_id),
  constraint friendships_no_self check (user_id <> friend_user_id)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_user_id uuid not null references auth.users(id) on delete cascade,
  circle_id uuid not null references public.circles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 5000),
  mood_tag text,
  content_warning text,
  is_identity_revealed boolean not null default false,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_circle_created_idx on public.posts(circle_id, created_at desc);
create index if not exists posts_author_created_idx on public.posts(author_user_id, created_at desc);
create index if not exists circle_members_user_idx on public.circle_members(user_id, circle_id);
create index if not exists friendships_friend_idx on public.friendships(friend_user_id, user_id);
create index if not exists crews_owner_idx on public.crews(owner_user_id);
create index if not exists parent_links_parent_idx on public.parent_links(parent_user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.enforce_circle_post_rules()
returns trigger
language plpgsql
as $$
declare
  v_kind public.circle_kind;
  v_owner uuid;
  v_crew_id uuid;
  v_parent_link_id uuid;
  v_is_member boolean;
begin
  select kind, owner_user_id, crew_id, parent_link_id
  into v_kind, v_owner, v_crew_id, v_parent_link_id
  from public.circles
  where id = new.circle_id;

  if not found then
    raise exception 'Circle not found';
  end if;

  if v_kind = 'parent' then
    raise exception 'Parent bridge is not a post destination';
  end if;

  if v_kind = 'public' then
    if new.author_user_id <> v_owner then
      raise exception 'Users can only post to their own public circle';
    end if;
    return new;
  end if;

  if v_kind = 'friends' then
    if new.author_user_id <> v_owner then
      raise exception 'Users can only post to their own friends circle';
    end if;
    return new;
  end if;

  if v_kind = 'crew' then
    select exists (
      select 1 from public.circle_members cm
      where cm.circle_id = new.circle_id
        and cm.user_id = new.author_user_id
    ) into v_is_member;

    if not v_is_member then
      raise exception 'Only crew members can post to this crew circle';
    end if;
    return new;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_crew_member_limit()
returns trigger
language plpgsql
as $$
declare
  v_crew_id uuid;
  v_max_members integer;
  v_count integer;
begin
  select c.crew_id into v_crew_id
  from public.circles c
  where c.id = new.circle_id and c.kind = 'crew';

  if v_crew_id is null then
    return new;
  end if;

  select max_members into v_max_members from public.crews where id = v_crew_id;
  select count(*) into v_count from public.circle_members where circle_id = new.circle_id;

  if v_count >= v_max_members then
    raise exception 'Crew member limit reached';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_crews_updated_at on public.crews;
create trigger trg_crews_updated_at
before update on public.crews
for each row execute function public.set_updated_at();

drop trigger if exists trg_parent_links_updated_at on public.parent_links;
create trigger trg_parent_links_updated_at
before update on public.parent_links
for each row execute function public.set_updated_at();

drop trigger if exists trg_circles_updated_at on public.circles;
create trigger trg_circles_updated_at
before update on public.circles
for each row execute function public.set_updated_at();

drop trigger if exists trg_posts_updated_at on public.posts;
create trigger trg_posts_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

drop trigger if exists trg_posts_circle_rules on public.posts;
create trigger trg_posts_circle_rules
before insert or update on public.posts
for each row execute function public.enforce_circle_post_rules();

drop trigger if exists trg_circle_members_limit on public.circle_members;
create trigger trg_circle_members_limit
before insert on public.circle_members
for each row execute function public.enforce_crew_member_limit();

alter table public.crews enable row level security;
alter table public.parent_links enable row level security;
alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.friendships enable row level security;
alter table public.posts enable row level security;

create policy "crews select own or member"
on public.crews for select to authenticated
using (
  owner_user_id = (select auth.uid())
  or id in (
    select c.crew_id
    from public.circles c
    join public.circle_members cm on cm.circle_id = c.id
    where c.kind = 'crew' and c.crew_id is not null
      and cm.user_id = (select auth.uid())
  )
);

create policy "crews insert own"
on public.crews for insert to authenticated
with check (owner_user_id = (select auth.uid()));

create policy "crews update own"
on public.crews for update to authenticated
using (owner_user_id = (select auth.uid()))
with check (owner_user_id = (select auth.uid()));

create policy "parent links select linked users"
on public.parent_links for select to authenticated
using (
  teen_user_id = (select auth.uid())
  or parent_user_id = (select auth.uid())
);

create policy "parent links insert teen only"
on public.parent_links for insert to authenticated
with check (teen_user_id = (select auth.uid()));

create policy "parent links update linked teen"
on public.parent_links for update to authenticated
using (teen_user_id = (select auth.uid()))
with check (teen_user_id = (select auth.uid()));

create policy "circles select owner or member"
on public.circles for select to authenticated
using (
  owner_user_id = (select auth.uid())
  or id in (
    select cm.circle_id from public.circle_members cm
    where cm.user_id = (select auth.uid())
  )
  or kind = 'public'
);

create policy "circles insert own"
on public.circles for insert to authenticated
with check (owner_user_id = (select auth.uid()));

create policy "circles update own"
on public.circles for update to authenticated
using (owner_user_id = (select auth.uid()))
with check (owner_user_id = (select auth.uid()));

create policy "circle members select own circles"
on public.circle_members for select to authenticated
using (
  user_id = (select auth.uid())
  or circle_id in (
    select id from public.circles where owner_user_id = (select auth.uid())
  )
);

create policy "circle members insert owner only"
on public.circle_members for insert to authenticated
with check (
  circle_id in (
    select id from public.circles where owner_user_id = (select auth.uid())
  )
);

create policy "circle members delete owner only"
on public.circle_members for delete to authenticated
using (
  circle_id in (
    select id from public.circles where owner_user_id = (select auth.uid())
  )
);

create policy "friendships select own"
on public.friendships for select to authenticated
using (
  user_id = (select auth.uid())
  or friend_user_id = (select auth.uid())
);

create policy "friendships insert own side"
on public.friendships for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "friendships delete own side"
on public.friendships for delete to authenticated
using (user_id = (select auth.uid()));

create policy "posts select by circle visibility"
on public.posts for select to authenticated
using (
  author_user_id = (select auth.uid())
  or circle_id in (
    select c.id from public.circles c where c.kind = 'public'
  )
  or circle_id in (
    select c.id from public.circles c
    where c.kind = 'friends'
      and c.owner_user_id in (
        select f1.friend_user_id
        from public.friendships f1
        join public.friendships f2
          on f1.user_id = f2.friend_user_id
         and f1.friend_user_id = f2.user_id
        where f1.user_id = (select auth.uid())
      )
  )
  or circle_id in (
    select cm.circle_id from public.circle_members cm
    where cm.user_id = (select auth.uid())
  )
);

create policy "posts insert by author"
on public.posts for insert to authenticated
with check (author_user_id = (select auth.uid()));

create policy "posts update own"
on public.posts for update to authenticated
using (author_user_id = (select auth.uid()))
with check (author_user_id = (select auth.uid()));

create policy "posts delete own"
on public.posts for delete to authenticated
using (author_user_id = (select auth.uid()));

-- ── Migration 2: Comments, Reactions, Moods, Parent Bridge ──

create type public.reaction_kind as enum (
  'hug',
  'heart',
  'listen',
  'support',
  'spark'
);

create type public.mood_level as enum (
  'very_low',
  'low',
  'okay',
  'good',
  'great'
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction public.reaction_kind not null,
  created_at timestamptz not null default now(),
  unique (post_id, user_id, reaction)
);

create table if not exists public.moods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mood public.mood_level not null,
  energy_level smallint check (energy_level between 1 and 5),
  anxiety_level smallint check (anxiety_level between 1 and 5),
  journal_excerpt text,
  is_private boolean not null default true,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parent_mood_summaries (
  id uuid primary key default gen_random_uuid(),
  teen_user_id uuid not null references auth.users(id) on delete cascade,
  parent_user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  mood_entry_count integer not null default 0 check (mood_entry_count >= 0),
  dominant_mood public.mood_level,
  average_energy numeric(4,2),
  average_anxiety numeric(4,2),
  low_mood_count integer not null default 0 check (low_mood_count >= 0),
  very_low_mood_count integer not null default 0 check (very_low_mood_count >= 0),
  support_flag boolean not null default false,
  summary_text text,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint parent_mood_summaries_date_range check (period_end >= period_start),
  unique (teen_user_id, parent_user_id, period_start, period_end)
);

create table if not exists public.safety_alerts (
  id uuid primary key default gen_random_uuid(),
  teen_user_id uuid not null references auth.users(id) on delete cascade,
  parent_user_id uuid not null references auth.users(id) on delete cascade,
  source_mood_id uuid references public.moods(id) on delete set null,
  source_post_id uuid references public.posts(id) on delete set null,
  alert_type text not null check (alert_type in ('critical_mood','self_harm_keyword','panic_pattern','manual_sos')),
  severity text not null check (severity in ('medium','high','critical')),
  title text not null,
  summary text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists post_comments_post_created_idx on public.post_comments(post_id, created_at asc);
create index if not exists post_comments_author_idx on public.post_comments(author_user_id, created_at desc);
create index if not exists post_reactions_post_idx on public.post_reactions(post_id, created_at desc);
create index if not exists post_reactions_user_idx on public.post_reactions(user_id, created_at desc);
create index if not exists moods_user_recorded_idx on public.moods(user_id, recorded_at desc);
create index if not exists parent_mood_summaries_parent_idx on public.parent_mood_summaries(parent_user_id, period_end desc);
create index if not exists parent_mood_summaries_teen_idx on public.parent_mood_summaries(teen_user_id, period_end desc);
create index if not exists safety_alerts_parent_idx on public.safety_alerts(parent_user_id, created_at desc);
create index if not exists safety_alerts_teen_idx on public.safety_alerts(teen_user_id, created_at desc);

create or replace function public.assert_can_access_post(p_post_id uuid, p_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.posts p
    where p.id = p_post_id
      and (
        p.author_user_id = p_user_id
        or p.circle_id in (
          select c.id from public.circles c where c.kind = 'public'
        )
        or p.circle_id in (
          select c.id from public.circles c
          where c.kind = 'friends'
            and c.owner_user_id in (
              select f1.friend_user_id
              from public.friendships f1
              join public.friendships f2
                on f1.user_id = f2.friend_user_id
               and f1.friend_user_id = f2.user_id
              where f1.user_id = p_user_id
            )
        )
        or p.circle_id in (
          select cm.circle_id from public.circle_members cm
          where cm.user_id = p_user_id
        )
      )
  );
$$;

create or replace function public.assert_can_parent_view_teen(p_teen_user_id uuid, p_parent_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.parent_links pl
    where pl.teen_user_id = p_teen_user_id
      and pl.parent_user_id = p_parent_user_id
      and pl.is_active = true
  );
$$;

create or replace function public.enforce_comment_visibility()
returns trigger
language plpgsql
as $$
begin
  if not public.assert_can_access_post(new.post_id, new.author_user_id) then
    raise exception 'User cannot comment on this post';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_reaction_visibility()
returns trigger
language plpgsql
as $$
begin
  if not public.assert_can_access_post(new.post_id, new.user_id) then
    raise exception 'User cannot react to this post';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_parent_summary_link()
returns trigger
language plpgsql
as $$
begin
  if not public.assert_can_parent_view_teen(new.teen_user_id, new.parent_user_id) then
    raise exception 'Parent summary must map to an active parent link';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_safety_alert_link()
returns trigger
language plpgsql
as $$
begin
  if not public.assert_can_parent_view_teen(new.teen_user_id, new.parent_user_id) then
    raise exception 'Safety alert must map to an active parent link';
  end if;
  return new;
end;
$$;

create or replace function public.refresh_parent_mood_summary(
  p_teen_user_id uuid,
  p_parent_user_id uuid,
  p_period_start date,
  p_period_end date
)
returns void
language plpgsql
security definer
as $$
declare
  v_count integer;
  v_dominant public.mood_level;
  v_avg_energy numeric(4,2);
  v_avg_anxiety numeric(4,2);
  v_low_count integer;
  v_very_low_count integer;
  v_support_flag boolean;
  v_summary text;
begin
  if not public.assert_can_parent_view_teen(p_teen_user_id, p_parent_user_id) then
    raise exception 'Invalid teen-parent link';
  end if;

  select count(*) into v_count
  from public.moods m
  where m.user_id = p_teen_user_id
    and m.recorded_at::date between p_period_start and p_period_end;

  select sub.mood into v_dominant
  from (
    select m.mood, count(*) as mood_count
    from public.moods m
    where m.user_id = p_teen_user_id
      and m.recorded_at::date between p_period_start and p_period_end
    group by m.mood
    order by mood_count desc, m.mood asc
    limit 1
  ) sub;

  select
    round(avg(m.energy_level)::numeric, 2),
    round(avg(m.anxiety_level)::numeric, 2)
  into v_avg_energy, v_avg_anxiety
  from public.moods m
  where m.user_id = p_teen_user_id
    and m.recorded_at::date between p_period_start and p_period_end;

  select count(*) into v_low_count
  from public.moods m
  where m.user_id = p_teen_user_id
    and m.mood = 'low'
    and m.recorded_at::date between p_period_start and p_period_end;

  select count(*) into v_very_low_count
  from public.moods m
  where m.user_id = p_teen_user_id
    and m.mood = 'very_low'
    and m.recorded_at::date between p_period_start and p_period_end;

  v_support_flag := coalesce(v_very_low_count, 0) >= 2 or coalesce(v_low_count, 0) >= 4;
  v_summary := case
    when v_count = 0 then 'No mood entries recorded in this period.'
    else 'Mood trend summary generated from aggregated entries only.'
  end;

  insert into public.parent_mood_summaries (
    teen_user_id, parent_user_id, period_start, period_end,
    mood_entry_count, dominant_mood, average_energy, average_anxiety,
    low_mood_count, very_low_mood_count, support_flag, summary_text
  )
  values (
    p_teen_user_id, p_parent_user_id, p_period_start, p_period_end,
    coalesce(v_count, 0), v_dominant, v_avg_energy, v_avg_anxiety,
    coalesce(v_low_count, 0), coalesce(v_very_low_count, 0),
    coalesce(v_support_flag, false), v_summary
  )
  on conflict (teen_user_id, parent_user_id, period_start, period_end)
  do update set
    mood_entry_count    = excluded.mood_entry_count,
    dominant_mood       = excluded.dominant_mood,
    average_energy      = excluded.average_energy,
    average_anxiety     = excluded.average_anxiety,
    low_mood_count      = excluded.low_mood_count,
    very_low_mood_count = excluded.very_low_mood_count,
    support_flag        = excluded.support_flag,
    summary_text        = excluded.summary_text,
    updated_at          = now(),
    generated_at        = now();
end;
$$;

drop trigger if exists trg_post_comments_updated_at on public.post_comments;
create trigger trg_post_comments_updated_at
before update on public.post_comments
for each row execute function public.set_updated_at();

drop trigger if exists trg_moods_updated_at on public.moods;
create trigger trg_moods_updated_at
before update on public.moods
for each row execute function public.set_updated_at();

drop trigger if exists trg_parent_mood_summaries_updated_at on public.parent_mood_summaries;
create trigger trg_parent_mood_summaries_updated_at
before update on public.parent_mood_summaries
for each row execute function public.set_updated_at();

drop trigger if exists trg_safety_alerts_updated_at on public.safety_alerts;
create trigger trg_safety_alerts_updated_at
before update on public.safety_alerts
for each row execute function public.set_updated_at();

drop trigger if exists trg_post_comments_visibility on public.post_comments;
create trigger trg_post_comments_visibility
before insert or update on public.post_comments
for each row execute function public.enforce_comment_visibility();

drop trigger if exists trg_post_reactions_visibility on public.post_reactions;
create trigger trg_post_reactions_visibility
before insert or update on public.post_reactions
for each row execute function public.enforce_reaction_visibility();

drop trigger if exists trg_parent_mood_summaries_link on public.parent_mood_summaries;
create trigger trg_parent_mood_summaries_link
before insert or update on public.parent_mood_summaries
for each row execute function public.enforce_parent_summary_link();

drop trigger if exists trg_safety_alerts_link on public.safety_alerts;
create trigger trg_safety_alerts_link
before insert or update on public.safety_alerts
for each row execute function public.enforce_safety_alert_link();

alter table public.post_comments enable row level security;
alter table public.post_reactions enable row level security;
alter table public.moods enable row level security;
alter table public.parent_mood_summaries enable row level security;
alter table public.safety_alerts enable row level security;

create policy "comments select if post visible"
on public.post_comments for select to authenticated
using (public.assert_can_access_post(post_id, (select auth.uid())));

create policy "comments insert own if post visible"
on public.post_comments for insert to authenticated
with check (
  author_user_id = (select auth.uid())
  and public.assert_can_access_post(post_id, (select auth.uid()))
);

create policy "comments update own"
on public.post_comments for update to authenticated
using (author_user_id = (select auth.uid()))
with check (author_user_id = (select auth.uid()));

create policy "comments delete own"
on public.post_comments for delete to authenticated
using (author_user_id = (select auth.uid()));

create policy "reactions select if post visible"
on public.post_reactions for select to authenticated
using (public.assert_can_access_post(post_id, (select auth.uid())));

create policy "reactions insert own if post visible"
on public.post_reactions for insert to authenticated
with check (
  user_id = (select auth.uid())
  and public.assert_can_access_post(post_id, (select auth.uid()))
);

create policy "reactions delete own"
on public.post_reactions for delete to authenticated
using (user_id = (select auth.uid()));

create policy "moods select own"
on public.moods for select to authenticated
using (user_id = (select auth.uid()));

create policy "moods insert own"
on public.moods for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "moods update own"
on public.moods for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "moods delete own"
on public.moods for delete to authenticated
using (user_id = (select auth.uid()));

create policy "parent summaries select linked teen or parent"
on public.parent_mood_summaries for select to authenticated
using (
  teen_user_id = (select auth.uid())
  or parent_user_id = (select auth.uid())
);

create policy "parent summaries insert teen only"
on public.parent_mood_summaries for insert to authenticated
with check (teen_user_id = (select auth.uid()));

create policy "parent summaries update teen only"
on public.parent_mood_summaries for update to authenticated
using (teen_user_id = (select auth.uid()))
with check (teen_user_id = (select auth.uid()));

create policy "safety alerts select linked teen or parent"
on public.safety_alerts for select to authenticated
using (
  teen_user_id = (select auth.uid())
  or parent_user_id = (select auth.uid())
);

create policy "safety alerts insert teen only"
on public.safety_alerts for insert to authenticated
with check (teen_user_id = (select auth.uid()));

create policy "safety alerts update parent or teen"
on public.safety_alerts for update to authenticated
using (
  teen_user_id = (select auth.uid())
  or parent_user_id = (select auth.uid())
)
with check (
  teen_user_id = (select auth.uid())
  or parent_user_id = (select auth.uid())
);

-- ── Migration 3: Media Attachments + Storage ─────────────────

create type public.media_kind as enum (
  'image',
  'audio',
  'video'
);

create table if not exists public.media_attachments (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.post_comments(id) on delete cascade,
  bucket_id text not null,
  object_path text not null,
  media_type public.media_kind not null,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0 and file_size_bytes <= 52428800),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  duration_seconds numeric(8,2) check (duration_seconds is null or duration_seconds > 0),
  alt_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_attachment_exact_parent check (
    ((post_id is not null)::int + (comment_id is not null)::int) = 1
  ),
  constraint media_attachment_bucket_allowed check (
    bucket_id in ('bip-post-media', 'bip-scrapbook-media')
  ),
  unique (bucket_id, object_path)
);

create table if not exists public.scrapbook_entries (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  crew_id uuid not null references public.crews(id) on delete cascade,
  media_attachment_id uuid not null unique references public.media_attachments(id) on delete cascade,
  caption text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists media_attachments_owner_idx on public.media_attachments(owner_user_id, created_at desc);
create index if not exists media_attachments_post_idx on public.media_attachments(post_id, created_at asc);
create index if not exists media_attachments_comment_idx on public.media_attachments(comment_id, created_at asc);
create index if not exists scrapbook_entries_crew_idx on public.scrapbook_entries(crew_id, created_at desc);
create index if not exists scrapbook_entries_owner_idx on public.scrapbook_entries(owner_user_id, created_at desc);

create or replace function public.is_crew_member(p_crew_id uuid, p_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.circles c
    join public.circle_members cm on cm.circle_id = c.id
    where c.kind = 'crew'
      and c.crew_id = p_crew_id
      and cm.user_id = p_user_id
  );
$$;

create or replace function public.can_access_media_attachment(p_media_id uuid, p_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.media_attachments ma
    left join public.post_comments pc on pc.id = ma.comment_id
    where ma.id = p_media_id
      and (
        ma.owner_user_id = p_user_id
        or (ma.post_id is not null and public.assert_can_access_post(ma.post_id, p_user_id))
        or (ma.comment_id is not null and public.assert_can_access_post(pc.post_id, p_user_id))
        or (
          ma.bucket_id = 'bip-scrapbook-media'
          and exists (
            select 1 from public.scrapbook_entries se
            where se.media_attachment_id = ma.id
              and public.is_crew_member(se.crew_id, p_user_id)
          )
        )
      )
  );
$$;

create or replace function public.enforce_media_attachment_access()
returns trigger
language plpgsql
as $$
declare
  v_post_author uuid;
  v_comment_author uuid;
  v_post_id uuid;
  v_circle_id uuid;
  v_circle_kind public.circle_kind;
begin
  if new.post_id is not null then
    select p.author_user_id, p.circle_id
    into v_post_author, v_circle_id
    from public.posts p where p.id = new.post_id;

    if not found then
      raise exception 'Post not found for media attachment';
    end if;

    if new.owner_user_id <> v_post_author then
      raise exception 'Only the post author can attach media to a post';
    end if;

    select c.kind into v_circle_kind from public.circles c where c.id = v_circle_id;

    if v_circle_kind = 'parent' then
      raise exception 'Parent bridge cannot receive media posts';
    end if;
  end if;

  if new.comment_id is not null then
    select pc.author_user_id, pc.post_id
    into v_comment_author, v_post_id
    from public.post_comments pc where pc.id = new.comment_id;

    if not found then
      raise exception 'Comment not found for media attachment';
    end if;

    if new.owner_user_id <> v_comment_author then
      raise exception 'Only the comment author can attach media to a comment';
    end if;

    if not public.assert_can_access_post(v_post_id, new.owner_user_id) then
      raise exception 'Comment media must belong to a visible post';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_scrapbook_access()
returns trigger
language plpgsql
as $$
declare
  v_owner uuid;
  v_bucket text;
begin
  if not public.is_crew_member(new.crew_id, new.owner_user_id) then
    raise exception 'Only crew members can create scrapbook entries';
  end if;

  select ma.owner_user_id, ma.bucket_id
  into v_owner, v_bucket
  from public.media_attachments ma
  where ma.id = new.media_attachment_id;

  if not found then
    raise exception 'Media attachment not found';
  end if;

  if v_owner <> new.owner_user_id then
    raise exception 'Scrapbook entry owner must own the media';
  end if;

  if v_bucket <> 'bip-scrapbook-media' then
    raise exception 'Scrapbook entries must use scrapbook bucket media';
  end if;

  return new;
end;
$$;

create or replace function public.can_access_storage_object(p_bucket_id text, p_name text, p_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.media_attachments ma
    where ma.bucket_id = p_bucket_id
      and ma.object_path = p_name
      and public.can_access_media_attachment(ma.id, p_user_id)
  );
$$;

drop trigger if exists trg_media_attachments_updated_at on public.media_attachments;
create trigger trg_media_attachments_updated_at
before update on public.media_attachments
for each row execute function public.set_updated_at();

drop trigger if exists trg_scrapbook_entries_updated_at on public.scrapbook_entries;
create trigger trg_scrapbook_entries_updated_at
before update on public.scrapbook_entries
for each row execute function public.set_updated_at();

drop trigger if exists trg_media_attachments_access on public.media_attachments;
create trigger trg_media_attachments_access
before insert or update on public.media_attachments
for each row execute function public.enforce_media_attachment_access();

drop trigger if exists trg_scrapbook_entries_access on public.scrapbook_entries;
create trigger trg_scrapbook_entries_access
before insert or update on public.scrapbook_entries
for each row execute function public.enforce_scrapbook_access();

alter table public.media_attachments enable row level security;
alter table public.scrapbook_entries enable row level security;

create policy "media select if visible"
on public.media_attachments for select to authenticated
using (public.can_access_media_attachment(id, (select auth.uid())));

create policy "media insert own"
on public.media_attachments for insert to authenticated
with check (owner_user_id = (select auth.uid()));

create policy "media update own"
on public.media_attachments for update to authenticated
using (owner_user_id = (select auth.uid()))
with check (owner_user_id = (select auth.uid()));

create policy "media delete own"
on public.media_attachments for delete to authenticated
using (owner_user_id = (select auth.uid()));

create policy "scrapbook select crew members"
on public.scrapbook_entries for select to authenticated
using (public.is_crew_member(crew_id, (select auth.uid())));

create policy "scrapbook insert crew members"
on public.scrapbook_entries for insert to authenticated
with check (
  owner_user_id = (select auth.uid())
  and public.is_crew_member(crew_id, (select auth.uid()))
);

create policy "scrapbook update own"
on public.scrapbook_entries for update to authenticated
using (owner_user_id = (select auth.uid()))
with check (owner_user_id = (select auth.uid()));

create policy "scrapbook delete own"
on public.scrapbook_entries for delete to authenticated
using (owner_user_id = (select auth.uid()));

insert into storage.buckets (id, name, public)
values
  ('bip-post-media', 'bip-post-media', false),
  ('bip-scrapbook-media', 'bip-scrapbook-media', false)
on conflict (id) do nothing;

create policy "post media select by attachment visibility"
on storage.objects for select to authenticated
using (
  bucket_id in ('bip-post-media', 'bip-scrapbook-media')
  and public.can_access_storage_object(bucket_id, name, (select auth.uid()))
);

create policy "post media insert own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id in ('bip-post-media', 'bip-scrapbook-media')
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "post media update own folder"
on storage.objects for update to authenticated
using (
  bucket_id in ('bip-post-media', 'bip-scrapbook-media')
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id in ('bip-post-media', 'bip-scrapbook-media')
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "post media delete own folder"
on storage.objects for delete to authenticated
using (
  bucket_id in ('bip-post-media', 'bip-scrapbook-media')
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

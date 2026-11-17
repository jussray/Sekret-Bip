begin;

-- Phase 1: Parent–Teen Bridge summaries.
-- Parent linking never grants raw journal, mood, chat, or legacy Bridge content.
-- Parents may read only generated summaries tied to an active link and an
-- unrevoked teen-created share request.

-- Remove legacy raw-content parent read paths.
drop policy if exists "journal_entries: linked_parent_read_shared" on public.journal_entries;
drop policy if exists "mood_history: linked_parent_read_shared" on public.mood_history;
drop policy if exists bridge_shares_linked_parent_select on public.bridge_shares;

create table if not exists public.bridge_share_requests (
  id uuid primary key default gen_random_uuid(),
  teen_user_id uuid not null references auth.users(id) on delete cascade,
  parent_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','processing','ready','viewed','revoked','expired','failed','deleted')),
  idempotency_key text not null,
  consented_at timestamptz not null default now(),
  revoked_at timestamptz,
  expires_at timestamptz,
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teen_user_id, idempotency_key)
);

create index if not exists bridge_share_requests_parent_status_idx
  on public.bridge_share_requests (parent_user_id, status, created_at desc);
create index if not exists bridge_share_requests_teen_status_idx
  on public.bridge_share_requests (teen_user_id, status, created_at desc);

create table if not exists public.bridge_share_sources (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.bridge_share_requests(id) on delete cascade,
  source_kind text not null check (source_kind in ('journal','mood','goal','scrapbook')),
  source_id text not null,
  created_at timestamptz not null default now(),
  unique (request_id, source_kind, source_id)
);

create table if not exists public.bridge_summaries (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.bridge_share_requests(id) on delete cascade,
  themes text[] not null default '{}',
  conversation_starters text[] not null default '{}',
  limitations text not null,
  prompt_version text not null,
  model text,
  used_fallback boolean not null default false,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bridge_summary_views (
  id uuid primary key default gen_random_uuid(),
  summary_id uuid not null references public.bridge_summaries(id) on delete cascade,
  parent_user_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique (summary_id, parent_user_id)
);

create table if not exists public.bridge_delivery_preferences (
  teen_user_id uuid primary key references auth.users(id) on delete cascade,
  weekly_in_app boolean not null default false,
  weekly_email boolean not null default false,
  verified_parent_email_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bridge_share_requests enable row level security;
alter table public.bridge_share_sources enable row level security;
alter table public.bridge_summaries enable row level security;
alter table public.bridge_summary_views enable row level security;
alter table public.bridge_delivery_preferences enable row level security;

-- Teen owns request lifecycle.
drop policy if exists bridge_share_requests_teen_select on public.bridge_share_requests;
create policy bridge_share_requests_teen_select
on public.bridge_share_requests for select to authenticated
using (teen_user_id = auth.uid());

drop policy if exists bridge_share_requests_teen_insert on public.bridge_share_requests;
create policy bridge_share_requests_teen_insert
on public.bridge_share_requests for insert to authenticated
with check (
  teen_user_id = auth.uid()
  and exists (
    select 1 from public.parent_links pl
    where pl.teen_user_id = auth.uid()
      and pl.parent_user_id = bridge_share_requests.parent_user_id
      and pl.status = 'active'
      and pl.is_active = true
  )
);

drop policy if exists bridge_share_requests_teen_update on public.bridge_share_requests;
create policy bridge_share_requests_teen_update
on public.bridge_share_requests for update to authenticated
using (teen_user_id = auth.uid())
with check (teen_user_id = auth.uid());

-- Parent may see request metadata only while the link and share remain valid.
drop policy if exists bridge_share_requests_parent_select on public.bridge_share_requests;
create policy bridge_share_requests_parent_select
on public.bridge_share_requests for select to authenticated
using (
  parent_user_id = auth.uid()
  and status in ('ready','viewed')
  and revoked_at is null
  and (expires_at is null or expires_at > now())
  and exists (
    select 1 from public.parent_links pl
    where pl.teen_user_id = bridge_share_requests.teen_user_id
      and pl.parent_user_id = auth.uid()
      and pl.status = 'active'
      and pl.is_active = true
  )
);

-- Source references are visible to the teen only. Parents never receive source IDs.
drop policy if exists bridge_share_sources_teen_select on public.bridge_share_sources;
create policy bridge_share_sources_teen_select
on public.bridge_share_sources for select to authenticated
using (
  exists (
    select 1 from public.bridge_share_requests r
    where r.id = bridge_share_sources.request_id
      and r.teen_user_id = auth.uid()
  )
);

drop policy if exists bridge_share_sources_teen_insert on public.bridge_share_sources;
create policy bridge_share_sources_teen_insert
on public.bridge_share_sources for insert to authenticated
with check (
  exists (
    select 1 from public.bridge_share_requests r
    where r.id = bridge_share_sources.request_id
      and r.teen_user_id = auth.uid()
      and r.status = 'pending'
      and r.revoked_at is null
  )
);

-- Teen may inspect the generated summary. Parent may read summary text only through
-- an active link and a ready/viewed, non-revoked request.
drop policy if exists bridge_summaries_teen_select on public.bridge_summaries;
create policy bridge_summaries_teen_select
on public.bridge_summaries for select to authenticated
using (
  exists (
    select 1 from public.bridge_share_requests r
    where r.id = bridge_summaries.request_id
      and r.teen_user_id = auth.uid()
  )
);

drop policy if exists bridge_summaries_parent_select on public.bridge_summaries;
create policy bridge_summaries_parent_select
on public.bridge_summaries for select to authenticated
using (
  exists (
    select 1
    from public.bridge_share_requests r
    join public.parent_links pl
      on pl.teen_user_id = r.teen_user_id
     and pl.parent_user_id = r.parent_user_id
    where r.id = bridge_summaries.request_id
      and r.parent_user_id = auth.uid()
      and r.status in ('ready','viewed')
      and r.revoked_at is null
      and (r.expires_at is null or r.expires_at > now())
      and pl.status = 'active'
      and pl.is_active = true
  )
);

-- Parents may record their own view only for a summary they can currently read.
drop policy if exists bridge_summary_views_parent_select on public.bridge_summary_views;
create policy bridge_summary_views_parent_select
on public.bridge_summary_views for select to authenticated
using (parent_user_id = auth.uid());

drop policy if exists bridge_summary_views_parent_insert on public.bridge_summary_views;
create policy bridge_summary_views_parent_insert
on public.bridge_summary_views for insert to authenticated
with check (
  parent_user_id = auth.uid()
  and exists (
    select 1
    from public.bridge_summaries s
    join public.bridge_share_requests r on r.id = s.request_id
    join public.parent_links pl
      on pl.teen_user_id = r.teen_user_id
     and pl.parent_user_id = r.parent_user_id
    where s.id = bridge_summary_views.summary_id
      and r.parent_user_id = auth.uid()
      and r.status in ('ready','viewed')
      and r.revoked_at is null
      and (r.expires_at is null or r.expires_at > now())
      and pl.status = 'active'
      and pl.is_active = true
  )
);

-- Delivery preferences remain teen-controlled. Email stays disabled by default.
drop policy if exists bridge_delivery_preferences_owner_all on public.bridge_delivery_preferences;
create policy bridge_delivery_preferences_owner_all
on public.bridge_delivery_preferences for all to authenticated
using (teen_user_id = auth.uid())
with check (teen_user_id = auth.uid());

create or replace function public.create_bridge_share_request(
  p_parent_user_id uuid,
  p_idempotency_key text,
  p_sources jsonb,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_teen_user_id uuid := auth.uid();
  v_request_id uuid;
  v_source jsonb;
begin
  if v_teen_user_id is null then
    raise exception 'unauthorized';
  end if;

  if p_parent_user_id is null or p_parent_user_id = v_teen_user_id then
    raise exception 'invalid_parent';
  end if;

  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception 'invalid_idempotency_key';
  end if;

  if jsonb_typeof(p_sources) <> 'array' or jsonb_array_length(p_sources) = 0 then
    raise exception 'sources_required';
  end if;

  if jsonb_array_length(p_sources) > 20 then
    raise exception 'too_many_sources';
  end if;

  if not exists (
    select 1 from public.parent_links pl
    where pl.teen_user_id = v_teen_user_id
      and pl.parent_user_id = p_parent_user_id
      and pl.status = 'active'
      and pl.is_active = true
  ) then
    raise exception 'active_parent_link_required';
  end if;

  insert into public.bridge_share_requests (
    teen_user_id, parent_user_id, status, idempotency_key, consented_at, expires_at
  ) values (
    v_teen_user_id, p_parent_user_id, 'pending', trim(p_idempotency_key), now(), p_expires_at
  )
  on conflict (teen_user_id, idempotency_key) do update
    set updated_at = now()
  returning id into v_request_id;

  for v_source in select value from jsonb_array_elements(p_sources)
  loop
    if coalesce(v_source->>'kind','') not in ('journal','mood','goal','scrapbook')
       or nullif(trim(v_source->>'sourceId'),'') is null then
      raise exception 'invalid_source';
    end if;

    insert into public.bridge_share_sources (request_id, source_kind, source_id)
    values (v_request_id, v_source->>'kind', trim(v_source->>'sourceId'))
    on conflict (request_id, source_kind, source_id) do nothing;
  end loop;

  return v_request_id;
end;
$$;

revoke execute on function public.create_bridge_share_request(uuid,text,jsonb,timestamptz) from public, anon;
grant execute on function public.create_bridge_share_request(uuid,text,jsonb,timestamptz) to authenticated;

create or replace function public.revoke_bridge_share_request(p_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_teen_user_id uuid := auth.uid();
begin
  if v_teen_user_id is null then
    raise exception 'unauthorized';
  end if;

  update public.bridge_share_requests
  set status = 'revoked',
      revoked_at = now(),
      updated_at = now()
  where id = p_request_id
    and teen_user_id = v_teen_user_id
    and status not in ('revoked','deleted');

  return found;
end;
$$;

revoke execute on function public.revoke_bridge_share_request(uuid) from public, anon;
grant execute on function public.revoke_bridge_share_request(uuid) to authenticated;

comment on table public.bridge_share_requests is
  'Teen-created consent record for a generated parent-safe Bridge summary. Does not contain raw source content.';
comment on table public.bridge_share_sources is
  'References exact teen-selected sources. Parent policies intentionally expose none of these rows.';
comment on table public.bridge_summaries is
  'Generated summary content only; readable by the teen and the currently active linked parent while unrevoked.';

commit;

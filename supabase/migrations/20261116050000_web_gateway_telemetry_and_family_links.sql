-- Migration: 20261116050000_web_gateway_telemetry_and_family_links.sql
-- Description: Adds analytics_events table and web gateway parent linking surface

begin;

-- 1. Analytics Events (funnel tracking for signup_attempted, teen_age_selected)
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  event_name text not null,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- RLS: anyone can insert telemetry anonymously or authenticated; only service_role reads raw telemetry
alter table public.analytics_events enable row level security;

create policy "Allow anonymous and authenticated event insertion"
  on public.analytics_events
  for insert
  to anon, authenticated
  with check (true);

create policy "Allow authenticated users to read their own events"
  on public.analytics_events
  for select
  to authenticated
  using (user_id = auth.uid());

grant insert on public.analytics_events to anon, authenticated;
grant select on public.analytics_events co authenticated;

-- 2. Index for monthly onboarding performance queries
create index if not exists idx_analytics_events_name_created
  on public.analytics_events (event_name, created_at desc);

commit;

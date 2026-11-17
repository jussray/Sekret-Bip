-- Retention event log
create table if not exists public.app_events (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  event_type  text not null,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create index if not exists app_events_user_type_time
  on public.app_events (user_id, event_type, created_at);

alter table public.app_events enable row level security;

drop policy if exists "users insert own events" on public.app_events;
create policy "users insert own events"
  on public.app_events for insert to authenticated
  with check (auth.uid() = user_id);

-- Analytics are service-only. SECURITY INVOKER prevents bypassing base-table RLS.
create or replace view public.v_d7_retention
with (security_invoker = true) as
select
  count(distinct d7.user_id)::float /
  nullif(count(distinct d0.user_id), 0) * 100 as d7_retention_pct,
  count(distinct d0.user_id) as cohort_size
from (
  select distinct user_id, date(created_at) as day0
  from public.app_events
  where event_type = 'session_start'
) d0
left join (
  select distinct user_id, date(created_at) as day_n
  from public.app_events
  where event_type = 'session_start'
) d7
  on d0.user_id = d7.user_id
 and d7.day_n between d0.day0 + 6 and d0.day0 + 8;

create or replace view public.v_wau_trend
with (security_invoker = true) as
select
  date_trunc('week', created_at) as week_start,
  count(distinct user_id) as wau
from public.app_events
where event_type = 'session_start'
group by 1
order by 1;

revoke all on public.v_d7_retention from public, anon, authenticated;
revoke all on public.v_wau_trend from public, anon, authenticated;
grant select on public.v_d7_retention to service_role;
grant select on public.v_wau_trend to service_role;

begin;

-- D7 retention must answer one business question consistently:
-- of users whose first recorded session is old enough for the full D6-D8
-- observation window, what percentage returned during that window?
--
-- The original view treated every distinct session date as a new day 0. That
-- allowed later sessions to create additional cohorts for the same user and
-- made the metric drift away from first-session retention.
create or replace view public.v_d7_retention
with (security_invoker = true) as
with first_sessions as (
  select
    user_id,
    min(created_at::date) as first_day
  from public.app_events
  where event_type = 'session_start'
    and user_id is not null
  group by user_id
),
eligible_cohort as (
  select user_id, first_day
  from first_sessions
  where first_day <= current_date - 8
),
returned_users as (
  select distinct cohort.user_id
  from eligible_cohort cohort
  join public.app_events events
    on events.user_id = cohort.user_id
   and events.event_type = 'session_start'
   and events.created_at::date between cohort.first_day + 6 and cohort.first_day + 8
)
select
  count(returned_users.user_id)::float
    / nullif(count(eligible_cohort.user_id), 0) * 100 as d7_retention_pct,
  count(eligible_cohort.user_id) as cohort_size
from eligible_cohort
left join returned_users using (user_id);

revoke all on public.v_d7_retention from public, anon, authenticated;
grant select on public.v_d7_retention to service_role;

comment on view public.v_d7_retention is
  'D7 retention: eligible first-session cohort users who return during the D6-D8 observation window.';

commit;

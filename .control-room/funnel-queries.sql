-- ============================================================
-- Se'kret Bip — Onboarding Current-State Funnel Queries
-- OODA Observe Layer / Founder Control Room
-- ============================================================
-- Run only with an approved read-only/service-role connection.
--
-- IMPORTANT:
-- `user_onboarding_state` stores one CURRENT stage per user. It is
-- not an event log. These queries may estimate cumulative reach
-- from the ordered current stage, but they cannot prove that every
-- intermediate event occurred. Branch outcomes that are overwritten
-- by later stages are reported as unavailable rather than invented.
-- ============================================================


-- ── 1. CURRENT-STAGE DISTRIBUTION ──────────────────────────────
-- Snapshot of where users are now. This is not cumulative reach.

select
  stage,
  role,
  count(*) as users,
  round(100.0 * count(*) / nullif(sum(count(*)) over (), 0), 1) as pct_of_total
from public.user_onboarding_state
group by stage, role
order by
  array_position(array[
    'pre_signup','signed_up','consent_complete','age_verified',
    'role_selected','name_set','identity_set','reflection_complete',
    'parent_link_sent','parent_linked','parent_link_skipped',
    'parent_setup_complete','activated','steady_state'
  ]::text[], stage::text),
  role;


-- ── 2. ESTIMATED CUMULATIVE REACH — TEEN PATH ────────────────
-- Counts users whose current ordered stage is at or beyond each
-- required teen milestone. Unknown-role rows are excluded and shown
-- separately in query 10.

with stage_rank(stage, rank) as (
  values
    ('signed_up'::onboarding_stage, 1),
    ('consent_complete'::onboarding_stage, 2),
    ('age_verified'::onboarding_stage, 3),
    ('role_selected'::onboarding_stage, 4),
    ('name_set'::onboarding_stage, 5),
    ('identity_set'::onboarding_stage, 6),
    ('reflection_complete'::onboarding_stage, 7),
    ('parent_link_sent'::onboarding_stage, 8),
    ('parent_linked'::onboarding_stage, 9),
    ('parent_link_skipped'::onboarding_stage, 9),
    ('parent_setup_complete'::onboarding_stage, 10),
    ('activated'::onboarding_stage, 11),
    ('steady_state'::onboarding_stage, 12)
),
required(stage, required_rank, ord) as (
  values
    ('signed_up'::onboarding_stage, 1, 1),
    ('consent_complete'::onboarding_stage, 2, 2),
    ('age_verified'::onboarding_stage, 3, 3),
    ('name_set'::onboarding_stage, 5, 4),
    ('identity_set'::onboarding_stage, 6, 5),
    ('reflection_complete'::onboarding_stage, 7, 6),
    ('activated'::onboarding_stage, 11, 7)
),
population as (
  select s.user_id, r.rank as current_rank
  from public.user_onboarding_state s
  join stage_rank r using (stage)
  where s.role = 'teen'
),
reach as (
  select
    req.stage,
    req.ord,
    count(*) filter (where p.current_rank >= req.required_rank) as users_reached
  from required req
  left join population p on true
  group by req.stage, req.ord
)
select
  ord,
  stage,
  users_reached,
  lag(users_reached) over (order by ord) as previous_reach,
  round(
    100.0 * users_reached
    / nullif(lag(users_reached) over (order by ord), 0),
    1
  ) as estimated_retention_pct
from reach
order by ord;


-- ── 3. ESTIMATED CUMULATIVE REACH — PARENT PATH ──────────────

with stage_rank(stage, rank) as (
  values
    ('signed_up'::onboarding_stage, 1),
    ('consent_complete'::onboarding_stage, 2),
    ('age_verified'::onboarding_stage, 3),
    ('role_selected'::onboarding_stage, 4),
    ('name_set'::onboarding_stage, 5),
    ('identity_set'::onboarding_stage, 6),
    ('reflection_complete'::onboarding_stage, 7),
    ('parent_link_sent'::onboarding_stage, 8),
    ('parent_linked'::onboarding_stage, 9),
    ('parent_link_skipped'::onboarding_stage, 9),
    ('parent_setup_complete'::onboarding_stage, 10),
    ('activated'::onboarding_stage, 11),
    ('steady_state'::onboarding_stage, 12)
),
required(stage, required_rank, ord) as (
  values
    ('signed_up'::onboarding_stage, 1, 1),
    ('consent_complete'::onboarding_stage, 2, 2),
    ('parent_setup_complete'::onboarding_stage, 10, 3),
    ('activated'::onboarding_stage, 11, 4)
),
population as (
  select s.user_id, r.rank as current_rank
  from public.user_onboarding_state s
  join stage_rank r using (stage)
  where s.role = 'parent'
),
reach as (
  select
    req.stage,
    req.ord,
    count(*) filter (where p.current_rank >= req.required_rank) as users_reached
  from required req
  left join population p on true
  group by req.stage, req.ord
)
select
  ord,
  stage,
  users_reached,
  lag(users_reached) over (order by ord) as previous_reach,
  round(
    100.0 * users_reached
    / nullif(lag(users_reached) over (order by ord), 0),
    1
  ) as estimated_retention_pct
from reach
order by ord;


-- ── 4. STORED TRANSITION TIMINGS ──────────────────────────────
-- `identity_to_activated_secs` is currently populated from
-- `created_at`; treat it as signup-to-activation until a dedicated
-- identity timestamp and forward migration correct the schema.

select
  'signup → consent' as transition,
  percentile_cont(0.5) within group (order by signup_to_consent_secs) as median_secs,
  percentile_cont(0.9) within group (order by signup_to_consent_secs) as p90_secs,
  count(*) filter (where signup_to_consent_secs is not null) as sample_n
from public.user_onboarding_state
union all
select
  'consent → age',
  percentile_cont(0.5) within group (order by consent_to_age_secs),
  percentile_cont(0.9) within group (order by consent_to_age_secs),
  count(*) filter (where consent_to_age_secs is not null)
from public.user_onboarding_state
union all
select
  'age → role',
  percentile_cont(0.5) within group (order by age_to_role_secs),
  percentile_cont(0.9) within group (order by age_to_role_secs),
  count(*) filter (where age_to_role_secs is not null)
from public.user_onboarding_state
union all
select
  'name → identity',
  percentile_cont(0.5) within group (order by name_to_identity_secs),
  percentile_cont(0.9) within group (order by name_to_identity_secs),
  count(*) filter (where name_to_identity_secs is not null)
from public.user_onboarding_state
union all
select
  'signup → activated (legacy column name)',
  percentile_cont(0.5) within group (order by identity_to_activated_secs),
  percentile_cont(0.9) within group (order by identity_to_activated_secs),
  count(*) filter (where identity_to_activated_secs is not null)
from public.user_onboarding_state
order by transition;


-- ── 5. ACTIVATION BREAKDOWN ───────────────────────────────────

select
  coalesce(activation_action, 'unknown') as activation_action,
  role,
  count(*) as activated_users,
  round(avg(identity_to_activated_secs) / 60.0, 1) as avg_signup_to_activation_mins,
  round(
    100.0 * count(*)
    / nullif(sum(count(*)) over (partition by role), 0),
    1
  ) as pct_of_role
from public.user_onboarding_state
where stage in ('activated', 'steady_state')
group by activation_action, role
order by role, activated_users desc;


-- ── 6. PARENT-LINK OUTCOME AVAILABILITY ───────────────────────
-- The current-stage column overwrites `parent_linked` or
-- `parent_link_skipped` after setup/activation. A historical link
-- rate cannot be reconstructed from this table. Use an approved,
-- privacy-reviewed event/outcome field or the canonical relationship
-- authority before publishing a rate.

select
  'unavailable_from_current_stage_snapshot'::text as metric_state,
  'parent_linked and parent_link_skipped are overwritten by later stages'::text as reason,
  null::numeric as parent_link_rate_pct;


-- ── 7. AGE-BUCKET DISTRIBUTION ────────────────────────────────

select
  coalesce(age_bucket, 'unknown') as age_bucket,
  count(*) as users,
  round(100.0 * count(*) / nullif(sum(count(*)) over (), 0), 1) as pct
from public.user_onboarding_state
where role = 'teen'
group by age_bucket
order by users desc;


-- ── 8. DAILY SIGNUPS + ACTIVATION RATE (LAST 30 DAYS) ────────

select
  date_trunc('day', created_at) at time zone 'America/New_York' as day,
  count(*) as signups,
  count(*) filter (where stage in ('activated', 'steady_state')) as activated,
  round(
    100.0
    * count(*) filter (where stage in ('activated', 'steady_state'))
    / nullif(count(*), 0),
    1
  ) as activation_rate_pct
from public.user_onboarding_state
where created_at >= now() - interval '30 days'
group by 1
order by 1 desc;


-- ── 9. PRIVACY-MINIMIZED STUCK-COHORT SUMMARY ────────────────
-- Default Control Room output is aggregate only. Any operational
-- re-engagement list containing identifiers requires a separate,
-- approved job with access control, retention, and audit evidence.

select
  stage,
  role,
  coalesce(age_bucket, 'unknown') as age_bucket,
  coalesce(device_platform, 'unknown') as device_platform,
  case
    when now() - created_at < interval '48 hours' then '24-48h'
    when now() - created_at < interval '7 days' then '2-7d'
    else '7d+'
  end as time_stuck_bucket,
  count(*) as users
from public.user_onboarding_state
where
  stage not in ('activated', 'steady_state')
  and created_at < now() - interval '24 hours'
group by
  stage,
  role,
  coalesce(age_bucket, 'unknown'),
  coalesce(device_platform, 'unknown'),
  case
    when now() - created_at < interval '48 hours' then '24-48h'
    when now() - created_at < interval '7 days' then '2-7d'
    else '7d+'
  end
order by users desc, stage;


-- ── 10. DATA-QUALITY / PLATFORM SUMMARY ───────────────────────

select
  coalesce(device_platform, 'unknown') as platform,
  count(*) as users,
  count(*) filter (where stage in ('activated', 'steady_state')) as activated,
  count(*) filter (where role = 'unknown') as unknown_role_rows,
  count(*) filter (where age_bucket is null and role = 'teen') as teen_missing_age_bucket
from public.user_onboarding_state
group by platform
order by users desc;

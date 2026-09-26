begin transaction read only;

-- Founder Control Room read-only witness for issue #502.
-- This probe intentionally fails if the expected onboarding or moods tables are
-- absent. It performs no DDL, DML, role changes, temporary writes, or function calls.

select
  current_database() as database_name,
  current_user as database_role,
  to_regclass('public.user_onboarding_state')::text as onboarding_table,
  to_regclass('public.moods')::text as moods_table;

select
  version,
  name,
  statements
from supabase_migrations.schema_migrations
where version in ('20260718000000', '20260718000001', '20260718040638')
order by version;

select
  e.enumsortorder,
  e.enumlabel
from pg_type t
join pg_enum e on e.enumtypid = t.oid
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public'
  and t.typname = 'onboarding_stage'
order by e.enumsortorder;

select
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'user_onboarding_state'
order by ordinal_position;

select
  con.conname as constraint_name,
  con.contype as constraint_type,
  pg_get_constraintdef(con.oid, true) as definition
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'user_onboarding_state'
order by con.conname;

select
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'user_onboarding_state'
order by policyname;

select
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'user_onboarding_state'
  and grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')
order by grantee, privilege_type;

select
  tg.tgname as trigger_name,
  tg.tgenabled as enabled,
  p.proname as function_name,
  p.prosecdef as security_definer,
  p.proconfig as function_config,
  p.proacl as function_acl,
  pg_get_triggerdef(tg.oid, true) as trigger_definition
from pg_trigger tg
join pg_class c on c.oid = tg.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = tg.tgfoid
where n.nspname = 'public'
  and c.relname in ('user_onboarding_state', 'moods')
  and not tg.tgisinternal
order by c.relname, tg.tgname;

with onboarding_table as (
  select c.oid
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'user_onboarding_state'
), onboarding_type as (
  select t.oid
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public'
    and t.typname = 'onboarding_stage'
)
select distinct
  d.classid::regclass::text as dependent_class,
  d.objid,
  d.objsubid,
  d.refclassid::regclass::text as referenced_class,
  d.refobjid,
  d.refobjsubid,
  d.deptype
from pg_depend d
where d.refobjid in (
  (select oid from onboarding_table),
  (select oid from onboarding_type)
)
order by dependent_class, d.objid, d.objsubid;

-- Aggregate-only row witnesses. No identifiers or row content are selected.
select
  count(*) as onboarding_rows,
  count(*) filter (where activated_at is not null) as activated_rows,
  count(*) filter (where activation_action is not null) as rows_with_activation_action
from public.user_onboarding_state;

select
  count(*) as mood_rows,
  count(distinct user_id) as mood_users,
  max(created_at) as latest_mood_created_at
from public.moods;

rollback;

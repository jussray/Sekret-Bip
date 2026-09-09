-- Se'kret Bip SECURITY DEFINER trigger catalog Phase 1
--
-- READ-ONLY. This probe does not create rows, fire triggers, call pg_net,
-- invoke Edge Functions, or mutate migration history. It records the live
-- Postgres catalog state needed before any behavioral trigger probe is run.
--
-- The repository baseline intentionally covers application-owned trigger
-- functions in public/auth and excludes Supabase-managed platform schemas.

with trigger_functions as (
  select
    p.oid,
    pn.nspname as function_schema,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as identity_arguments,
    p.prosecdef as security_definer,
    pg_get_userbyid(p.proowner) as owner,
    coalesce(p.proconfig, array[]::text[]) as function_config,
    coalesce(array_to_string(p.proacl, ','), '') as acl,
    md5(pg_get_functiondef(p.oid)) as function_definition_md5,
    exists (
      select 1
      from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
      where acl.privilege_type = 'EXECUTE'
        and acl.grantee = 0
    ) as public_execute,
    exists (
      select 1
      from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
      join pg_roles role on role.oid = acl.grantee
      where acl.privilege_type = 'EXECUTE'
        and role.rolname = 'anon'
    ) as anon_execute,
    exists (
      select 1
      from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
      join pg_roles role on role.oid = acl.grantee
      where acl.privilege_type = 'EXECUTE'
        and role.rolname = 'authenticated'
    ) as authenticated_execute
  from pg_proc p
  join pg_namespace pn on pn.oid = p.pronamespace
  where p.prorettype = 'pg_catalog.trigger'::regtype
    and pn.nspname = 'public'
),
attachments as (
  select
    t.tgfoid as function_oid,
    t.tgname as trigger_name,
    tn.nspname as table_schema,
    c.relname as table_name,
    pg_get_triggerdef(t.oid, true) as trigger_definition,
    md5(pg_get_triggerdef(t.oid, true)) as trigger_definition_md5
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace tn on tn.oid = c.relnamespace
  where not t.tgisinternal
)
select
  format(
    '%I.%I(%s)',
    function_schema,
    function_name,
    identity_arguments
  ) as function_signature,
  security_definer,
  owner,
  function_config,
  acl,
  public_execute,
  anon_execute,
  authenticated_execute,
  function_definition_md5,
  trigger_name,
  table_schema,
  table_name,
  trigger_definition,
  trigger_definition_md5,
  current_setting('server_version') as server_version
from trigger_functions tf
left join attachments a on a.function_oid = tf.oid
where tf.security_definer
order by function_signature, table_schema, table_name, trigger_name;

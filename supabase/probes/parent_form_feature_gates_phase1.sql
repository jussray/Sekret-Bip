-- Se'kret Bip parent form rollout authorization proof; ephemeral database only.
-- No auth users, teen data, or persisted records. Fail closed and roll back.
begin;

do $parent_forms$
declare
  actor text;
  permission text;
begin
  if to_regclass('public.parent_form_feature_gates') is null then
    raise exception 'parent_form_feature_gates migration missing';
  end if;

  if not (
    select count(*) = 2
    from public.parent_form_feature_gates
    where name in ('parent_registration', 'parent_private_forms')
      and enabled = false
  ) or (select count(*) from public.parent_form_feature_gates) <> 2 then
    raise exception 'parent-form flags must exist exactly twice and default disabled';
  end if;

  if not (
    select c.relrowsecurity
    from pg_class c
    where c.oid = 'public.parent_form_feature_gates'::regclass
  ) then
    raise exception 'parent form feature flags require RLS';
  end if;

  foreach actor in array array['anon', 'authenticated'] loop
    if not has_table_privilege(actor, 'public.parent_form_feature_gates', 'SELECT') then
      raise exception '% must be allowed to read rollout status', actor;
    end if;
    foreach permission in array array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'] loop
      if has_table_privilege(actor, 'public.parent_form_feature_gates', permission) then
        raise exception '% unexpectedly has % on rollout flags', actor, permission;
      end if;
    end loop;
  end loop;
end
$parent_forms$;

-- Exercise the actual RLS SELECT path as both client roles, not only catalog grants.
set local role anon;
do $anon_read$
begin
  if (select count(*) from public.parent_form_feature_gates) <> 2 then
    raise exception 'anon cannot see both public rollout booleans';
  end if;
end
$anon_read$;
reset role;

set local role authenticated;
do $authenticated_read$
begin
  if (select count(*) from public.parent_form_feature_gates) <> 2 then
    raise exception 'authenticated clients cannot see both public rollout booleans';
  end if;
end
$authenticated_read$;
reset role;

rollback;

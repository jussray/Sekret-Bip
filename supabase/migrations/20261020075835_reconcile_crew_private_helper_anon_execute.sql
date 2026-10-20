begin;

-- Reconcile a live Supabase grant drift detected on 2026-10-20.
-- A historical Crew migration already revoked anonymous EXECUTE, but production
-- had regained that grant. The private RLS helper is used by authenticated
-- Crew recipients and must remain executable by that role.
-- Source-only until applied through the production migration authority.

do $guard$
begin
  if to_regprocedure('private.crew_check_in_access_is_active(uuid,uuid,uuid)') is null then
    raise exception 'Crew helper missing; stop without changing grants';
  end if;
  if not has_function_privilege('authenticated', 'private.crew_check_in_access_is_active(uuid,uuid,uuid)', 'EXECUTE') then
    raise exception 'Authenticated Crew access is missing; stop without changing grants';
  end if;
end
$guard$;

revoke execute on function private.crew_check_in_access_is_active(uuid,uuid,uuid) from anon;

commit;

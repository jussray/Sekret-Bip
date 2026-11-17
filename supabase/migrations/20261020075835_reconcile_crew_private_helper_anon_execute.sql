begin;
-- The Crew policy helper is intentionally available to authenticated users
-- via RLS. No anonymous caller requires direct EXECUTE privilege.
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

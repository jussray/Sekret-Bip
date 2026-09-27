-- Lock Crew function search paths after all bodies use qualified table names.

begin;

alter function public.guard_crew_member_write()
  set search_path = pg_catalog, pg_temp;
alter function public.redeem_crew_invite(text, text)
  set search_path = pg_catalog, pg_temp;
alter function public.get_crew_connection_profiles(uuid[])
  set search_path = pg_catalog, pg_temp;
alter function public.create_crew_check_in(date, text, text, uuid[])
  set search_path = pg_catalog, pg_temp;
alter function public.cleanup_crew_relationship_access()
  set search_path = pg_catalog, pg_temp;
alter function public.set_crew_connection_status(uuid, text)
  set search_path = pg_catalog, pg_temp;

commit;

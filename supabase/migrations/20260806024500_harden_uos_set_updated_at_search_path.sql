begin;

-- This trigger function only stamps NEW.updated_at and must retain its existing
-- SECURITY INVOKER behavior, owner, grants, trigger attachment, and body.
-- Pin name resolution without rewriting the historical deployed migration.
alter function public.uos_set_updated_at()
  set search_path = pg_catalog, pg_temp;

commit;

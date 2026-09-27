begin;

-- Migration 20260726093000 may already be recorded as applied in deployed
-- environments. Harden the existing SECURITY DEFINER trigger function through a
-- new forward migration so every database receives the corrected search path.
alter function public.initialize_app_profile()
  set search_path = pg_catalog, pg_temp;

commit;

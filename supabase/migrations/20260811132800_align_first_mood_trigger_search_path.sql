-- Keep the reviewed trigger-function contract while preserving explicit table
-- qualification inside handle_first_mood_log(). PostgreSQL searches pg_catalog
-- implicitly before ordinary search_path entries, so the reviewed `public`
-- configuration remains the effective contract used by the structural baseline.
alter function public.handle_first_mood_log()
  set search_path = public;

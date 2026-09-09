-- Se'kret Bip — reconcile auto_resolve_issue_on_event_resolve() search_path
-- and client EXECUTE revoke
--
-- test/supabase-trigger-structure.test.mjs flagged that this SECURITY
-- DEFINER function has no `set search_path` and no client EXECUTE revoke
-- in the repository migration (20260701_control_room_normalization.sql),
-- unlike every sibling trigger function.
--
-- Verified live via read-only introspection:
-- - pg_get_functiondef() shows the function already has
--   `SET search_path TO 'public'` in production.
-- - information_schema.routine_privileges shows only postgres and
--   service_role hold EXECUTE — public, anon, and authenticated are
--   already revoked in production.
-- Both are migration-history parity gaps, not live security gaps — the
-- repo's copy of this function never captured fixes that were already
-- applied live. This migration is a no-op against production; it only
-- brings the repository into parity with what's already true.

alter function public.auto_resolve_issue_on_event_resolve() set search_path = public;

revoke all on function public.auto_resolve_issue_on_event_resolve() from public, anon, authenticated;

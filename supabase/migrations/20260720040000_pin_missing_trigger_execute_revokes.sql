-- Se'kret Bip — reconcile missing client EXECUTE revokes for three
-- SECURITY DEFINER trigger functions
--
-- test/supabase-trigger-structure.test.mjs walks the full migration corpus
-- and found that enforce_circle_anonymity(), handle_bip_event_points(), and
-- trigger_safety_scan() were never given a `revoke ... from public, anon,
-- authenticated` statement anywhere in migration history, unlike every
-- other reviewed trigger function in security/supabase-trigger-baseline.json.
--
-- Verified live via read-only information_schema.routine_privileges: all
-- three already have EXECUTE held only by postgres and service_role in
-- production — public, anon, and authenticated are already revoked live.
-- This is a migration-history parity gap, not a live security gap. This
-- migration is a no-op against production; it only brings the repository
-- into parity with what's already true.

revoke all on function public.enforce_circle_anonymity() from public, anon, authenticated;
revoke all on function public.handle_bip_event_points() from public, anon, authenticated;
revoke all on function public.trigger_safety_scan() from public, anon, authenticated;

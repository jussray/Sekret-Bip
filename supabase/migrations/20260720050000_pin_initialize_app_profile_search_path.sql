-- Se'kret Bip — reconcile initialize_app_profile() search_path
--
-- test/supabase-trigger-structure.test.mjs flagged that this SECURITY
-- DEFINER function's repository migration
-- (20260711190000_account_profile_source_of_truth.sql) pins
-- `search_path = public, auth`, but security/supabase-trigger-baseline.json
-- records the reviewed live value as `pg_catalog, pg_temp`.
--
-- Verified live via read-only pg_get_functiondef(): the function already
-- has `SET search_path TO 'pg_catalog', 'pg_temp'` in production, with an
-- identical function body to the repository's copy. This is a
-- migration-history parity gap, not a live security gap — the repo's copy
-- of this function never captured a search_path hardening that was already
-- applied live. This migration is a no-op against production; it only
-- brings the repository into parity with what's already true.

alter function public.initialize_app_profile() set search_path = pg_catalog, pg_temp;

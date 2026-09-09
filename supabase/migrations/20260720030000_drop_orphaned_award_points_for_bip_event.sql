-- Se'kret Bip — drop orphaned award_points_for_bip_event()
--
-- 20260704_sync_points_chores_rewards.sql created this function and wired
-- bip_events_award_points to it, but 20260713052511_restore_bip_events_
-- points_trigger.sql (a later migration) unconditionally reverted that
-- trigger back to handle_bip_event_points() — and
-- test/supabase-live-migration-parity.test.mjs already asserts the trigger
-- must NOT reference award_points_for_bip_event, confirming the reversion
-- was intentional.
--
-- The function itself was never dropped, so it sits unused: no trigger
-- points to it (confirmed by replaying the full migration corpus), it
-- doesn't exist live (verified via read-only pg_proc query — the 20260704
-- migration's function-creation was never applied to production), and
-- nothing in the app references it. Safe to drop.

drop function if exists public.award_points_for_bip_event();

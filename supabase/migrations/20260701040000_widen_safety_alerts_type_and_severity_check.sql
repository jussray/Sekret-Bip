-- Pre-existing mismatch: the safety-scan Edge Function writes
-- alert_type in ('moderation','keyword') and severity can be 'low', but
-- the CHECK constraints only allowed the original crisis-detection
-- vocabulary. Every safety_alerts insert from the Edge Function has been
-- failing its CHECK constraint since deployment. Widening to match what's
-- actually written, rather than narrowing the function - the function's
-- vocabulary reflects the real two-layer (keyword + OpenAI moderation)
-- scan design already in place.
--
-- NOTE: this does NOT fix the deeper issue found afterward - the Edge
-- Function's insert also references columns (user_id, source_table,
-- source_id) that don't exist on the live safety_alerts table at all
-- (real columns: teen_user_id, parent_user_id, source_mood_id,
-- source_post_id, title, summary, is_read). See plan doc
-- docs/circle-v2-migration-plan.md §10.3 - that's a separate, larger,
-- out-of-scope problem, intentionally not touched here.
--
-- Applied to tbsevonvegdnlyjgplmm via apply_migration on 2026-07-01;
-- this file brings the repo migration history in line with that.

alter table public.safety_alerts
  drop constraint if exists safety_alerts_alert_type_check;
alter table public.safety_alerts
  add constraint safety_alerts_alert_type_check
  check (alert_type in (
    'critical_mood','self_harm_keyword','panic_pattern','manual_sos',
    'moderation','keyword'
  ));

alter table public.safety_alerts
  drop constraint if exists safety_alerts_severity_check;
alter table public.safety_alerts
  add constraint safety_alerts_severity_check
  check (severity in ('low','medium','high','critical'));

-- 20260627_parent_teen_snapshot_view.sql
-- Creates a parent-safe view over teen_activity_summary.
-- Exposes only the three non-sensitive columns; timestamps never reach the parent side.
-- fetchTeenActivitySummary in src/utils/sync.ts reads from this view.

CREATE OR REPLACE VIEW public.parent_teen_activity_snapshot AS
SELECT
  tas.user_id,
  tas.streak_days,
  tas.session_count,
  tas.points_tier
FROM public.teen_activity_summary tas;

-- Grant read access to authenticated users (RLS on the underlying table still applies).
GRANT SELECT ON public.parent_teen_activity_snapshot TO authenticated;

-- Comment so intent is clear in Supabase Studio.
COMMENT ON VIEW public.parent_teen_activity_snapshot IS
  'Parent-readable snapshot of teen activity. Intentionally omits last_active_at and updated_at so no timestamp metadata is exposed to the parent side.';

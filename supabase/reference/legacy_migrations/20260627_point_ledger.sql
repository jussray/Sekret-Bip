-- point_transactions: real rewards ledger
--
-- Each row is one awarded point transaction, tied to the ActivityEvent
-- that caused it. Replaces the bip_points snapshot approach for live totals.
--
-- Downstream: usePoints() hook queries SUM(points) + COUNT(*) per event_type
-- to build the same breakdown currently calculated at render time in PointsScreen.
--
-- Privacy: no user content stored here — only event_type + point value.
-- RLS: teen owns their rows exclusively. Parents read aggregated tier data
-- from teen_activity_summary, not this table.

CREATE TABLE IF NOT EXISTS public.point_transactions (
  id           bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type   text        NOT NULL,
  points       integer     NOT NULL,
  occurred_at  timestamptz NOT NULL DEFAULT now(),
  bip_event_id bigint      REFERENCES public.bip_events(id) ON DELETE SET NULL
);

ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "point_transactions: teen all"
  ON public.point_transactions FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fast total computation
CREATE INDEX IF NOT EXISTS idx_point_tx_user
  ON public.point_transactions (user_id);

-- Fast per-type breakdown
CREATE INDEX IF NOT EXISTS idx_point_tx_user_type
  ON public.point_transactions (user_id, event_type);

COMMENT ON TABLE public.point_transactions IS
  'Append-only point ledger. One row per awarded event. '
  'No PII — stores only event_type, points, timestamp.';

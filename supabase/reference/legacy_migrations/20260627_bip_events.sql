-- bip_events: canonical activity event ledger
--
-- Every meaningful user action appends a row here.
-- Downstream systems (point ledger, companion engine, safety, history)
-- read from this table rather than scanning individual feature tables.
--
-- Privacy rules:
--   - meta column never stores PII, journal text, voice audio, or raw mood strings
--     beyond what's shown in the ActivityEventMeta type in events.ts
--   - Parents cannot read this table; they get aggregated summaries only
--     (teen_activity_summary / parent_teen_activity_snapshot)
--   - RLS: teen owns their rows exclusively

CREATE TABLE IF NOT EXISTS public.bip_events (
  id          bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type  text        NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  meta        jsonb       NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.bip_events ENABLE ROW LEVEL SECURITY;

-- Teen can insert and read their own events
CREATE POLICY "bip_events: teen all"
  ON public.bip_events FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fast lookups by user + time window (used by point ledger, history, safety)
CREATE INDEX IF NOT EXISTS idx_bip_events_user_time
  ON public.bip_events (user_id, occurred_at DESC);

-- Fast filter by event type (used by companion engine, safety coordinator)
CREATE INDEX IF NOT EXISTS idx_bip_events_user_type
  ON public.bip_events (user_id, event_type);

COMMENT ON TABLE public.bip_events IS
  'Append-only activity event ledger. One row per meaningful user action. '
  'Meta is intentionally minimal — no PII, no raw content.';

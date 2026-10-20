-- 20260621_parent_notes_realtime.sql
-- Se'kret Bip — Bridge: parent_notes table + Realtime on Bridge
--
-- parent_notes: parent-originated warm messages delivered to the teen's
-- Bridge screen. Content is parent-chosen (not teen's private diary), so
-- storing it server-side is consistent with the local-first privacy design.
--
-- bridge_signals already has RLS for linked parents (see 20260618).
-- This migration adds parent_notes and enables Realtime on both tables.
--
-- Also adds parent_links.status if the live table is missing it
-- (older deployments created parent_links without that column).

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Back-fill parent_links.status if missing
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.parent_links
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. parent_notes
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.parent_notes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_user_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content         text        NOT NULL,
  sent_at         timestamptz NOT NULL DEFAULT now(),
  seen_by_teen    boolean     NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS parent_notes_teen_user_id_idx
  ON public.parent_notes (teen_user_id);

CREATE INDEX IF NOT EXISTS parent_notes_parent_user_id_idx
  ON public.parent_notes (parent_user_id);

ALTER TABLE public.parent_notes ENABLE ROW LEVEL SECURITY;

-- Parent may insert notes to their linked teen only.
DROP POLICY IF EXISTS "parent_notes: parent insert" ON public.parent_notes;
CREATE POLICY "parent_notes: parent insert"
  ON public.parent_notes FOR INSERT
  WITH CHECK (
    auth.uid() = parent_user_id
    AND EXISTS (
      SELECT 1 FROM public.parent_links pl
      WHERE pl.parent_user_id = auth.uid()
        AND pl.teen_user_id   = parent_notes.teen_user_id
        AND pl.status         = 'active'
    )
  );

-- Parent may read their own sent notes.
DROP POLICY IF EXISTS "parent_notes: parent read" ON public.parent_notes;
CREATE POLICY "parent_notes: parent read"
  ON public.parent_notes FOR SELECT
  USING (auth.uid() = parent_user_id);

-- Teen may read notes addressed to them.
DROP POLICY IF EXISTS "parent_notes: teen read" ON public.parent_notes;
CREATE POLICY "parent_notes: teen read"
  ON public.parent_notes FOR SELECT
  USING (auth.uid() = teen_user_id);

-- Teen may mark notes as seen.
DROP POLICY IF EXISTS "parent_notes: teen mark seen" ON public.parent_notes;
CREATE POLICY "parent_notes: teen mark seen"
  ON public.parent_notes FOR UPDATE
  USING (auth.uid() = teen_user_id)
  WITH CHECK (auth.uid() = teen_user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Enable Realtime (safe — skips if already in publication)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- bridge_signals: only add if the table exists AND is not already in the publication.
  -- (The table is created by 20260618_bridge_oracle_tables.sql — that migration may
  --  not have run yet on older deployments, so we guard on table existence first.)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bridge_signals'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'bridge_signals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bridge_signals;
  END IF;

  -- parent_notes: always exists by this point (created above).
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'parent_notes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.parent_notes;
  END IF;
END $$;

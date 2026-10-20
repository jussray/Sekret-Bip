-- 20260628_consent_visibility.sql
-- Se'kret Bip — Consent / Visibility Layer  (Phase 2D)
--
-- Adds an item-level visibility field to the two tables where teens are
-- most likely to explicitly share with a parent: journal_entries and
-- mood_history.  All existing rows default to 'private' — no data exposure.
--
-- Visibility levels (mirrors types/privacy.ts TeenShareVisibility):
--   'private'            — only the teen and Se'kret AI
--   'shared_with_parent' — teen explicitly shared; linked parent may read
--   'crew'               — crew members (reserved; not enforced yet)
--   'circle'             — Se'kret Circle (reserved; circle_posts is separate)
--
-- Parent-read policy pattern is identical to bridge_signals (20260618):
-- a linked parent can SELECT rows where visibility = 'shared_with_parent'
-- and parent_links.status = 'active'.  No content is pushed to parents
-- without an explicit teen decision.
--
-- RLS additions are purely additive — existing owner-all policies are unchanged.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. journal_entries — add visibility column
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private';

DO $$
BEGIN
  ALTER TABLE public.journal_entries
    ADD CONSTRAINT journal_entries_visibility_check
    CHECK (visibility IN ('private', 'shared_with_parent', 'crew', 'circle'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Parent-read: linked parent may read entries the teen explicitly shared.
DROP POLICY IF EXISTS "journal_entries: linked_parent_read_shared" ON public.journal_entries;
CREATE POLICY "journal_entries: linked_parent_read_shared"
  ON public.journal_entries FOR SELECT
  USING (
    visibility = 'shared_with_parent'
    AND EXISTS (
      SELECT 1
      FROM   public.parent_links pl
      WHERE  pl.teen_user_id   = journal_entries.user_id
        AND  pl.parent_user_id = auth.uid()
        AND  pl.status         = 'active'
    )
  );

-- Fast lookup for "what did my teen share?" query on parent side.
CREATE INDEX IF NOT EXISTS idx_journal_visibility
  ON public.journal_entries (user_id, visibility)
  WHERE visibility != 'private';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. mood_history — add visibility column
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.mood_history
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private';

DO $$
BEGIN
  ALTER TABLE public.mood_history
    ADD CONSTRAINT mood_history_visibility_check
    CHECK (visibility IN ('private', 'shared_with_parent', 'crew', 'circle'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Parent-read: linked parent may read mood check-ins the teen explicitly shared.
DROP POLICY IF EXISTS "mood_history: linked_parent_read_shared" ON public.mood_history;
CREATE POLICY "mood_history: linked_parent_read_shared"
  ON public.mood_history FOR SELECT
  USING (
    visibility = 'shared_with_parent'
    AND EXISTS (
      SELECT 1
      FROM   public.parent_links pl
      WHERE  pl.teen_user_id   = mood_history.user_id
        AND  pl.parent_user_id = auth.uid()
        AND  pl.status         = 'active'
    )
  );

CREATE INDEX IF NOT EXISTS idx_mood_visibility
  ON public.mood_history (user_id, visibility)
  WHERE visibility != 'private';

-- ─────────────────────────────────────────────────────────────────────────────
-- Notes
-- ─────────────────────────────────────────────────────────────────────────────
-- voice_notes, comfort_sessions, crew_check_ins remain owner-only; sharing
-- those requires a future explicit teen decision surface per item type.
--
-- circle_posts have their own audience model (circle_tag) and are not included
-- here — circle is a separate sharing context.
--
-- The 'crew' and 'circle' values are reserved in the CHECK constraint so the
-- client type system can reference them before enforcement is added.

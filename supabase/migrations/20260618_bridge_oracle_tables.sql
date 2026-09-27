-- 20260618_bridge_oracle_tables.sql
-- Se'kret Bip — P6–P8 tables
--   • parent_links     — prerequisite for linked-parent bridge policies
--   • bridge_signals   — teen-to-parent metadata signal (NO message content)
--   • oracle_records   — upsert snapshot of a user's full OracleRecord per mode
--   • oracle_sessions  — companion-memory + append-only per-session log
--
-- Some production databases already received parent_links and oracle_sessions
-- through remote migration history. Fresh databases replay this repository in
-- filename order, so this migration must establish those base tables before any
-- policy or ALTER TABLE statement references them. All DDL below is idempotent.

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. prerequisite base tables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.parent_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  teen_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  linked_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.oracle_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  personality_id text NOT NULL,
  memory jsonb NOT NULL DEFAULT '{}',
  session_count integer NOT NULL DEFAULT 0,
  last_synced timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, personality_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. bridge_signals
--    Teen-side send creates one row per Bridge tap. Message text is NEVER
--    stored; only share_type / conv_mode / char_key metadata is persisted so
--    the parent-side can surface a gentle nudge.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.bridge_signals (
  id            bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  teen_user_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  char_key      text        NOT NULL CHECK (char_key IN ('raylene', 'rylane')),
  share_type    text        NOT NULL,
  conv_mode     text,
  sent_at       timestamptz NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bridge_signals_teen_user_id_idx
  ON public.bridge_signals (teen_user_id);

ALTER TABLE public.bridge_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bridge_signals: teen insert" ON public.bridge_signals;
CREATE POLICY "bridge_signals: teen insert"
  ON public.bridge_signals FOR INSERT
  WITH CHECK (auth.uid() = teen_user_id);

DROP POLICY IF EXISTS "bridge_signals: teen read" ON public.bridge_signals;
CREATE POLICY "bridge_signals: teen read"
  ON public.bridge_signals FOR SELECT
  USING (auth.uid() = teen_user_id);

DROP POLICY IF EXISTS "bridge_signals: linked parent read" ON public.bridge_signals;
CREATE POLICY "bridge_signals: linked parent read"
  ON public.bridge_signals FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.parent_links pl
      WHERE pl.teen_user_id = bridge_signals.teen_user_id
        AND pl.parent_user_id = auth.uid()
        AND pl.status = 'active'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. oracle_records
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.oracle_records (
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode              text        NOT NULL CHECK (mode IN ('teen', 'parent')),
  session_count     integer     NOT NULL DEFAULT 0,
  total_turns       integer     NOT NULL DEFAULT 0,
  last_session      timestamptz,
  dimension_summary jsonb       NOT NULL DEFAULT '{}',
  profile_snapshot  text        NOT NULL DEFAULT '',
  updated_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, mode)
);

ALTER TABLE public.oracle_records ENABLE ROW LEVEL SECURITY;

-- Production retained both policies. The later canonical June 29 hardening
-- migrations alter both by name, so fresh replay must reconstruct both here.
DROP POLICY IF EXISTS "Enable users to view their own data only" ON public.oracle_records;
CREATE POLICY "Enable users to view their own data only"
  ON public.oracle_records FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "oracle_records: owner all" ON public.oracle_records;
CREATE POLICY "oracle_records: owner all"
  ON public.oracle_records FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. oracle_sessions
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.oracle_sessions
  ADD COLUMN IF NOT EXISTS mode              text,
  ADD COLUMN IF NOT EXISTS session_index     integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_turns       integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS question_ids      text[]      NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dimension_summary jsonb       NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS profile_snapshot  text        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS completed_at      timestamptz;

CREATE INDEX IF NOT EXISTS oracle_sessions_user_id_idx
  ON public.oracle_sessions (user_id);

CREATE INDEX IF NOT EXISTS oracle_sessions_user_mode_idx
  ON public.oracle_sessions (user_id, mode);

ALTER TABLE public.oracle_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "oracle_sessions: owner read" ON public.oracle_sessions;
DROP POLICY IF EXISTS "oracle_sessions: owner insert" ON public.oracle_sessions;
DROP POLICY IF EXISTS "oracle_sessions: owner update" ON public.oracle_sessions;
DROP POLICY IF EXISTS "oracle_sessions: owner delete" ON public.oracle_sessions;

CREATE POLICY "oracle_sessions: owner read"
  ON public.oracle_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "oracle_sessions: owner insert"
  ON public.oracle_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "oracle_sessions: owner update"
  ON public.oracle_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "oracle_sessions: owner delete"
  ON public.oracle_sessions FOR DELETE
  USING (auth.uid() = user_id);

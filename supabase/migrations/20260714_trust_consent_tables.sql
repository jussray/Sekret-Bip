-- Trust-02: Consent tracking tables
-- Run in Supabase SQL editor or via supabase db push

-- ============================================================
-- user_consents: current consent state per user per category
-- ============================================================
CREATE TABLE IF NOT EXISTS user_consents (
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category   text        NOT NULL,
  granted    boolean     NOT NULL DEFAULT false,
  timestamp  timestamptz NOT NULL DEFAULT now(),
  version    text        NOT NULL DEFAULT '1.0.0',
  PRIMARY KEY (user_id, category)
);

ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own consents"
  ON user_consents
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE user_consents IS
  'Current consent state per user per category. Upserted on every grant/revoke.';

-- ============================================================
-- consent_audit_log: immutable history of all consent changes
-- ============================================================
CREATE TABLE IF NOT EXISTS consent_audit_log (
  id         bigserial   PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category   text        NOT NULL,
  action     text        NOT NULL CHECK (action IN ('grant', 'revoke')),
  granted    boolean     NOT NULL,
  timestamp  timestamptz NOT NULL DEFAULT now(),
  version    text        NOT NULL DEFAULT '1.0.0'
);

ALTER TABLE consent_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can read their own audit log (for data export)
CREATE POLICY "Users read own audit log"
  ON consent_audit_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Inserts come from server/service role only (no client insert policy)
COMMENT ON TABLE consent_audit_log IS
  'Immutable audit trail of all consent actions. Retention: 7 years (legal). '
  'Inserts via service role key only.';

-- ============================================================
-- Index for fast user lookups
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id
  ON user_consents(user_id);

CREATE INDEX IF NOT EXISTS idx_consent_audit_log_user_id
  ON consent_audit_log(user_id);

CREATE INDEX IF NOT EXISTS idx_consent_audit_log_timestamp
  ON consent_audit_log(timestamp DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 20260724_compliance_foundation.sql
--
-- COPPA / HIPAA-equivalent / AB 2089 / BIPA compliance foundation.
-- Adds:
--   • user_profiles  — stores DOB, account_type, consent timestamps, deletion flag
--   • consent_log    — append-only audit trail (COPPA requires demonstrable consent)
--   • request_account_deletion() RPC — marks user for deletion & logs the event
--   • has_given_consent()         RPC — check helper used by edge functions
-- ─────────────────────────────────────────────────────────────────────────────

-- ── user_profiles ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_profiles (
  id                              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  date_of_birth                   date,
  account_type                    text CHECK (account_type IN ('teen', 'parent', 'unset')) DEFAULT 'unset',

  -- Terms & Privacy consent (versioned so we can re-prompt on updates)
  terms_accepted_at               timestamptz,
  terms_version                   text,
  privacy_accepted_at             timestamptz,
  privacy_version                 text,

  -- Voice biometric consent (required: Illinois BIPA, Texas CUBI, Washington WFIPA)
  voice_biometric_consent         boolean NOT NULL DEFAULT false,
  voice_biometric_consented_at    timestamptz,

  -- COPPA: under-13 requires verifiable parental consent
  coppa_parent_consent_given      boolean NOT NULL DEFAULT false,
  coppa_parent_consent_given_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  coppa_parent_consent_given_at   timestamptz,

  -- Account deletion request (two-phase: requested → completed by background job)
  data_deletion_requested_at      timestamptz,
  data_deletion_completed_at      timestamptz,

  -- Data export request (GDPR/CCPA portability)
  data_export_requested_at        timestamptz,
  data_export_completed_at        timestamptz,

  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now()
);

-- Only the owning user can read or update their profile
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_select_own"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profile_insert_own"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profile_update_own"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION touch_user_profile_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION touch_user_profile_updated_at();


-- ── consent_log ──────────────────────────────────────────────────────────────
-- Append-only audit trail. COPPA requires documented, verifiable consent records.
-- NO UPDATE or DELETE policies are granted — records are permanent.

CREATE TABLE IF NOT EXISTS consent_log (
  id               bigserial PRIMARY KEY,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Consent types:
  --   'terms'                 — Terms of Service acceptance
  --   'privacy'               — Privacy Policy acceptance
  --   'voice_biometric'       — Biometric voice data consent (BIPA / CUBI / WFIPA)
  --   'coppa_parent'          — Parent giving consent for child under 13
  --   'data_deletion_request' — User requesting account/data deletion
  --   'data_export_request'   — User requesting data portability export
  consent_type     text NOT NULL,
  consent_version  text,                    -- e.g. "tos-v1.2", "pp-v2.0"

  given            boolean NOT NULL,        -- true = granted, false = withdrawn
  given_at         timestamptz NOT NULL DEFAULT now(),
  given_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,  -- parent's user_id for COPPA grants

  platform         text,                    -- 'ios' | 'android' | 'web'
  app_version      text,
  metadata         jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE consent_log ENABLE ROW LEVEL SECURITY;

-- Users can read their own consent history
CREATE POLICY "consent_log_select_own"
  ON consent_log FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own consent events (client-side)
CREATE POLICY "consent_log_insert_own"
  ON consent_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE or DELETE — append-only by policy


-- ── RPC: request_account_deletion ────────────────────────────────────────────
-- Call from client to mark the account for deletion.
-- A background job (Supabase Edge Function or cron) reads
-- data_deletion_requested_at and hard-deletes auth.users rows after a
-- 30-day cooling-off window. ON DELETE CASCADE handles the data purge.

CREATE OR REPLACE FUNCTION request_account_deletion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- Upsert profile row if it doesn't exist yet, then set deletion flag
  INSERT INTO user_profiles (id, data_deletion_requested_at)
  VALUES (auth.uid(), now())
  ON CONFLICT (id) DO UPDATE
    SET data_deletion_requested_at = COALESCE(
          user_profiles.data_deletion_requested_at, -- keep first request date
          now()
        ),
        updated_at = now();

  -- Append-only audit record
  INSERT INTO consent_log (user_id, consent_type, given, metadata)
  VALUES (
    auth.uid(),
    'data_deletion_request',
    true,
    jsonb_build_object('requested_at', now())
  );
END;
$$;

-- Only authenticated users may call this for themselves (SECURITY DEFINER already enforces uid)
REVOKE ALL ON FUNCTION request_account_deletion() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION request_account_deletion() TO authenticated;


-- ── RPC: request_data_export ─────────────────────────────────────────────────
-- Marks the account for a data export (GDPR/CCPA portability right).

CREATE OR REPLACE FUNCTION request_data_export()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO user_profiles (id, data_export_requested_at)
  VALUES (auth.uid(), now())
  ON CONFLICT (id) DO UPDATE
    SET data_export_requested_at = COALESCE(
          user_profiles.data_export_requested_at,
          now()
        ),
        updated_at = now();

  INSERT INTO consent_log (user_id, consent_type, given, metadata)
  VALUES (
    auth.uid(),
    'data_export_request',
    true,
    jsonb_build_object('requested_at', now())
  );
END;
$$;

REVOKE ALL ON FUNCTION request_data_export() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION request_data_export() TO authenticated;


-- ── RPC: has_given_consent ───────────────────────────────────────────────────
-- Check helper — used by edge functions to gate content delivery.

CREATE OR REPLACE FUNCTION has_given_consent(p_consent_type text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM consent_log
    WHERE user_id     = auth.uid()
      AND consent_type = p_consent_type
      AND given        = true
  );
$$;

REVOKE ALL ON FUNCTION has_given_consent(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION has_given_consent(text) TO authenticated;


-- ── Upsert profile helper (used by consent screen) ───────────────────────────
-- Records a full first-time consent event atomically.

CREATE OR REPLACE FUNCTION record_initial_consent(
  p_date_of_birth    date,
  p_account_type     text,
  p_terms_version    text,
  p_privacy_version  text,
  p_voice_consent    boolean,
  p_platform         text DEFAULT NULL,
  p_app_version      text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_now timestamptz := now();
BEGIN
  -- Upsert profile
  INSERT INTO user_profiles (
    id, date_of_birth, account_type,
    terms_accepted_at, terms_version,
    privacy_accepted_at, privacy_version,
    voice_biometric_consent, voice_biometric_consented_at
  )
  VALUES (
    auth.uid(), p_date_of_birth, p_account_type,
    v_now, p_terms_version,
    v_now, p_privacy_version,
    p_voice_consent, CASE WHEN p_voice_consent THEN v_now ELSE NULL END
  )
  ON CONFLICT (id) DO UPDATE SET
    date_of_birth              = EXCLUDED.date_of_birth,
    account_type               = EXCLUDED.account_type,
    terms_accepted_at          = COALESCE(user_profiles.terms_accepted_at, EXCLUDED.terms_accepted_at),
    terms_version              = EXCLUDED.terms_version,
    privacy_accepted_at        = COALESCE(user_profiles.privacy_accepted_at, EXCLUDED.privacy_accepted_at),
    privacy_version            = EXCLUDED.privacy_version,
    voice_biometric_consent    = EXCLUDED.voice_biometric_consent,
    voice_biometric_consented_at = CASE
      WHEN EXCLUDED.voice_biometric_consent THEN COALESCE(user_profiles.voice_biometric_consented_at, v_now)
      ELSE NULL
    END,
    updated_at                 = v_now;

  -- Log terms consent
  INSERT INTO consent_log (user_id, consent_type, consent_version, given, given_at, platform, app_version)
  VALUES (auth.uid(), 'terms', p_terms_version, true, v_now, p_platform, p_app_version);

  -- Log privacy consent
  INSERT INTO consent_log (user_id, consent_type, consent_version, given, given_at, platform, app_version)
  VALUES (auth.uid(), 'privacy', p_privacy_version, true, v_now, p_platform, p_app_version);

  -- Log voice biometric consent
  IF p_voice_consent THEN
    INSERT INTO consent_log (user_id, consent_type, given, given_at, platform, app_version)
    VALUES (auth.uid(), 'voice_biometric', true, v_now, p_platform, p_app_version);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION record_initial_consent(date, text, text, text, boolean, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_initial_consent(date, text, text, text, boolean, text, text) TO authenticated;

-- RECOVERED PRODUCTION HISTORY
-- Exact SQL recorded in canonical Supabase migration 20261004215523 (compliance_foundation).
-- This file preserves immutable history only. A later guarded corrective migration removes
-- the non-canonical duplicate compliance path after zero-row verification.

-- ── user_profiles ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_profiles (
  id                              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  date_of_birth                   date,
  account_type                    text CHECK (account_type IN ('teen', 'parent', 'unset')) DEFAULT 'unset',

  terms_accepted_at               timestamptz,
  terms_version                   text,
  privacy_accepted_at             timestamptz,
  privacy_version                 text,

  voice_biometric_consent         boolean NOT NULL DEFAULT false,
  voice_biometric_consented_at    timestamptz,

  coppa_parent_consent_given      boolean NOT NULL DEFAULT false,
  coppa_parent_consent_given_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  coppa_parent_consent_given_at   timestamptz,

  data_deletion_requested_at      timestamptz,
  data_deletion_completed_at      timestamptz,

  data_export_requested_at        timestamptz,
  data_export_completed_at        timestamptz,

  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS consent_log (
  id               bigserial PRIMARY KEY,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type     text NOT NULL,
  consent_version  text,
  given            boolean NOT NULL,
  given_at         timestamptz NOT NULL DEFAULT now(),
  given_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  platform         text,
  app_version      text,
  metadata         jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE consent_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consent_log_select_own"
  ON consent_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "consent_log_insert_own"
  ON consent_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ── RPC: request_account_deletion ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION request_account_deletion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO user_profiles (id, data_deletion_requested_at)
  VALUES (auth.uid(), now())
  ON CONFLICT (id) DO UPDATE
    SET data_deletion_requested_at = COALESCE(
          user_profiles.data_deletion_requested_at,
          now()
        ),
        updated_at = now();

  INSERT INTO consent_log (user_id, consent_type, given, metadata)
  VALUES (
    auth.uid(),
    'data_deletion_request',
    true,
    jsonb_build_object('requested_at', now())
  );
END;
$$;

REVOKE ALL ON FUNCTION request_account_deletion() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION request_account_deletion() TO authenticated;


-- ── RPC: request_data_export ─────────────────────────────────────────────────

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


-- ── RPC: record_initial_consent ──────────────────────────────────────────────

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

  INSERT INTO consent_log (user_id, consent_type, consent_version, given, given_at, platform, app_version)
  VALUES (auth.uid(), 'terms', p_terms_version, true, v_now, p_platform, p_app_version);

  INSERT INTO consent_log (user_id, consent_type, consent_version, given, given_at, platform, app_version)
  VALUES (auth.uid(), 'privacy', p_privacy_version, true, v_now, p_platform, p_app_version);

  IF p_voice_consent THEN
    INSERT INTO consent_log (user_id, consent_type, given, given_at, platform, app_version)
    VALUES (auth.uid(), 'voice_biometric', true, v_now, p_platform, p_app_version);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION record_initial_consent(date, text, text, text, boolean, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_initial_consent(date, text, text, text, boolean, text, text) TO authenticated;

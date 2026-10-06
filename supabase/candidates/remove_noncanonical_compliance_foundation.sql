-- Guarded correction for accidental production migration 20261004215523_compliance_foundation.
-- Fail closed if either stray table contains data. Do not use CASCADE: unexpected dependencies
-- are a stop condition and must be reviewed rather than silently removed.

DO $$
DECLARE
  v_user_profiles_rows bigint := 0;
  v_consent_log_rows bigint := 0;
BEGIN
  IF to_regclass('public.user_profiles') IS NOT NULL THEN
    EXECUTE 'select count(*) from public.user_profiles' INTO v_user_profiles_rows;
  END IF;

  IF to_regclass('public.consent_log') IS NOT NULL THEN
    EXECUTE 'select count(*) from public.consent_log' INTO v_consent_log_rows;
  END IF;

  IF v_user_profiles_rows <> 0 OR v_consent_log_rows <> 0 THEN
    RAISE EXCEPTION
      'Refusing compliance-foundation cleanup: user_profiles rows=%, consent_log rows=%',
      v_user_profiles_rows,
      v_consent_log_rows;
  END IF;
END
$$;

DROP FUNCTION IF EXISTS public.request_account_deletion();
DROP FUNCTION IF EXISTS public.request_data_export();
DROP FUNCTION IF EXISTS public.has_given_consent(text);
DROP FUNCTION IF EXISTS public.record_initial_consent(date, text, text, text, boolean, text, text);

DO $$
BEGIN
  IF to_regclass('public.user_profiles') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS user_profiles_updated_at ON public.user_profiles;
  END IF;
END
$$;

DROP FUNCTION IF EXISTS public.touch_user_profile_updated_at();
DROP TABLE IF EXISTS public.consent_log;
DROP TABLE IF EXISTS public.user_profiles;

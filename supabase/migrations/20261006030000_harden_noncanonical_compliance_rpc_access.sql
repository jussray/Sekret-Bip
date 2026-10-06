-- Non-destructive containment for the non-canonical compliance path introduced
-- by 20261004215523_compliance_foundation.
--
-- Supabase's public-schema default function ACL grants EXECUTE to anon and
-- authenticated explicitly. The original migration revoked PUBLIC but did not
-- remove those explicit grants. This migration removes client execution while
-- preserving the objects and any future forensic/cleanup decision.

REVOKE ALL ON FUNCTION public.request_account_deletion() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_account_deletion() FROM anon;
REVOKE ALL ON FUNCTION public.request_account_deletion() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO service_role;

REVOKE ALL ON FUNCTION public.request_data_export() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_data_export() FROM anon;
REVOKE ALL ON FUNCTION public.request_data_export() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.request_data_export() TO service_role;

REVOKE ALL ON FUNCTION public.has_given_consent(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_given_consent(text) FROM anon;
REVOKE ALL ON FUNCTION public.has_given_consent(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.has_given_consent(text) TO service_role;

REVOKE ALL ON FUNCTION public.record_initial_consent(date, text, text, text, boolean, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_initial_consent(date, text, text, text, boolean, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.record_initial_consent(date, text, text, text, boolean, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.record_initial_consent(date, text, text, text, boolean, text, text) TO service_role;

-- Trigger helper only. It must not be a client-callable RPC.
REVOKE ALL ON FUNCTION public.touch_user_profile_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.touch_user_profile_updated_at() FROM anon;
REVOKE ALL ON FUNCTION public.touch_user_profile_updated_at() FROM authenticated;

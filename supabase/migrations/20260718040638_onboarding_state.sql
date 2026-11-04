-- Onboarding state machine

CREATE TYPE public.onboarding_stage AS ENUM (
  'signup',
  'welcome_seen',
  'consent_complete',
  'age_confirmed',
  'identity_set',
  'name_set',
  'reflection_complete',
  'parent_link_skipped',
  'parent_link_complete',
  'parent_setup_complete',
  'activated',
  'offboarded'
);

CREATE TYPE public.user_role AS ENUM ('teen', 'parent', 'unknown');

CREATE TABLE public.user_onboarding_state (
  user_id                       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stage                         public.onboarding_stage NOT NULL DEFAULT 'signup',
  role                          public.user_role NOT NULL DEFAULT 'unknown',
  activation_action             text,
  activated_at                  timestamptz,
  signup_to_consent_secs        integer,
  consent_to_age_secs           integer,
  age_to_identity_secs          integer,
  identity_to_name_secs         integer,
  name_to_reflection_secs       integer,
  reflection_to_parentlink_secs integer,
  identity_to_activated_secs    integer,
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_onboarding_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_onboarding" ON public.user_onboarding_state
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "service_read_all_onboarding" ON public.user_onboarding_state
  FOR SELECT TO service_role USING (true);

CREATE INDEX idx_uos_stage   ON public.user_onboarding_state(stage);
CREATE INDEX idx_uos_role    ON public.user_onboarding_state(role);
CREATE INDEX idx_uos_created ON public.user_onboarding_state(created_at);
CREATE INDEX idx_uos_activated ON public.user_onboarding_state(activated_at) WHERE activated_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.uos_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER uos_updated_at
  BEFORE UPDATE ON public.user_onboarding_state
  FOR EACH ROW EXECUTE FUNCTION public.uos_set_updated_at();

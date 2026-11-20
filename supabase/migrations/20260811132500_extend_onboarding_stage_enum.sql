-- Add the richer application-stage vocabulary in its own migration.
-- PostgreSQL does not allow newly-added enum values to be safely consumed by
-- later DDL/DML in the same migration transaction, so reconciliation follows in
-- the next ordered migration.

alter type public.onboarding_stage add value if not exists 'pre_signup';
alter type public.onboarding_stage add value if not exists 'signed_up';
alter type public.onboarding_stage add value if not exists 'age_verified';
alter type public.onboarding_stage add value if not exists 'role_selected';
alter type public.onboarding_stage add value if not exists 'parent_link_sent';
alter type public.onboarding_stage add value if not exists 'parent_linked';
alter type public.onboarding_stage add value if not exists 'steady_state';

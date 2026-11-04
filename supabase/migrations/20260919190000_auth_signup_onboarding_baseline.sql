begin;

-- Account creation must establish the server-owned onboarding baseline even
-- when email confirmation means the client has no permanent session yet.
-- Anonymous preview identities are excluded; if one is upgraded to a permanent
-- account, the UPDATE trigger creates the baseline at that transition.
create or replace function public.initialize_onboarding_state_from_auth()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_age_bucket text;
begin
  if coalesce(new.is_anonymous, false) then
    return new;
  end if;

  v_age_bucket := case
    when new.raw_user_meta_data ->> 'age_bucket' in ('13-15', '16-17', '18-19')
      then new.raw_user_meta_data ->> 'age_bucket'
    else null
  end;

  insert into public.user_onboarding_state (
    user_id,
    stage,
    role,
    age_bucket,
    device_platform
  ) values (
    new.id,
    'signed_up',
    'unknown',
    v_age_bucket,
    'unknown'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.initialize_onboarding_state_from_auth()
  from public, anon, authenticated;
grant execute on function public.initialize_onboarding_state_from_auth()
  to service_role;

drop trigger if exists initialize_onboarding_state_on_signup on auth.users;
create trigger initialize_onboarding_state_on_signup
after insert on auth.users
for each row execute function public.initialize_onboarding_state_from_auth();

drop trigger if exists initialize_onboarding_state_on_permanent_upgrade on auth.users;
create trigger initialize_onboarding_state_on_permanent_upgrade
after update of is_anonymous on auth.users
for each row
when (old.is_anonymous is true and new.is_anonymous is false)
execute function public.initialize_onboarding_state_from_auth();

comment on function public.initialize_onboarding_state_from_auth() is
  'Creates the minimal signed_up onboarding baseline for permanent Se''kret Bip identities, including anonymous-to-permanent upgrades. It is telemetry/routing state, not consent, verification, relationship, or authorization authority.';

commit;

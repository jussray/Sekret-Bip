begin;

-- Brand-new external users must receive a usable profile row immediately after
-- auth.users insertion. Metadata is optional because older clients may not send it.
create or replace function public.initialize_app_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_side text;
  v_name text;
begin
  v_side := case
    when new.raw_user_meta_data ->> 'account_side' in ('teen', 'parent')
      then new.raw_user_meta_data ->> 'account_side'
    else null
  end;

  v_name := nullif(btrim(coalesce(
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'private_display_name',
    ''
  )), '');

  insert into public.app_profiles(
    user_id,
    email,
    account_side,
    private_display_name,
    onboarding_complete,
    profile_updated_at,
    updated_at
  ) values (
    new.id,
    new.email,
    v_side,
    left(v_name, 64),
    false,
    now(),
    now()
  )
  on conflict (user_id) do update
    set email = coalesce(excluded.email, public.app_profiles.email),
        account_side = coalesce(public.app_profiles.account_side, excluded.account_side),
        private_display_name = coalesce(public.app_profiles.private_display_name, excluded.private_display_name),
        updated_at = now();

  return new;
end;
$$;

revoke execute on function public.initialize_app_profile() from public, anon, authenticated;
grant execute on function public.initialize_app_profile() to service_role;

-- Ensure the trigger exists even on environments where an earlier migration was
-- partially applied.
drop trigger if exists initialize_app_profile_on_signup on auth.users;
create trigger initialize_app_profile_on_signup
after insert on auth.users
for each row execute function public.initialize_app_profile();

commit;

begin;

-- Anonymous accounts are inserted before they choose a durable Teen or Parent
-- side. Reuse the existing, reviewed auth.users update trigger instead of adding
-- a second side-effect path. Approved account identity metadata may fill an empty
-- profile side or private display name, but it can never overwrite an existing
-- durable choice or grant role, founder, verification, or permission fields.
create or replace function public.sync_app_profile_email_from_auth()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
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
    profile_updated_at,
    updated_at
  ) values (
    new.id,
    new.email,
    v_side,
    left(v_name, 64),
    now(),
    now()
  )
  on conflict (user_id) do update
    set email = excluded.email,
        account_side = coalesce(public.app_profiles.account_side, excluded.account_side),
        private_display_name = coalesce(public.app_profiles.private_display_name, excluded.private_display_name),
        profile_updated_at = case
          when public.app_profiles.account_side is null and excluded.account_side is not null then now()
          when public.app_profiles.private_display_name is null and excluded.private_display_name is not null then now()
          else public.app_profiles.profile_updated_at
        end,
        updated_at = now();

  return new;
end;
$$;

revoke all on function public.sync_app_profile_email_from_auth() from public, anon, authenticated;
grant execute on function public.sync_app_profile_email_from_auth() to service_role;

drop trigger if exists sync_app_profile_email_on_auth_update on auth.users;
create trigger sync_app_profile_email_on_auth_update
after update of email, raw_user_meta_data on auth.users
for each row
when (
  old.email is distinct from new.email
  or old.raw_user_meta_data is distinct from new.raw_user_meta_data
)
execute function public.sync_app_profile_email_from_auth();

commit;

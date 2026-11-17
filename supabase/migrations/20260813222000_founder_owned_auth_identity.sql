begin;

-- Founder access is an authorization property of one owned, confirmed Supabase
-- identity. The address is intentionally a routed Se'kret Bip mailbox; knowing
-- the address does not grant access because promotion requires Supabase to have
-- confirmed control of that mailbox first.
create or replace function public.sync_owned_founder_profile()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  founder_email constant text := 'founder@sekretbip.net';
  is_confirmed_founder boolean :=
    lower(coalesce(new.email, '')) = founder_email
    and new.email_confirmed_at is not null
    and coalesce(new.is_anonymous, false) = false;
begin
  if is_confirmed_founder then
    insert into public.app_profiles (
      user_id,
      email,
      role,
      can_view_audits,
      can_manage_app,
      exclude_from_analytics,
      updated_at
    ) values (
      new.id,
      new.email,
      'founder',
      true,
      true,
      true,
      now()
    )
    on conflict (user_id) do update
      set email = excluded.email,
          role = 'founder',
          can_view_audits = true,
          can_manage_app = true,
          exclude_from_analytics = true,
          updated_at = now();
  elsif tg_op = 'UPDATE'
    and lower(coalesce(old.email, '')) = founder_email then
    -- Do not let founder authorization survive a mailbox change, confirmation
    -- loss, or conversion to an anonymous identity.
    update public.app_profiles
      set role = 'user',
          can_view_audits = false,
          can_manage_app = false,
          exclude_from_analytics = false,
          email = new.email,
          updated_at = now()
      where user_id = new.id
        and role = 'founder';
  end if;

  return new;
end;
$$;

revoke all on function public.sync_owned_founder_profile() from public, anon, authenticated;

drop trigger if exists sync_owned_founder_profile_insert on auth.users;
create trigger sync_owned_founder_profile_insert
after insert on auth.users
for each row execute function public.sync_owned_founder_profile();

drop trigger if exists sync_owned_founder_profile_update on auth.users;
create trigger sync_owned_founder_profile_update
after update of email, email_confirmed_at, is_anonymous on auth.users
for each row execute function public.sync_owned_founder_profile();

commit;

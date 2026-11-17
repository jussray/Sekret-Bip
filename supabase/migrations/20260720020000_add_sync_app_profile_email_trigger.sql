-- Se'kret Bip — reconcile sync_app_profile_email_from_auth() migration history
--
-- test/supabase-trigger-structure.test.mjs's baseline
-- (security/supabase-trigger-baseline.json, built from a read-only live
-- pg_catalog observation) records this function and its trigger as expected
-- repository state, but no migration ever created them — a
-- migration-history parity gap, not a live security gap.
--
-- Verified live via read-only pg_get_functiondef()/pg_get_triggerdef():
-- both already exist in production, exactly as written here. This
-- migration is a no-op against production; it only brings the repository
-- into parity with what's already true.

create or replace function public.sync_app_profile_email_from_auth()
  returns trigger
  language plpgsql
  security definer
  set search_path = pg_catalog, pg_temp
as $$
begin
  insert into public.app_profiles(user_id, email)
  values (new.id, new.email)
  on conflict (user_id) do update
    set email = excluded.email,
        updated_at = now();

  return new;
end;
$$;

revoke all on function public.sync_app_profile_email_from_auth() from public, anon, authenticated;

drop trigger if exists sync_app_profile_email_on_auth_update on auth.users;
create trigger sync_app_profile_email_on_auth_update
  after update of email on auth.users
  for each row
  when (old.email::text is distinct from new.email::text)
  execute function public.sync_app_profile_email_from_auth();

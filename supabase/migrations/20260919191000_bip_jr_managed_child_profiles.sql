begin;

-- Bip Jr is a supervised child profile, not a second auth identity. The child
-- never needs an email/password account. A verified guardian owns provisioning
-- authority while Se'kret Bip retains a separate child profile identity.
create table if not exists public.jr_child_profiles (
  id uuid primary key default gen_random_uuid(),
  guardian_user_id uuid not null references auth.users(id) on delete cascade,
  display_alias text not null,
  age_band text not null check (age_band in ('5-7', '8-10', '11-12')),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint jr_child_profiles_alias_bounds check (
    char_length(btrim(display_alias)) between 1 and 40
  )
);

create index if not exists jr_child_profiles_guardian_status_idx
  on public.jr_child_profiles(guardian_user_id, status, created_at desc);

create table if not exists public.jr_parental_consent_receipts (
  id uuid primary key default gen_random_uuid(),
  child_profile_id uuid not null references public.jr_child_profiles(id) on delete cascade,
  guardian_user_id uuid not null references auth.users(id) on delete cascade,
  consent_version text not null,
  consented_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (child_profile_id, consent_version)
);

create index if not exists jr_parental_consent_guardian_idx
  on public.jr_parental_consent_receipts(guardian_user_id, consented_at desc);

alter table public.jr_child_profiles enable row level security;
alter table public.jr_parental_consent_receipts enable row level security;

revoke all on table public.jr_child_profiles from public, anon, authenticated;
revoke all on table public.jr_parental_consent_receipts from public, anon, authenticated;
grant select on table public.jr_child_profiles to authenticated;
grant select on table public.jr_parental_consent_receipts to authenticated;

drop policy if exists jr_child_profiles_verified_guardian_select on public.jr_child_profiles;
create policy jr_child_profiles_verified_guardian_select
on public.jr_child_profiles
for select
to authenticated
using (
  public.is_non_anonymous_user()
  and guardian_user_id = (select auth.uid())
  and exists (
    select 1
    from public.account_verification av
    where av.user_id = (select auth.uid())
      and av.verification_state = 'VERIFIED_GUARDIAN'
  )
);

drop policy if exists jr_parental_consent_verified_guardian_select on public.jr_parental_consent_receipts;
create policy jr_parental_consent_verified_guardian_select
on public.jr_parental_consent_receipts
for select
to authenticated
using (
  public.is_non_anonymous_user()
  and guardian_user_id = (select auth.uid())
  and exists (
    select 1
    from public.account_verification av
    where av.user_id = (select auth.uid())
      and av.verification_state = 'VERIFIED_GUARDIAN'
  )
);

create or replace function public.create_own_jr_child_profile(
  p_display_alias text,
  p_age_band text
)
returns table (
  id uuid,
  display_alias text,
  age_band text,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_guardian_id uuid := auth.uid();
  v_profile public.app_profiles%rowtype;
  v_verification_state text;
  v_child public.jr_child_profiles%rowtype;
  v_alias text := btrim(coalesce(p_display_alias, ''));
  v_consent_version constant text := 'bip-jr-parental-consent-v1';
begin
  if v_guardian_id is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select * into v_profile
  from public.app_profiles
  where user_id = v_guardian_id;

  if not found
     or v_profile.account_side <> 'parent'
     or v_profile.onboarding_complete is not true then
    raise exception 'completed parent profile required' using errcode = '42501';
  end if;

  select verification_state into v_verification_state
  from public.account_verification
  where user_id = v_guardian_id;

  if v_verification_state <> 'VERIFIED_GUARDIAN' then
    raise exception 'verified guardian required' using errcode = '42501';
  end if;

  if char_length(v_alias) < 1 or char_length(v_alias) > 40 then
    raise exception 'child display name must be 1 to 40 characters' using errcode = '22023';
  end if;

  if p_age_band not in ('5-7', '8-10', '11-12') then
    raise exception 'invalid Bip Jr age band' using errcode = '22023';
  end if;

  insert into public.jr_child_profiles (
    guardian_user_id,
    display_alias,
    age_band
  ) values (
    v_guardian_id,
    v_alias,
    p_age_band
  )
  returning * into v_child;

  insert into public.jr_parental_consent_receipts (
    child_profile_id,
    guardian_user_id,
    consent_version
  ) values (
    v_child.id,
    v_guardian_id,
    v_consent_version
  );

  return query
  select
    v_child.id,
    v_child.display_alias,
    v_child.age_band,
    v_child.status,
    v_child.created_at;
end;
$$;

create or replace function public.archive_own_jr_child_profile(
  p_child_profile_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_guardian_id uuid := auth.uid();
  v_verification_state text;
begin
  if v_guardian_id is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select verification_state into v_verification_state
  from public.account_verification
  where user_id = v_guardian_id;

  if v_verification_state <> 'VERIFIED_GUARDIAN' then
    raise exception 'verified guardian required' using errcode = '42501';
  end if;

  update public.jr_child_profiles
  set status = 'archived',
      archived_at = coalesce(archived_at, now()),
      updated_at = now()
  where id = p_child_profile_id
    and guardian_user_id = v_guardian_id
    and status = 'active';

  if not found then
    return false;
  end if;

  update public.jr_parental_consent_receipts
  set revoked_at = coalesce(revoked_at, now())
  where child_profile_id = p_child_profile_id
    and guardian_user_id = v_guardian_id
    and revoked_at is null;

  return true;
end;
$$;

revoke all on function public.create_own_jr_child_profile(text, text) from public, anon;
grant execute on function public.create_own_jr_child_profile(text, text) to authenticated, service_role;

revoke all on function public.archive_own_jr_child_profile(uuid) from public, anon;
grant execute on function public.archive_own_jr_child_profile(uuid) to authenticated, service_role;

comment on table public.jr_child_profiles is
  'Parent-managed Bip Jr identities. These rows are not auth users and never grant access to teen private data.';
comment on table public.jr_parental_consent_receipts is
  'Versioned parental-consent receipts for creating managed Bip Jr profiles; contains no child credentials or raw age evidence.';
comment on function public.create_own_jr_child_profile(text, text) is
  'Verified-parent-only atomic Bip Jr provisioning plus explicit parental-consent receipt.';
comment on function public.archive_own_jr_child_profile(uuid) is
  'Verified-parent-only archival of an owned Bip Jr profile and revocation timestamp on its consent receipt.';

commit;

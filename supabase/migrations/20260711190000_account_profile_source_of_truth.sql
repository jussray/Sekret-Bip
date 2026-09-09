begin;

-- Durable identity/profile state for cross-device recovery. Authentication remains
-- in auth.users; authorization capabilities remain in app_profiles.role/flags.
alter table public.app_profiles
  add column if not exists account_side text,
  add column if not exists private_display_name text,
  add column if not exists onboarding_complete boolean not null default false,
  add column if not exists age_range text,
  add column if not exists gender text,
  add column if not exists selected_companion text,
  add column if not exists parent_room_style text,
  add column if not exists parent_focus text,
  add column if not exists profile_updated_at timestamptz not null default now();

alter table public.app_profiles drop constraint if exists app_profiles_account_side_check;
alter table public.app_profiles
  add constraint app_profiles_account_side_check
  check (account_side is null or account_side in ('teen', 'parent'));

alter table public.app_profiles drop constraint if exists app_profiles_private_display_name_check;
alter table public.app_profiles
  add constraint app_profiles_private_display_name_check
  check (
    private_display_name is null
    or (char_length(btrim(private_display_name)) between 1 and 64)
  );

alter table public.app_profiles drop constraint if exists app_profiles_age_range_check;
alter table public.app_profiles
  add constraint app_profiles_age_range_check
  check (age_range is null or age_range in ('13-15', '16-17', '18-19'));

alter table public.app_profiles drop constraint if exists app_profiles_gender_check;
alter table public.app_profiles
  add constraint app_profiles_gender_check
  check (gender is null or gender in ('girl', 'boy', 'other'));

alter table public.app_profiles drop constraint if exists app_profiles_selected_companion_check;
alter table public.app_profiles
  add constraint app_profiles_selected_companion_check
  check (selected_companion is null or selected_companion in ('raylene', 'rylane', 'cloud', 'night'));

alter table public.app_profiles drop constraint if exists app_profiles_parent_room_style_check;
alter table public.app_profiles
  add constraint app_profiles_parent_room_style_check
  check (parent_room_style is null or parent_room_style in ('mom', 'dad'));

alter table public.app_profiles drop constraint if exists app_profiles_parent_focus_check;
alter table public.app_profiles
  add constraint app_profiles_parent_focus_check
  check (parent_focus is null or parent_focus in ('support', 'listen', 'repair', 'learn'));

create or replace function public.initialize_app_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.app_profiles(user_id, email)
  values (new.id, new.email)
  on conflict (user_id) do update
    set email = coalesce(excluded.email, public.app_profiles.email),
        updated_at = now();
  return new;
end;
$$;

revoke execute on function public.initialize_app_profile() from public, anon, authenticated;
grant execute on function public.initialize_app_profile() to service_role;

drop trigger if exists initialize_app_profile_on_signup on auth.users;
create trigger initialize_app_profile_on_signup
after insert on auth.users
for each row execute function public.initialize_app_profile();

insert into public.app_profiles(user_id, email)
select id, email from auth.users
on conflict (user_id) do update
  set email = coalesce(excluded.email, public.app_profiles.email);

alter table public.app_profiles enable row level security;
revoke all on table public.app_profiles from anon;
revoke insert, update, delete on table public.app_profiles from authenticated;
grant select on table public.app_profiles to authenticated;

drop policy if exists app_profiles_select_own on public.app_profiles;
create policy app_profiles_select_own
on public.app_profiles
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

-- The client can update only its own profile-shaped columns through this RPC.
-- role, founder/admin flags, and verification state are deliberately untouched.
create or replace function public.upsert_own_bip_profile(
  p_account_side text,
  p_private_display_name text,
  p_onboarding_complete boolean default true,
  p_age_range text default null,
  p_gender text default null,
  p_selected_companion text default null,
  p_parent_room_style text default null,
  p_parent_focus text default null
)
returns public.app_profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_profile public.app_profiles%rowtype;
begin
  if v_user_id is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_account_side not in ('teen', 'parent') then
    raise exception 'invalid account side' using errcode = '22023';
  end if;

  if nullif(btrim(p_private_display_name), '') is null
     or char_length(btrim(p_private_display_name)) > 64 then
    raise exception 'invalid private display name' using errcode = '22023';
  end if;

  if p_onboarding_complete and p_account_side = 'teen' and (
    p_age_range not in ('13-15', '16-17', '18-19')
    or p_gender not in ('girl', 'boy', 'other')
    or p_selected_companion not in ('raylene', 'rylane', 'cloud', 'night')
  ) then
    raise exception 'incomplete teen profile' using errcode = '22023';
  end if;

  if p_onboarding_complete and p_account_side = 'parent' and (
    p_parent_room_style not in ('mom', 'dad')
    or p_parent_focus not in ('support', 'listen', 'repair', 'learn')
  ) then
    raise exception 'incomplete parent profile' using errcode = '22023';
  end if;

  select email into v_email from auth.users where id = v_user_id;

  insert into public.app_profiles(
    user_id,
    email,
    account_side,
    private_display_name,
    onboarding_complete,
    age_range,
    gender,
    selected_companion,
    parent_room_style,
    parent_focus,
    profile_updated_at,
    updated_at
  ) values (
    v_user_id,
    v_email,
    p_account_side,
    btrim(p_private_display_name),
    coalesce(p_onboarding_complete, false),
    case when p_account_side = 'teen' then p_age_range else null end,
    case when p_account_side = 'teen' then p_gender else null end,
    case when p_account_side = 'teen' then p_selected_companion else null end,
    case when p_account_side = 'parent' then p_parent_room_style else null end,
    case when p_account_side = 'parent' then p_parent_focus else null end,
    now(),
    now()
  )
  on conflict (user_id) do update
  set email = coalesce(excluded.email, public.app_profiles.email),
      account_side = excluded.account_side,
      private_display_name = excluded.private_display_name,
      onboarding_complete = excluded.onboarding_complete,
      age_range = excluded.age_range,
      gender = excluded.gender,
      selected_companion = excluded.selected_companion,
      parent_room_style = excluded.parent_room_style,
      parent_focus = excluded.parent_focus,
      profile_updated_at = now(),
      updated_at = now()
  returning * into v_profile;

  return v_profile;
end;
$$;

revoke execute on function public.upsert_own_bip_profile(text, text, boolean, text, text, text, text, text)
  from public, anon;
grant execute on function public.upsert_own_bip_profile(text, text, boolean, text, text, text, text, text)
  to authenticated;

comment on function public.upsert_own_bip_profile(text, text, boolean, text, text, text, text, text) is
  'Writes only the authenticated user profile fields needed for cross-device Bip onboarding recovery; never changes role or permissions.';

-- Guardian review is independent from parent_links. A parent link is teen consent
-- to share with one guardian; it is not proof that the adult account is verified.
create or replace function public.submit_guardian_verification()
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.app_profiles%rowtype;
  v_state text;
begin
  if v_user_id is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select * into v_profile
  from public.app_profiles
  where user_id = v_user_id
  for update;

  if not found
     or v_profile.account_side <> 'parent'
     or v_profile.onboarding_complete is not true then
    raise exception 'completed parent profile required' using errcode = '42501';
  end if;

  select verification_state into v_state
  from public.account_verification
  where user_id = v_user_id
  for update;

  if v_state = 'VERIFIED_GUARDIAN' then
    return v_state;
  end if;

  if v_state = 'GUARDIAN_SUSPENDED' then
    raise exception 'guardian account suspended' using errcode = '42501';
  end if;

  insert into public.account_verification(
    user_id,
    verification_state,
    parent_link_state,
    verification_reason,
    verification_updated_at
  ) values (
    v_user_id,
    'PENDING_GUARDIAN_REVIEW',
    'none',
    'guardian_review_submitted',
    now()
  )
  on conflict (user_id) do update
  set verification_state = 'PENDING_GUARDIAN_REVIEW',
      verification_reason = 'guardian_review_submitted',
      verification_updated_at = now();

  return 'PENDING_GUARDIAN_REVIEW';
end;
$$;

revoke execute on function public.submit_guardian_verification() from public, anon;
grant execute on function public.submit_guardian_verification() to authenticated;

comment on function public.submit_guardian_verification() is
  'Starts guardian review without creating, activating, or using a teen parent_link consent record.';

-- Circle identity remains public/pseudonymous and is never copied from the
-- private display name by a database trigger.
alter table public.circle_profiles enable row level security;
revoke all on table public.circle_profiles from anon;
grant select, insert, update on table public.circle_profiles to authenticated;

drop policy if exists circle_profiles_owner_insert on public.circle_profiles;
create policy circle_profiles_owner_insert
on public.circle_profiles
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

drop policy if exists circle_profiles_owner_select on public.circle_profiles;
create policy circle_profiles_owner_select
on public.circle_profiles
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

drop policy if exists circle_profiles_owner_update on public.circle_profiles;
create policy circle_profiles_owner_update
on public.circle_profiles
for update
to authenticated
using (
  (select auth.uid()) = user_id
  and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
)
with check (
  (select auth.uid()) = user_id
  and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

commit;

begin;

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
  v_existing public.app_profiles%rowtype;
  v_profile public.app_profiles%rowtype;
  v_has_existing boolean := false;
  v_requested_complete boolean := coalesce(p_onboarding_complete, false);
begin
  if v_user_id is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  -- Nullable input needs explicit rejection. SQL NOT IN returns NULL for NULL
  -- operands, and IF NULL does not enter the rejection branch.
  if p_account_side is null
     or p_account_side not in ('teen', 'parent') then
    raise exception 'invalid account side' using errcode = '22023';
  end if;

  if nullif(btrim(p_private_display_name), '') is null
     or char_length(btrim(p_private_display_name)) > 64 then
    raise exception 'invalid private display name' using errcode = '22023';
  end if;

  -- Lock the current profile before evaluating transitions so concurrent device
  -- writes cannot race a completed identity into another account side.
  select * into v_existing
  from public.app_profiles
  where user_id = v_user_id
  for update;
  v_has_existing := found;

  -- Account side is flexible while onboarding remains incomplete. Once a teen
  -- or parent profile is completed, that durable identity cannot flip through a
  -- stale cache, alternate binary, or crafted client request.
  if v_has_existing
     and v_existing.onboarding_complete is true
     and v_existing.account_side is distinct from p_account_side then
    raise exception 'completed account side cannot change' using errcode = '22023';
  end if;

  -- Completion is monotonic. A completed profile cannot return to an incomplete
  -- shell and clear the fields used by routing, guardian review, and sync.
  if v_has_existing
     and v_existing.onboarding_complete is true
     and v_requested_complete is not true then
    raise exception 'completed profile cannot return to onboarding' using errcode = '22023';
  end if;

  if v_requested_complete and p_account_side = 'teen' and (
    p_age_range is null
    or p_age_range not in ('13-15', '16-17', '18-19')
    or p_gender is null
    or p_gender not in ('girl', 'boy', 'other')
    or p_selected_companion is null
    or p_selected_companion not in ('raylene', 'rylane', 'cloud', 'night')
  ) then
    raise exception 'incomplete teen profile' using errcode = '22023';
  end if;

  if v_requested_complete and p_account_side = 'parent' and (
    p_parent_room_style is null
    or p_parent_room_style not in ('mom', 'dad')
    or p_parent_focus is null
    or p_parent_focus not in ('support', 'listen', 'repair', 'learn')
  ) then
    raise exception 'incomplete parent profile' using errcode = '22023';
  end if;

  select email into v_email
  from auth.users
  where id = v_user_id;

  insert into public.app_profiles (
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
    v_requested_complete,
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

revoke all on function public.upsert_own_bip_profile(
  text,
  text,
  boolean,
  text,
  text,
  text,
  text,
  text
) from public, anon;

grant execute on function public.upsert_own_bip_profile(
  text,
  text,
  boolean,
  text,
  text,
  text,
  text,
  text
) to authenticated, service_role;

comment on function public.upsert_own_bip_profile(
  text,
  text,
  boolean,
  text,
  text,
  text,
  text,
  text
) is
  'Self-scoped permanent-account profile writer. Nullable identity inputs are explicitly rejected; account side may pivot only before onboarding completion; completed side and completion state are immutable, while role and capability columns remain outside the RPC write set.';

commit;

begin;

create or replace function public.submit_guardian_verification()
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.app_profiles%rowtype;
  v_circle_account_type text;
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

  -- The review queue requires a guardian Circle identity. Enforce the same
  -- invariant before transitioning state so malformed clients cannot create
  -- pending records that the founder/admin queue can never display.
  select account_type into v_circle_account_type
  from public.circle_profiles
  where user_id = v_user_id;

  if not found or v_circle_account_type <> 'guardian' then
    raise exception 'guardian circle profile required' using errcode = '42501';
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

revoke all on function public.submit_guardian_verification()
  from public, anon;
grant execute on function public.submit_guardian_verification()
  to authenticated;

comment on function public.submit_guardian_verification() is
  'Self-scoped permanent-parent RPC. Requires completed parent onboarding and a guardian Circle identity before entering guardian review; never creates or uses teen parent_link consent.';

commit;

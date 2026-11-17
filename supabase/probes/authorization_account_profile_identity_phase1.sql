-- Se'kret Bip authenticated account-profile identity Phase 1 proof harness
--
-- Run after the completed-identity lock migration. The fixture is synthetic,
-- all changes are transaction-contained, and the final rollback retains nothing.

begin;

create temp table profile_context (
  user_id uuid primary key
) on commit drop;

insert into profile_context values (gen_random_uuid());
grant select on profile_context to authenticated;

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
)
select
  user_id,
  null,
  'authenticated',
  'authenticated',
  'account-profile-identity@sekret.invalid',
  now(),
  now(),
  '{}'::jsonb,
  '{}'::jsonb
from profile_context;

create temp table profile_results (
  check_name text primary key,
  passed boolean not null,
  detail text not null
) on commit drop;

grant all on profile_results to authenticated;

select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from profile_context),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from profile_context),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;

-- Incomplete onboarding may pivot before identity becomes durable.
select public.upsert_own_bip_profile(
  'teen',
  'Draft Teen',
  false,
  null,
  null,
  null,
  null,
  null
);
select public.upsert_own_bip_profile(
  'parent',
  'Draft Parent',
  false,
  null,
  null,
  null,
  null,
  null
);

insert into profile_results
select
  'precompletion_side_pivot_allowed',
  account_side = 'parent' and onboarding_complete = false,
  'Incomplete profile may change side before completion'
from public.app_profiles
where user_id = (select user_id from profile_context);

-- Completing the selected parent identity succeeds.
select public.upsert_own_bip_profile(
  'parent',
  'Complete Parent',
  true,
  null,
  null,
  null,
  'mom',
  'support'
);

insert into profile_results
select
  'profile_completion_succeeds',
  account_side = 'parent'
    and onboarding_complete = true
    and parent_room_style = 'mom'
    and parent_focus = 'support',
  'Valid parent profile completed'
from public.app_profiles
where user_id = (select user_id from profile_context);

-- Same-side edits remain available after completion.
select public.upsert_own_bip_profile(
  'parent',
  'Updated Parent',
  true,
  null,
  null,
  null,
  'dad',
  'listen'
);

insert into profile_results
select
  'same_side_completed_update_allowed',
  account_side = 'parent'
    and onboarding_complete = true
    and private_display_name = 'Updated Parent'
    and parent_room_style = 'dad'
    and parent_focus = 'listen',
  'Completed parent may update same-side profile fields'
from public.app_profiles
where user_id = (select user_id from profile_context);

-- Completed identity cannot flip to the other account side.
do $probe$
begin
  begin
    perform public.upsert_own_bip_profile(
      'teen',
      'Forbidden Flip',
      true,
      '16-17',
      'other',
      'cloud',
      null,
      null
    );
    insert into profile_results values (
      'completed_side_flip_denied',
      false,
      'Completed parent unexpectedly changed to teen'
    );
  exception when invalid_parameter_value then
    insert into profile_results values (
      'completed_side_flip_denied',
      true,
      'Completed account side change denied'
    );
  end;
end
$probe$;

-- Completed identity cannot return to an incomplete shell.
do $probe$
begin
  begin
    perform public.upsert_own_bip_profile(
      'parent',
      'Forbidden Downgrade',
      false,
      null,
      null,
      null,
      null,
      null
    );
    insert into profile_results values (
      'completed_downgrade_denied',
      false,
      'Completed profile unexpectedly returned to onboarding'
    );
  exception when invalid_parameter_value then
    insert into profile_results values (
      'completed_downgrade_denied',
      true,
      'Completed onboarding downgrade denied'
    );
  end;
end
$probe$;

-- Required side fields remain mandatory for completed writes.
do $probe$
begin
  begin
    perform public.upsert_own_bip_profile(
      'parent',
      'Incomplete Parent',
      true,
      null,
      null,
      null,
      'mom',
      null
    );
    insert into profile_results values (
      'invalid_completed_parent_denied',
      false,
      'Incomplete completed parent unexpectedly accepted'
    );
  exception when invalid_parameter_value then
    insert into profile_results values (
      'invalid_completed_parent_denied',
      true,
      'Incomplete completed parent denied'
    );
  end;
end
$probe$;

reset role;

-- Failed transitions leave the completed identity intact.
insert into profile_results
select
  'denied_transitions_leave_profile_intact',
  account_side = 'parent'
    and onboarding_complete = true
    and private_display_name = 'Updated Parent'
    and parent_room_style = 'dad'
    and parent_focus = 'listen',
  'Denied transitions did not partially mutate profile'
from public.app_profiles
where user_id = (select user_id from profile_context);

-- Anonymous-authenticated sessions cannot write permanent profile identity.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from profile_context),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from profile_context),
    'role', 'authenticated',
    'is_anonymous', true
  )::text,
  true
);
set local role authenticated;

do $probe$
begin
  begin
    perform public.upsert_own_bip_profile(
      'parent',
      'Anonymous Write',
      true,
      null,
      null,
      null,
      'mom',
      'support'
    );
    insert into profile_results values (
      'anonymous_session_denied',
      false,
      'Anonymous-authenticated session unexpectedly wrote profile'
    );
  exception when insufficient_privilege then
    insert into profile_results values (
      'anonymous_session_denied',
      true,
      'Anonymous-authenticated profile write denied'
    );
  end;
end
$probe$;

reset role;

select check_name, passed, detail
from profile_results
order by check_name;

rollback;

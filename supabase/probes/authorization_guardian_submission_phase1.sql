-- Se'kret Bip guardian submission authorization Phase 1 proof harness
--
-- Proves only a permanent, completed parent account with a guardian Circle
-- identity can enter guardian review. All rows are synthetic and rolled back.

begin;

create temp table guardian_submit_context (
  label text primary key,
  user_id uuid not null
) on commit drop;

insert into guardian_submit_context(label, user_id)
values
  ('valid_parent', gen_random_uuid()),
  ('missing_circle', gen_random_uuid()),
  ('wrong_circle', gen_random_uuid()),
  ('teen', gen_random_uuid()),
  ('incomplete_parent', gen_random_uuid()),
  ('suspended_parent', gen_random_uuid()),
  ('verified_parent', gen_random_uuid()),
  ('other_parent', gen_random_uuid());

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select null::uuid, user_id, 'authenticated', 'authenticated',
  label || '.guardian-submit@sekret.invalid', '', now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now(), '', '', '', ''
from guardian_submit_context;

insert into public.app_profiles(
  user_id, role, account_side, private_display_name, onboarding_complete,
  age_range, gender, selected_companion, parent_room_style, parent_focus
)
select
  user_id,
  case when label = 'teen' then 'teen' else 'parent' end,
  case when label = 'teen' then 'teen' else 'parent' end,
  'Synthetic ' || label,
  label <> 'incomplete_parent',
  case when label = 'teen' then '16-17' else null end,
  case when label = 'teen' then 'other' else null end,
  case when label = 'teen' then 'cloud' else null end,
  case when label <> 'teen' then 'mom' else null end,
  case when label <> 'teen' then 'support' else null end
from guardian_submit_context
on conflict (user_id) do update
set role = excluded.role,
    account_side = excluded.account_side,
    private_display_name = excluded.private_display_name,
    onboarding_complete = excluded.onboarding_complete,
    age_range = excluded.age_range,
    gender = excluded.gender,
    selected_companion = excluded.selected_companion,
    parent_room_style = excluded.parent_room_style,
    parent_focus = excluded.parent_focus;

insert into public.circle_profiles(user_id, nickname, avatar_emoji, account_type)
select
  user_id,
  'Synthetic ' || label,
  '🌙',
  case when label in ('teen', 'wrong_circle') then 'teen' else 'guardian' end
from guardian_submit_context
where label <> 'missing_circle'
on conflict (user_id) do update
set nickname = excluded.nickname,
    avatar_emoji = excluded.avatar_emoji,
    account_type = excluded.account_type;

insert into public.account_verification(user_id, verification_state, parent_link_state)
select
  user_id,
  case
    when label = 'suspended_parent' then 'GUARDIAN_SUSPENDED'
    when label = 'verified_parent' then 'VERIFIED_GUARDIAN'
    else 'UNVERIFIED'
  end,
  'none'
from guardian_submit_context
on conflict (user_id) do update
set verification_state = excluded.verification_state,
    parent_link_state = excluded.parent_link_state;

create temp table guardian_submit_results (
  check_name text primary key,
  passed boolean not null,
  detail text not null
) on commit drop;

grant select on guardian_submit_context to authenticated;
grant all on guardian_submit_results to authenticated;

-- Valid permanent parent with guardian identity.
select set_config('request.jwt.claim.sub', (select user_id::text from guardian_submit_context where label = 'valid_parent'), true);
select set_config('request.jwt.claims', jsonb_build_object('sub', (select user_id::text from guardian_submit_context where label = 'valid_parent'), 'role', 'authenticated', 'is_anonymous', false)::text, true);
set local role authenticated;
insert into guardian_submit_results values (
  'valid_guardian_submission_succeeds',
  public.submit_guardian_verification() = 'PENDING_GUARDIAN_REVIEW',
  'Completed parent with guardian Circle identity enters review'
);
reset role;

-- Missing guardian Circle identity.
select set_config('request.jwt.claim.sub', (select user_id::text from guardian_submit_context where label = 'missing_circle'), true);
select set_config('request.jwt.claims', jsonb_build_object('sub', (select user_id::text from guardian_submit_context where label = 'missing_circle'), 'role', 'authenticated', 'is_anonymous', false)::text, true);
set local role authenticated;
do $probe$ begin
  begin
    perform public.submit_guardian_verification();
    insert into guardian_submit_results values ('missing_circle_denied', false, 'Missing identity unexpectedly submitted');
  exception when insufficient_privilege then
    insert into guardian_submit_results values ('missing_circle_denied', true, 'Missing guardian Circle identity is denied');
  end;
end $probe$;
reset role;

-- Teen Circle identity on a parent profile.
select set_config('request.jwt.claim.sub', (select user_id::text from guardian_submit_context where label = 'wrong_circle'), true);
select set_config('request.jwt.claims', jsonb_build_object('sub', (select user_id::text from guardian_submit_context where label = 'wrong_circle'), 'role', 'authenticated', 'is_anonymous', false)::text, true);
set local role authenticated;
do $probe$ begin
  begin
    perform public.submit_guardian_verification();
    insert into guardian_submit_results values ('teen_circle_identity_denied', false, 'Teen Circle identity unexpectedly submitted');
  exception when insufficient_privilege then
    insert into guardian_submit_results values ('teen_circle_identity_denied', true, 'Teen Circle identity cannot enter guardian review');
  end;
end $probe$;
reset role;

-- Teen profile.
select set_config('request.jwt.claim.sub', (select user_id::text from guardian_submit_context where label = 'teen'), true);
select set_config('request.jwt.claims', jsonb_build_object('sub', (select user_id::text from guardian_submit_context where label = 'teen'), 'role', 'authenticated', 'is_anonymous', false)::text, true);
set local role authenticated;
do $probe$ begin
  begin
    perform public.submit_guardian_verification();
    insert into guardian_submit_results values ('teen_profile_denied', false, 'Teen profile unexpectedly submitted');
  exception when insufficient_privilege then
    insert into guardian_submit_results values ('teen_profile_denied', true, 'Teen profile cannot enter guardian review');
  end;
end $probe$;
reset role;

-- Incomplete parent profile.
select set_config('request.jwt.claim.sub', (select user_id::text from guardian_submit_context where label = 'incomplete_parent'), true);
select set_config('request.jwt.claims', jsonb_build_object('sub', (select user_id::text from guardian_submit_context where label = 'incomplete_parent'), 'role', 'authenticated', 'is_anonymous', false)::text, true);
set local role authenticated;
do $probe$ begin
  begin
    perform public.submit_guardian_verification();
    insert into guardian_submit_results values ('incomplete_parent_denied', false, 'Incomplete parent unexpectedly submitted');
  exception when insufficient_privilege then
    insert into guardian_submit_results values ('incomplete_parent_denied', true, 'Incomplete parent profile is denied');
  end;
end $probe$;
reset role;

-- Anonymous-authenticated session using an otherwise eligible account.
select set_config('request.jwt.claim.sub', (select user_id::text from guardian_submit_context where label = 'other_parent'), true);
select set_config('request.jwt.claims', jsonb_build_object('sub', (select user_id::text from guardian_submit_context where label = 'other_parent'), 'role', 'authenticated', 'is_anonymous', true)::text, true);
set local role authenticated;
do $probe$ begin
  begin
    perform public.submit_guardian_verification();
    insert into guardian_submit_results values ('anonymous_session_denied', false, 'Anonymous session unexpectedly submitted');
  exception when insufficient_privilege then
    insert into guardian_submit_results values ('anonymous_session_denied', true, 'Anonymous-authenticated session is denied');
  end;
end $probe$;
reset role;

-- Suspended guardian.
select set_config('request.jwt.claim.sub', (select user_id::text from guardian_submit_context where label = 'suspended_parent'), true);
select set_config('request.jwt.claims', jsonb_build_object('sub', (select user_id::text from guardian_submit_context where label = 'suspended_parent'), 'role', 'authenticated', 'is_anonymous', false)::text, true);
set local role authenticated;
do $probe$ begin
  begin
    perform public.submit_guardian_verification();
    insert into guardian_submit_results values ('suspended_guardian_denied', false, 'Suspended guardian unexpectedly resubmitted');
  exception when insufficient_privilege then
    insert into guardian_submit_results values ('suspended_guardian_denied', true, 'Suspended guardian cannot resubmit');
  end;
end $probe$;
reset role;

-- Already verified guardian remains verified.
select set_config('request.jwt.claim.sub', (select user_id::text from guardian_submit_context where label = 'verified_parent'), true);
select set_config('request.jwt.claims', jsonb_build_object('sub', (select user_id::text from guardian_submit_context where label = 'verified_parent'), 'role', 'authenticated', 'is_anonymous', false)::text, true);
set local role authenticated;
insert into guardian_submit_results values (
  'verified_guardian_is_idempotent',
  public.submit_guardian_verification() = 'VERIFIED_GUARDIAN',
  'Verified guardian remains verified without reopening review'
);
reset role;

insert into guardian_submit_results values (
  'submission_is_self_scoped',
  (select verification_state = 'PENDING_GUARDIAN_REVIEW' from public.account_verification where user_id = (select user_id from guardian_submit_context where label = 'valid_parent'))
  and (select verification_state = 'UNVERIFIED' from public.account_verification where user_id = (select user_id from guardian_submit_context where label = 'other_parent')),
  'Submission changes only the authenticated caller row'
);

select check_name, passed, detail
from guardian_submit_results
order by check_name;

rollback;

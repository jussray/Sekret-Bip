-- Focused Parent Link receiver-authority proof.
--
-- This is intentionally separate from Teen verification authority:
--   * a Teen-side account cannot redeem another Teen's Parent Link code;
--   * a completed Parent-side account may redeem without VERIFIED_GUARDIAN;
--   * redeeming establishes relationship state only and never mints Teen verification.
--
-- All identities are synthetic and every write is rolled back.

begin;

create temp table parent_link_receiver_context (
  label text primary key,
  user_id uuid not null
) on commit drop;

insert into parent_link_receiver_context(label, user_id)
values
  ('teen_owner', gen_random_uuid()),
  ('teen_intruder', gen_random_uuid()),
  ('trusted_adult', gen_random_uuid());

grant select on parent_link_receiver_context to authenticated;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  is_anonymous
)
select
  null::uuid,
  user_id,
  'authenticated',
  'authenticated',
  label || '.parent-link-receiver@sekret.invalid',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  '',
  false
from parent_link_receiver_context;

insert into public.app_profiles (
  user_id,
  role,
  account_side,
  private_display_name,
  onboarding_complete,
  age_range,
  gender,
  selected_companion,
  parent_room_style,
  parent_focus
)
select
  user_id,
  case when label = 'trusted_adult' then 'parent' else 'teen' end,
  case when label = 'trusted_adult' then 'parent' else 'teen' end,
  'Synthetic ' || label,
  true,
  case when label = 'trusted_adult' then null else '16-17' end,
  case when label = 'trusted_adult' then null else 'other' end,
  case when label = 'trusted_adult' then null else 'cloud' end,
  case when label = 'trusted_adult' then 'mom' else null end,
  case when label = 'trusted_adult' then 'support' else null end
from parent_link_receiver_context;

insert into public.account_verification (
  user_id,
  verification_state,
  parent_link_state,
  verification_reason
)
select
  user_id,
  'UNVERIFIED',
  'none',
  'synthetic_parent_link_receiver_probe'
from parent_link_receiver_context;

create temp table parent_link_receiver_runtime (
  key text primary key,
  value text not null
) on commit drop;

create temp table parent_link_receiver_results (
  check_name text primary key,
  passed boolean not null,
  detail text not null
) on commit drop;

grant all on parent_link_receiver_runtime, parent_link_receiver_results to authenticated;

-- Teen owner creates the private relationship code.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from parent_link_receiver_context where label = 'teen_owner'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from parent_link_receiver_context where label = 'teen_owner'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
insert into parent_link_receiver_runtime(key, value)
values ('invite_code', public.create_parent_link_invite());
reset role;

-- Another Teen account must not be able to occupy the trusted-adult slot.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from parent_link_receiver_context where label = 'teen_intruder'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from parent_link_receiver_context where label = 'teen_intruder'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
do $probe$
begin
  begin
    perform public.redeem_parent_link_invite(
      (select value from parent_link_receiver_runtime where key = 'invite_code')
    );
    insert into parent_link_receiver_results values (
      'teen_side_receiver_denied',
      false,
      'A Teen-side account unexpectedly redeemed another Teen Parent Link code'
    );
  exception when insufficient_privilege then
    insert into parent_link_receiver_results values (
      'teen_side_receiver_denied',
      true,
      'Parent Link redemption rejects Teen-side accounts at the server boundary'
    );
  end;
end
$probe$;
reset role;

-- A completed Parent-side trusted adult may establish Bridge relationship
-- consent even while guardian verification is still UNVERIFIED.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from parent_link_receiver_context where label = 'trusted_adult'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from parent_link_receiver_context where label = 'trusted_adult'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
insert into parent_link_receiver_runtime(key, value)
select
  'trusted_adult_redeemed_rows',
  count(*)::text
from public.redeem_parent_link_invite(
  (select value from parent_link_receiver_runtime where key = 'invite_code')
);
reset role;

insert into parent_link_receiver_results
select
  'unverified_parent_side_receiver_allowed_for_bridge_only',
  (select value = '1' from parent_link_receiver_runtime where key = 'trusted_adult_redeemed_rows')
  and coalesce((
    select verification_state = 'UNVERIFIED'
    from public.account_verification
    where user_id = (select user_id from parent_link_receiver_context where label = 'trusted_adult')
  ), false)
  and coalesce((
    select verification_state = 'UNVERIFIED'
      and parent_link_state = 'active'
    from public.account_verification
    where user_id = (select user_id from parent_link_receiver_context where label = 'teen_owner')
  ), false)
  and coalesce((
    select status = 'active'
      and is_active is true
      and parent_user_id = (select user_id from parent_link_receiver_context where label = 'trusted_adult')
    from public.parent_links
    where teen_user_id = (select user_id from parent_link_receiver_context where label = 'teen_owner')
  ), false),
  'Completed Parent Side may accept Teen-controlled Bridge consent without gaining VERIFIED_GUARDIAN or minting VERIFIED_TEEN';

-- Fail closed with one receipt per behavior.
do $assertions$
declare
  v_failed text;
begin
  select string_agg(check_name || ': ' || detail, E'\n' order by check_name)
  into v_failed
  from parent_link_receiver_results
  where passed is not true;

  if v_failed is not null then
    raise exception 'parent link receiver proof failed:%', E'\n' || v_failed;
  end if;
end
$assertions$;

table parent_link_receiver_results;

rollback;

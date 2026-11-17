-- Se'kret Bip authenticated push-token Phase 1 proof harness
--
-- Run after the push-token ownership migration. Every account and token is
-- synthetic, and the final rollback retains no production rows.

begin;

create temp table push_context (
  label text primary key,
  user_id uuid not null
) on commit drop;

insert into push_context(label, user_id)
values
  ('teen', gen_random_uuid()),
  ('parent', gen_random_uuid()),
  ('anonymous_user', gen_random_uuid());

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
  email_change
)
select
  null::uuid,
  user_id,
  'authenticated',
  'authenticated',
  label || '.push-token@sekret.invalid',
  '',
  now(),
  '{}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
from push_context;

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
values
  (
    (select user_id from push_context where label = 'teen'),
    'teen',
    'teen',
    'Synthetic Teen',
    true,
    '16-17',
    'other',
    'cloud',
    null,
    null
  ),
  (
    (select user_id from push_context where label = 'parent'),
    'parent',
    'parent',
    'Synthetic Parent',
    true,
    null,
    null,
    null,
    'mom',
    'support'
  )
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

create temp table push_results (
  check_name text primary key,
  passed boolean not null,
  detail text not null
) on commit drop;

grant select on push_context to authenticated;
grant all on push_results to authenticated;

-- Completed profile side overrides the caller-supplied binary label.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from push_context where label = 'teen'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from push_context where label = 'teen'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
select public.claim_push_token(
  'ExponentPushToken[synthetic-shared-token]',
  'ios',
  'parent'
);
reset role;

insert into push_results
select
  'profile_side_overrides_spoof',
  coalesce((
    select user_id = (select user_id from push_context where label = 'teen')
      and app_variant = 'teen'
      and enabled = true
    from public.push_tokens
    where expo_push_token = 'ExponentPushToken[synthetic-shared-token]'
  ), false),
  'Completed teen profile overrode caller-supplied parent label';

-- The same owner can refresh platform and re-enable metadata.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from push_context where label = 'teen'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from push_context where label = 'teen'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
select public.claim_push_token(
  'ExponentPushToken[synthetic-shared-token]',
  'android',
  'parent'
);
reset role;

insert into push_results
select
  'same_owner_refreshes',
  coalesce((
    select platform = 'android'
      and app_variant = 'teen'
      and enabled = true
    from public.push_tokens
    where expo_push_token = 'ExponentPushToken[synthetic-shared-token]'
  ), false),
  'Same owner refreshed platform without losing server-derived side';

-- A different active account cannot take an enabled token.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from push_context where label = 'parent'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from push_context where label = 'parent'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
do $probe$
begin
  begin
    perform public.claim_push_token(
      'ExponentPushToken[synthetic-shared-token]',
      'ios',
      'parent'
    );
    insert into push_results values (
      'enabled_cross_user_transfer_denied',
      false,
      'Different account unexpectedly took an enabled token'
    );
  exception when insufficient_privilege then
    insert into push_results values (
      'enabled_cross_user_transfer_denied',
      true,
      'Enabled cross-user token transfer denied'
    );
  end;
end
$probe$;
reset role;

insert into push_results
select
  'denied_transfer_preserves_owner',
  coalesce((
    select user_id = (select user_id from push_context where label = 'teen')
      and enabled = true
    from public.push_tokens
    where expo_push_token = 'ExponentPushToken[synthetic-shared-token]'
  ), false),
  'Denied claim preserved the existing enabled owner';

-- The current owner disables the token before signing out.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from push_context where label = 'teen'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from push_context where label = 'teen'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
select public.disable_push_token('ExponentPushToken[synthetic-shared-token]');
reset role;

insert into push_results
select
  'owner_disables',
  coalesce((
    select enabled = false
    from public.push_tokens
    where expo_push_token = 'ExponentPushToken[synthetic-shared-token]'
  ), false),
  'Current owner disabled token';

-- A disabled token may be handed to another signed-in account on the same device.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from push_context where label = 'parent'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from push_context where label = 'parent'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
select public.claim_push_token(
  'ExponentPushToken[synthetic-shared-token]',
  'ios',
  'teen'
);
reset role;

insert into push_results
select
  'disabled_token_handoff_allowed',
  coalesce((
    select user_id = (select user_id from push_context where label = 'parent')
      and app_variant = 'parent'
      and enabled = true
    from public.push_tokens
    where expo_push_token = 'ExponentPushToken[synthetic-shared-token]'
  ), false),
  'Disabled token transferred to the new account with server-derived parent side';

-- Former owner cannot disable the newly transferred token.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from push_context where label = 'teen'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from push_context where label = 'teen'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
select public.disable_push_token('ExponentPushToken[synthetic-shared-token]');
reset role;

insert into push_results
select
  'former_owner_cannot_disable',
  coalesce((
    select enabled = true
      and user_id = (select user_id from push_context where label = 'parent')
    from public.push_tokens
    where expo_push_token = 'ExponentPushToken[synthetic-shared-token]'
  ), false),
  'Former owner disable attempt did not affect transferred token';

-- Current owner can disable it.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from push_context where label = 'parent'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from push_context where label = 'parent'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
select public.disable_push_token('ExponentPushToken[synthetic-shared-token]');
reset role;

insert into push_results
select
  'current_owner_disables',
  coalesce((
    select enabled = false
      and user_id = (select user_id from push_context where label = 'parent')
    from public.push_tokens
    where expo_push_token = 'ExponentPushToken[synthetic-shared-token]'
  ), false),
  'Current owner disabled transferred token';

-- Invalid token strings are rejected before insertion.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from push_context where label = 'teen'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from push_context where label = 'teen'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
do $probe$
begin
  begin
    perform public.claim_push_token('not-a-token', 'ios', 'teen');
    insert into push_results values (
      'invalid_token_denied',
      false,
      'Malformed token unexpectedly inserted'
    );
  exception when invalid_parameter_value then
    insert into push_results values (
      'invalid_token_denied',
      true,
      'Malformed token denied'
    );
  end;
end
$probe$;
reset role;

-- Modern ExpoPushToken wrapper is accepted.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from push_context where label = 'teen'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from push_context where label = 'teen'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
select public.claim_push_token('ExpoPushToken[modern-synthetic-token]', 'ios', 'teen');
reset role;

insert into push_results
select
  'modern_wrapper_token_accepted',
  exists (
    select 1
    from public.push_tokens
    where expo_push_token = 'ExpoPushToken[modern-synthetic-token]'
      and user_id = (select user_id from push_context where label = 'teen')
  ),
  'ExpoPushToken wrapper accepted';

-- UUID-shaped token accepted by Expo SDK is also accepted.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from push_context where label = 'teen'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from push_context where label = 'teen'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
select public.claim_push_token(
  '123e4567-e89b-12d3-a456-426614174000',
  'android',
  'teen'
);
reset role;

insert into push_results
select
  'uuid_token_accepted',
  exists (
    select 1
    from public.push_tokens
    where expo_push_token = '123e4567-e89b-12d3-a456-426614174000'
      and user_id = (select user_id from push_context where label = 'teen')
  ),
  'UUID-shaped Expo token accepted';

-- Anonymous-authenticated sessions cannot claim permanent notification state.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from push_context where label = 'anonymous_user'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from push_context where label = 'anonymous_user'),
    'role', 'authenticated',
    'is_anonymous', true
  )::text,
  true
);
set local role authenticated;
do $probe$
begin
  begin
    perform public.claim_push_token(
      'ExpoPushToken[anonymous-synthetic-token]',
      'ios',
      'teen'
    );
    insert into push_results values (
      'anonymous_claim_denied',
      false,
      'Anonymous-authenticated session unexpectedly claimed token'
    );
  exception when insufficient_privilege then
    insert into push_results values (
      'anonymous_claim_denied',
      true,
      'Anonymous-authenticated claim denied'
    );
  end;
end
$probe$;
reset role;

select check_name, passed, detail
from push_results
order by check_name;

rollback;

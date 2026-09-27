-- Se'kret Bip authenticated parent-link RPC Phase 1 proof harness
--
-- Run after the parent-link behavior migration. Every user and row is synthetic,
-- all changes are transaction-contained, and the final rollback retains nothing.

begin;

create temp table parent_link_context (
  label text primary key,
  user_id uuid not null
) on commit drop;

insert into parent_link_context(label, user_id)
values
  ('teen', gen_random_uuid()),
  ('teen_active', gen_random_uuid()),
  ('teen_suspended', gen_random_uuid()),
  ('teen_expired', gen_random_uuid()),
  ('teen_self', gen_random_uuid()),
  ('parent', gen_random_uuid()),
  ('parent_profile', gen_random_uuid()),
  ('other_parent', gen_random_uuid()),
  ('profileless', gen_random_uuid()),
  ('anonymous_teen', gen_random_uuid());

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
  label || '.parent-link-rpc@sekret.invalid',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
from parent_link_context;

-- The production auth trigger may create an app_profiles row automatically.
-- Upsert the intended synthetic profile shape, then remove the profileless fixture.
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
  case when label in ('parent', 'parent_profile', 'other_parent') then 'parent' else 'teen' end,
  case when label in ('parent', 'parent_profile', 'other_parent') then 'parent' else 'teen' end,
  'Synthetic ' || label,
  true,
  case when label not in ('parent', 'parent_profile', 'other_parent') then '16-17' else null end,
  case when label not in ('parent', 'parent_profile', 'other_parent') then 'other' else null end,
  case when label not in ('parent', 'parent_profile', 'other_parent') then 'cloud' else null end,
  case when label in ('parent', 'parent_profile', 'other_parent') then 'mom' else null end,
  case when label in ('parent', 'parent_profile', 'other_parent') then 'support' else null end
from parent_link_context
where label <> 'profileless'
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

delete from public.app_profiles
where user_id = (
  select user_id
  from parent_link_context
  where label = 'profileless'
);

insert into public.account_verification (
  user_id,
  verification_state,
  parent_link_state,
  verification_reason
)
select
  user_id,
  case
    when label = 'teen_suspended' then 'SUSPENDED'
    when label = 'teen_active' then 'VERIFIED_TEEN'
    else 'UNVERIFIED'
  end,
  case when label = 'teen_active' then 'active' else 'none' end,
  'synthetic_parent_link_probe'
from parent_link_context
on conflict (user_id) do update
set verification_state = excluded.verification_state,
    parent_link_state = excluded.parent_link_state,
    verification_reason = excluded.verification_reason;

insert into public.parent_links (
  teen_user_id,
  parent_user_id,
  is_active,
  status,
  invite_code,
  expires_at,
  created_at,
  updated_at
)
values
  (
    (select user_id from parent_link_context where label = 'teen_active'),
    (select user_id from parent_link_context where label = 'parent'),
    true,
    'active',
    null,
    null,
    now(),
    now()
  ),
  (
    (select user_id from parent_link_context where label = 'teen_expired'),
    null,
    true,
    'pending',
    'EXPIRE05',
    now() - interval '1 hour',
    now(),
    now()
  ),
  (
    (select user_id from parent_link_context where label = 'teen_self'),
    null,
    true,
    'pending',
    'SELF0005',
    now() + interval '1 hour',
    now(),
    now()
  );

create temp table parent_link_runtime (
  key text primary key,
  value text not null
) on commit drop;

create temp table parent_link_results (
  check_name text primary key,
  passed boolean not null,
  detail text not null
) on commit drop;

grant select on parent_link_context to authenticated;
grant all on parent_link_runtime, parent_link_results to authenticated;

-- A valid completed teen can create a code and regenerate it in place. The
-- canonical one-row-per-teen relationship record must be reused, not duplicated.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from parent_link_context where label = 'teen'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from parent_link_context where label = 'teen'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
insert into parent_link_runtime values ('code_one', public.create_parent_link_invite());
insert into parent_link_runtime values ('code_two', public.create_parent_link_invite());
reset role;

insert into parent_link_results
select
  'teen_invite_regenerates_in_place',
  (select value from parent_link_runtime where key = 'code_one')
    <> (select value from parent_link_runtime where key = 'code_two')
  and (
    select count(*) = 1
    from public.parent_links
    where teen_user_id = (
      select user_id from parent_link_context where label = 'teen'
    )
  )
  and coalesce((
    select invite_code = (select value from parent_link_runtime where key = 'code_two')
      and status = 'pending'
      and is_active = true
    from public.parent_links
    where teen_user_id = (
      select user_id from parent_link_context where label = 'teen'
    )
  ), false),
  'A second code replaces the first on one canonical relationship row';

-- Parent profiles cannot mint teen-side invites.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from parent_link_context where label = 'parent_profile'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from parent_link_context where label = 'parent_profile'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
do $probe$
begin
  begin
    perform public.create_parent_link_invite();
    insert into parent_link_results values (
      'parent_profile_denied',
      false,
      'A completed parent unexpectedly created a teen-side invite'
    );
  exception when insufficient_privilege then
    insert into parent_link_results values (
      'parent_profile_denied',
      true,
      'Completed parent profile denied'
    );
  end;
end
$probe$;
reset role;

-- A permanent account without a completed app profile is also denied.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from parent_link_context where label = 'profileless'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from parent_link_context where label = 'profileless'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
do $probe$
begin
  begin
    perform public.create_parent_link_invite();
    insert into parent_link_results values (
      'profileless_denied',
      false,
      'Profile-less account unexpectedly created an invite'
    );
  exception when insufficient_privilege then
    insert into parent_link_results values (
      'profileless_denied',
      true,
      'Profile-less account denied'
    );
  end;
end
$probe$;
reset role;

-- Anonymous-authenticated sessions must not reach permanent relationship state.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from parent_link_context where label = 'anonymous_teen'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from parent_link_context where label = 'anonymous_teen'),
    'role', 'authenticated',
    'is_anonymous', true
  )::text,
  true
);
set local role authenticated;
do $probe$
begin
  begin
    perform public.create_parent_link_invite();
    insert into parent_link_results values (
      'anonymous_teen_denied',
      false,
      'Anonymous-authenticated teen unexpectedly created an invite'
    );
  exception when insufficient_privilege then
    insert into parent_link_results values (
      'anonymous_teen_denied',
      true,
      'Anonymous-authenticated teen denied'
    );
  end;
end
$probe$;
reset role;

-- Suspended or manual-review users cannot create a fresh relationship token.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from parent_link_context where label = 'teen_suspended'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from parent_link_context where label = 'teen_suspended'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
do $probe$
begin
  begin
    perform public.create_parent_link_invite();
    insert into parent_link_results values (
      'suspended_teen_denied',
      false,
      'Suspended teen unexpectedly created an invite'
    );
  exception when insufficient_privilege then
    insert into parent_link_results values (
      'suspended_teen_denied',
      true,
      'Suspended teen denied'
    );
  end;
end
$probe$;
reset role;

-- An active relationship requires explicit revocation before relinking.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from parent_link_context where label = 'teen_active'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from parent_link_context where label = 'teen_active'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
do $probe$
begin
  begin
    perform public.create_parent_link_invite();
    insert into parent_link_results values (
      'active_link_replacement_denied',
      false,
      'An active parent relationship was silently replaced'
    );
  exception when insufficient_privilege then
    insert into parent_link_results values (
      'active_link_replacement_denied',
      true,
      'Active relationship preserved until explicit revoke'
    );
  end;
end
$probe$;
reset role;

-- Expiration must commit even though the client receives no linked teen row.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from parent_link_context where label = 'other_parent'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from parent_link_context where label = 'other_parent'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
insert into parent_link_runtime values (
  'expired_returned_rows',
  (select count(*)::text from public.redeem_parent_link_invite('EXPIRE05'))
);
reset role;

insert into parent_link_results
select
  'expired_invite_commits_expiration',
  (select value = '0' from parent_link_runtime where key = 'expired_returned_rows')
  and coalesce((
    select status = 'expired'
      and is_active = false
      and invite_code is null
    from public.parent_links
    where teen_user_id = (
      select user_id from parent_link_context where label = 'teen_expired'
    )
  ), false)
  and coalesce((
    select verification_state = 'EXPIRED'
      and parent_link_state = 'expired'
    from public.account_verification
    where user_id = (
      select user_id from parent_link_context where label = 'teen_expired'
    )
  ), false),
  'Expired invite returns no row while persisting link and verification expiration';

-- A teen cannot redeem their own relationship code.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from parent_link_context where label = 'teen_self'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from parent_link_context where label = 'teen_self'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
do $probe$
begin
  begin
    perform public.redeem_parent_link_invite('SELF0005');
    insert into parent_link_results values (
      'self_link_denied',
      false,
      'Teen unexpectedly redeemed their own invite'
    );
  exception when insufficient_privilege then
    insert into parent_link_results values (
      'self_link_denied',
      true,
      'Self-link denied'
    );
  end;
end
$probe$;
reset role;

-- The regenerated valid code is consumed exactly once and mutates only its teen.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from parent_link_context where label = 'parent'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from parent_link_context where label = 'parent'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
insert into parent_link_runtime values (
  'valid_returned_rows',
  (
    select count(*)::text
    from public.redeem_parent_link_invite(
      (select value from parent_link_runtime where key = 'code_two')
    )
  )
);
reset role;

insert into parent_link_results
select
  'valid_redemption_is_one_time_and_self_scoped',
  (select value = '1' from parent_link_runtime where key = 'valid_returned_rows')
  and coalesce((
    select status = 'active'
      and parent_user_id = (
        select user_id from parent_link_context where label = 'parent'
      )
      and invite_code is null
    from public.parent_links
    where teen_user_id = (
      select user_id from parent_link_context where label = 'teen'
    )
  ), false)
  and coalesce((
    select verification_state = 'VERIFIED_TEEN'
    from public.account_verification
    where user_id = (
      select user_id from parent_link_context where label = 'teen'
    )
  ), false)
  and coalesce((
    select verification_state = 'UNVERIFIED'
    from public.account_verification
    where user_id = (
      select user_id from parent_link_context where label = 'anonymous_teen'
    )
  ), false),
  'Valid redemption consumes the code and changes only the selected teen';

-- The consumed code is unavailable to a second caller.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from parent_link_context where label = 'other_parent'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from parent_link_context where label = 'other_parent'),
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
      (select value from parent_link_runtime where key = 'code_two')
    );
    insert into parent_link_results values (
      'used_invite_denied',
      false,
      'A second caller unexpectedly reused a consumed code'
    );
  exception when others then
    insert into parent_link_results values (
      'used_invite_denied',
      true,
      'Consumed code denied to a second caller'
    );
  end;
end
$probe$;
reset role;

select check_name, passed, detail
from parent_link_results
order by check_name;

rollback;

-- Se'kret Bip family-account authority Phase 1 proof harness
--
-- Proves the current authority model against a freshly replayed database:
--   * permanent auth identities receive onboarding state server-side;
--   * anonymous preview identities do not until upgraded to permanent;
--   * parent-link lifecycle changes relationship state only, never teen verification;
--   * Bip Jr is a verified-parent-managed profile with an explicit consent receipt;
--   * cross-guardian access and mutation remain denied.
--
-- All identities are synthetic and every write is rolled back.

begin;

create temp table family_authority_context (
  label text primary key,
  user_id uuid not null
) on commit drop;

insert into family_authority_context(label, user_id)
values
  ('teen', gen_random_uuid()),
  ('parent', gen_random_uuid()),
  ('other_parent', gen_random_uuid()),
  ('unverified_parent', gen_random_uuid()),
  ('anonymous_preview', gen_random_uuid()),
  ('anonymous_upgrade', gen_random_uuid());

grant select on family_authority_context to authenticated;

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
  label || '.family-authority@sekret.invalid',
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
  label in ('anonymous_preview', 'anonymous_upgrade')
from family_authority_context;

create temp table family_authority_results (
  check_name text primary key,
  passed boolean not null,
  detail text not null
) on commit drop;

create temp table family_authority_runtime (
  key text primary key,
  value text not null
) on commit drop;

grant all on family_authority_results, family_authority_runtime to authenticated;

-- Permanent signups must be provisioned by the auth.users trigger even before
-- a client-side authenticated session exists.
insert into family_authority_results
select
  'permanent_signup_gets_server_onboarding_baseline',
  (
    select count(*) = 4
    from public.user_onboarding_state uos
    join family_authority_context c on c.user_id = uos.user_id
    where c.label in ('teen', 'parent', 'other_parent', 'unverified_parent')
      and uos.stage = 'signed_up'
  ),
  'All permanent synthetic identities have signed_up onboarding rows';

insert into family_authority_results
select
  'anonymous_preview_does_not_get_permanent_onboarding_baseline',
  not exists (
    select 1
    from public.user_onboarding_state uos
    join family_authority_context c on c.user_id = uos.user_id
    where c.label = 'anonymous_preview'
  ),
  'Anonymous preview identity is excluded from permanent onboarding authority';

update auth.users
set is_anonymous = false,
    updated_at = now()
where id = (select user_id from family_authority_context where label = 'anonymous_upgrade');

insert into family_authority_results
select
  'anonymous_upgrade_gets_onboarding_baseline_once_permanent',
  coalesce((
    select stage = 'signed_up'
    from public.user_onboarding_state
    where user_id = (select user_id from family_authority_context where label = 'anonymous_upgrade')
  ), false),
  'Anonymous-to-permanent upgrade creates the server-owned onboarding baseline';

-- Establish the synthetic product-side account shapes used by the RPCs.
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
  case when label = 'teen' then 'teen' else 'parent' end,
  case when label = 'teen' then 'teen' else 'parent' end,
  'Synthetic ' || label,
  true,
  case when label = 'teen' then '16-17' else null end,
  case when label = 'teen' then 'other' else null end,
  case when label = 'teen' then 'cloud' else null end,
  case when label <> 'teen' then 'mom' else null end,
  case when label <> 'teen' then 'support' else null end
from family_authority_context
where label in ('teen', 'parent', 'other_parent', 'unverified_parent')
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

insert into public.account_verification (
  user_id,
  verification_state,
  parent_link_state,
  verification_reason
)
select
  user_id,
  case
    when label in ('parent', 'other_parent') then 'VERIFIED_GUARDIAN'
    else 'UNVERIFIED'
  end,
  'none',
  'synthetic_family_authority_probe'
from family_authority_context
where label in ('teen', 'parent', 'other_parent', 'unverified_parent')
on conflict (user_id) do update
set verification_state = excluded.verification_state,
    parent_link_state = excluded.parent_link_state,
    verification_reason = excluded.verification_reason;

-- Teen creates the relationship invitation. Verification remains independent.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from family_authority_context where label = 'teen'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from family_authority_context where label = 'teen'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
insert into family_authority_runtime(key, value)
values ('parent_link_code', public.create_parent_link_invite());
reset role;

insert into family_authority_results
select
  'teen_invite_changes_relationship_not_verification',
  coalesce((
    select verification_state = 'UNVERIFIED'
      and parent_link_state = 'pending'
    from public.account_verification
    where user_id = (select user_id from family_authority_context where label = 'teen')
  ), false),
  'Invite creation leaves teen verification independent while relationship becomes pending';

-- Verified Parent redeems the teen-issued code. The relationship becomes active
-- but must never mint VERIFIED_TEEN.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from family_authority_context where label = 'parent'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from family_authority_context where label = 'parent'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
insert into family_authority_runtime(key, value)
select
  'redeemed_rows',
  count(*)::text
from public.redeem_parent_link_invite(
  (select value from family_authority_runtime where key = 'parent_link_code')
);
reset role;

insert into family_authority_results
select
  'parent_redemption_activates_relationship_without_minting_teen_verification',
  (select value = '1' from family_authority_runtime where key = 'redeemed_rows')
  and coalesce((
    select verification_state = 'UNVERIFIED'
      and parent_link_state = 'active'
    from public.account_verification
    where user_id = (select user_id from family_authority_context where label = 'teen')
  ), false)
  and coalesce((
    select status = 'active'
      and is_active = true
      and parent_user_id = (select user_id from family_authority_context where label = 'parent')
    from public.parent_links
    where teen_user_id = (select user_id from family_authority_context where label = 'teen')
  ), false),
  'Parent redemption activates only the teen-issued relationship';

-- The linked teen can revoke the relationship without losing or gaining
-- independent verification authority.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from family_authority_context where label = 'teen'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from family_authority_context where label = 'teen'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
insert into family_authority_runtime(key, value)
values ('teen_revoked', public.revoke_parent_link()::text);
reset role;

insert into family_authority_results
select
  'teen_revoke_changes_relationship_not_verification',
  (select value = 'true' from family_authority_runtime where key = 'teen_revoked')
  and coalesce((
    select verification_state = 'UNVERIFIED'
      and parent_link_state = 'revoked'
    from public.account_verification
    where user_id = (select user_id from family_authority_context where label = 'teen')
  ), false),
  'Teen revocation changes only the relationship state';

-- Verified guardian creates a supervised Bip Jr profile plus consent receipt.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from family_authority_context where label = 'parent'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from family_authority_context where label = 'parent'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
insert into family_authority_runtime(key, value)
select 'jr_child_id', id::text
from public.create_own_jr_child_profile('Eve Probe', '5-7');
reset role;

insert into family_authority_results
select
  'verified_parent_creates_managed_jr_profile_with_consent_receipt',
  exists (
    select 1
    from public.jr_child_profiles child
    join public.jr_parental_consent_receipts receipt
      on receipt.child_profile_id = child.id
    where child.id = (select value::uuid from family_authority_runtime where key = 'jr_child_id')
      and child.guardian_user_id = (select user_id from family_authority_context where label = 'parent')
      and child.display_alias = 'Eve Probe'
      and child.age_band = '5-7'
      and child.status = 'active'
      and receipt.guardian_user_id = child.guardian_user_id
      and receipt.consent_version = 'bip-jr-parental-consent-v1'
      and receipt.revoked_at is null
  )
  and not exists (
    select 1
    from auth.users
    where id = (select value::uuid from family_authority_runtime where key = 'jr_child_id')
  ),
  'Bip Jr identity is a managed child profile, not a child auth user';

-- An unverified Parent account cannot create a child profile.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from family_authority_context where label = 'unverified_parent'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from family_authority_context where label = 'unverified_parent'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
do $probe$
begin
  begin
    perform public.create_own_jr_child_profile('Denied Probe', '5-7');
    insert into family_authority_results values (
      'unverified_parent_cannot_create_jr_profile',
      false,
      'Unverified Parent unexpectedly created a Bip Jr profile'
    );
  exception when insufficient_privilege then
    insert into family_authority_results values (
      'unverified_parent_cannot_create_jr_profile',
      true,
      'Unverified Parent correctly denied'
    );
  end;
end
$probe$;
reset role;

-- Another verified guardian cannot see or archive the first guardian's child.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from family_authority_context where label = 'other_parent'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from family_authority_context where label = 'other_parent'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
insert into family_authority_runtime(key, value)
select 'other_guardian_visible_children', count(*)::text
from public.jr_child_profiles
where id = (select value::uuid from family_authority_runtime where key = 'jr_child_id');
insert into family_authority_runtime(key, value)
values (
  'other_guardian_archive',
  public.archive_own_jr_child_profile(
    (select value::uuid from family_authority_runtime where key = 'jr_child_id')
  )::text
);
reset role;

insert into family_authority_results
select
  'cross_guardian_child_access_and_archive_are_denied',
  (select value = '0' from family_authority_runtime where key = 'other_guardian_visible_children')
  and (select value = 'false' from family_authority_runtime where key = 'other_guardian_archive'),
  'A different verified guardian cannot read or archive the child profile';

-- Owner can archive and the explicit consent receipt records revocation.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from family_authority_context where label = 'parent'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from family_authority_context where label = 'parent'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
insert into family_authority_runtime(key, value)
values (
  'owner_archive',
  public.archive_own_jr_child_profile(
    (select value::uuid from family_authority_runtime where key = 'jr_child_id')
  )::text
);
reset role;

insert into family_authority_results
select
  'owner_archive_revokes_jr_consent_receipt',
  (select value = 'true' from family_authority_runtime where key = 'owner_archive')
  and coalesce((
    select status = 'archived' and archived_at is not null
    from public.jr_child_profiles
    where id = (select value::uuid from family_authority_runtime where key = 'jr_child_id')
  ), false)
  and coalesce((
    select revoked_at is not null
    from public.jr_parental_consent_receipts
    where child_profile_id = (select value::uuid from family_authority_runtime where key = 'jr_child_id')
  ), false),
  'Owner archival closes the managed profile and records consent revocation';

-- Fail closed with one distinct receipt per behavior check.
do $assertions$
declare
  v_failed text;
begin
  select string_agg(check_name || ': ' || detail, E'\n' order by check_name)
  into v_failed
  from family_authority_results
  where passed is not true;

  if v_failed is not null then
    raise exception 'family authority proof failed:%', E'\n' || v_failed;
  end if;
end
$assertions$;

table family_authority_results;

rollback;

-- Se'kret Bip authenticated parent-link revoke Phase 1 proof harness
--
-- Run after the revoke hardening migration. All users and relationship rows are
-- synthetic, and the final rollback retains no production data.

begin;

create temp table revoke_context (
  label text primary key,
  user_id uuid not null
) on commit drop;

insert into revoke_context(label, user_id)
values
  ('teen_normal', gen_random_uuid()),
  ('teen_parent_revoke', gen_random_uuid()),
  ('teen_suspended', gen_random_uuid()),
  ('teen_manual', gen_random_uuid()),
  ('parent_normal', gen_random_uuid()),
  ('parent_suspended_link', gen_random_uuid()),
  ('unrelated', gen_random_uuid()),
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
  label || '.parent-link-revoke@sekret.invalid',
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
from revoke_context;

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
  case when label like 'parent_%' then 'parent' else 'teen' end,
  case when label like 'parent_%' then 'parent' else 'teen' end,
  'Synthetic ' || label,
  true,
  case when label not like 'parent_%' then '16-17' else null end,
  case when label not like 'parent_%' then 'other' else null end,
  case when label not like 'parent_%' then 'cloud' else null end,
  case when label like 'parent_%' then 'mom' else null end,
  case when label like 'parent_%' then 'support' else null end
from revoke_context
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
    when label = 'teen_suspended' then 'SUSPENDED'
    when label = 'teen_manual' then 'MANUAL_REVIEW'
    when label like 'teen_%' then 'VERIFIED_TEEN'
    else 'UNVERIFIED'
  end,
  case when label like 'teen_%' then 'active' else 'none' end,
  case
    when label = 'teen_suspended' then 'safety_hold'
    when label = 'teen_manual' then 'manual_case'
    else 'synthetic_parent_link_revoke_probe'
  end
from revoke_context
on conflict (user_id) do update
set verification_state = excluded.verification_state,
    parent_link_state = excluded.parent_link_state,
    verification_reason = excluded.verification_reason;

create temp table revoke_links (
  label text primary key,
  link_id uuid not null
) on commit drop;

with inserted_links as (
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
      (select user_id from revoke_context where label = 'teen_normal'),
      (select user_id from revoke_context where label = 'parent_normal'),
      true,
      'active',
      null,
      null,
      now(),
      now()
    ),
    (
      (select user_id from revoke_context where label = 'teen_parent_revoke'),
      (select user_id from revoke_context where label = 'parent_normal'),
      true,
      'active',
      null,
      null,
      now() - interval '1 minute',
      now() - interval '1 minute'
    ),
    (
      (select user_id from revoke_context where label = 'teen_suspended'),
      (select user_id from revoke_context where label = 'parent_suspended_link'),
      true,
      'active',
      null,
      null,
      now(),
      now()
    ),
    (
      (select user_id from revoke_context where label = 'teen_manual'),
      null,
      true,
      'pending',
      'MANUAL03',
      now() + interval '1 hour',
      now(),
      now()
    )
  returning id, teen_user_id
)
insert into revoke_links(label, link_id)
select
  case teen_user_id
    when (select user_id from revoke_context where label = 'teen_normal') then 'normal'
    when (select user_id from revoke_context where label = 'teen_parent_revoke') then 'parent_revoke'
    when (select user_id from revoke_context where label = 'teen_suspended') then 'suspended'
    else 'manual'
  end,
  id
from inserted_links;

create temp table revoke_results (
  check_name text primary key,
  passed boolean not null,
  detail text not null
) on commit drop;

grant select on revoke_context, revoke_links to authenticated;
grant all on revoke_results to authenticated;

-- The teen can revoke their own active relationship.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from revoke_context where label = 'teen_normal'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from revoke_context where label = 'teen_normal'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
insert into revoke_results
select
  'teen_can_revoke_own_active_link',
  public.revoke_parent_link(
    (select link_id from revoke_links where label = 'normal')
  ),
  'Teen-owned active link revoke returned true';
reset role;

insert into revoke_results
select
  'normal_revoke_updates_link_and_verification',
  coalesce((
    select status = 'revoked'
      and is_active = false
      and invite_code is null
      and expires_at is null
    from public.parent_links
    where id = (select link_id from revoke_links where label = 'normal')
  ), false)
  and coalesce((
    select verification_state = 'PENDING_PARENT'
      and parent_link_state = 'revoked'
      and verification_reason = 'parent_link_revoked'
    from public.account_verification
    where user_id = (
      select user_id from revoke_context where label = 'teen_normal'
    )
  ), false),
  'Normal revoke transitions relationship and verification state';

-- A linked parent can remove their active relationship consent.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from revoke_context where label = 'parent_normal'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from revoke_context where label = 'parent_normal'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
insert into revoke_results
select
  'linked_parent_can_revoke_active_link',
  public.revoke_parent_link(
    (select link_id from revoke_links where label = 'parent_revoke')
  ),
  'Linked parent revoke returned true';
reset role;

-- An unrelated permanent user receives false and cannot mutate the row.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from revoke_context where label = 'unrelated'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from revoke_context where label = 'unrelated'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
insert into revoke_results
select
  'unrelated_user_denied_without_mutation',
  public.revoke_parent_link(
    (select link_id from revoke_links where label = 'suspended')
  ) = false,
  'Unrelated caller received false';
reset role;

-- Anonymous-authenticated sessions are denied before relationship lookup.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from revoke_context where label = 'anonymous_user'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from revoke_context where label = 'anonymous_user'),
    'role', 'authenticated',
    'is_anonymous', true
  )::text,
  true
);
set local role authenticated;
do $probe$
begin
  begin
    perform public.revoke_parent_link(
      (select link_id from revoke_links where label = 'suspended')
    );
    insert into revoke_results values (
      'anonymous_session_denied',
      false,
      'Anonymous-authenticated caller unexpectedly reached revoke'
    );
  exception when insufficient_privilege then
    insert into revoke_results values (
      'anonymous_session_denied',
      true,
      'Anonymous-authenticated caller denied'
    );
  end;
end
$probe$;
reset role;

-- The linked parent may remove consent from a suspended teen, but the safety
-- state and reason must survive independently from the link dimension.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from revoke_context where label = 'parent_suspended_link'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from revoke_context where label = 'parent_suspended_link'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
insert into revoke_results
select
  'suspended_link_revoke_returns_true',
  public.revoke_parent_link(
    (select link_id from revoke_links where label = 'suspended')
  ),
  'Linked parent removed relationship consent';
reset role;

insert into revoke_results
select
  'suspended_state_and_reason_preserved_after_revoke',
  coalesce((
    select verification_state = 'SUSPENDED'
      and parent_link_state = 'revoked'
      and verification_reason = 'safety_hold'
    from public.account_verification
    where user_id = (
      select user_id from revoke_context where label = 'teen_suspended'
    )
  ), false),
  'Suspension and safety reason survived relationship revocation';

-- A manual-review teen may revoke a pending invite without clearing review.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from revoke_context where label = 'teen_manual'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from revoke_context where label = 'teen_manual'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
insert into revoke_results
select
  'manual_review_pending_revoke_returns_true',
  public.revoke_parent_link(
    (select link_id from revoke_links where label = 'manual')
  ),
  'Manual-review teen removed pending consent';
reset role;

insert into revoke_results
select
  'manual_review_state_and_reason_preserved_after_revoke',
  coalesce((
    select verification_state = 'MANUAL_REVIEW'
      and parent_link_state = 'revoked'
      and verification_reason = 'manual_case'
    from public.account_verification
    where user_id = (
      select user_id from revoke_context where label = 'teen_manual'
    )
  ), false),
  'Manual review and review reason survived relationship revocation';

-- Retrying the explicit revoke is a safe false/no-op rather than a mutation.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from revoke_context where label = 'teen_normal'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from revoke_context where label = 'teen_normal'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
insert into revoke_results
select
  'repeated_revoke_is_safe_noop',
  public.revoke_parent_link(
    (select link_id from revoke_links where label = 'normal')
  ) = false,
  'Second explicit revoke returned false without another mutation';
reset role;

select check_name, passed, detail
from revoke_results
order by check_name;

rollback;

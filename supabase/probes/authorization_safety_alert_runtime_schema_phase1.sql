-- Se'kret Bip safety-alert runtime-schema proof harness
-- Synthetic identities only. Transaction-contained; final rollback retains nothing.

begin;

create temp table safety_runtime_context (
  label text primary key,
  user_id uuid not null
) on commit drop;

insert into safety_runtime_context(label, user_id)
values
  ('teen', gen_random_uuid()),
  ('parent', gen_random_uuid()),
  ('stranger', gen_random_uuid());

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
  label || '.safety-runtime@sekret.invalid',
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
from safety_runtime_context;

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
values (
  (select user_id from safety_runtime_context where label = 'teen'),
  (select user_id from safety_runtime_context where label = 'parent'),
  true,
  'active',
  null,
  null,
  now(),
  now()
);

create temp table safety_runtime_results (
  check_name text primary key,
  passed boolean not null,
  detail text not null
) on commit drop;

grant select on safety_runtime_context to authenticated;
grant all on safety_runtime_results to authenticated;

-- Service-side canonical insert must work without legacy parent/title/summary fields.
insert into public.safety_alerts (
  user_id,
  alert_type,
  source_table,
  source_id,
  severity,
  scan_metadata
)
values (
  (select user_id from safety_runtime_context where label = 'teen'),
  'moderation',
  'journal_entries',
  'synthetic-source-id',
  'high',
  '{"flagged":true,"provider":"synthetic"}'::jsonb
);

insert into safety_runtime_results
select
  'canonical_service_insert_allowed',
  count(*) = 1,
  'Canonical service-side alert inserted without legacy required fields'
from public.safety_alerts
where user_id = (select user_id from safety_runtime_context where label = 'teen');

-- Teen owner can read the server-created row.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from safety_runtime_context where label = 'teen'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from safety_runtime_context where label = 'teen'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
insert into safety_runtime_results
select
  'teen_owner_read_allowed',
  count(*) = 1,
  'Teen owner can read their server-created alert'
from public.safety_alerts
where user_id = (select user_id from safety_runtime_context where label = 'teen');
reset role;

-- Active linked parent can read the row.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from safety_runtime_context where label = 'parent'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from safety_runtime_context where label = 'parent'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
insert into safety_runtime_results
select
  'linked_parent_read_allowed',
  count(*) = 1,
  'Current active linked parent can read the teen safety alert'
from public.safety_alerts
where user_id = (select user_id from safety_runtime_context where label = 'teen');
reset role;

-- An unrelated authenticated user cannot read the row.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from safety_runtime_context where label = 'stranger'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from safety_runtime_context where label = 'stranger'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
insert into safety_runtime_results
select
  'unrelated_user_read_denied',
  count(*) = 0,
  'Unrelated account cannot read the teen safety alert'
from public.safety_alerts
where user_id = (select user_id from safety_runtime_context where label = 'teen');
reset role;

-- Clients cannot manufacture safety alerts directly; creation is service-side.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from safety_runtime_context where label = 'teen'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from safety_runtime_context where label = 'teen'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
do $probe$
begin
  begin
    insert into public.safety_alerts (
      user_id,
      alert_type,
      source_table,
      source_id,
      severity
    ) values (
      (select user_id from safety_runtime_context where label = 'teen'),
      'moderation',
      'journal_entries',
      'client-forged-source',
      'low'
    );

    insert into safety_runtime_results values (
      'authenticated_client_insert_denied',
      false,
      'Authenticated client unexpectedly inserted a safety alert'
    );
  exception when insufficient_privilege then
    insert into safety_runtime_results values (
      'authenticated_client_insert_denied',
      true,
      'Authenticated client insert denied'
    );
  end;
end
$probe$;
reset role;

-- Relationship revocation removes parent visibility immediately.
update public.parent_links
set status = 'revoked',
    is_active = false,
    updated_at = now()
where teen_user_id = (select user_id from safety_runtime_context where label = 'teen');

select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from safety_runtime_context where label = 'parent'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from safety_runtime_context where label = 'parent'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;
insert into safety_runtime_results
select
  'revoked_parent_read_denied',
  count(*) = 0,
  'Parent visibility disappears immediately after relationship revoke'
from public.safety_alerts
where user_id = (select user_id from safety_runtime_context where label = 'teen');
reset role;

-- Make failures fatal for automated proof.
do $assert$
declare
  v_failed integer;
  v_total integer;
begin
  select count(*) into v_failed
  from safety_runtime_results
  where passed is not true;

  select count(*) into v_total
  from safety_runtime_results;

  if v_total <> 6 then
    raise exception 'expected 6 safety runtime checks, got %', v_total;
  end if;

  if v_failed <> 0 then
    raise exception 'safety runtime proof failed: % check(s) failed', v_failed;
  end if;
end
$assert$;

select *
from safety_runtime_results
order by check_name;

rollback;

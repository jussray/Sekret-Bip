-- Se'kret Bip L3 agent-memory authorization proof.
-- Runs only against the ephemeral local Supabase database in PR CI.
-- Creates two synthetic auth users and synthetic memories inside one transaction.
-- No production identity, content, credential or persistent row is used.
-- Final statement is ROLLBACK, never COMMIT.

begin;

create temp table l3_memory_results (
  check_name text primary key,
  passed boolean not null,
  detail text not null
) on commit drop;
grant all on l3_memory_results to authenticated;

insert into auth.users(id, is_anonymous, created_at, updated_at)
values
  ('10000000-0000-4000-8000-000000000001', false, now(), now()),
  ('20000000-0000-4000-8000-000000000002', false, now(), now());

insert into public.agent_memories(
  id, user_id, scope, companion_id, kind, summary,
  provenance_kind, provenance_source_id, provenance_source_created_at,
  sensitivity, review_state, lifecycle_state, confidence,
  consent_version, integrity_fingerprint, admission_reviewed_at,
  retention_mode, expires_at
)
values
  (
    'a0000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'companion', 'raylene', 'semantic', 'synthetic owner A memory',
    'user_message', 'synthetic-a', now(),
    'ordinary', 'user_confirmed', 'active', 1.000,
    'probe-v1', repeat('a', 64), now(),
    'expires', now() + interval '1 hour'
  ),
  (
    'b0000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    'companion', 'raylene', 'semantic', 'synthetic owner B memory',
    'user_message', 'synthetic-b', now(),
    'ordinary', 'user_confirmed', 'active', 1.000,
    'probe-v1', repeat('b', 64), now(),
    'expires', now() + interval '1 hour'
  );

-- Permanent User A: own row visible, User B row hidden.
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

do $probe$
declare
  own_count integer;
  other_count integer;
  delete_other boolean;
  direct_write_denied boolean := false;
begin
  select count(*) into own_count
  from public.agent_memories
  where id = 'a0000000-0000-4000-8000-000000000001';

  select count(*) into other_count
  from public.agent_memories
  where id = 'b0000000-0000-4000-8000-000000000002';

  insert into l3_memory_results values
    ('owner_select_allowed', own_count = 1, 'Permanent User A can select only its own seeded memory'),
    ('cross_user_select_denied', other_count = 0, 'Permanent User A cannot select User B memory');

  begin
    insert into public.agent_memories(
      user_id, scope, companion_id, kind, summary,
      provenance_kind, provenance_source_id, provenance_source_created_at,
      sensitivity, review_state, lifecycle_state, confidence,
      consent_version, integrity_fingerprint, admission_reviewed_at,
      retention_mode, expires_at
    ) values (
      '10000000-0000-4000-8000-000000000001',
      'companion', 'raylene', 'semantic', 'direct client write must fail',
      'user_message', 'direct-write', now(),
      'ordinary', 'user_confirmed', 'active', 1.000,
      'probe-v1', repeat('c', 64), now(),
      'expires', now() + interval '1 hour'
    );
  exception when insufficient_privilege then
    direct_write_denied := true;
  end;

  insert into l3_memory_results values
    ('direct_authenticated_insert_denied', direct_write_denied, 'Authenticated clients have SELECT only; admission writes stay server-side');

  select public.delete_own_agent_memory('b0000000-0000-4000-8000-000000000002')
    into delete_other;
  insert into l3_memory_results values
    ('cross_user_delete_denied', delete_other is false, 'Owner-delete RPC cannot delete another user memory');
end
$probe$;

reset role;

-- Anonymous-authenticated form of User A: no row visibility and no delete authority.
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":true}',
  true
);
set local role authenticated;

do $probe$
declare
  visible_count integer;
  anonymous_delete_denied boolean := false;
begin
  select count(*) into visible_count from public.agent_memories;
  insert into l3_memory_results values
    ('anonymous_select_denied', visible_count = 0, 'Anonymous-authenticated session sees zero durable memories');

  begin
    perform public.delete_own_agent_memory('a0000000-0000-4000-8000-000000000001');
  exception when insufficient_privilege then
    anonymous_delete_denied := true;
  end;

  insert into l3_memory_results values
    ('anonymous_delete_denied', anonymous_delete_denied, 'Permanent-account guard rejects anonymous-authenticated delete RPC');
end
$probe$;

reset role;

-- Restore User A permanent claims and prove own forget works.
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

do $probe$
declare
  deleted boolean;
  remaining integer;
begin
  select public.delete_own_agent_memory('a0000000-0000-4000-8000-000000000001') into deleted;
  select count(*) into remaining
  from public.agent_memories
  where id = 'a0000000-0000-4000-8000-000000000001';

  insert into l3_memory_results values
    ('owner_delete_allowed', deleted and remaining = 0, 'Permanent owner can forget its own memory through bounded RPC');
end
$probe$;

reset role;

do $probe$
begin
  if exists (select 1 from l3_memory_results where passed is false) then
    raise exception 'L3 agent-memory authorization probe failed';
  end if;
end
$probe$;

select check_name, passed, detail
from l3_memory_results
order by check_name;

rollback;

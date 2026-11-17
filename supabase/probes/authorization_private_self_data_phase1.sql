-- Se'kret Bip private self-data authorization Phase 1 proof harness
--
-- Purpose:
--   Prove anonymous Supabase Auth sessions cannot write private comfort-session
--   or room-memory rows while permanent account owners retain CRUD access.
--
-- Safety:
--   * Reuses one existing permanent account only as an authorization fixture.
--   * Creates no auth users.
--   * Writes synthetic application rows only inside this transaction.
--   * Returns no user IDs, emails, private content, or secrets.
--   * Final statement is ROLLBACK, never COMMIT.

begin;

create temp table private_self_context (
  user_id uuid not null
) on commit drop;

insert into private_self_context(user_id)
select u.id
from auth.users u
where coalesce(u.is_anonymous, false) is false
  and u.deleted_at is null
order by u.created_at
limit 1;

do $probe$
begin
  if not exists (select 1 from private_self_context) then
    raise exception 'Private self-data probe requires one permanent account fixture';
  end if;
end
$probe$;

grant select on private_self_context to authenticated;

create temp table private_self_results (
  check_name text primary key,
  passed boolean not null,
  detail text not null
) on commit drop;

grant all on private_self_results to authenticated;

-- Same identity, but carrying an anonymous-auth claim: both writes must fail.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from private_self_context),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from private_self_context),
    'role', 'authenticated',
    'is_anonymous', true
  )::text,
  true
);
set local role authenticated;

do $probe$
declare
  v_user uuid := (select user_id from private_self_context);
begin
  begin
    insert into public.comfort_sessions(user_id, id, type, mood, date, time)
    values (v_user, -9000000000000000001, 'comfort', 'probe', '2099-01-01', '00:00');
    insert into private_self_results values (
      'anonymous_comfort_write_denied', false,
      'Anonymous-authenticated session unexpectedly wrote a comfort session'
    );
  exception when insufficient_privilege then
    insert into private_self_results values (
      'anonymous_comfort_write_denied', true,
      'Permanent-account RLS denied anonymous-authenticated comfort write'
    );
  end;

  begin
    insert into public.room_memory(user_id, character, visit_count)
    values (v_user, 'raylene', 987654321)
    on conflict (user_id) do update
      set visit_count = excluded.visit_count;
    insert into private_self_results values (
      'anonymous_room_memory_write_denied', false,
      'Anonymous-authenticated session unexpectedly wrote room memory'
    );
  exception when insufficient_privilege then
    insert into private_self_results values (
      'anonymous_room_memory_write_denied', true,
      'Permanent-account RLS denied anonymous-authenticated room-memory write'
    );
  end;
end
$probe$;

reset role;

-- Same identity with a permanent-account claim: owner access must still work.
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from private_self_context),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;

do $probe$
declare
  v_user uuid := (select user_id from private_self_context);
  v_count integer;
begin
  insert into public.comfort_sessions(user_id, id, type, mood, date, time)
  values (v_user, -9000000000000000001, 'comfort', 'probe', '2099-01-01', '00:00')
  on conflict (user_id, id) do update set mood = excluded.mood;

  select count(*) into v_count
  from public.comfort_sessions
  where user_id = v_user and id = -9000000000000000001;

  insert into private_self_results values (
    'permanent_comfort_owner_write_allowed', v_count = 1,
    'Permanent owner can write and read its own comfort-session row'
  );

  insert into public.room_memory(user_id, character, visit_count)
  values (v_user, 'raylene', 987654321)
  on conflict (user_id) do update
    set visit_count = excluded.visit_count;

  select count(*) into v_count
  from public.room_memory
  where user_id = v_user and visit_count = 987654321;

  insert into private_self_results values (
    'permanent_room_memory_owner_write_allowed', v_count = 1,
    'Permanent owner can write and read its own room-memory row'
  );
end
$probe$;

reset role;

insert into private_self_results values
  (
    'comfort_table_grants_least_privilege',
    not has_table_privilege('anon', 'public.comfort_sessions', 'SELECT')
      and not has_table_privilege('anon', 'public.comfort_sessions', 'INSERT')
      and has_table_privilege('authenticated', 'public.comfort_sessions', 'SELECT')
      and has_table_privilege('authenticated', 'public.comfort_sessions', 'INSERT')
      and has_table_privilege('authenticated', 'public.comfort_sessions', 'UPDATE')
      and has_table_privilege('authenticated', 'public.comfort_sessions', 'DELETE')
      and not has_table_privilege('authenticated', 'public.comfort_sessions', 'TRUNCATE')
      and not has_table_privilege('authenticated', 'public.comfort_sessions', 'REFERENCES')
      and not has_table_privilege('authenticated', 'public.comfort_sessions', 'TRIGGER'),
    'Anonymous role has no table grant; authenticated receives CRUD only'
  ),
  (
    'room_memory_table_grants_least_privilege',
    not has_table_privilege('anon', 'public.room_memory', 'SELECT')
      and not has_table_privilege('anon', 'public.room_memory', 'INSERT')
      and has_table_privilege('authenticated', 'public.room_memory', 'SELECT')
      and has_table_privilege('authenticated', 'public.room_memory', 'INSERT')
      and has_table_privilege('authenticated', 'public.room_memory', 'UPDATE')
      and has_table_privilege('authenticated', 'public.room_memory', 'DELETE')
      and not has_table_privilege('authenticated', 'public.room_memory', 'TRUNCATE')
      and not has_table_privilege('authenticated', 'public.room_memory', 'REFERENCES')
      and not has_table_privilege('authenticated', 'public.room_memory', 'TRIGGER'),
    'Anonymous role has no table grant; authenticated receives CRUD only'
  ),
  (
    'single_policy_contract_installed',
    (select count(*) = 1
       from pg_policies
       where schemaname = 'public'
         and tablename = 'comfort_sessions'
         and policyname = 'comfort_sessions_permanent_owner_all'
         and roles = array['authenticated']::name[]
         and cmd = 'ALL'
         and coalesce(qual, '') ilike '%is_non_anonymous_user%'
         and coalesce(with_check, '') ilike '%is_non_anonymous_user%')
    and
    (select count(*) = 1
       from pg_policies
       where schemaname = 'public'
         and tablename = 'room_memory'
         and policyname = 'room_memory_permanent_owner_all'
         and roles = array['authenticated']::name[]
         and cmd = 'ALL'
         and coalesce(qual, '') ilike '%is_non_anonymous_user%'
         and coalesce(with_check, '') ilike '%is_non_anonymous_user%'),
    'Each table has one authenticated owner policy with a permanent-account guard'
  );

select check_name, passed, detail
from private_self_results
order by check_name;

rollback;

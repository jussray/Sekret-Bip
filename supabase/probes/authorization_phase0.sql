-- Se'kret Bip Supabase authorization Phase 0 proof harness
--
-- Purpose:
--   Prove core owner-only private-data behavior against a real Supabase schema
--   without leaving users or content behind.
--
-- Safety:
--   * Synthetic users and rows only.
--   * Entire probe runs inside one transaction.
--   * Final statement is ROLLBACK, never COMMIT.
--   * No production user IDs, emails, content, or secrets are referenced.
--
-- Expected checks:
--   1. authenticated user reads own private rows
--   2. authenticated user cannot read another user's private rows
--   3. authenticated user cannot update another user's journal row
--   4. anon cannot read private rows
--
-- Run through an administrator connection that can insert temporary auth.users
-- rows and SET LOCAL ROLE. Review every change before adapting this probe.

begin;

create temp table phase0_ids (
  label text primary key,
  user_id uuid not null
) on commit drop;

insert into phase0_ids(label, user_id)
values
  ('user_a', gen_random_uuid()),
  ('user_b', gen_random_uuid());

grant select on phase0_ids to authenticated, anon;

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
  null,
  user_id,
  'authenticated',
  'authenticated',
  label || '.phase0@sekret.invalid',
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
from phase0_ids;

insert into public.journal_entries(user_id, id, text, mood, date, time)
select
  user_id,
  case label when 'user_a' then 990001 else 990002 end,
  'phase0 synthetic journal',
  'calm',
  '2026-07-13',
  '00:00'
from phase0_ids;

insert into public.mood_history(user_id, id, mood, date, time)
select
  user_id,
  case label when 'user_a' then 990001 else 990002 end,
  'calm',
  '2026-07-13',
  '00:00'
from phase0_ids;

insert into public.room_memory(user_id, character, visit_count)
select user_id, 'raylene', 1
from phase0_ids;

insert into public.voice_notes(user_id, id, title, date, time, duration)
select
  user_id,
  case label when 'user_a' then 990001 else 990002 end,
  'phase0 synthetic voice',
  '2026-07-13',
  '00:00',
  '0:01'
from phase0_ids;

create temp table phase0_results (
  check_name text primary key,
  passed boolean not null,
  detail text not null
) on commit drop;

grant all on phase0_results to authenticated, anon;

select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from phase0_ids where label = 'user_a'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from phase0_ids where label = 'user_a'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;

insert into phase0_results values
  (
    'authenticated_reads_own_private_rows',
    (
      select count(*) = 4
      from (
        select 1 from public.journal_entries where user_id = auth.uid()
        union all
        select 1 from public.mood_history where user_id = auth.uid()
        union all
        select 1 from public.room_memory where user_id = auth.uid()
        union all
        select 1 from public.voice_notes where user_id = auth.uid()
      ) owned
    ),
    'User A can read exactly the four synthetic rows owned by User A'
  ),
  (
    'authenticated_denied_cross_user_reads',
    (
      select count(*) = 0
      from (
        select 1
        from public.journal_entries
        where user_id = (select user_id from phase0_ids where label = 'user_b')
        union all
        select 1
        from public.mood_history
        where user_id = (select user_id from phase0_ids where label = 'user_b')
        union all
        select 1
        from public.room_memory
        where user_id = (select user_id from phase0_ids where label = 'user_b')
        union all
        select 1
        from public.voice_notes
        where user_id = (select user_id from phase0_ids where label = 'user_b')
      ) foreign_rows
    ),
    'User A cannot read User B journal, mood, room-memory, or voice rows'
  );

with attempted as (
  update public.journal_entries
  set mood = 'tampered'
  where user_id = (select user_id from phase0_ids where label = 'user_b')
  returning 1
)
insert into phase0_results
select
  'authenticated_denied_cross_user_update',
  count(*) = 0,
  'User A cannot update User B journal row'
from attempted;

reset role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

insert into phase0_results
select
  'anon_denied_private_rows',
  count(*) = 0,
  'Anon cannot read journal, mood, room-memory, or voice rows'
from (
  select 1 from public.journal_entries where id in (990001, 990002)
  union all
  select 1 from public.mood_history where id in (990001, 990002)
  union all
  select 1 from public.room_memory where user_id in (select user_id from phase0_ids)
  union all
  select 1 from public.voice_notes where id in (990001, 990002)
) private_rows;

reset role;

select check_name, passed, detail
from phase0_results
order by check_name;

rollback;

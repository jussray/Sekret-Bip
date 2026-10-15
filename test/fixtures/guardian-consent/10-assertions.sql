\set ON_ERROR_STOP on
-- Synthetic auth identities make the cascade constraints executable.
insert into auth.users (id) values
  ('00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000002'),
  ('00000000-0000-4000-8000-000000000003'),
  ('00000000-0000-4000-8000-000000000004'),
  ('00000000-0000-4000-8000-000000000005'),
  ('00000000-0000-4000-8000-000000000006'),
  ('00000000-0000-4000-8000-000000000007'),
  ('00000000-0000-4000-8000-000000000008'),
  ('00000000-0000-4000-8000-0000000000ff'),
  ('00000000-0000-4000-8000-0000000000ee')
on conflict do nothing;

insert into public.parent_links (teen_user_id, parent_user_id, status, is_active, expires_at) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000ff', 'active', true, null),
  ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-0000000000ff', 'revoked', false, null),
  ('00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-0000000000ff', 'active', true, now() - interval '1 day'),
  ('00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-0000000000ff', 'pending', true, null),
  ('00000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-0000000000ff', 'active', true, null),
  ('00000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-0000000000ff', 'active', true, null),
  ('00000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-0000000000ff', 'active', true, null);

insert into public.guardian_summary_consents (
  teen_user_id, parent_link_id, guardian_user_id, parent_link_updated_at, enabled, enabled_at
)
select teen_user_id, id, parent_user_id, updated_at, true, now()
from public.parent_links
where teen_user_id in (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-000000000005'
);

-- A consent row bound to some other relationship is not authority for this teen.
insert into public.guardian_summary_consents (
  teen_user_id, parent_link_id, guardian_user_id, parent_link_updated_at, enabled, enabled_at
)
select
  '00000000-0000-4000-8000-000000000002',
  id,
  parent_user_id,
  updated_at,
  true,
  now()
from public.parent_links
where teen_user_id = '00000000-0000-4000-8000-000000000001';

insert into public.guardian_summary_consents (teen_user_id, enabled, enabled_at)
values ('00000000-0000-4000-8000-000000000007', false, now());

create or replace function pg_temp.expect(label text, actual boolean, expected boolean)
returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL %: got %, expected %', label, actual, expected;
  end if;
end $$;

set role service_role;
select pg_temp.expect('active link + consent', public.guardian_summary_permitted('00000000-0000-4000-8000-000000000001'), true);
select pg_temp.expect('consent without link', public.guardian_summary_permitted('00000000-0000-4000-8000-000000000002'), false);
select pg_temp.expect('revoked link', public.guardian_summary_permitted('00000000-0000-4000-8000-000000000003'), false);
select pg_temp.expect('expired link', public.guardian_summary_permitted('00000000-0000-4000-8000-000000000004'), false);
select pg_temp.expect('pending link', public.guardian_summary_permitted('00000000-0000-4000-8000-000000000005'), false);
select pg_temp.expect('no consent row', public.guardian_summary_permitted('00000000-0000-4000-8000-000000000006'), false);
select pg_temp.expect('withdrawn', public.guardian_summary_permitted('00000000-0000-4000-8000-000000000007'), false);
select pg_temp.expect('before opt in', public.guardian_summary_permitted('00000000-0000-4000-8000-000000000008'), false);
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000008', false);
select set_config('request.jwt.claims', '{"is_anonymous":false}', false);
set role authenticated;
select public.set_guardian_summary_consent(true);
reset role;
set role service_role;
select pg_temp.expect('after teen opt in', public.guardian_summary_permitted('00000000-0000-4000-8000-000000000008'), true);
reset role;

-- Changing the active relationship version invalidates the earlier consent,
-- even if the same teen stays linked.
update public.parent_links
set parent_user_id = '00000000-0000-4000-8000-0000000000ee',
    updated_at = updated_at + interval '1 second'
where teen_user_id = '00000000-0000-4000-8000-000000000008';

set role service_role;
select pg_temp.expect('relationship change requires fresh consent', public.guardian_summary_permitted('00000000-0000-4000-8000-000000000008'), false);
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000008', false);
set role authenticated;
select public.set_guardian_summary_consent(true);
reset role;
set role service_role;
select pg_temp.expect('fresh consent binds current relationship', public.guardian_summary_permitted('00000000-0000-4000-8000-000000000008'), true);
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000008', false);
set role authenticated;
select public.set_guardian_summary_consent(false);
reset role;
set role service_role;
select pg_temp.expect('after withdrawal', public.guardian_summary_permitted('00000000-0000-4000-8000-000000000008'), false);
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
set role authenticated;
do $$
declare denied boolean := false;
begin
  begin
    perform public.set_guardian_summary_consent(true);
  exception when sqlstate '42501' then
    denied := true;
  end;
  if not denied then raise exception 'caller without an active guardian link enabled sharing'; end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub', '', false);
set role authenticated;
do $$
declare denied boolean := false;
begin
  begin
    perform public.set_guardian_summary_consent(true);
  exception when sqlstate '42501' then
    denied := true;
  end;
  if not denied then raise exception 'subject-less caller could toggle consent'; end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
set role authenticated;
do $$
declare denied boolean := false;
begin
  begin
    perform public.guardian_summary_permitted('00000000-0000-4000-8000-000000000001');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'authenticated caller reached server-only check'; end if;
end $$;
do $$
declare denied boolean := false;
begin
  begin
    update public.guardian_summary_consents set enabled = true;
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'authenticated caller wrote consent table'; end if;
end $$;
reset role;

-- Account deletion must remove consent identifiers, including disabled rows.
delete from auth.users where id = '00000000-0000-4000-8000-000000000001';
select pg_temp.expect(
  'teen account deletion cascades consent identity',
  not exists (select 1 from public.guardian_summary_consents where teen_user_id = '00000000-0000-4000-8000-000000000001'),
  true
);

delete from auth.users where id = '00000000-0000-4000-8000-0000000000ff';
select pg_temp.expect(
  'guardian account deletion cascades consent identity',
  not exists (select 1 from public.guardian_summary_consents where guardian_user_id = '00000000-0000-4000-8000-0000000000ff'),
  true
);

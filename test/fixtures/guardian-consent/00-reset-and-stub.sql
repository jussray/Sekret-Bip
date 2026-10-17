\set ON_ERROR_STOP on
-- Fail closed even if this destructive fixture is invoked directly through psql.
do $fixture_sentinel$
begin
  if current_database() <> 'bip_test'
     or to_regclass('public.guardian_fixture_disposable_sentinel') is null then
    raise exception 'guardian consent fixtures require a dedicated disposable database';
  end if;
  if not exists (
    select 1 from public.guardian_fixture_disposable_sentinel
    where marker = 'guardian-consent-disposable-v1'
  ) then
    raise exception 'guardian consent fixture sentinel mismatch';
  end if;
end
$fixture_sentinel$;
drop table if exists public.guardian_summary_consents cascade;
drop table if exists public.parent_links cascade;
drop function if exists public.set_guardian_summary_consent(boolean);
drop function if exists public.guardian_summary_permitted(uuid);

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end $$;

create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create or replace function auth.jwt() returns json language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::json
$$;

create table public.parent_links (
  id uuid primary key default gen_random_uuid(),
  teen_user_id uuid not null,
  parent_user_id uuid,
  status text not null,
  is_active boolean not null default true,
  expires_at timestamptz,
  invite_code text,
  updated_at timestamptz not null default now()
);

grant usage on schema public, auth to anon, authenticated, service_role;
grant select on public.parent_links to service_role;

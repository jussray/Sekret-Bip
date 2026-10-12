-- Se'kret Bip: server-owned guardian-summary consent.
-- Default is OFF. No existing account is opted in by this migration.
begin;

create table if not exists public.guardian_summary_consents (
  teen_user_id uuid primary key,
  enabled boolean not null default false,
  enabled_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz not null default pg_catalog.now()
);

alter table public.guardian_summary_consents enable row level security;
revoke all on table public.guardian_summary_consents from anon, authenticated;

create or replace function public.set_guardian_summary_consent(p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  insert into public.guardian_summary_consents as c
    (teen_user_id, enabled, enabled_at, revoked_at, updated_at)
  values
    (v_user_id, p_enabled,
     case when p_enabled then pg_catalog.now() end,
     case when p_enabled then null else pg_catalog.now() end,
     pg_catalog.now())
  on conflict (teen_user_id) do update
    set enabled = excluded.enabled,
        enabled_at = case when excluded.enabled then pg_catalog.now() else c.enabled_at end,
        revoked_at = case when excluded.enabled then null else pg_catalog.now() end,
        updated_at = pg_catalog.now();

  return p_enabled;
end;
$$;

revoke all on function public.set_guardian_summary_consent(boolean) from public, anon;
grant execute on function public.set_guardian_summary_consent(boolean) to authenticated;

create or replace function public.guardian_summary_permitted(p_teen_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.parent_links pl
    join public.guardian_summary_consents c
      on c.teen_user_id = pl.teen_user_id
    where pl.teen_user_id = p_teen_user_id
      and pl.is_active = true
      and pl.status = 'active'
      and pl.parent_user_id is not null
      and (pl.expires_at is null or pl.expires_at > pg_catalog.now())
      and c.enabled = true
  );
$$;

revoke all on function public.guardian_summary_permitted(uuid) from public, anon, authenticated;
grant execute on function public.guardian_summary_permitted(uuid) to service_role;

commit;

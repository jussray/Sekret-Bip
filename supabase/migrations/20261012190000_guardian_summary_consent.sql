-- Se'kret Bip: server-owned guardian-summary consent.
-- Default is OFF. No existing account is opted in by this migration.
-- Consent is bound to the exact active parent-link relationship version so a
-- revoked/replaced link cannot inherit an older sharing decision.
begin;

create table if not exists public.guardian_summary_consents (
  teen_user_id uuid primary key,
  parent_link_id uuid references public.parent_links(id) on delete cascade,
  guardian_user_id uuid,
  parent_link_updated_at timestamptz,
  enabled boolean not null default false,
  enabled_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz not null default pg_catalog.now(),
  constraint guardian_summary_enabled_requires_link
    check (
      enabled is false
      or (
        parent_link_id is not null
        and guardian_user_id is not null
        and parent_link_updated_at is not null
      )
    )
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
  v_link public.parent_links%rowtype;
begin
  if v_user_id is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if p_enabled then
    select *
      into v_link
    from public.parent_links
    where teen_user_id = v_user_id
      and is_active = true
      and status = 'active'
      and parent_user_id is not null
      and (expires_at is null or expires_at > pg_catalog.now())
    order by updated_at desc
    limit 1;

    if not found then
      raise exception 'active guardian link required' using errcode = '42501';
    end if;
  end if;

  insert into public.guardian_summary_consents as c (
    teen_user_id, parent_link_id, guardian_user_id, parent_link_updated_at,
    enabled, enabled_at, revoked_at, updated_at
  ) values (
    v_user_id,
    case when p_enabled then v_link.id else null end,
    case when p_enabled then v_link.parent_user_id else null end,
    case when p_enabled then v_link.updated_at else null end,
    p_enabled,
    case when p_enabled then pg_catalog.now() end,
    case when p_enabled then null else pg_catalog.now() end,
    pg_catalog.now()
  )
  on conflict (teen_user_id) do update
    set parent_link_id = excluded.parent_link_id,
        guardian_user_id = excluded.guardian_user_id,
        parent_link_updated_at = excluded.parent_link_updated_at,
        enabled = excluded.enabled,
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
     and c.parent_link_id = pl.id
     and c.guardian_user_id = pl.parent_user_id
     and c.parent_link_updated_at = pl.updated_at
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

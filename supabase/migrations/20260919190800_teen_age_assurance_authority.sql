begin;

-- Teen verification is an assurance decision, not a side effect of Bridge.
-- The active parent link only scopes which verified guardian may confirm the
-- self-declared teen age bucket; the confirmation itself is a separate action
-- with its own receipt. Relationship creation/revocation never mutates this
-- receipt or verification authority.
create table if not exists public.teen_age_assurance_receipts (
  id uuid primary key default gen_random_uuid(),
  teen_user_id uuid not null references auth.users(id) on delete cascade,
  method text not null check (method in ('guardian_confirmation', 'self_declared_18_19')),
  age_bucket text not null check (age_bucket in ('13-15', '16-17', '18-19')),
  guardian_user_id uuid references auth.users(id) on delete set null,
  assurance_version text not null default 'teen-age-assurance-v1',
  confirmed_at timestamptz not null default now(),
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint teen_age_assurance_guardian_shape check (
    (method = 'guardian_confirmation' and guardian_user_id is not null)
    or (method = 'self_declared_18_19' and guardian_user_id is null)
  )
);

create unique index if not exists teen_age_assurance_one_active_receipt_idx
  on public.teen_age_assurance_receipts(teen_user_id)
  where superseded_at is null;

create index if not exists teen_age_assurance_guardian_idx
  on public.teen_age_assurance_receipts(guardian_user_id, confirmed_at desc)
  where guardian_user_id is not null;

alter table public.teen_age_assurance_receipts enable row level security;
revoke all on table public.teen_age_assurance_receipts from public, anon, authenticated;
grant select on table public.teen_age_assurance_receipts to authenticated;

drop policy if exists teen_age_assurance_teen_select_own on public.teen_age_assurance_receipts;
create policy teen_age_assurance_teen_select_own
on public.teen_age_assurance_receipts
for select
to authenticated
using (
  public.is_non_anonymous_user()
  and teen_user_id = (select auth.uid())
);

drop policy if exists teen_age_assurance_guardian_select_own_confirmation on public.teen_age_assurance_receipts;
create policy teen_age_assurance_guardian_select_own_confirmation
on public.teen_age_assurance_receipts
for select
to authenticated
using (
  public.is_non_anonymous_user()
  and guardian_user_id = (select auth.uid())
);

create or replace function public.confirm_linked_teen_age_assurance(
  p_teen_user_id uuid
)
returns table (
  teen_user_id uuid,
  age_bucket text,
  verification_state text,
  assurance_method text,
  confirmed_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_guardian_id uuid := auth.uid();
  v_guardian_profile public.app_profiles%rowtype;
  v_guardian_state text;
  v_teen_profile public.app_profiles%rowtype;
  v_receipt public.teen_age_assurance_receipts%rowtype;
begin
  if v_guardian_id is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_teen_user_id is null or p_teen_user_id = v_guardian_id then
    raise exception 'valid linked teen required' using errcode = '22023';
  end if;

  select * into v_guardian_profile
  from public.app_profiles
  where user_id = v_guardian_id;

  if not found
     or v_guardian_profile.account_side <> 'parent'
     or v_guardian_profile.onboarding_complete is not true then
    raise exception 'completed parent profile required' using errcode = '42501';
  end if;

  select verification_state into v_guardian_state
  from public.account_verification
  where user_id = v_guardian_id;

  if v_guardian_state <> 'VERIFIED_GUARDIAN' then
    raise exception 'verified guardian required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.parent_links pl
    where pl.teen_user_id = p_teen_user_id
      and pl.parent_user_id = v_guardian_id
      and pl.status = 'active'
      and pl.is_active is true
  ) then
    raise exception 'active teen relationship required' using errcode = '42501';
  end if;

  select * into v_teen_profile
  from public.app_profiles
  where user_id = p_teen_user_id;

  if not found
     or v_teen_profile.account_side <> 'teen'
     or v_teen_profile.onboarding_complete is not true
     or v_teen_profile.age_range not in ('13-15', '16-17') then
    raise exception 'guardian confirmation is only for completed minor teen profiles' using errcode = '42501';
  end if;

  update public.teen_age_assurance_receipts
  set superseded_at = now()
  where teen_user_id = p_teen_user_id
    and superseded_at is null;

  insert into public.teen_age_assurance_receipts (
    teen_user_id,
    method,
    age_bucket,
    guardian_user_id
  ) values (
    p_teen_user_id,
    'guardian_confirmation',
    v_teen_profile.age_range,
    v_guardian_id
  )
  returning * into v_receipt;

  update public.account_verification
  set verification_state = 'VERIFIED_TEEN',
      verification_reason = 'guardian_age_assurance',
      verification_updated_at = now()
  where user_id = p_teen_user_id
    and verification_state not in ('SUSPENDED', 'MANUAL_REVIEW');

  if not found then
    raise exception 'teen verification state is not eligible for confirmation' using errcode = '42501';
  end if;

  return query
  select
    p_teen_user_id,
    v_teen_profile.age_range,
    'VERIFIED_TEEN'::text,
    v_receipt.method,
    v_receipt.confirmed_at;
end;
$$;

create or replace function public.confirm_own_self_declared_adult_teen_age_assurance()
returns table (
  teen_user_id uuid,
  age_bucket text,
  verification_state text,
  assurance_method text,
  confirmed_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_teen_id uuid := auth.uid();
  v_teen_profile public.app_profiles%rowtype;
  v_receipt public.teen_age_assurance_receipts%rowtype;
begin
  if v_teen_id is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select * into v_teen_profile
  from public.app_profiles
  where user_id = v_teen_id;

  if not found
     or v_teen_profile.account_side <> 'teen'
     or v_teen_profile.onboarding_complete is not true
     or v_teen_profile.age_range <> '18-19' then
    raise exception 'self-declared adult teen assurance requires a completed 18-19 teen profile' using errcode = '42501';
  end if;

  update public.teen_age_assurance_receipts
  set superseded_at = now()
  where teen_user_id = v_teen_id
    and superseded_at is null;

  insert into public.teen_age_assurance_receipts (
    teen_user_id,
    method,
    age_bucket,
    guardian_user_id
  ) values (
    v_teen_id,
    'self_declared_18_19',
    v_teen_profile.age_range,
    null
  )
  returning * into v_receipt;

  update public.account_verification
  set verification_state = 'VERIFIED_TEEN',
      verification_reason = 'self_declared_18_19',
      verification_updated_at = now()
  where user_id = v_teen_id
    and verification_state not in ('SUSPENDED', 'MANUAL_REVIEW');

  if not found then
    raise exception 'teen verification state is not eligible for confirmation' using errcode = '42501';
  end if;

  return query
  select
    v_teen_id,
    v_teen_profile.age_range,
    'VERIFIED_TEEN'::text,
    v_receipt.method,
    v_receipt.confirmed_at;
end;
$$;

revoke all on function public.confirm_linked_teen_age_assurance(uuid) from public, anon;
grant execute on function public.confirm_linked_teen_age_assurance(uuid) to authenticated, service_role;

revoke all on function public.confirm_own_self_declared_adult_teen_age_assurance() from public, anon;
grant execute on function public.confirm_own_self_declared_adult_teen_age_assurance() to authenticated, service_role;

comment on table public.teen_age_assurance_receipts is
  'Minimal Teen age-assurance receipts. No raw ID, selfie, full birth date, or Bridge content is stored.';
comment on function public.confirm_linked_teen_age_assurance(uuid) is
  'Verified-guardian explicit confirmation for a linked 13-17 Teen. The active parent link scopes the target only; this function is the separate assurance authority.';
comment on function public.confirm_own_self_declared_adult_teen_age_assurance() is
  'Explicit self-declared assurance for a completed 18-19 Teen profile; independent from parent links and Bridge.';

commit;

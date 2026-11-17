-- Runtime truth hardening: consent persistence and account deletion evidence.
-- This migration is intentionally timestamped so Supabase CLI migration discovery
-- cannot silently skip it.

create table if not exists public.user_consents (
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  granted boolean not null default false,
  timestamp timestamptz not null default now(),
  version text not null default '1.0.0',
  primary key (user_id, category)
);

create table if not exists public.consent_audit_log (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  action text not null check (action in ('grant', 'revoke')),
  granted boolean not null,
  timestamp timestamptz not null default now(),
  version text not null default '1.0.0'
);

alter table public.user_consents enable row level security;
alter table public.consent_audit_log enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.user_consents'::regclass
      and conname = 'user_consents_category_check'
  ) then
    alter table public.user_consents
      add constraint user_consents_category_check
      check (category in (
        'notifications',
        'moodTracking',
        'journaling',
        'aiChat',
        'analytics',
        'privacyPolicy',
        'termsOfService'
      ));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.consent_audit_log'::regclass
      and conname = 'consent_audit_log_category_check'
  ) then
    alter table public.consent_audit_log
      add constraint consent_audit_log_category_check
      check (category in (
        'notifications',
        'moodTracking',
        'journaling',
        'aiChat',
        'analytics',
        'privacyPolicy',
        'termsOfService'
      ));
  end if;
end
$$;

drop policy if exists "Users manage own consents" on public.user_consents;
drop policy if exists "Users read own consents" on public.user_consents;
create policy "Users read own consents"
  on public.user_consents
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users read own audit log" on public.consent_audit_log;
create policy "Users read own audit log"
  on public.consent_audit_log
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.user_consents from anon;
revoke all on table public.consent_audit_log from anon;
revoke insert, update, delete on table public.user_consents from authenticated;
revoke insert, update, delete on table public.consent_audit_log from authenticated;
grant select on table public.user_consents to authenticated;
grant select on table public.consent_audit_log to authenticated;

create or replace function public.record_user_consent(
  p_category text,
  p_granted boolean,
  p_version text default '1.0.0'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_timestamp timestamptz := now();
  v_action text;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if p_category not in (
    'notifications',
    'moodTracking',
    'journaling',
    'aiChat',
    'analytics',
    'privacyPolicy',
    'termsOfService'
  ) then
    raise exception 'invalid_consent_category' using errcode = '22023';
  end if;

  if coalesce(btrim(p_version), '') = '' then
    raise exception 'invalid_consent_version' using errcode = '22023';
  end if;

  v_action := case when p_granted then 'grant' else 'revoke' end;

  insert into public.user_consents as current_state (
    user_id,
    category,
    granted,
    timestamp,
    version
  ) values (
    v_user_id,
    p_category,
    p_granted,
    v_timestamp,
    p_version
  )
  on conflict (user_id, category) do update
    set granted = excluded.granted,
        timestamp = excluded.timestamp,
        version = excluded.version;

  insert into public.consent_audit_log (
    user_id,
    category,
    action,
    granted,
    timestamp,
    version
  ) values (
    v_user_id,
    p_category,
    v_action,
    p_granted,
    v_timestamp,
    p_version
  );

  return jsonb_build_object(
    'category', p_category,
    'granted', p_granted,
    'timestamp', v_timestamp,
    'version', p_version
  );
end;
$$;

revoke all on function public.record_user_consent(text, boolean, text) from public;
revoke all on function public.record_user_consent(text, boolean, text) from anon;
grant execute on function public.record_user_consent(text, boolean, text) to authenticated;

comment on function public.record_user_consent(text, boolean, text) is
  'Atomically updates current consent and appends an immutable audit entry for auth.uid().';

create index if not exists idx_user_consents_user_id
  on public.user_consents(user_id);
create index if not exists idx_consent_audit_log_user_id
  on public.consent_audit_log(user_id);
create index if not exists idx_consent_audit_log_timestamp
  on public.consent_audit_log(timestamp desc);

create table if not exists public.account_deletion_receipts (
  request_id uuid primary key,
  user_id_hash text not null,
  status text not null default 'processing'
    check (status in ('processing', 'completed', 'failed')),
  storage_buckets jsonb not null default '[]'::jsonb,
  storage_objects_deleted integer not null default 0,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.account_deletion_receipts enable row level security;
revoke all on table public.account_deletion_receipts from anon;
revoke all on table public.account_deletion_receipts from authenticated;

comment on table public.account_deletion_receipts is
  'Service-role-only tombstones proving delayed account deletion completed after the auth user and request row cascade away.';
